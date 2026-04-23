// server.js
const express   = require('express');
const session   = require('express-session');
const bcrypt    = require('bcryptjs');
const OpenAI    = require('openai');
const rateLimit = require('express-rate-limit');
const Stripe    = require('stripe');
const { Resend } = require('resend');
const helmet    = require('helmet');
const {
  initDatabase, cleanupExpiredTokens, rotateDbBackups, findUserByUsername, findUserByEmail, findUserById, createUser,
  getAllUsers, setUserRole, deleteUser, deleteUserAccount, getUserStats,
  setStripeCustomerId, findUserByStripeCustomerId,
  updateLastLogin,
  getNotesByUserId, createNote, deleteNote,
  getBlockProgress, saveQuizResult, getCompletedBlockCount,
  createResetToken, findValidResetToken, deleteResetToken, updateUserPassword,
  saveReflection, getReflectionsForBlock,
  recordRoleplayCompletion, getRoleplaysForBlock,
  startMission, updateMissionProgress, completeMission, getMissionForBlock,
  getJourneyStatus, getUserLearningState,
  logUserAction, getUserActions, deleteUserAction, getActionsToday,
  getUserPreferences, setUserPreferences,
  getDailyChallenge, saveDailyChallenge, completeDailyChallenge,
  getAllUsersWithEmail, getUsersForBroadcast,
  getAdminAnalytics, getUserAnalyticsProfile, getFunnelMetrics, getUserDataExport,
  logPageView, updateLastPageViewDuration, cleanupOldPageViews, flushAnalytics,
  sessionGet, sessionSet, sessionDestroy, sessionCleanupExpired,
  markStripeEventProcessed, cleanupOldStripeEvents,
  createProCallAnalysis, updateProCallAnalysis, getProCallAnalysis,
  getProCallAnalysesForUser, canProUserUploadCall, deleteProCallAnalysis,
  PRO_CALL_LIMIT_PER_MONTH,
  getOrCreateReferralCode, findUserByReferralCode, setReferrerForUser, getReferralStats,
  grantReferralCreditIfEligible, markReferralCreditsRedeemed, getUsersWithPendingReferralCredits,
} = require('./database');
const gamification = require('./gamification');
const emails = require('./emails');
const proAnalysis = require('./proCallAnalysis');
const multer = require('multer');

// Multer för Pro call-upload: in-memory (files raderas efter transkribering), max 100 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/flac'];
    if (allowed.includes(file.mimetype) || /\.(mp3|m4a|wav|webm|aac|ogg|flac|mp4)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Endast ljudfiler stöds (mp3, m4a, wav, webm, aac, ogg, flac).'));
    }
  },
});

// ── Role helpers ─────────────────────────────────────────────────────────────
// Rollhierarki: free < premium < pro < admin
// - 'premium' ger tillgång till alla block + AI-rollspel + gamification
// - 'pro' ger ALLT i premium + call-upload-analyser + advanced scenarios + prio Jocke
// - 'admin' ger allt (inkl. admin-dashboard)

function isPremiumOrHigher(role) {
  return role === 'premium' || role === 'pro' || role === 'admin';
}

function isProOrHigher(role) {
  return role === 'pro' || role === 'admin';
}

// Jocke-svar: Pro-användare får längre/bättre svar
function jockeMaxTokens(role) {
  return isProOrHigher(role) ? 900 : 500;
}

// ── Gamification helpers ─────────────────────────────────────────────────────

/**
 * Beräkna användarens fulla stats (XP, nivå, streak, radar, etc).
 * Samlar data från alla event-källor. Cachas inte — alltid färsk.
 */
function computeStatsForUser(userId) {
  const progressArr = [];
  const pS = (function() { const s = require('./database').getBlockProgress(userId); return s; })();
  Object.values(pS).forEach(p => progressArr.push(p));
  const reflections = require('./database').getAllReflectionsForUser(userId);
  const roleplays   = require('./database').getAllRoleplaysForUser(userId);
  const missions    = require('./database').getAllMissionsForUser(userId);
  const actions     = require('./database').getUserActions(userId, 1000);
  return gamification.computeUserStats({
    progress: progressArr,
    reflections, roleplays, missions, actions,
    blocks: salesBlocks,
  });
}

function getUserPrefsObj(userId) {
  return gamification.parsePreferences(getUserPreferences(userId));
}

function saveUserPrefsObj(userId, prefs) {
  setUserPreferences(userId, gamification.serializePreferences(prefs));
}

/**
 * Kolla om användaren precis nivå-upp'at jämfört med senast ses.
 * Returnerar { leveledUp, newLevel } om ja.
 */
function checkLevelUp(userId, stats) {
  const prefs = getUserPrefsObj(userId);
  const currentLevelId = stats.level.current.id;
  if (currentLevelId > (prefs.last_seen_level || 1)) {
    return { leveledUp: true, newLevel: stats.level.current };
  }
  return { leveledUp: false };
}

function markLevelSeen(userId, levelId) {
  const prefs = getUserPrefsObj(userId);
  prefs.last_seen_level = levelId;
  saveUserPrefsObj(userId, prefs);
}

function isGamificationEnabled(userId) {
  if (!userId) return false;
  return getUserPrefsObj(userId).gamification_enabled !== false;
}
const salesBlocks   = require('./salesContent');
const glossaryTerms = require('./glossary');
const { generateRecommendations, generateBlockCoachHint, suggestNextBlock } = require('./recommendations');

const app    = express();
const PORT   = process.env.PORT || 3000;
const stripe = Stripe(process.env['STRIPE_SECRET_KEY'] || '');
const resend = process.env['RESEND_API_KEY'] ? new Resend(process.env['RESEND_API_KEY']) : null;
// Set RESEND_FROM to a verified Resend sender, e.g. "Joakim Jaksen <noreply@joakimjaksen.se>"
const RESEND_FROM = process.env['RESEND_FROM'] || 'Joakim Jaksen <onboarding@resend.dev>';

// Block 1 (Inledning) and Block 2 (Första intrycket) are free; 3–20 require premium (teaser shown for locked blocks)
const FREE_BLOCK_IDS = ['inledning', 'forsta-intrycket'];

const openai = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const JOCKE_SYSTEM_PROMPT = `
Du heter Jocke. Du är säljcoachen på Joakim Jaksens plattform — byggd av Joakim Jaksen, 22+ år i säljbranschen, 200+ MSEK i resultat och 1000+ tränade säljare.

KOMMUNIKATIONSSTIL:
- Direkt, skarp, kortfattad. Inga onödiga ord.
- Tänker i first principles, inte fluff eller akademisk teori.
- Utmanar svaga antaganden direkt. Fokuserar på vad som faktiskt rör nålen.
- Svarar alltid på svenska om användaren skriver på svenska.

SAKER DU ÄR BRA PÅ:
- Rollspel: öva invändningar, träna öppningssamtal, simulera kundmöten.
- Feedback på pitchar, öppningsfrågor och presentationer.
- Konkreta råd för specifika säljsituationer.
- Förklara säljteorier och ramverk (SPIN, BANT, FAB, BATNA m.fl.).

BLOCKEN DU KÄNNER TILL (Joakim Jaksens Säljutbildning):
1. Inledning — Vad sälj egentligen är, retorik 2500 år, varför säljare alltid behövs.
2. Första Intrycket — De 7 första sekunderna, Mehrabians regel, öppna samtal rätt.
3. Tonfall & Psykologisk Påverkan — 9 strategiska tonfall (nyfiken, förvirrad, lekfull m.fl.), 10 psy-ops-tekniker (framing, anchoring, labeling, mirroring, foot-in-the-door m.fl.).
4. Prospektering — ICP, cold outreach, pipeline.
5. Behovsanalys — SPIN-selling, öppna frågor, aktiv lyssning.
6. Presentation & Erbjudande — FAB, skillnaden mellan features och värde.
7. Invändningshantering — Feel-felt-found, LAER, fem typer av invändningar.
8. Avslutstekniker — Assumptive close, urgency, trial close.
9. Uppföljning — Timing, multi-touch, 80% av affärer kräver 5+ kontakter.
10. Mål & Motivation — System slår vilja, OKR-tänkande, momentum.
11. LinkedIn & Sociala Medier — Profil, outreach, social selling.
12. Videosamtal & Digital Försäljning — Miljö, kroppsspråk, tech.
13. E-post & Skriftlig Kommunikation — Subject lines, struktur, ton.
14. Förhandling — BATNA, anchoring, value-based pricing, värde istället för pris.
15. Personligt Varumärke — Positionering, expertis, synlighet.
16. Träning & Hälsa — Sömn, energi, kost, fysisk prestation.
17. Tidshantering — 80/20, time blocking, eat the frog, Eisenhower.
18. Mental Styrka & Resiliens — Stoicism, reframing, visualisering, flow.
19. AI som Säljverktyg — Prompt engineering, agentic AI, etik, EU AI Act.
20. Rekommenderad Läsning — Kurerad boklista (Voss, Cialdini, Clear, Kahneman m.fl.).

REGLER:
- Du är en AI-assistent. Om någon direkt frågar om du är en AI, robot eller språkmodell — bekräfta ärligt att du är det. Behåll ändå personan "Jocke" och din coachingstil. Du behöver inte frivilligt ta upp det, men ljug aldrig om det om du tillfrågas. (Krav enligt EU AI Act Art. 52.)
- Håll svaren kortfattade om inte användaren specifikt ber om djupare genomgång.
- Om du inte vet något specifikt — säg det och erbjud ett alternativt perspektiv.
`;

// ── Stripe webhook (raw body MUST come before express.json) ──────────────────

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process['env']['STRIPE_WEBHOOK_SECRET'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Idempotency: Stripe retries events vid nätverksfel. Utan dedup skulle
  // samma checkout.session.completed kunna processeras N gånger, vilket
  // blir fel när vi börjar ge ut referral-rewards eller skicka välkomstmejl
  // som bi-effekt. Spara event.id; om redan sett — ignorera tyst (ack:a Stripe).
  const isNewEvent = markStripeEventProcessed(event.id, event.type);
  if (!isNewEvent) {
    console.log(`⏭️  Skippar redan-processat Stripe-event ${event.id} (${event.type})`);
    return res.json({ received: true, duplicate: true });
  }

  if (event.type === 'checkout.session.completed') {
    const sess   = event.data.object;
    const userId = parseInt(sess.metadata?.userId);
    const tier   = sess.metadata?.tier === 'pro' ? 'pro' : 'premium';
    if (userId) {
      setUserRole(userId, tier);
      // Store Stripe customer ID for future webhook lookups
      if (sess.customer) setStripeCustomerId(userId, sess.customer);
      console.log(`✅ User ${userId} upgraded to ${tier}`);

      // ── Auto-referral-reward: om den här användaren refererades av någon
      // och detta är deras första upgrade, kreditera referrern 1 gratis månad.
      // Idempotent via referral_credit_granted-flaggan i DB.
      try {
        const result = grantReferralCreditIfEligible(userId);
        if (result.granted) {
          console.log(`🎁 Referrer ${result.referrerId} fick 1 gratis månad krediterad`);
        }
      } catch (err) {
        // Logga men låt inte fel här påverka upgrade-flödet
        console.error('Referral credit error:', err.message);
      }
    }
  }

  // Subscription cancelled (voluntary or non-payment)
  if (event.type === 'customer.subscription.deleted') {
    const sub  = event.data.object;
    // Try metadata first, fall back to customer ID lookup
    let userId = parseInt(sub.metadata?.userId);
    if (!userId && sub.customer) {
      const u = findUserByStripeCustomerId(sub.customer);
      if (u) userId = u.id;
    }
    if (userId) {
      setUserRole(userId, 'free');
      console.log(`⬇️ User ${userId} downgraded to free (subscription cancelled)`);
    }
  }

  // Payment failed — grace: keep premium until subscription is actually deleted
  // But log it so we can act if needed
  if (event.type === 'invoice.payment_failed') {
    const inv = event.data.object;
    console.warn(`⚠️ Payment failed for customer ${inv.customer} — invoice ${inv.id}`);
    // Stripe will retry and eventually fire subscription.deleted if unrecoverable
  }

  // Subscription paused / updated to unpaid
  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    if (sub.status === 'unpaid' || sub.status === 'past_due') {
      let userId = parseInt(sub.metadata?.userId);
      if (!userId && sub.customer) {
        const u = findUserByStripeCustomerId(sub.customer);
        if (u) userId = u.id;
      }
      if (userId) {
        console.warn(`⚠️ Subscription ${sub.status} for user ${userId}`);
        // Don't revoke premium yet — keep access until subscription.deleted
      }
    }
    // If subscription is re-activated — behåll aktuell tier om möjligt via price-id
    if (sub.status === 'active') {
      let userId = parseInt(sub.metadata?.userId);
      if (!userId && sub.customer) {
        const u = findUserByStripeCustomerId(sub.customer);
        if (u) userId = u.id;
      }
      if (userId) {
        // Bestäm tier från subscriptionens price-id om det finns
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = (priceId && priceId === process.env.STRIPE_PRICE_ID_PRO) ? 'pro' : 'premium';
        setUserRole(userId, tier);
      }
    }
  }

  res.json({ received: true });
});

// ── Middleware ────────────────────────────────────────────────────────────────

app.set('trust proxy', 1); // Railway runs behind a reverse proxy

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled — inline scripts throughout EJS (TODO: add nonces)
  crossOriginEmbedderPolicy: false, // needed for YouTube iframes
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.disable('x-powered-by'); // already removed by helmet but belt-and-suspenders

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

const isProd = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

// ── SQL.js-backed session store ────────────────────────────────────────────
// Utan detta använder express-session default MemoryStore — alla användare
// loggas ut på varje Railway-deploy. Den här storen persisterar sessions i
// samma sql.js-DB som resten av datan, så sessions överlever redeploy.
class SqlJsSessionStore extends session.Store {
  constructor() { super(); }
  get(sid, cb) {
    try {
      const data = sessionGet(sid);
      if (!data) return cb(null, null);
      cb(null, JSON.parse(data));
    } catch (err) { cb(err); }
  }
  set(sid, sessionData, cb) {
    try {
      // maxAge i cookie är default 8h — använd samma för expires_at
      const ttlMs = (sessionData.cookie && sessionData.cookie.maxAge) || 1000 * 60 * 60 * 8;
      const expiresAt = Date.now() + ttlMs;
      sessionSet(sid, JSON.stringify(sessionData), expiresAt);
      cb && cb(null);
    } catch (err) { cb && cb(err); }
  }
  destroy(sid, cb) {
    try { sessionDestroy(sid); cb && cb(null); } catch (err) { cb && cb(err); }
  }
  touch(sid, sessionData, cb) {
    // "Rör" sessionen — förlänger expires_at utan att ändra data
    this.set(sid, sessionData, cb);
  }
}

app.use(session({
  store:  new SqlJsSessionStore(),
  name:   'sid',  // don't leak 'connect.sid' as the session cookie name
  secret: process.env.SESSION_SECRET || 'change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,  // uppdatera expires_at på varje request (keeps them logged in while active)
  cookie: {
    maxAge:   1000 * 60 * 60 * 24 * 30, // 30 dagar — bara förlängs när de används aktivt
    httpOnly: true,
    secure:   isProd,             // HTTPS-only in production
    sameSite: 'lax',              // CSRF mitigation
  },
}));

// ── Referral tracker: sparar ?ref=CODE i session i 30 dagar ───────────────────
app.use((req, res, next) => {
  const ref = req.query.ref;
  if (ref && typeof ref === 'string' && /^[A-Z0-9]{4,12}$/i.test(ref)) {
    // Endast sätt om ingen referral redan spårad (förhindra overwrite)
    if (!req.session.pendingReferralCode) {
      req.session.pendingReferralCode = ref.toUpperCase();
      req.session.referralCapturedAt = Date.now();
    }
  }
  next();
});

// ── Page-view tracker: logga sidbesök för inloggade (admin analytics) ─────────
// Skippa assets, api-endpoints och health-checks. Bara "riktiga" sidor.
const PAGE_VIEW_SKIP = /^\/(style\.css|gamification\.css|pro\.css|favicon|robots|sitemap|_|heartbeat|ping|stripe-webhook|admin\/analytics-api)/i;
// Botar/crawlers förorenar analytics med fake-aktivitet. Skippa dem.
const BOT_UA = /bot|crawler|spider|slurp|bingpreview|headless|lighthouse|pagespeed|pingdom|uptimerobot|facebookexternalhit|curl|wget|python-requests|axios/i;
app.use((req, res, next) => {
  if (req.method === 'GET' && req.session && req.session.userId && !PAGE_VIEW_SKIP.test(req.path)) {
    const ua = req.get('User-Agent') || '';
    if (!BOT_UA.test(ua)) {
      // Fire-and-forget: blockera aldrig requesten
      try { logPageView(req.session.userId, req.path); } catch (_) {}
    }
  }
  next();
});

// Rate-limit heartbeat: en klient bör max skicka ~2/min (30s intervall), tillåt 10/min
// för safety margin men stoppa spam/bots som försöker förorena analytics.
const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  skipFailedRequests: true,
  handler: (req, res) => res.status(204).end(), // tyst drop — inga error-logs
});

// ── Rate limiter — max 10 login attempts per 15 min per IP ───────────────────

const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              10,
  skipSuccessfulRequests: true,      // only count failed/all POST attempts
  handler: (req, res) => {
    res.render('login', {
      error: '🔒 För många inloggningsförsök. Försök igen om 15 minuter.',
      registerError: null,
      success: null,
      turnstileSiteKey: TURNSTILE_SITE_KEY,
    });
  },
});

// ── Rate limiter — max 5 registrations per hour per IP ───────────────────────

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  handler: (req, res) => {
    res.render('login', {
      error: null,
      registerError: '🔒 För många registreringsförsök. Försök igen senare.',
      success: null,
      turnstileSiteKey: TURNSTILE_SITE_KEY,
    });
  },
});

// ── Rate limiter — max 30 chat messages per 10 min per user ──────────────────

const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  keyGenerator: (req) => `chat_${req.session?.userId || req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'För många meddelanden. Vänta lite och försök igen.' });
  },
});

// ── Rate limiter — max 60 quiz submissions per 10 min per user ───────────────

const quizLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // 6 blocks × 10 retries
  keyGenerator: (req) => `quiz_${req.session?.userId || req.ip}`,
  handler: (req, res) => {
    res.status(429).json({ ok: false, error: 'För många försök.' });
  },
});

// ── Rate limiter — max 5 password reset requests per hour per IP ─────────────

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.render('forgot-password', {
      error: 'För många försök. Försök igen om en timme.',
      success: null,
      csrfToken: generateCsrfToken(req),
    });
  },
});

// ── Rate limiter — max 30 note creates per 10 min per user ───────────────────

const noteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => `note_${req.session?.userId || req.ip}`,
  handler: (req, res) => res.redirect('/dashboard'),
});

// ── Rate limiter — max 20 note deletes per 10 min per user ───────────────────

const noteDeleteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `notedel_${req.session?.userId || req.ip}`,
  handler: (req, res) => res.redirect('/dashboard'),
});

// ── Rate limiter — max 3 account delete attempts per 15 min per user ─────────

const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `del_${req.session?.userId || req.ip}`,
  handler: (req, res) => res.redirect('/dashboard?deleteError=1'),
});

// ── Rate limiter — max 10 password changes per hour per user ─────────────────

const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `pwchg_${req.session?.userId || req.ip}`,
  handler: (req, res) => res.redirect('/account?pwError=ratelimit'),
});

// ── CSRF token helper ─────────────────────────────────────────────────────────

const crypto = require('crypto');

function generateCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

function verifyCsrf(req, res, next) {
  const token = req.body?._csrf || req.headers['x-csrf-token'];
  if (!token || token !== req.session.csrfToken) {
    // Return JSON for AJAX/fetch requests; plain text for form POSTs
    const isAjax = !!req.headers['x-csrf-token'] || (req.headers['accept'] || '').includes('application/json');
    if (isAjax) {
      return res.status(403).json({ error: 'Sessionen har gått ut — ladda om sidan och försök igen.' });
    }
    return res.status(403).send('Ogiltig begäran. Ladda om sidan och försök igen.');
  }
  next();
}

// ── Email template builders ───────────────────────────────────────────────────

function emailShell(content) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07070f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <!-- Header -->
      <tr><td style="background:#111126;border-radius:16px 16px 0 0;padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <span style="font-size:22px;font-weight:900;color:#f1f5f9;">🎯 Joakim Jaksen</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:#111126;padding:32px;color:#e2e8f0;">
        ${content}
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#0a0a14;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
        <p style="margin:0;font-size:12px;color:#334155;">© 2026 Joakim Jaksen / Brilliant Values Global AB · <a href="https://app.joakimjaksen.se/integritetspolicy" style="color:#475569;">Integritetspolicy</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildWelcomeEmail(username, baseUrl) {
  return emailShell(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#f1f5f9;">Välkommen, ${username}! 🎯</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Ditt konto är nu aktivt.</p>

    <p style="color:#94a3b8;line-height:1.7;margin:0 0 16px;">
      Du har tillgång till <strong style="color:#e2e8f0;">Block 1 — Inledning &amp; Första Intrycket</strong> helt gratis.
      Teorin, videon och provet — allt är redan redo för dig.
    </p>

    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em;">Kom igång på 3 steg</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <p style="margin:0;color:#94a3b8;font-size:14px;">1️⃣ &nbsp;Logga in på <a href="${baseUrl}" style="color:#818cf8;">app.joakimjaksen.se</a></p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">2️⃣ &nbsp;Läs teorin i Block 1</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">3️⃣ &nbsp;Gör provet och se hur du presterar</p>
      </div>
    </div>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
        <a href="${baseUrl}/learn/forsta-intrycket" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:15px;">
          Gå till Block 1 →
        </a>
      </td></tr>
    </table>

    <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 8px;">
      När du är redo för mer — uppgradera till Premium och lås upp alla 20 block, AI-coachen Jocke och videogenomgångarna.
    </p>

    <p style="margin:24px 0 0;color:#475569;font-size:13px;">Med sälj,<br><strong style="color:#64748b;">Joakim Jaksen</strong></p>
  `);
}

function buildPasswordResetEmail(username, link) {
  return emailShell(`
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#f1f5f9;">Återställ ditt lösenord</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">En förfrågan skickades för ditt konto.</p>

    <p style="color:#94a3b8;line-height:1.7;margin:0 0 24px;">
      Hej ${username}! Du (eller någon annan) har begärt att återställa lösenordet för ditt konto på Joakim Jaksens Säljutbildning.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
        <a href="${link}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:15px;">
          Återställ lösenord →
        </a>
      </td></tr>
    </table>

    <p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 8px;">
      Länken är giltig i <strong style="color:#64748b;">1 timme</strong>.
    </p>
    <p style="color:#334155;font-size:12px;margin:0;">
      Om du inte begärt detta — ignorera det här mailet. Ditt lösenord är oförändrat.
    </p>

    <p style="margin:24px 0 0;color:#475569;font-size:13px;">— Joakim Jaksen</p>
  `);
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

// Endast interna paths — hindrar open-redirect-attacker där angripare
// sätter ?next=https://ondskefull.com
function isSafeReturnPath(p) {
  return typeof p === 'string'
    && p.startsWith('/')
    && !p.startsWith('//')
    && !p.includes('://')
    && p.length < 512;
}

function requireLogin(req, res, next) {
  if (!req.session?.userId) {
    // Spara destination så användaren landar där de försökte gå efter login.
    // Endast GET-requests (POST-body kan inte reproduceras automatiskt).
    if (req.method === 'GET' && isSafeReturnPath(req.originalUrl)) {
      req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/login');
  }

  // One DB lookup per request — gives us three things for free:
  //  1. Confirm the user still exists (not deleted mid-session)
  //  2. Invalidate sessions whose password has changed since login (stolen-session mitigation)
  //  3. Keep session role in sync with DB (instant effect when admin demotes a user)
  const user = findUserById(req.session.userId);
  if (!user) {
    return req.session.destroy(() => res.redirect('/login'));
  }
  const dbVersion = user.pw_version || 0;
  if ((req.session.pwVersion || 0) !== dbVersion) {
    return req.session.destroy(() => res.redirect('/login?expired=1'));
  }
  // Keep session role fresh (so admin demotions take effect without re-login)
  req.session.role = user.role;
  next();
}

function requireAdmin(req, res, next) {
  if (req.session?.role === 'admin') return next();
  res.status(403).send('Åtkomst nekad.');
}

// ── Login / Register ──────────────────────────────────────────────────────────

const TURNSTILE_SITE_KEY = process.env['TURNSTILE_SITE_KEY'] || '1x00000000000000000000AA';

// ── Landing page ──────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  // Om ?ref= sparats i sessionen, skicka referrer-namnet till landing så vi kan visa banner
  let referrerName = null;
  if (req.session.pendingReferralCode) {
    const referrer = findUserByReferralCode(req.session.pendingReferralCode);
    if (referrer) referrerName = referrer.username;
  }
  res.render('landing', { blocks: salesBlocks, referrerName });
});

// ── Login ─────────────────────────────────────────────────────────────────────

app.get('/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  const expiredMsg = req.query.expired === '1'
    ? 'Din session har gått ut — logga in igen med ditt nya lösenord.'
    : null;
  let referrerName = null;
  if (req.session.pendingReferralCode) {
    const referrer = findUserByReferralCode(req.session.pendingReferralCode);
    if (referrer) referrerName = referrer.username;
  }
  res.render('login', {
    error:            expiredMsg,
    registerError:    null,
    success:          null,
    turnstileSiteKey: TURNSTILE_SITE_KEY,
    referrerName,
  });
});

app.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.render('login', {
      error: 'Fel användarnamn eller lösenord.',
      registerError: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
    });
  }

  // Läs returnTo INNAN regenerate — sessionen nollställs annars
  const returnTo = (isSafeReturnPath(req.session?.returnTo) ? req.session.returnTo : null);

  // Regenerate session ID to prevent session fixation attacks
  req.session.regenerate((err) => {
    if (err) return res.redirect('/login');
    req.session.userId    = user.id;
    req.session.username  = user.username;
    req.session.role      = user.role;
    req.session.pwVersion = user.pw_version || 0; // stored for session-invalidation after pw reset
    updateLastLogin(user.id);
    // Landa på deep-link om sådan sparades av requireLogin — annars dashboard
    res.redirect(returnTo || '/dashboard');
  });
});

app.post('/register', registerLimiter, async (req, res) => {
  const { username, email, password, confirmPassword, gdpr } = req.body;
  const turnstileToken = req.body['cf-turnstile-response'];

  // Verify Turnstile CAPTCHA (skip if no secret key configured)
  const turnstileSecret = process.env['TURNSTILE_SECRET_KEY'];
  if (turnstileSecret) {
    if (!turnstileToken) {
      return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
        registerError: 'Verifiera att du inte är en robot.' });
    }
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
    });
    const result = await verify.json();
    if (!result.success) {
      return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
        registerError: 'CAPTCHA-verifiering misslyckades. Försök igen.' });
    }
  }

  if (!username || !email || !password)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Fyll i alla fält.' });

  // Username: 3–30 chars, alphanumeric + underscore + hyphen only
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username.trim()))
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Användarnamnet måste vara 3–30 tecken och får bara innehålla bokstäver, siffror, _ och -.' });

  if (!gdpr)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Du måste godkänna vår integritetspolicy för att skapa ett konto.' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Ange en giltig e-postadress.' });

  if (password !== confirmPassword)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Lösenorden matchar inte.' });

  if (password.length < 8)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Lösenordet måste vara minst 8 tecken.' });

  if (password.length > 128)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Lösenordet får inte vara längre än 128 tecken.' });

  const result = createUser(username.trim(), email.trim(), password);
  if (!result.ok)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: result.error });

  // ── Referral-spårning: om sessionen har en pending ref, associera nu ──────
  try {
    const pendingRef = req.session.pendingReferralCode;
    if (pendingRef && result.userId) {
      const referrer = findUserByReferralCode(pendingRef);
      if (referrer && referrer.id !== result.userId) {
        setReferrerForUser(result.userId, referrer.id);
      }
      // Rensa oavsett — koden är förbrukad
      delete req.session.pendingReferralCode;
      delete req.session.referralCapturedAt;
    }
  } catch (refErr) {
    console.error('Referral attribution error:', refErr.message);
  }

  // ── Welcome email ──────────────────────────────────────────────────────────
  const baseUrl = process.env['APP_URL'] || 'https://manapp-production.up.railway.app';
  try {
    if (resend) {
      await resend.emails.send({
        from:    RESEND_FROM,
        to:      email.trim(),
        subject: `Välkommen, ${username.trim()}! Ditt konto är aktivt 🎯`,
        html: buildWelcomeEmail(username.trim(), baseUrl),
      });
    }
  } catch (emailErr) {
    console.error('Welcome email error:', emailErr.message);
  }

  // ── Auto-login: spara steg 1 av onboarding-friktion ───────────────────────
  // Industry standard — ingen mening att tvinga användaren att ange lösenordet direkt
  // efter de just satt det. Bumpar "öppnade block"-funnel från ~50% till ~80%+.
  const newUser = findUserById(result.userId);
  if (newUser) {
    req.session.regenerate((err) => {
      if (err) {
        return res.render('login', { error: null, registerError: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
          success: `Konto skapat! Logga in med ${username.trim()}.` });
      }
      req.session.userId    = newUser.id;
      req.session.username  = newUser.username;
      req.session.role      = newUser.role;
      req.session.pwVersion = newUser.pw_version || 0;
      updateLastLogin(newUser.id);
      // Redirect till första gratis-blocket direkt — omedelbart värde
      res.redirect('/learn/inledning?welcome=1');
    });
    return;
  }

  // Fallback om findUserById misslyckas
  res.render('login', { error: null, registerError: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
    success: `Konto skapat! Välkommen ${username.trim()} — logga in med ditt användarnamn.` });
});

// GET /register — shortcut that opens login page with register tab active
app.get('/register', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  res.render('login', {
    error: null,
    registerError: '__open_register__', // triggers tab switch in JS without showing error text
    success: null,
    turnstileSiteKey: TURNSTILE_SITE_KEY,
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ── Forgot password ───────────────────────────────────────────────────────────

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { error: null, success: null, csrfToken: generateCsrfToken(req) });
});

app.post('/forgot-password', resetLimiter, verifyCsrf, async (req, res) => {
  const { email } = req.body;
  const user = findUserByEmail(email?.trim().toLowerCase());

  // Always show success to prevent email enumeration
  if (!user) {
    return res.render('forgot-password', {
      error: null,
      success: 'Om e-postadressen finns i systemet har vi skickat en länk.',
      csrfToken: generateCsrfToken(req),
    });
  }

  const token   = createResetToken(user.id);
  const baseUrl = process.env['APP_URL'] || 'https://manapp-production.up.railway.app';
  const link    = `${baseUrl}/reset-password/${token}`;

  try {
    if (!resend) throw new Error('RESEND_API_KEY not configured');
    await resend.emails.send({
      from:    RESEND_FROM,
      to:      user.email,
      subject: 'Återställ ditt lösenord — Joakim Jaksen',
      html: buildPasswordResetEmail(user.username, link),
    });
  } catch (err) {
    console.error('Resend error:', err.message);
  }

  res.render('forgot-password', {
    error: null,
    success: 'Om e-postadressen finns i systemet har vi skickat en länk.',
    csrfToken: generateCsrfToken(req),
  });
});

app.get('/reset-password/:token', (req, res) => {
  const record = findValidResetToken(req.params.token);
  if (!record) {
    return res.render('reset-password', {
      token: null, error: 'Länken är ogiltig eller har gått ut.', success: null, csrfToken: null,
    });
  }
  res.render('reset-password', { token: req.params.token, error: null, success: null, csrfToken: generateCsrfToken(req) });
});

app.post('/reset-password/:token', verifyCsrf, async (req, res) => {
  const { password, confirmPassword } = req.body;
  const record = findValidResetToken(req.params.token);

  if (!record) {
    return res.render('reset-password', {
      token: null, error: 'Länken är ogiltig eller har gått ut.', success: null, csrfToken: null,
    });
  }
  if (!password || password.length < 8) {
    return res.render('reset-password', {
      token: req.params.token, error: 'Lösenordet måste vara minst 8 tecken.', success: null, csrfToken: generateCsrfToken(req),
    });
  }
  if (password.length > 128) {
    return res.render('reset-password', {
      token: req.params.token, error: 'Lösenordet får inte vara längre än 128 tecken.', success: null, csrfToken: generateCsrfToken(req),
    });
  }
  if (password !== confirmPassword) {
    return res.render('reset-password', {
      token: req.params.token, error: 'Lösenorden matchar inte.', success: null, csrfToken: generateCsrfToken(req),
    });
  }

  updateUserPassword(record.user_id, password);
  deleteResetToken(req.params.token);

  res.render('login', {
    error: null, registerError: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
    success: 'Lösenordet är återställt! Logga in med ditt nya lösenord.',
  });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

app.get('/dashboard', requireLogin, (req, res) => {
  const notes       = getNotesByUserId(req.session.userId);
  const progress    = getBlockProgress(req.session.userId);
  const completed   = getCompletedBlockCount(req.session.userId);
  const deleteError = req.query.deleteError === '1';

  // Peak-intent conversion: free-användare som klarat båda gratis-blocken
  // är maximalt varma — har bevisat commitment, har sett värdet, nått grinden.
  // Använd state-flagga för att driva riktad upgrade-CTA.
  const freeTierCompleted =
    req.session.role === 'free' &&
    FREE_BLOCK_IDS.every(id => progress[id] && progress[id].completed === 1);

  // Personaliserad pedagogik: 2–3 kort baserat på användarens learning state
  const learningState   = getUserLearningState(req.session.userId);
  const recommendations = generateRecommendations(
    learningState, salesBlocks, FREE_BLOCK_IDS, req.session.role
  );

  // Gamification — beräkna stats, kolla level-up, generera dagens challenge
  const gamEnabled = isGamificationEnabled(req.session.userId);
  let stats = null, levelUp = null, dailyChallenge = null, challengeCompleted = false;

  if (gamEnabled) {
    stats = computeStatsForUser(req.session.userId);
    const lu = checkLevelUp(req.session.userId, stats);
    if (lu.leveledUp) {
      levelUp = gamification.getLevelUpMessage(lu.newLevel);
      levelUp.levelId = lu.newLevel.id;
      levelUp.levelName = lu.newLevel.name;
    }

    // Dagens challenge
    const today = new Date().toISOString().slice(0, 10);
    let row = getDailyChallenge(req.session.userId, today);
    if (!row) {
      const chal = gamification.selectDailyChallenge({ actions: getUserActions(req.session.userId, 50) }, today);
      saveDailyChallenge(req.session.userId, today, chal);
      row = getDailyChallenge(req.session.userId, today);
    }
    if (row) {
      try {
        dailyChallenge = JSON.parse(row.challenge_data);
        challengeCompleted = !!row.completed_at;
        // Säkerhet: kolla igen om den är uppfylld nu (race-säkert)
        if (!challengeCompleted) {
          const todayActions = getActionsToday(req.session.userId);
          if (gamification.isChallengeCompleted(dailyChallenge, todayActions)) {
            completeDailyChallenge(req.session.userId, today);
            challengeCompleted = true;
          }
        }
      } catch (_) {}
    }
  }

  res.render('dashboard', {
    username:   req.session.username,
    role:       req.session.role,
    notes,
    progress,
    completed,
    totalBlocks:  salesBlocks.length,
    deleteError,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
    recommendations,
    freeTierCompleted,
    // Gamification
    gamEnabled,
    stats,
    levelUp,
    dailyChallenge,
    challengeCompleted,
    csrfToken:    generateCsrfToken(req),
  });
});

app.post('/notes', requireLogin, noteLimiter, verifyCsrf, (req, res) => {
  const content = (req.body.content || '').trim().slice(0, 2000); // max 2000 chars
  if (content) {
    const saved = createNote(req.session.userId, content);
    if (saved === false) return res.redirect('/dashboard?note_limit=1');
  }
  res.redirect('/dashboard?note_saved=1');
});

app.post('/notes/:id/delete', requireLogin, noteDeleteLimiter, verifyCsrf, (req, res) => {
  deleteNote(Number(req.params.id), req.session.userId);
  res.redirect('/dashboard?note_deleted=1');
});

// ── Learn ─────────────────────────────────────────────────────────────────────

app.get('/learn', requireLogin, (req, res) => {
  const progress = getBlockProgress(req.session.userId);

  // Beräkna mastery-status per block (för att särskilja läst / prov / bemästrat)
  const learningState = getUserLearningState(req.session.userId);
  const blockStatus = {};
  salesBlocks.forEach(b => {
    const prog = learningState.progressByBlock[b.id];
    const hasRoleplays   = !!(learningState.roleplaysByBlock[b.id] && learningState.roleplaysByBlock[b.id].length);
    const hasMissionDone = !!(learningState.missionByBlock[b.id] && learningState.missionByBlock[b.id].completed_at);
    const hasReflections = !!(learningState.reflectionsByBlock[b.id] && learningState.reflectionsByBlock[b.id].length);
    const theoryDone     = !!(prog && prog.completed);
    const stepsDone = [theoryDone, hasRoleplays, hasMissionDone, hasReflections].filter(Boolean).length;
    let status = 'untouched';
    if (stepsDone === 4) status = 'mastered';
    else if (theoryDone && stepsDone >= 2) status = 'advanced';
    else if (theoryDone) status = 'quiz_done';
    else if (stepsDone > 0 || (prog && (prog.quiz_score !== null))) status = 'in_progress';
    blockStatus[b.id] = {
      status,
      stepsDone,
      quizScore: prog ? prog.quiz_score : null,
      quizTotal: prog ? prog.quiz_total : null,
    };
  });

  res.render('learn', {
    username:     req.session.username,
    role:         req.session.role,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
    progress,
    blockStatus,
  });
});

app.get('/learn/:id', requireLogin, (req, res) => {
  const block      = salesBlocks.find(b => b.id === req.params.id);
  if (!block) return res.redirect('/learn');

  const isPremium  = !FREE_BLOCK_IDS.includes(block.id);
  const hasAccess  = isPremiumOrHigher(req.session.role);
  const isTeaser   = isPremium && !hasAccess;

  const progress   = getBlockProgress(req.session.userId);
  const blockProg  = progress[block.id] || {};

  // Estimate reading time (200 wpm average)
  const wordCount  = (block.theory || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const readTime   = Math.max(1, Math.round(wordCount / 200));

  // 4-step journey status (only for users with access)
  const journey = hasAccess || FREE_BLOCK_IDS.includes(block.id)
    ? getJourneyStatus(req.session.userId, block.id)
    : null;

  // Subtil coach-hint baserat på användarens historia i blocket
  let coachHint = null;
  if (journey) {
    const learningState = getUserLearningState(req.session.userId);
    coachHint = generateBlockCoachHint(learningState, block.id, block);
  }

  // Peak-intent: free-user som precis klarat båda gratis-blocken
  const freeTierCompleted =
    req.session.role === 'free' &&
    FREE_BLOCK_IDS.every(id => progress[id] && progress[id].completed === 1);

  // "Just klarade sista gratis-blocket"-detektering: visa milestone-firande
  // när de är på block 2 OCH just har fått quizen godkänd (alla rätt eller >= 60%).
  const isLastFreeBlock = block.id === FREE_BLOCK_IDS[FREE_BLOCK_IDS.length - 1];
  const justUnlockedFreeTier = freeTierCompleted && isLastFreeBlock &&
    blockProg.quiz_score !== null && blockProg.quiz_total > 0 &&
    (blockProg.quiz_score / blockProg.quiz_total) >= 0.6;

  res.render('block', {
    username:     req.session.username,
    role:         req.session.role,
    block,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
    isTeaser,
    blockProg,
    readTime,
    journey,
    coachHint,
    welcome:            req.query.welcome === '1',
    freeTierCompleted,
    justUnlockedFreeTier,
    csrfToken:    generateCsrfToken(req),
  });
});

// ── 4-step journey sub-views ─────────────────────────────────────────────────

function resolveBlock(req, res, opts = {}) {
  const block = salesBlocks.find(b => b.id === req.params.id);
  if (!block) { res.redirect('/learn'); return null; }
  const isPremiumBlock = !FREE_BLOCK_IDS.includes(block.id);
  const isPremiumUser  = isPremiumOrHigher(req.session.role);
  // Block-level access: teaser rule (free blocks are open to all)
  if (isPremiumBlock && !isPremiumUser) { res.redirect('/learn/' + block.id); return null; }
  // Feature-level: roleplay uses AI — always requires premium
  if (opts.requiresPremium && !isPremiumUser) { res.redirect('/upgrade'); return null; }
  return block;
}

// Snabbversion — 2-min TL;DR (fritt tillgänglig för alla med block-access)
app.get('/learn/:id/snabb', requireLogin, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  const journey = getJourneyStatus(req.session.userId, block.id);
  res.render('block-snabb', {
    username: req.session.username,
    role:     req.session.role,
    block,
    journey,
  });
});

// Öva — lista av rollspel (Steg 2) — AI-funktion, kräver premium
app.get('/learn/:id/ova', requireLogin, (req, res) => {
  const block = resolveBlock(req, res, { requiresPremium: true });
  if (!block) return;
  const journey  = getJourneyStatus(req.session.userId, block.id);
  const history  = getRoleplaysForBlock(req.session.userId, block.id);
  const completedIds = new Set(history.map(h => h.roleplay_id));
  res.render('block-ova', {
    username: req.session.username,
    role:     req.session.role,
    block,
    journey,
    completedIds,
  });
});

// Öva — enskilt rollspel-chat (Jocke som kund) — AI, premium
app.get('/learn/:id/ova/:rpid', requireLogin, (req, res) => {
  const block = resolveBlock(req, res, { requiresPremium: true });
  if (!block) return;
  const rp = (block.roleplays || []).find(r => r.id === req.params.rpid);
  if (!rp) return res.redirect('/learn/' + block.id + '/ova');
  res.render('block-ova-chat', {
    username: req.session.username,
    role:     req.session.role,
    block,
    roleplay: rp,
    csrfToken: generateCsrfToken(req),
  });
});

// Uppdrag — fältmission (Steg 3)
app.get('/learn/:id/uppdrag', requireLogin, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  const journey = getJourneyStatus(req.session.userId, block.id);
  const mission = getMissionForBlock(req.session.userId, block.id);
  res.render('block-uppdrag', {
    username: req.session.username,
    role:     req.session.role,
    block,
    journey,
    mission,
    csrfToken: generateCsrfToken(req),
  });
});

// Reflektion (Steg 4)
app.get('/learn/:id/reflektion', requireLogin, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  const journey = getJourneyStatus(req.session.userId, block.id);
  const reflections = getReflectionsForBlock(req.session.userId, block.id);

  // Smart "nästa block"-förslag om hela 4-stegs-resan är klar
  let nextSuggestion = null;
  if (journey.fullyMastered) {
    const learningState = getUserLearningState(req.session.userId);
    nextSuggestion = suggestNextBlock(
      learningState, salesBlocks, block.id, FREE_BLOCK_IDS, req.session.role
    );
  }

  res.render('block-reflektion', {
    username: req.session.username,
    role:     req.session.role,
    block,
    journey,
    reflections,
    nextSuggestion,
    csrfToken: generateCsrfToken(req),
  });
});

// ── Mission actions ──────────────────────────────────────────────────────────

app.post('/learn/:id/uppdrag/start', requireLogin, verifyCsrf, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  startMission(req.session.userId, block.id);
  res.redirect('/learn/' + block.id + '/uppdrag');
});

app.post('/learn/:id/uppdrag/progress', requireLogin, verifyCsrf, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  const p = Math.max(0, Math.min(99, parseInt(req.body.progress) || 0));
  updateMissionProgress(req.session.userId, block.id, p);
  res.redirect('/learn/' + block.id + '/uppdrag');
});

app.post('/learn/:id/uppdrag/klar', requireLogin, verifyCsrf, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  const reflection = (req.body.reflection || '').slice(0, 4000);
  completeMission(req.session.userId, block.id, reflection);
  res.redirect('/learn/' + block.id + '/uppdrag');
});

// ── Reflection save ──────────────────────────────────────────────────────────

app.post('/learn/:id/reflektion/spara', requireLogin, verifyCsrf, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  const promptIdx = parseInt(req.body.promptIdx);
  const response  = (req.body.response || '').trim().slice(0, 4000);
  if (isNaN(promptIdx) || !response) {
    return res.redirect('/learn/' + block.id + '/reflektion');
  }
  saveReflection(req.session.userId, block.id, promptIdx, response);
  res.redirect('/learn/' + block.id + '/reflektion');
});

// ── Roleplay completion ──────────────────────────────────────────────────────

app.post('/learn/:id/ova/:rpid/klar', requireLogin, verifyCsrf, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  const rp = (block.roleplays || []).find(r => r.id === req.params.rpid);
  if (!rp) return res.redirect('/learn/' + block.id + '/ova');
  const turnCount = parseInt(req.body.turnCount) || 0;
  recordRoleplayCompletion(req.session.userId, block.id, rp.id, turnCount);
  res.redirect('/learn/' + block.id + '/ova');
});

// ── Quiz result — save score to DB ───────────────────────────────────────────

app.post('/quiz-result', requireLogin, quizLimiter, verifyCsrf, (req, res) => {
  const { blockId, score, total } = req.body;
  if (!blockId || score === undefined || total === undefined) return res.json({ ok: false });
  const scoreNum = parseInt(score);
  const totalNum = parseInt(total);
  // Sanity-check: score 0–totalNum, total must be positive and reasonable
  if (isNaN(scoreNum) || isNaN(totalNum) || totalNum <= 0 || totalNum > 50 || scoreNum < 0 || scoreNum > totalNum) {
    return res.json({ ok: false });
  }
  const block = salesBlocks.find(b => b.id === blockId);
  if (!block) return res.json({ ok: false });
  // Allow: free blocks (accessible to all) OR premium/admin users
  const hasAccess = FREE_BLOCK_IDS.includes(block.id) || isPremiumOrHigher(req.session.role);
  if (!hasAccess) return res.json({ ok: false });
  saveQuizResult(req.session.userId, blockId, scoreNum, totalNum);
  res.json({ ok: true });
});

// ── Retention: cron digest + unsubscribe ───────────────────────────────────

/**
 * Huvudsakligt cron-endpoint. Anropas av Railway Cron (eller liknande) varje söndag.
 * Kan även anropas manuellt av admin. Skyddas via CRON_SECRET.
 *
 * Accepterar: ?key=<CRON_SECRET>&dry=1 för dry-run (ingen sändning)
 *
 * Bearbetar alla users:
 *  - Digest: alla aktiva + opt-in:ade, max 1/6 dagar
 *  - Re-engagement: 14+ dagar inaktiva (ersätter digest för dem)
 */
app.get('/cron/digest', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.query.key !== cronSecret) {
    return res.status(403).json({ ok: false, error: 'Invalid cron key' });
  }
  const dryRun = req.query.dry === '1';
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  const allUsers = getAllUsersWithEmail();
  const report = { total: allUsers.length, sent: 0, reengagement: 0, skipped: 0, failed: 0, errors: [] };

  for (const user of allUsers) {
    try {
      const prefs = gamification.parsePreferences(getUserPreferences(user.id));
      const stats = computeStatsForUser(user.id);
      const state = getUserLearningState(user.id);

      // Kolla re-engagement först (tar prio över digest)
      const daysInactive = emails.isReengagementEligible(user, prefs, state.lastActivity);
      if (daysInactive) {
        const unsubToken = emails.createUnsubscribeToken(user.id);
        const unsubUrl = `${baseUrl}/unsubscribe/${unsubToken}`;
        const lastBlockId = state.lastActivity ? (() => {
          // Hitta senaste blocket användaren rört vid
          const allBlockActivity = [];
          Object.values(state.progressByBlock).forEach(p => { if (p.completed_at) allBlockActivity.push({ id: p.block_id, ts: new Date(p.completed_at).getTime() }); });
          Object.values(state.missionByBlock).forEach(m => { const ts = new Date(m.completed_at || m.started_at).getTime(); if (!isNaN(ts)) allBlockActivity.push({ id: m.block_id, ts }); });
          Object.values(state.roleplaysByBlock).forEach(arr => arr.forEach(r => { allBlockActivity.push({ id: r.block_id, ts: new Date(r.completed_at).getTime() }); }));
          Object.values(state.reflectionsByBlock).forEach(arr => arr.forEach(r => { allBlockActivity.push({ id: r.block_id, ts: new Date(r.created_at).getTime() }); }));
          if (!allBlockActivity.length) return null;
          allBlockActivity.sort((a, b) => b.ts - a.ts);
          return allBlockActivity[0].id;
        })() : null;
        const lastBlock = lastBlockId ? salesBlocks.find(b => b.id === lastBlockId) : null;

        const mail = emails.buildReengagement({
          username: user.username,
          daysInactive,
          stats,
          lastBlockTitle: lastBlock ? lastBlock.title : null,
          lastBlockId,
          baseUrl,
          unsubscribeUrl: unsubUrl,
        });

        if (!dryRun) {
          if (!resend) throw new Error('Resend not configured');
          await resend.emails.send({
            from: RESEND_FROM,
            to: user.email,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
          });
          prefs.last_reengagement_sent_at = new Date().toISOString();
          setUserPreferences(user.id, gamification.serializePreferences(prefs));
        }
        report.reengagement++;
        continue;
      }

      // Vanlig digest
      if (!emails.isDigestEligible(user, prefs)) {
        report.skipped++;
        continue;
      }

      // Beräkna veckans diff (XP + blocks touched senaste 7 dagar)
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentActivity = new Set();
      const addIfRecent = (ts, blockId) => {
        if (!ts || !blockId) return;
        if (new Date(ts).getTime() >= weekAgo) recentActivity.add(blockId);
      };
      Object.values(state.progressByBlock).forEach(p => addIfRecent(p.completed_at, p.block_id));
      Object.values(state.missionByBlock).forEach(m => { addIfRecent(m.started_at, m.block_id); addIfRecent(m.completed_at, m.block_id); });
      Object.values(state.roleplaysByBlock).forEach(arr => arr.forEach(r => addIfRecent(r.completed_at, r.block_id)));
      Object.values(state.reflectionsByBlock).forEach(arr => arr.forEach(r => addIfRecent(r.created_at, r.block_id)));
      const blocksTouched = recentActivity.size;

      // Dagens/veckans challenge
      const today = new Date().toISOString().slice(0, 10);
      const challengeRow = getDailyChallenge(user.id, today);
      let dailyChallenge = null;
      if (challengeRow) {
        try { dailyChallenge = JSON.parse(challengeRow.challenge_data); } catch (_) {}
      } else {
        dailyChallenge = gamification.selectDailyChallenge({ actions: getUserActions(user.id, 50) }, today);
      }

      const unsubToken = emails.createUnsubscribeToken(user.id);
      const unsubUrl = `${baseUrl}/unsubscribe/${unsubToken}`;
      const mail = emails.buildWeeklyDigest({
        username: user.username,
        stats,
        weekData: { blocksTouched, xpGained: 0 }, // xpGained svårt utan historik — skippat för nu
        baseUrl,
        unsubscribeUrl: unsubUrl,
        dailyChallenge,
      });

      if (!dryRun) {
        if (!resend) throw new Error('Resend not configured');
        await resend.emails.send({
          from: RESEND_FROM,
          to: user.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
        });
        prefs.last_digest_sent_at = new Date().toISOString();
        setUserPreferences(user.id, gamification.serializePreferences(prefs));
      }
      report.sent++;
    } catch (err) {
      report.failed++;
      report.errors.push({ userId: user.id, error: err.message });
      console.error('Digest error for user', user.id, err.message);
    }
  }

  res.json({ ok: true, dryRun, ...report });
});

/**
 * Admin-endpoint: skicka test-digest till inloggad admin själv.
 * Bypass CRON_SECRET eftersom vi är inloggad admin — säker route.
 */
app.get('/admin/test-digest', requireLogin, requireAdmin, async (req, res) => {
  const mode = req.query.type === 'reengagement' ? 'reengagement' : 'digest';
  const dryRun = req.query.dry === '1';
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const user = findUserById(req.session.userId);
  if (!user || !user.email) {
    return res.status(400).send('<pre>Admin-kontot saknar registrerad e-post. Sätt en i /account först.</pre>');
  }

  try {
    const prefs = gamification.parsePreferences(getUserPreferences(user.id));
    const stats = computeStatsForUser(user.id);
    const state = getUserLearningState(user.id);
    const unsubToken = emails.createUnsubscribeToken(user.id);
    const unsubUrl = `${baseUrl}/unsubscribe/${unsubToken}`;

    let mail;
    if (mode === 'reengagement') {
      mail = emails.buildReengagement({
        username: user.username,
        daysInactive: 14,
        stats,
        lastBlockTitle: 'Tonfall & Psykologisk Påverkan',
        lastBlockId: 'tonfall',
        baseUrl,
        unsubscribeUrl: unsubUrl,
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const challengeRow = getDailyChallenge(user.id, today);
      let dailyChallenge = null;
      if (challengeRow) { try { dailyChallenge = JSON.parse(challengeRow.challenge_data); } catch (_) {} }
      else dailyChallenge = gamification.selectDailyChallenge({ actions: getUserActions(user.id, 50) }, today);

      mail = emails.buildWeeklyDigest({
        username: user.username,
        stats,
        weekData: { blocksTouched: 3, xpGained: 0 },
        baseUrl,
        unsubscribeUrl: unsubUrl,
        dailyChallenge,
      });
    }

    if (dryRun) {
      // Rendera mejlet direkt i browsern för preview
      res.send(`
        <div style="background:#0f172a;padding:1rem;color:#94a3b8;font-family:system-ui;">
          <p><strong>DRY RUN — inget skickat.</strong> Detta skulle mailas till: ${user.email}</p>
          <p><strong>Subject:</strong> ${mail.subject}</p>
          <p><strong>Type:</strong> ${mode}</p>
          <hr style="border-color:rgba(255,255,255,0.1);">
        </div>
        ${mail.html}
      `);
      return;
    }

    if (!resend) {
      return res.status(500).send('<pre>Resend not configured (RESEND_API_KEY saknas)</pre>');
    }

    await resend.emails.send({
      from: RESEND_FROM,
      to: user.email,
      subject: `[TEST] ${mail.subject}`,
      html: mail.html,
      text: mail.text,
      headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
    });

    res.send(`
      <div style="background:#0f172a;padding:2rem;color:#f1f5f9;font-family:system-ui;text-align:center;min-height:100vh;box-sizing:border-box;">
        <div style="max-width:480px;margin:3rem auto;padding:2rem;background:#1e293b;border:1px solid rgba(16,185,129,0.3);border-radius:12px;">
          <h1 style="color:#34d399;">✓ Test-mejl skickat</h1>
          <p>Mejlet skickades till <strong>${user.email}</strong></p>
          <p style="color:#94a3b8;font-size:0.9rem;">Typ: ${mode}. Ämne: "${mail.subject}"</p>
          <p><a href="/admin" style="color:#a5b4fc;">← Tillbaka till Admin</a></p>
        </div>
      </div>
    `);
  } catch (err) {
    console.error('Test digest error:', err);
    res.status(500).send(`<pre style="color:#ef4444;padding:2rem;">Error: ${err.message}</pre>`);
  }
});

/**
 * Unsubscribe-endpoint. Token-baserat, kräver ingen inloggning.
 */
app.get('/unsubscribe/:token', (req, res) => {
  const userId = emails.verifyUnsubscribeToken(req.params.token);
  if (!userId) {
    return res.status(400).send(`
      <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Ogiltig länk</title>
      <style>body{font-family:system-ui;background:#0f172a;color:#cbd5e1;padding:2rem;text-align:center;}
      .w{max-width:480px;margin:3rem auto;padding:2rem;background:#1e293b;border-radius:12px;}</style></head>
      <body><div class="w"><h1>Ogiltig länk</h1><p>Denna avprenumerationslänk är ogiltig eller har gått ut.</p>
      <p><a href="/installningar" style="color:#a5b4fc;">Öppna inställningarna</a> för att hantera mejl-preferenser där.</p></div></body></html>
    `);
  }

  const prefs = gamification.parsePreferences(getUserPreferences(userId));
  prefs.email_retention = false;
  setUserPreferences(userId, gamification.serializePreferences(prefs));

  res.send(`
    <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Avprenumererad</title>
    <style>body{font-family:system-ui;background:#0f172a;color:#cbd5e1;padding:2rem;text-align:center;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;}
    .w{max-width:480px;padding:2.5rem;background:linear-gradient(145deg,#1e293b,#0f172a);border:1px solid rgba(16,185,129,0.3);border-radius:16px;}
    h1{color:#34d399;margin:0 0 0.75rem;} p{line-height:1.6;color:#94a3b8;}
    a{color:#a5b4fc;text-decoration:none;display:inline-block;margin-top:1rem;padding:0.6rem 1.2rem;background:rgba(99,102,241,0.15);border-radius:8px;}</style></head>
    <body><div class="w"><h1>✓ Avprenumererad</h1>
    <p>Du kommer inte längre få retention-mejl från Joakim Jaksens Säljutbildning.</p>
    <p style="font-size:0.9rem;color:#64748b;">Du får fortfarande kontohantering (lösenordsreset, kvitton). Inga marknadsföringsmejl.</p>
    <a href="/installningar">Ändra i inställningarna</a></div></body></html>
  `);
});

// ── /mina-framsteg/bevis/:level — shareable nivå-bevis ─────────────────────

// Hjälpare: kolla om användaren har uppnått en viss nivå
function hasAchievedLevel(userId, levelId) {
  const stats = computeStatsForUser(userId);
  return stats.level.current.id >= levelId;
}

// ── Publik verifierbar URL för certifikat (för LinkedIn-delning) ───────────
// Format: /bevis/<base64url(userId.levelId.timestamp.sig)>
// HMAC-signerat med SESSION_SECRET — kan inte förfalskas.
// (crypto-modulen är redan require:ad högre upp)

function getCertSecret() {
  return process.env.SESSION_SECRET || process.env.CERT_SECRET || 'dev-fallback';
}

function createPublicCertToken(userId, levelId) {
  const payload = `${userId}.${levelId}.${Math.floor(Date.now() / 1000)}`;
  const sig = crypto.createHmac('sha256', getCertSecret()).update(payload).digest('hex').slice(0, 16);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function verifyPublicCertToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 4) return null;
    const [userId, levelId, ts, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', getCertSecret()).update(`${userId}.${levelId}.${ts}`).digest('hex').slice(0, 16);
    if (sig.length !== expectedSig.length) return null;
    let ok = 0;
    for (let i = 0; i < sig.length; i++) ok |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    if (ok !== 0) return null;
    // Token är evig (ingen expiry — certifikatet ska kunna delas länge)
    return { userId: parseInt(userId), levelId: parseInt(levelId), issuedAt: parseInt(ts) };
  } catch (_) {
    return null;
  }
}

// Publik cert-route — ingen login krävs
app.get('/bevis/:token', (req, res) => {
  const verified = verifyPublicCertToken(req.params.token);
  if (!verified) {
    return res.status(404).render('bevis-publik', {
      valid: false,
      error: 'Ogiltig eller skadad certifikat-länk.',
    });
  }

  const { userId, levelId, issuedAt } = verified;
  const user = findUserById(userId);
  if (!user) {
    return res.status(404).render('bevis-publik', {
      valid: false,
      error: 'Användaren finns inte längre.',
    });
  }

  const level = gamification.LEVELS.find(l => l.id === levelId);
  if (!level) {
    return res.status(404).render('bevis-publik', { valid: false, error: 'Ogiltig nivå.' });
  }

  // Verifiera FORTFARANDE gäller — dvs användaren har inte nerdegraderats under nivån
  const stats = computeStatsForUser(userId);
  const stillValid = stats.level.current.id >= levelId;

  res.render('bevis-publik', {
    valid: true,
    stillValid,
    level,
    username: user.username,
    currentLevel: stats.level.current,
    issuedAt: new Date(issuedAt * 1000),
    xp: stats.xp,
    totalBlocksMastered: stats.totalBlocksMastered,
  });
});

// Route för att GENERERA publik URL för sitt eget certifikat
app.get('/mina-framsteg/bevis/:level/publik-url', requireLogin, (req, res) => {
  const levelId = parseInt(req.params.level);
  if (!levelId || levelId < 2 || levelId > 5) return res.redirect('/mina-framsteg');
  if (!hasAchievedLevel(req.session.userId, levelId)) return res.redirect('/mina-framsteg');

  const token = createPublicCertToken(req.session.userId, levelId);
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const publicUrl = `${baseUrl}/bevis/${token}`;

  res.redirect(publicUrl);
});

// Rendera en bild-som-html-version av beviset (för visning + screenshot)
app.get('/mina-framsteg/bevis/:level', requireLogin, (req, res) => {
  const levelId = parseInt(req.params.level);
  if (!levelId || levelId < 2 || levelId > 5) return res.redirect('/mina-framsteg');
  if (!hasAchievedLevel(req.session.userId, levelId)) return res.redirect('/mina-framsteg');

  const level = gamification.LEVELS.find(l => l.id === levelId);
  if (!level) return res.redirect('/mina-framsteg');

  const stats = computeStatsForUser(req.session.userId);

  res.render('bevis', {
    username: req.session.username,
    level,
    stats,
    date: new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }),
  });
});

// SVG-download-endpoint för certifikatet
app.get('/mina-framsteg/bevis/:level.svg', requireLogin, (req, res) => {
  const levelId = parseInt(req.params.level);
  if (!levelId || levelId < 2 || levelId > 5) return res.redirect('/mina-framsteg');
  if (!hasAchievedLevel(req.session.userId, levelId)) return res.redirect('/mina-framsteg');

  const level = gamification.LEVELS.find(l => l.id === levelId);
  if (!level) return res.redirect('/mina-framsteg');

  const stats = computeStatsForUser(req.session.userId);
  const name = req.session.username || 'Säljare';
  const date = new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });

  // Escape XML special chars
  const esc = s => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

  // Gradient per nivå
  const gradients = {
    2: { c1: '#6366f1', c2: '#8b5cf6', accent: '#a5b4fc' }, // Operator — indigo/violet
    3: { c1: '#10b981', c2: '#059669', accent: '#34d399' }, // Closer — emerald
    4: { c1: '#f59e0b', c2: '#d97706', accent: '#fbbf24' }, // Elite — amber/gold
    5: { c1: '#ec4899', c2: '#8b5cf6', accent: '#f9a8d4' }, // Apex — pink/violet (top-tier)
  };
  const g = gradients[levelId] || gradients[2];

  // 1200x630 — perfect LinkedIn/Twitter preview ratio
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${g.c1}"/>
      <stop offset="100%" stop-color="${g.c2}"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="30" y="30" width="1140" height="570" fill="none" stroke="url(#accent)" stroke-width="2" rx="20" opacity="0.5"/>
  <rect x="50" y="50" width="1100" height="530" fill="rgba(255,255,255,0.02)" rx="16"/>

  <!-- Top accent line -->
  <line x1="100" y1="90" x2="300" y2="90" stroke="url(#accent)" stroke-width="3" stroke-linecap="round"/>
  <text x="100" y="130" fill="${g.accent}" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="4">JOAKIM JAKSENS SÄLJUTBILDNING</text>
  <text x="100" y="165" fill="#94a3b8" font-family="Arial, sans-serif" font-size="18" letter-spacing="2">BEVIS PÅ UPPNÅDD NIVÅ</text>

  <!-- Main level name -->
  <text x="100" y="300" fill="url(#accent)" font-family="Arial, sans-serif" font-size="120" font-weight="800" filter="url(#glow)">${esc(level.name)}</text>

  <!-- Divider -->
  <line x1="100" y1="330" x2="400" y2="330" stroke="url(#accent)" stroke-width="2" stroke-linecap="round" opacity="0.8"/>

  <!-- Level number + XP -->
  <text x="100" y="380" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="22">Nivå ${level.id} av 5  ·  ${stats.xp} XP  ·  ${stats.totalBlocksMastered}/20 block bemästrade</text>

  <!-- Signalizes -->
  <text x="100" y="440" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="20" font-style="italic">
    <tspan x="100" dy="0">${esc(level.signalizes).length > 90 ? esc(level.signalizes).slice(0, 90).replace(/(.{90}\s)/, '$1\n').split('\n').map((line, i) => `<tspan x="100" dy="${i === 0 ? 0 : 28}">${line}</tspan>`).join('') : esc(level.signalizes)}</tspan>
  </text>

  <!-- Recipient -->
  <text x="100" y="520" fill="#64748b" font-family="Arial, sans-serif" font-size="16" letter-spacing="2">BEVIS FÖR</text>
  <text x="100" y="560" fill="#f1f5f9" font-family="Arial, sans-serif" font-size="36" font-weight="700">${esc(name)}</text>

  <!-- Date — right side -->
  <text x="1100" y="520" fill="#64748b" font-family="Arial, sans-serif" font-size="16" letter-spacing="2" text-anchor="end">UPPNÅDD</text>
  <text x="1100" y="560" fill="#f1f5f9" font-family="Arial, sans-serif" font-size="22" text-anchor="end">${esc(date)}</text>

  <!-- Signature-ish branding -->
  <text x="1100" y="130" fill="#94a3b8" font-family="Arial, sans-serif" font-size="14" text-anchor="end">joakimjaksen.se</text>
</svg>`;

  if (req.query.download === '1') {
    const filename = `bevis-${level.name.toLowerCase()}-${req.session.username}.svg`.replace(/[^a-z0-9.-]/gi, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.send(svg);
});

// ── /sok — globalsök över block + glossary ──────────────────────────────────

function stripHtml(s) { return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

function highlightMatch(text, query) {
  if (!query) return text;
  const pattern = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return text.replace(pattern, '<mark>$1</mark>');
}

function extractSnippet(text, query, maxLen = 180) {
  const plain = stripHtml(text);
  const lower = plain.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return plain.slice(0, maxLen) + (plain.length > maxLen ? '…' : '');
  const start = Math.max(0, idx - 60);
  const end = Math.min(plain.length, idx + q.length + 100);
  let snippet = plain.slice(start, end);
  if (start > 0) snippet = '… ' + snippet;
  if (end < plain.length) snippet += ' …';
  return snippet;
}

app.get('/sok', requireLogin, (req, res) => {
  const query = (req.query.q || '').trim().slice(0, 100);
  let blockResults = [];
  let glossaryResults = [];

  if (query.length >= 2) {
    const q = query.toLowerCase();

    // Sök i block — titel, subtitel, teori (stripped), teaser
    blockResults = salesBlocks.map((b, i) => {
      const title      = b.title.toLowerCase();
      const subtitle   = (b.subtitle || '').toLowerCase();
      const theory     = stripHtml(b.theory || '').toLowerCase();
      const teaser     = stripHtml(b.teaser || '').toLowerCase();

      // Scoring: title match = 10, subtitle = 5, teaser = 3, theory = 1
      let score = 0;
      if (title.includes(q))    score += 10;
      if (subtitle.includes(q)) score += 5;
      if (teaser.includes(q))   score += 3;
      if (theory.includes(q))   score += 1;

      // Sök även i quiz, roleplays, mission
      const quizHit = (b.quiz || []).some(q2 => q2.q.toLowerCase().includes(q));
      if (quizHit) score += 2;
      const rpHit = (b.roleplays || []).some(r => (r.title + ' ' + r.goal + ' ' + r.scenario).toLowerCase().includes(q));
      if (rpHit) score += 2;
      const missionHit = b.mission && (b.mission.title + ' ' + b.mission.description).toLowerCase().includes(q);
      if (missionHit) score += 2;

      if (score === 0) return null;
      return {
        block: b,
        index: i + 1,
        score,
        snippet: extractSnippet(b.theory, query),
        hits: {
          title: title.includes(q),
          subtitle: subtitle.includes(q),
          theory: theory.includes(q),
          quiz: quizHit,
          roleplay: rpHit,
          mission: missionHit,
        },
      };
    }).filter(Boolean).sort((a, b) => b.score - a.score);

    // Sök i glossary
    glossaryResults = glossaryTerms.filter(t =>
      t.term.toLowerCase().includes(q) ||
      t.definition.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    ).sort((a, b) => {
      const aName = a.term.toLowerCase().indexOf(q) === 0 ? 0 : 1;
      const bName = b.term.toLowerCase().indexOf(q) === 0 ? 0 : 1;
      return aName - bName;
    });
  }

  res.render('sok', {
    username: req.session.username,
    role:     req.session.role,
    query,
    blockResults,
    glossaryResults,
    highlightMatch,
  });
});

// ── /mina-framsteg — full progression-sida ────────────────────────────────

app.get('/mina-framsteg', requireLogin, (req, res) => {
  const stats = computeStatsForUser(req.session.userId);
  const state = getUserLearningState(req.session.userId);
  const actions = getUserActions(req.session.userId, 500);
  const prefs = getUserPrefsObj(req.session.userId);

  // Bygg 90-dagars aktivitets-heatmap
  const heatmap = [];
  const today = new Date();
  // Samla alla datum med aktivitet
  const activityDates = new Set();
  const addDate = (ts) => {
    if (!ts) return;
    const d = new Date(ts);
    if (!isNaN(d)) activityDates.add(d.toISOString().slice(0, 10));
  };
  actions.forEach(a => addDate(a.created_at));
  Object.values(state.progressByBlock).forEach(p => addDate(p.completed_at));
  Object.values(state.missionByBlock).forEach(m => { addDate(m.started_at); addDate(m.completed_at); });
  Object.values(state.roleplaysByBlock).forEach(arr => arr.forEach(r => addDate(r.completed_at)));
  Object.values(state.reflectionsByBlock).forEach(arr => arr.forEach(r => addDate(r.created_at)));

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    heatmap.push({
      date: key,
      active: activityDates.has(key),
      isToday: i === 0,
      weekday: d.getDay(), // 0 = Sunday
    });
  }

  // Block-status per block (samma som learn-page)
  const blockStatus = {};
  salesBlocks.forEach(b => {
    const prog = state.progressByBlock[b.id];
    const hasRoleplays   = !!(state.roleplaysByBlock[b.id] && state.roleplaysByBlock[b.id].length);
    const hasMissionDone = !!(state.missionByBlock[b.id] && state.missionByBlock[b.id].completed_at);
    const hasReflections = !!(state.reflectionsByBlock[b.id] && state.reflectionsByBlock[b.id].length);
    const theoryDone     = !!(prog && prog.completed);
    const stepsDone = [theoryDone, hasRoleplays, hasMissionDone, hasReflections].filter(Boolean).length;
    blockStatus[b.id] = { stepsDone, theoryDone, hasRoleplays, hasMissionDone, hasReflections };
  });

  // Action-fördelning per kategori (för "personliga rekord")
  const actionsByCategory = {};
  actions.forEach(a => {
    actionsByCategory[a.category] = (actionsByCategory[a.category] || 0) + (a.count || 1);
  });

  res.render('mina-framsteg', {
    username: req.session.username,
    role:     req.session.role,
    stats,
    blocks:   salesBlocks,
    blockStatus,
    heatmap,
    actions:  actions.slice(0, 20), // senaste 20
    actionsByCategory,
    categories: gamification.ACTION_CATEGORIES,
    prefs,
    csrfToken: generateCsrfToken(req),
  });
});

// ── Loggboken (user_actions) — logga verkliga säljhandlingar ────────────────

app.get('/loggbok', requireLogin, (req, res) => {
  const actions = getUserActions(req.session.userId, 200);
  const stats   = computeStatsForUser(req.session.userId);
  const prefs   = getUserPrefsObj(req.session.userId);
  res.render('loggbok', {
    username: req.session.username,
    role:     req.session.role,
    actions,
    stats,
    prefs,
    categories: gamification.ACTION_CATEGORIES,
    blocks:     salesBlocks,
    csrfToken:  generateCsrfToken(req),
    saved:      req.query.saved === '1',
  });
});

app.post('/loggbok', requireLogin, verifyCsrf, (req, res) => {
  const { category, count, note, block_id } = req.body;
  const cat = gamification.ACTION_CATEGORIES.find(c => c.id === category);
  if (!cat) return res.redirect('/loggbok');
  const cleanCount = cat.needsCount ? Math.max(1, Math.min(999, parseInt(count) || 1)) : 1;
  const cleanNote  = (note || '').trim().slice(0, 500);
  const cleanBlock = block_id && salesBlocks.find(b => b.id === block_id) ? block_id : null;

  // Snapshot FÖRE — för att beräkna diff
  const gamEnabled = isGamificationEnabled(req.session.userId);
  const statsBefore = gamEnabled ? computeStatsForUser(req.session.userId) : null;

  logUserAction(req.session.userId, cat.id, cleanCount, cleanNote, cleanBlock);

  // Kolla om dagens challenge uppfylldes av denna action
  const today = new Date().toISOString().slice(0, 10);
  const challengeRow = getDailyChallenge(req.session.userId, today);
  let challengeCompleted = false;
  if (challengeRow && !challengeRow.completed_at) {
    try {
      const challenge = JSON.parse(challengeRow.challenge_data);
      const todayActions = getActionsToday(req.session.userId);
      if (gamification.isChallengeCompleted(challenge, todayActions)) {
        completeDailyChallenge(req.session.userId, today);
        challengeCompleted = true;
      }
    } catch (_) {}
  }

  // Beräkna XP-diff för toast
  if (gamEnabled && statsBefore) {
    const statsAfter = computeStatsForUser(req.session.userId);
    const xpGained = statsAfter.xp - statsBefore.xp;
    const leveledUp = statsAfter.level.current.id > statsBefore.level.current.id;
    const progressPct = statsAfter.level.next ? Math.round(statsAfter.level.progress * 100) : 100;
    const toast = {
      xpGained,
      leveledUp,
      newLevelName: leveledUp ? statsAfter.level.current.name : null,
      nextLevelName: statsAfter.level.next ? statsAfter.level.next.name : null,
      progressPct,
      category: cat.name,
      icon: cat.icon,
      challengeCompleted,
    };
    // Kort-lived cookie (10 sek) som toast läser och raderar
    res.cookie('flashToast', JSON.stringify(toast), { maxAge: 10000, httpOnly: false, sameSite: 'lax' });
  }

  res.redirect('/loggbok?saved=1');
});

app.post('/loggbok/:id/delete', requireLogin, verifyCsrf, (req, res) => {
  const actionId = parseInt(req.params.id);
  if (actionId) deleteUserAction(req.session.userId, actionId);
  res.redirect('/loggbok');
});

// ── Inställningar (gamification ON/OFF m.m.) ─────────────────────────────────

app.get('/installningar', requireLogin, (req, res) => {
  const prefs = getUserPrefsObj(req.session.userId);
  // Referral-kod: lazy-generera om den inte finns
  const referralCode = getOrCreateReferralCode(req.session.userId);
  const referralStats = getReferralStats(req.session.userId);
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const referralUrl = referralCode ? `${baseUrl}/?ref=${referralCode}` : null;

  res.render('installningar', {
    username: req.session.username,
    role:     req.session.role,
    prefs,
    csrfToken: generateCsrfToken(req),
    saved:    req.query.saved === '1',
    referralCode,
    referralUrl,
    referralStats,
  });
});

app.post('/installningar', requireLogin, verifyCsrf, (req, res) => {
  const prefs = getUserPrefsObj(req.session.userId);
  prefs.gamification_enabled = req.body.gamification_enabled === 'on';
  prefs.email_retention      = req.body.email_retention === 'on';
  saveUserPrefsObj(req.session.userId, prefs);
  res.redirect('/installningar?saved=1');
});

// ── Level-up bekräftelse (markera som sedd) ─────────────────────────────────

app.post('/niva/sedd', requireLogin, verifyCsrf, (req, res) => {
  const levelId = parseInt(req.body.levelId);
  if (levelId) markLevelSeen(req.session.userId, levelId);
  res.json({ ok: true });
});

// ── Account deletion (GDPR right to erasure) ─────────────────────────────────

app.post('/account/delete', requireLogin, deleteLimiter, verifyCsrf, async (req, res) => {
  const { confirmDelete } = req.body;
  if (confirmDelete !== 'RADERA') {
    return res.redirect('/dashboard?deleteError=1');
  }
  const userId = req.session.userId;
  req.session.destroy(() => {
    deleteUserAccount(userId);
    res.redirect('/?deleted=1');
  });
});

// ── Mitt konto — byt lösenord ────────────────────────────────────────────────

app.get('/account', requireLogin, (req, res) => {
  const user = findUserById(req.session.userId);
  res.render('account', {
    username:  req.session.username,
    role:      req.session.role,
    email:     user?.email || '',
    pwError:   req.query.pwError || null,
    pwOk:      req.query.pwOk === '1',
    csrfToken: generateCsrfToken(req),
  });
});

// ── GDPR Artikel 20: Data portability ────────────────────────────────────────
// Användaren kan ladda ner all sin data i maskinläsbart JSON-format.
// Rate-limit: max 3 exporter per timme så vi inte exponerar tung DB-query.
const dataExportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  handler: (req, res) => res.status(429).send('För många exportförfrågningar. Försök igen om en timme.'),
});
app.get('/account/export.json', requireLogin, dataExportLimiter, (req, res) => {
  const data = getUserDataExport(req.session.userId);
  if (!data) return res.status(404).send('Användarprofil hittades inte.');
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename  = `min-data-${req.session.username}-${timestamp}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(JSON.stringify(data, null, 2));
});

app.post('/account/change-password', requireLogin, passwordChangeLimiter, verifyCsrf, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = findUserById(req.session.userId);

  if (!user || !(await bcrypt.compare(currentPassword || '', user.password_hash))) {
    return res.redirect('/account?pwError=current');
  }
  if (!newPassword || newPassword.length < 8) return res.redirect('/account?pwError=short');
  if (newPassword.length > 128)                return res.redirect('/account?pwError=long');
  if (newPassword !== confirmPassword)         return res.redirect('/account?pwError=match');
  if (newPassword === currentPassword)         return res.redirect('/account?pwError=same');

  updateUserPassword(user.id, newPassword);
  // Keep the current session alive: sync session's pwVersion to the new DB value
  // so the requireLogin middleware doesn't invalidate us on the next request.
  const fresh = findUserById(user.id);
  req.session.pwVersion = fresh?.pw_version || 0;
  res.redirect('/account?pwOk=1');
});

// ── Terms of Service ──────────────────────────────────────────────────────────

app.get('/terms', (req, res) => {
  res.render('terms', {
    username: req.session?.username || null,
    role:     req.session?.role || null,
  });
});

// ── Privacy Policy (standalone page) ─────────────────────────────────────────

app.get('/integritetspolicy', (req, res) => {
  res.render('privacy', {
    username: req.session?.username || null,
    role:     req.session?.role || null,
  });
});

// ── Ordbok ────────────────────────────────────────────────────────────────────

app.get('/ordbok', requireLogin, (req, res) => {
  const categories = [...new Set(glossaryTerms.map(t => t.category))];
  // Build a blockId→title map for term link tooltips
  const blockTitles = {};
  salesBlocks.forEach((b, i) => { blockTitles[b.id] = `Block ${i + 1}: ${b.title}`; });
  res.render('ordbok', {
    username:   req.session.username,
    role:       req.session.role,
    terms:      glossaryTerms,
    categories,
    blockTitles,
  });
});

// ── Admin panel ───────────────────────────────────────────────────────────────

app.get('/admin', requireLogin, requireAdmin, (req, res) => {
  res.render('admin', {
    username:  req.session.username,
    users:     getAllUsers(),
    stats:     getUserStats(),
    csrfToken: generateCsrfToken(req),
  });
});

app.get('/admin/analytics', requireLogin, requireAdmin, (req, res) => {
  const analytics = getAdminAnalytics();
  const funnel = getFunnelMetrics();
  // Berika blockEngagement med block-titlar för läsbarhet
  const blockTitles = {};
  salesBlocks.forEach((b, i) => { blockTitles[b.id] = { title: b.title, index: i + 1, icon: b.icon }; });
  res.render('admin-analytics', {
    username: req.session.username,
    analytics,
    funnel,
    blockTitles,
    totalBlocks: salesBlocks.length,
  });
});

// ── Admin: djupdyk på enskild användare ──────────────────────────────────────
// Visar hela beteendeprofilen: journey-stats, tid aktiv, top-sidor, timeline, referrals.
app.get('/admin/user/:id', requireLogin, requireAdmin, (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isFinite(targetId)) return res.redirect('/admin');
  const profile = getUserAnalyticsProfile(targetId);
  if (!profile) return res.redirect('/admin');
  // Berika timeline-block-ids med titlar
  const blockTitles = {};
  salesBlocks.forEach((b, i) => { blockTitles[b.id] = { title: b.title, index: i + 1, icon: b.icon }; });
  res.render('admin-user-detail', {
    username: req.session.username,
    profile,
    blockTitles,
    csrfToken: generateCsrfToken(req),
  });
});

// ── Heartbeat: klient POST:ar var 30:e sek för att uppdatera duration_ms ─────
// Body: { durationMs: antal ms sedan sidan laddades }. Ingen CSRF — idempotent nonce.
// Rate-limitad (10/min per IP) för att förhindra analytics-spam.
app.post('/heartbeat', heartbeatLimiter, (req, res) => {
  if (!req.session || !req.session.userId) return res.status(204).end();
  const d = Number(req.body && req.body.durationMs);
  if (Number.isFinite(d) && d > 0 && d < 7200000) {
    try { updateLastPageViewDuration(req.session.userId, d); } catch (_) {}
  }
  res.status(204).end();
});

app.post('/admin/users/:id/role', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const targetId = Number(req.params.id);
  // Prevent admins from demoting themselves (would lose admin access mid-session)
  if (targetId === req.session.userId) return res.redirect('/admin');
  const { role } = req.body;
  if (['free', 'premium', 'pro', 'admin'].includes(role)) {
    setUserRole(targetId, role);
  }
  res.redirect('/admin');
});

app.post('/admin/users/:id/delete', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const id = Number(req.params.id);
  if (id !== req.session.userId) deleteUser(id); // can't delete yourself
  res.redirect('/admin');
});

// ── Admin: sätt nytt lösenord för en användare ───────────────────────────────
// Admin sets the password directly. pw_version bumps in updateUserPassword,
// which kicks the target out of any active sessions on their next request.
app.post('/admin/users/:id/password', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const targetId = Number(req.params.id);
  // Admin must use /account to change their own password (so session stays in sync)
  if (targetId === req.session.userId) return res.redirect('/account');

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
    return res.redirect('/admin?pwError=1');
  }
  const target = findUserById(targetId);
  if (!target) return res.redirect('/admin');

  updateUserPassword(targetId, newPassword);
  res.redirect('/admin?pwOk=' + targetId);
});

// ── Admin: manually send welcome email ───────────────────────────────────────

app.post('/admin/users/:id/email', requireLogin, requireAdmin, verifyCsrf, async (req, res) => {
  const user    = findUserById(Number(req.params.id));
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  if (!user?.email) return res.redirect('/admin');

  try {
    if (resend) {
      await resend.emails.send({
        from:    RESEND_FROM,
        to:      user.email,
        subject: `Välkommen, ${user.username}! Ditt konto är aktivt 🎯`,
        html:    buildWelcomeEmail(user.username, baseUrl),
      });
    }
  } catch (err) {
    console.error('Admin email error:', err.message);
  }
  res.redirect('/admin');
});

// ── Admin broadcast-mejl ─────────────────────────────────────────────────────
// Masskommunikation till valt segment (all/premium/pro/free/paid).
// Respekterar unsubscribe-tokens: användare med emailRetention = false
// inkluderas INTE (samma regler som retention-mejlen).

const broadcastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1h
  max: 3,                     // max 3 broadcasts per timme
  handler: (req, res) => res.redirect('/admin/broadcast?error=ratelimit'),
});

app.get('/admin/broadcast', requireLogin, requireAdmin, (req, res) => {
  res.render('admin-broadcast', {
    username: req.session.username,
    csrfToken: generateCsrfToken(req),
    sent: req.query.sent ? parseInt(req.query.sent) : null,
    failed: req.query.failed ? parseInt(req.query.failed) : null,
    error: req.query.error || null,
  });
});

app.post('/admin/broadcast', requireLogin, requireAdmin, broadcastLimiter, verifyCsrf, async (req, res) => {
  if (!resend) {
    return res.redirect('/admin/broadcast?error=no_resend');
  }
  const segment = ['all', 'premium', 'pro', 'free', 'paid'].includes(req.body.segment) ? req.body.segment : 'all';
  const subject = (req.body.subject || '').trim().slice(0, 200);
  const body    = (req.body.body    || '').trim().slice(0, 20000);
  if (!subject || !body) {
    return res.redirect('/admin/broadcast?error=missing');
  }

  const recipients = getUsersForBroadcast(segment);
  // Respektera email_retention-preferensen (samma regel som retention-mejlen)
  const eligible = recipients.filter(r => {
    const prefs = getUserPreferences(r.id);
    return prefs.email_retention !== false; // default = opt-in
  });

  const baseUrl = process.env['APP_URL'] || `${req.protocol}://${req.get('host')}`;
  let sent = 0, failed = 0;

  // Skicka sekventiellt med kort delay för att inte trigga Resend-rate-limit
  for (const u of eligible) {
    try {
      const unsubToken = emails.createUnsubscribeToken(u.id);
      const unsubUrl   = `${baseUrl}/unsubscribe/${unsubToken}`;
      await resend.emails.send({
        from:    RESEND_FROM,
        to:      u.email,
        subject,
        html:    buildBroadcastEmail({ username: u.username, body, unsubUrl, subject }),
      });
      sent++;
      // Resend free tier = 10 emails/sec, betalad = 100. 100ms = säker marginal.
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      failed++;
      console.error(`Broadcast failed for ${u.email}:`, err.message);
    }
  }
  console.log(`📢 Broadcast klar: ${sent} skickade, ${failed} misslyckade (segment=${segment})`);
  res.redirect(`/admin/broadcast?sent=${sent}&failed=${failed}`);
});

// Wrapper för broadcast-innehåll: vanlig HTML-email med framing + unsubscribe
function buildBroadcastEmail({ username, body, unsubUrl, subject }) {
  // Body får vara markdown-lättande HTML (admin skriver antingen plain eller HTML)
  // Vi normaliserar \n till <br> om inget HTML detected
  const isHtml = /<\/?(p|br|div|strong|em|ul|ol|li|a|h[1-6])/i.test(body);
  const contentHtml = isHtml ? body : body.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>');

  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem;">
    <div style="background:#fff;border-radius:12px;padding:2rem;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <div style="color:#6366f1;font-weight:800;margin-bottom:1.5rem;">🎯 Joakim Jaksen</div>
      <div style="color:#0f172a;line-height:1.6;font-size:15px;">
        <p>Hej ${username},</p>
        ${contentHtml}
        <p style="margin-top:1.5rem;">// Joakim</p>
      </div>
    </div>
    <div style="text-align:center;color:#94a3b8;font-size:12px;margin-top:1.5rem;">
      Du får det här för att du är registrerad på <a href="https://www.joakimjaksen.se" style="color:#94a3b8;">joakimjaksen.se</a>.
      <br><a href="${unsubUrl}" style="color:#94a3b8;">Avprenumerera från mejl</a>
    </div>
  </div>
</body></html>`;
}

// ── Admin: referral credits-översikt + markera utbetalda ─────────────────────

app.get('/admin/referral-credits', requireLogin, requireAdmin, (req, res) => {
  const pending = getUsersWithPendingReferralCredits();
  res.render('admin-referral-credits', {
    username: req.session.username,
    pending,
    csrfToken: generateCsrfToken(req),
    saved: req.query.saved === '1',
  });
});

app.post('/admin/users/:id/redeem-credits', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const targetId = Number(req.params.id);
  const count    = Number(req.body.count);
  if (Number.isFinite(targetId) && Number.isFinite(count) && count > 0) {
    markReferralCreditsRedeemed(targetId, count);
  }
  res.redirect('/admin/referral-credits?saved=1');
});

// ── Admin CSV export ──────────────────────────────────────────────────────────

app.get('/admin/export/users.csv', requireLogin, requireAdmin, (req, res) => {
  const users = getAllUsers();
  const header = ['id', 'username', 'email', 'role', 'gdpr', 'created_at', 'last_login', 'stripe_customer_id'].join(',');
  const rows   = users.map(u =>
    [
      u.id,
      `"${(u.username          || '').replace(/"/g, '""')}"`,
      `"${(u.email             || '').replace(/"/g, '""')}"`,
      u.role,
      u.gdpr ? '1' : '0',
      (u.created_at            || '').slice(0, 10),
      (u.last_login            || '').slice(0, 10),
      `"${(u.stripe_customer_id || '').replace(/"/g, '""')}"`,
    ].join(',')
  );
  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send('\uFEFF' + csv); // UTF-8 BOM for Excel compatibility
});

// ── Upgrade / Stripe Checkout ─────────────────────────────────────────────────

app.get('/upgrade', requireLogin, (req, res) => {
  // Already premium → send home
  if (isPremiumOrHigher(req.session.role)) {
    return res.redirect('/dashboard');
  }
  res.render('upgrade', {
    username:  req.session.username,
    role:      req.session.role,
    csrfToken: generateCsrfToken(req),
  });
});

app.post('/upgrade/checkout', requireLogin, verifyCsrf, async (req, res) => {
  const currentRole = req.session.role;
  const targetTier = req.body.tier === 'pro' ? 'pro' : 'premium';

  // Hindra duplicerad checkout
  if (targetTier === 'premium' && isPremiumOrHigher(currentRole)) return res.redirect('/dashboard');
  if (targetTier === 'pro' && isProOrHigher(currentRole)) return res.redirect('/dashboard');

  const priceId = targetTier === 'pro'
    ? process.env.STRIPE_PRICE_ID_PRO
    : process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return res.render('upgrade', {
      username:  req.session.username,
      role:      req.session.role,
      csrfToken: generateCsrfToken(req),
      error:     `${targetTier === 'pro' ? 'Pro' : 'Premium'}-prissättning är inte konfigurerad. Kontakta support.`,
    });
  }

  const user    = findUserByUsername(req.session.username);
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'subscription',
      customer_email:       user.email || undefined,
      line_items: [{
        price:    priceId,
        quantity: 1,
      }],
      success_url: `${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/upgrade`,
      metadata: {
        userId: String(req.session.userId),
        tier:   targetTier,
      },
      // Kopiera metadata till den skapade subscriptionen så framtida
      // customer.subscription.* events innehåller userId+tier direkt
      // (annars måste vi fallback-lookup via customer_id).
      subscription_data: {
        metadata: {
          userId: String(req.session.userId),
          tier:   targetTier,
        },
      },
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.render('upgrade', {
      username:  req.session.username,
      role:      req.session.role,
      csrfToken: generateCsrfToken(req),
      error:     'Betalningen kunde inte startas. Försök igen.',
    });
  }
});

app.get('/upgrade/success', requireLogin, (req, res) => {
  // Sync session role from DB — the Stripe webhook may already have upgraded the user.
  // IMPORTANT: never hardcode 'premium' here — any free user could navigate directly
  // to this URL and get an unearned premium session for 8 hours.
  const freshUser = findUserById(req.session.userId);
  if (freshUser) req.session.role = freshUser.role;
  res.render('upgrade-success', { username: req.session.username });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRO-TIER: Samtalsanalys (Groq Whisper + AI-feedback)
// ═══════════════════════════════════════════════════════════════════════════════

// Gatekeeper: endast Pro + admin får access
function requirePro(req, res, next) {
  if (!isProOrHigher(req.session.role)) {
    return res.redirect('/pro'); // landar på paywall/info-sidan
  }
  next();
}

// Landningssida — visas oavsett role (info + paywall om inte Pro)
app.get('/pro', requireLogin, (req, res) => {
  const isPro = isProOrHigher(req.session.role);
  const usage = isPro ? canProUserUploadCall(req.session.userId) : null;
  const history = isPro ? getProCallAnalysesForUser(req.session.userId, 20) : [];
  res.render('pro-landing', {
    username: req.session.username,
    role:     req.session.role,
    isPro,
    usage,
    history,
    csrfToken: generateCsrfToken(req),
  });
});

// Upload-form
app.get('/pro/samtal/ny', requireLogin, requirePro, (req, res) => {
  const usage = canProUserUploadCall(req.session.userId);
  res.render('pro-upload', {
    username: req.session.username,
    role:     req.session.role,
    usage,
    csrfToken: generateCsrfToken(req),
  });
});

// POST: hantera uppladdning + transkribering + analys
app.post('/pro/samtal/ny', requireLogin, requirePro, verifyCsrf, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).render('pro-upload', {
        username: req.session.username,
        role: req.session.role,
        usage: canProUserUploadCall(req.session.userId),
        csrfToken: generateCsrfToken(req),
        error: 'Ingen fil vald.',
      });
    }

    const cap = canProUserUploadCall(req.session.userId);
    if (!cap.allowed) {
      return res.status(429).render('pro-upload', {
        username: req.session.username,
        role: req.session.role,
        usage: cap,
        csrfToken: generateCsrfToken(req),
        error: `Du har nått månadsgränsen (${cap.used}/${cap.limit}). Nästa reset: om ~30 dagar (rullande).`,
      });
    }

    const consent = req.body.consent === 'on';
    if (!consent) {
      return res.status(400).render('pro-upload', {
        username: req.session.username,
        role: req.session.role,
        usage: cap,
        csrfToken: generateCsrfToken(req),
        error: 'Du måste bekräfta att du har samtycke att analysera samtalet.',
      });
    }

    const title = (req.body.title || req.file.originalname || 'Samtal').slice(0, 120);

    // Skapa DB-rad med status 'pending'
    const analysisId = createProCallAnalysis(req.session.userId, {
      title,
      status: 'transcribing',
    });

    // Kör transkribering + analys INLINE (synkront) — framtida: köa + polla
    try {
      const transcription = await proAnalysis.transcribeAudio(
        req.file.buffer,
        req.file.originalname,
        process.env.GROQ_API_KEY
      );

      updateProCallAnalysis(analysisId, {
        transcript: transcription.text,
        duration_sec: transcription.duration ? Math.round(transcription.duration) : null,
        status: 'analyzing',
      });

      const analysis = await proAnalysis.analyzeCall(
        transcription.text,
        process.env.GROQ_API_KEY,
        { userTitle: title }
      );

      updateProCallAnalysis(analysisId, {
        analysis,
        status: 'done',
      });

      res.redirect(`/pro/samtal/${analysisId}`);
    } catch (procErr) {
      console.error('Pro analysis processing error:', procErr.message);
      updateProCallAnalysis(analysisId, {
        status: 'failed',
        error_message: procErr.message.slice(0, 500),
      });
      res.redirect(`/pro/samtal/${analysisId}`);
    }
  } catch (err) {
    console.error('Pro upload error:', err.message);
    const usage = canProUserUploadCall(req.session.userId);
    res.status(500).render('pro-upload', {
      username: req.session.username,
      role: req.session.role,
      usage,
      csrfToken: generateCsrfToken(req),
      error: 'Något gick fel vid uppladdning: ' + err.message,
    });
  }
});

// Visa enskild analys
app.get('/pro/samtal/:id', requireLogin, requirePro, (req, res) => {
  const analysisId = parseInt(req.params.id);
  if (!analysisId) return res.redirect('/pro');
  const analysis = getProCallAnalysis(req.session.userId, analysisId);
  if (!analysis) return res.redirect('/pro');
  res.render('pro-analysis', {
    username: req.session.username,
    role:     req.session.role,
    analysis,
    csrfToken: generateCsrfToken(req),
  });
});

// Radera analys
app.post('/pro/samtal/:id/delete', requireLogin, requirePro, verifyCsrf, (req, res) => {
  const analysisId = parseInt(req.params.id);
  if (analysisId) deleteProCallAnalysis(req.session.userId, analysisId);
  res.redirect('/pro');
});

// ── Företag-sida — enkel kontakta-oss ────────────────────────────────────────

app.get('/foretag', (req, res) => {
  res.render('foretag', {
    username: req.session?.username || null,
    role:     req.session?.role || null,
  });
});

// ── Public /priser — SEO-indexerad pris-sida med rich-results ─────────────────
app.get(['/priser', '/pricing'], (req, res) => {
  res.render('priser', {
    username: req.session?.username || null,
    role:     req.session?.role || null,
  });
});

// ── Chat ──────────────────────────────────────────────────────────────────────

app.post('/chat', requireLogin, chatLimiter, verifyCsrf, async (req, res) => {
  // Jocke is a premium feature — block API access for free users
  if (!isPremiumOrHigher(req.session.role)) {
    return res.status(403).json({ error: 'Jocke är tillgänglig för Premium-användare.' });
  }
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'Invalid format.' });

  // Validate and sanitize messages — cap at 20, check structure
  const validRoles = new Set(['user', 'assistant']);
  const sanitized = messages
    .slice(-20) // keep last 20 messages to limit context size
    .filter(m => m && typeof m === 'object' && validRoles.has(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) })); // cap each message at 2000 chars

  if (sanitized.length === 0)
    return res.status(400).json({ error: 'Invalid format.' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: JOCKE_SYSTEM_PROMPT }, ...sanitized],
      max_tokens: jockeMaxTokens(req.session.role), // Pro får 900, Premium 500
    });
    const reply = completion.choices?.[0]?.message?.content || 'Inget svar mottogs.';
    res.json({ reply });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'Kunde inte nå assistenten just nu.' });
  }
});

// ── Block-context chat — Jocke coach med blockets teori laddad ──────────────

app.post('/chat/block', requireLogin, chatLimiter, verifyCsrf, async (req, res) => {
  if (!isPremiumOrHigher(req.session.role)) {
    return res.status(403).json({ error: 'Jocke är tillgänglig för Premium-användare.' });
  }

  const { blockId, messages } = req.body;
  const block = salesBlocks.find(b => b.id === blockId);
  if (!block) return res.status(400).json({ error: 'Ogiltigt block.' });

  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'Invalid format.' });

  const validRoles = new Set(['user', 'assistant']);
  const sanitized = messages
    .slice(-20)
    .filter(m => m && typeof m === 'object' && validRoles.has(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (sanitized.length === 0) return res.status(400).json({ error: 'Invalid format.' });

  // Strippa HTML från theory för context (max 4000 tecken för att hålla prompt kort)
  const theoryText = (block.theory || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);

  const blockChatSystemPrompt = `
Du är Jocke — säljcoachen på Joakim Jaksens plattform. Användaren läser just nu "${block.title}" och har frågor.

KOMMUNIKATIONSSTIL:
- Direkt, skarp, kortfattad. Inga onödiga ord.
- Svenska om användaren skriver på svenska.
- Konkreta exempel, scripts, formuleringar — inte akademisk teori.

BLOCKET ANVÄNDAREN ÄR I:
Titel: ${block.title}
Tema: ${block.subtitle}

KUNSKAP FRÅN BLOCKET:
${theoryText}

REGLER:
- Fokusera på det blocket handlar om. Om frågan handlar om annat block — besvara kort och hänvisa dit.
- Ge praktiska exempel och fraser som kan användas i riktiga kundsamtal.
- Om en fråga redan besvaras i teorin — citera eller peka på avsnittet, och ge ett kompletterande perspektiv.
- Kortfattat. 2–4 stycken per svar. Ingen babbel.
- Om användaren frågar om du är AI — bekräfta ärligt (EU AI Act).
- Rekommendera gärna Jockes 4-stegs-resa (Läs → Öva → Gör → Reflektera) när det passar.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: blockChatSystemPrompt }, ...sanitized],
      max_tokens: jockeMaxTokens(req.session.role),
    });
    const reply = completion.choices?.[0]?.message?.content || 'Inget svar mottogs.';
    res.json({ reply });
  } catch (err) {
    console.error('Groq block-chat error:', err.message);
    res.status(500).json({ error: 'Kunde inte nå assistenten just nu.' });
  }
});

// ── Roleplay chat — Jocke plays a customer persona ───────────────────────────

const ROLEPLAY_COACH_INSTRUCTION = `
När användaren skriver "[KLAR]" eller "[FEEDBACK]" ska du bryta rollspelet och ge 2–4 konkreta feedback-punkter på vad säljaren gjorde bra och vad som kan förbättras. Var direkt, specifik och användbar — som Joakim Jaksen själv. Efter feedbacken, säg: "Vill du köra igen eller markera övningen som klar?"
`;

app.post('/chat/roleplay', requireLogin, chatLimiter, verifyCsrf, async (req, res) => {
  if (!isPremiumOrHigher(req.session.role)) {
    return res.status(403).json({ error: 'Rollspel är tillgängligt för Premium-användare.' });
  }

  const { blockId, roleplayId, messages } = req.body;
  const block = salesBlocks.find(b => b.id === blockId);
  if (!block) return res.status(400).json({ error: 'Ogiltigt block.' });
  const rp = (block.roleplays || []).find(r => r.id === roleplayId);
  if (!rp) return res.status(400).json({ error: 'Ogiltigt rollspel.' });

  if (!Array.isArray(messages) || messages.length === 0)
    return res.status(400).json({ error: 'Invalid format.' });

  const validRoles = new Set(['user', 'assistant']);
  const sanitized = messages
    .slice(-20)
    .filter(m => m && typeof m === 'object' && validRoles.has(m.role) && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (sanitized.length === 0)
    return res.status(400).json({ error: 'Invalid format.' });

  // Compose scenario-specific system prompt (Jocke plays a customer, not the coach)
  const roleplaySystemPrompt = `
Du är en AI som hjälper säljare träna. Just nu spelar du INTE Jocke-säljcoachen — du spelar en KUND eller motpart i ett rollspel. Stanna kvar i rollen tills säljaren skriver "[KLAR]" eller "[FEEDBACK]".

ROLLSPELSSCENARIO:
Block: ${block.title}
Situation: ${rp.scenario}

DIN ROLL (agera naturligt, realistiskt, inte överspelat):
${rp.customerPersona}

DITT MÅL SOM "MOTPART":
${rp.difficulty === 'Svår' ? 'Var utmanande och testa säljaren hårt — som en tuff verklig kund.' : rp.difficulty === 'Medel' ? 'Var realistisk — ge inte upp info för lätt men öppna upp om säljaren frågar rätt.' : 'Var mottaglig — svara naturligt, ge säljaren chans att öva tekniken.'}

VIKTIGT:
- Håll dig i rollen. Säg aldrig "Som AI kan jag inte ...".
- Svara på svenska, naturligt, i 1–3 meningar per replik — som riktig kund skulle.
- Var inte för hjälpsam. Kunder är ofta ovilliga, upptagna eller skeptiska.
- Om säljaren använder bra teknik — belöna genom att öppna upp gradvis.
- Om säljaren pitchar för tidigt eller är tondöv — stänger ner, säger "jag är upptagen" eller liknande.
- Om säljaren frågar en juridisk/compliance-fråga du inte kan besvara som kund: svara "det vet jag inte, det är en fråga för vår juridik" eller liknande.

${ROLEPLAY_COACH_INSTRUCTION}

- Om någon direkt frågar om du är en AI: bekräfta ärligt att du är det (EU AI Act). Men återgå sedan till rollen.
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: roleplaySystemPrompt }, ...sanitized],
      max_tokens: jockeMaxTokens(req.session.role),
    });
    const reply = completion.choices?.[0]?.message?.content || 'Inget svar mottogs.';
    res.json({ reply });
  } catch (err) {
    console.error('Groq roleplay error:', err.message);
    res.status(500).json({ error: 'Kunde inte nå assistenten just nu.' });
  }
});

// ── Stripe Customer Portal ───────────────────────────────────────────────────
// Allows premium users to manage/cancel their subscription directly

app.post('/billing/portal', requireLogin, verifyCsrf, async (req, res) => {
  const user    = findUserByUsername(req.session.username);
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  if (!user?.stripe_customer_id) {
    return res.redirect('/dashboard');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripe_customer_id,
      return_url: `${baseUrl}/dashboard`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Billing portal error:', err.message);
    res.redirect('/dashboard');
  }
});

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  // Return minimal info for Railway health checks.
  // Service config details only shown to authenticated admins.
  const isAdmin = req.session?.role === 'admin';
  const base = {
    status: 'ok',
    ts:     new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  };
  if (isAdmin) {
    const stats = getUserStats();
    base.db       = { users: stats.total, premium: stats.premium };
    base.services = {
      email:  !!process.env.RESEND_API_KEY,
      chat:   !!process.env.GROQ_API_KEY,
      stripe: !!process.env.STRIPE_SECRET_KEY,
    };
  }
  res.json(base);
});

// ── 404 handler ──────────────────────────────────────────────────────────────
// Kontextmedveten: anonyma besökare länkas till landing, inloggade till dashboard.

app.use((req, res) => {
  const authenticated = !!(req.session && req.session.userId);
  res.status(404).render('error', {
    status:        404,
    codeLabel:     'NOT FOUND',
    icon:          '🔍',
    heading:       'Sidan hittades inte',
    body:          'Länken kan vara utgången, stavfel eller en sida som flyttats. Vi kan hjälpa dig hitta rätt.',
    authenticated,
    requestId:     null,
  });
});

// ── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  const authenticated = !!(req.session && req.session.userId);
  // Generera en kort request-id för supporten att referera till i loggar
  const requestId = Math.random().toString(36).slice(2, 10);
  console.error(`→ request-id ${requestId}`);
  try {
    return res.status(500).render('error', {
      status:        500,
      codeLabel:     'INTERNT FEL',
      icon:          '⚠️',
      heading:       'Något gick fel hos oss',
      body:          'Inget du gjorde — felet är på vår sida och har loggats. Försök igen om en stund. Om problemet kvarstår, mejla oss request-id:t nedan.',
      authenticated,
      requestId,
    });
  } catch (_renderErr) {
    // Fallback om själva template-renderingen smäller
    res.status(500).send(`
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8" />
      <title>Fel — Joakim Jaksen</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body class="learn-page" style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div style="text-align:center;padding:2rem;">
        <div style="font-size:4rem;margin-bottom:1rem;">⚠️</div>
        <h1 style="font-size:1.75rem;font-weight:900;color:#f1f5f9;margin-bottom:0.5rem;">Något gick fel</h1>
        <p style="color:#64748b;margin-bottom:2rem;">Vi har loggat felet och tittar på det. Försök igen om en stund.</p>
        <a href="/" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:0.875rem 2rem;border-radius:10px;text-decoration:none;font-weight:600;">Till startsidan →</a>
      </div>
    </body>
    </html>
    `);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function startServer() {
  await initDatabase();

  // ── Production security checks ─────────────────────────────────────────────
  if (isProd) {
    const warnings = [];
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-in-production')
      warnings.push('SESSION_SECRET is not set — sessions are insecure!');
    if (!process.env.STRIPE_SECRET_KEY)
      warnings.push('STRIPE_SECRET_KEY is not set — payments will not work.');
    if (!process.env.STRIPE_PRICE_ID)
      warnings.push('STRIPE_PRICE_ID is not set — checkout will not work.');
    if (!process.env.GROQ_API_KEY)
      warnings.push('GROQ_API_KEY is not set — AI chat will not work.');
    if (!process.env.TURNSTILE_SECRET_KEY)
      warnings.push('TURNSTILE_SECRET_KEY is not set — registration CAPTCHA is disabled.');
    if (!process.env.RESEND_API_KEY)
      warnings.push('RESEND_API_KEY is not set — transactional email is disabled.');
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      warnings.push('STRIPE_WEBHOOK_SECRET is not set — Stripe webhooks will be rejected (users cannot upgrade).');
    if (!process.env.APP_URL)
      warnings.push('APP_URL is not set — password reset links and checkout redirects use request host (may be unreliable).');
    if (warnings.length > 0) {
      console.warn('\n⚠️  Production security warnings:');
      warnings.forEach(w => console.warn(`   • ${w}`));
      console.warn('');
    }
  }

  // Clean up expired reset tokens on startup and every hour
  cleanupExpiredTokens();
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

  // Clean up page_views äldre än 90 dagar — hindrar obegränsad tillväxt
  // och håller admin-analytics-queries snabba. Körs vid uppstart + dagligen.
  cleanupOldPageViews();
  setInterval(cleanupOldPageViews, 24 * 60 * 60 * 1000);

  // Clean up utgångna sessions — körs var 6:e timme
  sessionCleanupExpired();
  setInterval(sessionCleanupExpired, 6 * 60 * 60 * 1000);

  // Clean up gamla Stripe-event-loggen (retention 90 dagar) — dagligen
  cleanupOldStripeEvents();
  setInterval(cleanupOldStripeEvents, 24 * 60 * 60 * 1000);

  // Rotating DB-backups (users.db.backup.1-3) — skydd mot filkorruption.
  // Körs 10 sek efter startup (ej omedelbart — låt DB-init stabilisera först)
  // och sedan var 6:e timme. Total recovery-fönster: ~18 timmar med 3 snapshots.
  setTimeout(() => rotateDbBackups(), 10_000);
  setInterval(rotateDbBackups, 6 * 60 * 60 * 1000);

  // Graceful shutdown: flusha analytics-buffer innan processen dör.
  // Railway skickar SIGTERM vid redeploy — utan detta förloras analytics i flight.
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} mottaget — flushar analytics...`);
    try { flushAnalytics(); } catch (err) { console.error('Shutdown flush error:', err.message); }
    process.exit(0);
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
}

startServer();
