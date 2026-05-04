// server.js
const express     = require('express');
const session     = require('express-session');
const bcrypt      = require('bcryptjs');
const OpenAI      = require('openai');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const Stripe      = require('stripe');
const { Resend }  = require('resend');
const helmet      = require('helmet');
const compression = require('compression');
const {
  initDatabase, cleanupExpiredTokens, rotateDbBackups, findUserByUsername, findUserByEmail, findUserById, generateUsernameFromEmail, displayName, fullName, createUser,
  getAllUsers, setUserRole, deleteUser, deleteUserAccount, getUserStats,
  updateUserEmail, updateUserName,
  setStripeCustomerId, findUserByStripeCustomerId,
  updateLastLogin,
  isUserLocked, recordFailedLogin, clearFailedLogins,
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
  saveBroadcast, getBroadcastsForUser, getBroadcastById,
  enqueueEmail, getPendingEmails, markEmailSent, markEmailFailed, cleanupOldEmailQueue,
  listAllEmailQueue, requeueEmail,
  getAdminAnalytics, getAdminDigestStats, getUserAnalyticsProfile, getFunnelMetrics, getUserDataExport, getCohortRetention,
  getContinueTarget, getBlockTimeAnalytics,
  logPageView, updateLastPageViewDuration, cleanupOldPageViews, flushAnalytics,
  logFunnelEvent, getFunnelStats, getRecentFunnelEvents, backfillRegisterEvents,
  upsertBlockAudio, getBlockAudio, listBlockAudios, deleteBlockAudio,
  sessionGet, sessionSet, sessionDestroy, sessionCleanupExpired,
  isStripeEventProcessed, markStripeEventProcessed, cleanupOldStripeEvents,
  getAdminNotesForUser, addAdminNote, deleteAdminNote,
  logAdminAction, getAuditLog, getAuditActionTypes, cleanupOldAuditLog,
  createProCallAnalysis, updateProCallAnalysis, getProCallAnalysis,
  getProCallAnalysesForUser, canProUserUploadCall, deleteProCallAnalysis,
  PRO_CALL_LIMIT_PER_MONTH,
  getOrCreateReferralCode, findUserByReferralCode, setReferrerForUser, getReferralStats,
  grantReferralCreditIfEligible, markReferralCreditsRedeemed, getUsersWithPendingReferralCredits,
  setProTrialEndAt, clearProTrial, markProTrialReminderSent, getUsersWithTrialEndingSoon,
} = require('./database');
const gamification = require('./gamification');
const emails = require('./emails');
const proAnalysis = require('./proCallAnalysis');
const { notifyAdmin } = require('./services/alerting');
const { fetchWithTimeout, TIMEOUT } = require('./services/fetchTimeout');
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
// RESEND_FROM = avsändar-display + adress för utgående transactional mejl.
//
// VIKTIGT (efter april 2026 email-routing-omflyttning):
// Resend skickar från subdomäner under joakimjaksen.se, INTE roten.
// Rätt värde i prod: "Joakim Jaksen <noreply@mail.joakimjaksen.se>"
//
// Skälet är att roten (joakimjaksen.se) nu äger Cloudflare Email Routing
// för inkommande aliaser (info@, kontakt@, support@, joakim@, ekonomi@) →
// alla → joakim@brilliantvalues.se. Att hålla utgående på subdomain
// undviker SPF-include-konflikter och håller deliverability-domänerna
// renligen separerade (mail = sender, bounces = SES bounces på Growth-OS-sidan).
//
// Display-namnet "Joakim Jaksen" syns i mottagarens inbox; full
// adress (noreply@mail.joakimjaksen.se) syns bara vid expand av "from"-fält.
const RESEND_FROM = process.env['RESEND_FROM'] || 'Joakim Jaksen <onboarding@resend.dev>';

/**
 * Pålitlig mejl-send med automatic queue-fallback.
 * Försöker skicka direkt → om fail, enqueue:as för retry med exponential backoff.
 * Använd denna istället för raw resend.emails.send() för transactional mejl.
 *
 * Returnerar { sent: bool, queued: bool, error?: string }
 */
async function sendEmailReliable({ to, subject, html, from, kind }) {
  if (!to || !subject || !html) return { sent: false, queued: false, error: 'missing fields' };
  // Resend ej konfigurerad → enqueue och hoppa
  if (!resend) {
    enqueueEmail({ to, subject, html, from, kind });
    return { sent: false, queued: true };
  }
  try {
    await resend.emails.send({
      from: from || RESEND_FROM,
      to,
      subject,
      html,
    });
    return { sent: true, queued: false };
  } catch (err) {
    console.warn(`📧 Direct send failed för ${to} (${kind}), queueing för retry: ${err.message}`);
    enqueueEmail({ to, subject, html, from, kind });
    return { sent: false, queued: true, error: err.message };
  }
}

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
    // Larmar critical — om webhooks inte verifieras kan vi inte uppgradera betalande users
    notifyAdmin('critical', 'Stripe webhook signature failed',
      'En webhook från Stripe avvisades pga ogiltig signatur. Antingen är STRIPE_WEBHOOK_SECRET fel, eller fejk-trafik. Inga uppgraderingar går igenom medan detta pågår.',
      { error: err.message, sigPreview: String(sig || '').slice(0, 30) }
    );
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Idempotency: Stripe retries events vid nätverksfel.
  // Pattern: CHECK före handler-execution, MARK efter lyckad execution.
  // Detta skyddar mot scenarion där:
  //   1. Event kommer in
  //   2. Handler börjar köra (t.ex. setUserRole)
  //   3. Server kraschar mid-handler
  //   4. Stripe retries
  // Med GAMMAL pattern (mark FÖRE handler): event = "redan processat" → skip
  //   → user betalar utan att uppgraderas. KRITISK BUGG.
  // Med NY pattern (mark EFTER handler): retry körs igen → handlers är
  //   idempotenta (setUserRole sätter samma roll, grant har eget flag) → safe.
  if (isStripeEventProcessed(event.id)) {
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

      // Funnel: upgrade slutförd — pengar har faktiskt rört sig (eller trial startad).
      // Per tier eftersom premium- och pro-konvertering är separata processer.
      logFunnelEvent(userId, 'upgrade_completed_' + tier, { tier });

      // ── Pro-trial-tracking: om detta var en Pro-subscription med trial,
      // fetch:a subscriptionen för att få trial_end-timestamp.
      if (tier === 'pro' && sess.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(sess.subscription);
          if (subscription.trial_end) {
            const trialEndIso = new Date(subscription.trial_end * 1000).toISOString();
            setProTrialEndAt(userId, trialEndIso);
            console.log(`🎯 Pro-trial startad för user ${userId}, slutar ${trialEndIso}`);
          }
        } catch (err) {
          console.error('Pro trial tracking error:', err.message);
        }
      }

      // ── Auto-referral-reward: om den här användaren refererades av någon
      // och detta är deras första upgrade, kreditera referrern 1 gratis månad.
      // Idempotent via referral_credit_granted-flaggan i DB.
      // Fraud-flagging: om referrer + referred har samma IP/email-domän →
      // krediteras fortf. men loggas som suspicious. Joakim kan revertera.
      try {
        const result = grantReferralCreditIfEligible(userId);
        if (result.granted) {
          console.log(`🎁 Referrer ${result.referrerId} fick 1 gratis månad krediterad`);
          if (result.suspicious) {
            try {
              logAdminAction(0, 'system', 'referral.suspicious_grant',
                { id: userId, username: null },
                { referrerId: result.referrerId, flags: result.fraudFlags },
                null
              );
              console.warn(`⚠️ Misstänkt referral-grant: user ${result.referrerId} ← user ${userId} (${result.fraudFlags.join(',')})`);
            } catch (_) {}
          }
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
      // Rensa trial-tracking om det var en trial-cancel
      try { clearProTrial(userId); } catch (_) {}
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
        // Om trial precis slutade (status 'trialing' → 'active'): rensa trial_end_at
        // så UI-bannern försvinner. Första betalningen har gått igenom.
        try { clearProTrial(userId); } catch (_) {}
      }
    }
  }

  // Markera event som processerat ENDAST efter att alla handlers körts klart.
  // Om server kraschat innan denna rad: event ej markerat → Stripe retries →
  // handlers körs igen (idempotent, safe).
  markStripeEventProcessed(event.id, event.type);
  res.json({ received: true });
});

// ── Middleware ────────────────────────────────────────────────────────────────

app.set('trust proxy', 1); // Railway runs behind a reverse proxy

// ── Security headers ──────────────────────────────────────────────────────────
// CSP-strategi: loose policy som täcker XSS-vektorer utan att bryta vår
// existerande inline-script-hantering i EJS. Strict CSP m. nonces hade krävt
// att varje <script>-block i 50+ vyer fick nonce-attribut → stort refaktor
// med risk för UI-regression. Den här policy:n är en pragmatisk medelväg:
//
//   - script-src 'unsafe-inline' tillåter våra inline-scripts (AI-chat,
//     onClick-handlers, etc.) men blockar EXTERNA script-injektioner
//   - whitelist:ar Turnstile + Stripe + YouTube för embeds vi använder
//   - tight connect-src: bara egen origin + Stripe (för checkout-redirect)
//   - frame-ancestors 'self' förhindrar clickjacking
//   - object-src 'none' blockar Flash/Java-objekt-injektioner
//
// Förbättring (P2): byt till strict CSP m. nonces vid större EJS-refaktor.
const isProdEnv = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:   ["'self'"],
      // 'unsafe-inline' + 'unsafe-eval' krävs för EJS inline-scripts + ev. dynamic import.
      // Cloudflare Turnstile kräver challenges.cloudflare.com; Stripe checkout har egen origin.
      scriptSrc:    ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://challenges.cloudflare.com', 'https://js.stripe.com'],
      styleSrc:     ["'self'", "'unsafe-inline'"],
      imgSrc:       ["'self'", 'data:', 'https:'], // tillåt https-bilder (YouTube-thumbnails, etc.)
      fontSrc:      ["'self'", 'data:'],
      connectSrc:   ["'self'", 'https://api.stripe.com', 'https://challenges.cloudflare.com'],
      // YouTube för videogenomgångar, Turnstile för CAPTCHA, Stripe för checkout-redirect
      frameSrc:     ['https://www.youtube.com', 'https://www.youtube-nocookie.com', 'https://challenges.cloudflare.com', 'https://js.stripe.com', 'https://hooks.stripe.com'],
      mediaSrc:     ["'self'", 'https:', 'blob:'], // för pro-tier audio-uppladdning preview
      objectSrc:    ["'none'"], // blocka <object>, <embed>, <applet>
      baseUri:      ["'self'"],
      formAction:   ["'self'", 'https://checkout.stripe.com'],
      frameAncestors: ["'self'"], // anti-clickjacking — endast själva sidan kan iframea oss
      ...(isProdEnv ? { upgradeInsecureRequests: [] } : {}), // bara prod — dev kör http
    },
  },
  crossOriginEmbedderPolicy: false, // YouTube iframes kräver disabled
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // HSTS: bara prod — utvecklings-localhost ska inte tvingas https
  ...(isProdEnv ? { hsts: { maxAge: 31536000, includeSubDomains: true, preload: false } } : { hsts: false }),
}));
app.disable('x-powered-by'); // already removed by helmet but belt-and-suspenders

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Gzip-compression — minskar 235 KB CSS+JS till ~40 KB över wire (~80% reduktion).
// On 3G mobile = ~2s snabbare första pageload. Filter:ar bort PDF/EPUB/audio
// (redan kompimerade) för att inte slösa CPU.
app.use(compression({
  filter: (req, res) => {
    const ct = res.getHeader('Content-Type') || '';
    // Skippa redan-komprimerade format
    if (/\b(pdf|epub|zip|gzip|jpeg|png|gif|webp|mp3|mp4|m4a|ogg)\b/i.test(String(ct))) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // <1 KB = inte värt att gzip:a
}));

// Static files med 30-dagars cache-headers — CSS/JS uppdateras sällan,
// browsers behöver inte refetcha varje page-load. För dev (NODE_ENV ej satt)
// behåller vi short cache så vi ser ändringar direkt.
const STATIC_MAX_AGE = (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT)
  ? 30 * 24 * 60 * 60  // 30 dagar i sek
  : 0;
app.use(express.static('public', {
  maxAge: STATIC_MAX_AGE * 1000, // express vill ha ms
  etag: true,                    // 304 Not Modified vid omatchad If-None-Match
  lastModified: true,
}));
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
  keyGenerator: (req) => `chat_${req.session?.userId || ipKeyGenerator(req)}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'För många meddelanden. Vänta lite och försök igen.' });
  },
});

// ── Rate limiter — max 60 quiz submissions per 10 min per user ───────────────

const quizLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // 6 blocks × 10 retries
  keyGenerator: (req) => `quiz_${req.session?.userId || ipKeyGenerator(req)}`,
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
  keyGenerator: (req) => `note_${req.session?.userId || ipKeyGenerator(req)}`,
  handler: (req, res) => res.redirect('/dashboard'),
});

// ── Rate limiter — max 20 note deletes per 10 min per user ───────────────────

const noteDeleteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `notedel_${req.session?.userId || ipKeyGenerator(req)}`,
  handler: (req, res) => res.redirect('/dashboard'),
});

// ── Rate limiter — max 3 account delete attempts per 15 min per user ─────────

const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => `del_${req.session?.userId || ipKeyGenerator(req)}`,
  handler: (req, res) => res.redirect('/dashboard?deleteError=1'),
});

// ── Rate limiter — max 10 password changes per hour per user ─────────────────

const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `pwchg_${req.session?.userId || ipKeyGenerator(req)}`,
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

/**
 * Tier-aware välkomstmejl. Free/Premium/Pro får olika kontext + CTA + steg.
 *
 * Vid /register skapas konto alltid som 'free' så registrerings-flödet
 * får free-version. Admin-resend (POST /admin/users/:id/email) använder
 * användarens NUVARANDE role → premium/pro-konto får rätt content.
 *
 * @param {string} username   — display-name eller first_name
 * @param {string} baseUrl    — t.ex. "https://app.joakimjaksen.se"
 * @param {string} [role]     — 'free' | 'premium' | 'pro' | 'admin'. Default 'free'.
 */
function buildWelcomeEmail(username, baseUrl, role = 'free') {
  const isPro     = role === 'pro' || role === 'admin';
  const isPremium = role === 'premium' || isPro;
  const totalBlocks = salesBlocks.length;

  // Header-tagline + access-text
  const accessLine = isPro
    ? `Du har <strong style="color:#fbbf24;">Pro-tier</strong>: alla ${totalBlocks} block, AI-coachen Jocke <em>plus</em> AI-samtalsanalys där du laddar upp dina riktiga kundsamtal och får skarp feedback.`
    : isPremium
    ? `Du har <strong style="color:#a5b4fc;">Premium-tier</strong>: alla ${totalBlocks} block, AI-coachen Jocke, säljordboken — hela utbildningen är upplåst.`
    : `Du har tillgång till <strong style="color:#e2e8f0;">introduktionsblocken</strong> helt gratis. Teorin, videon och provet — allt är redan redo för dig.`;

  // 3-stegs onboarding-checklist
  const stepsHtml = isPro
    ? `
        <p style="margin:0;color:#94a3b8;font-size:14px;">1️⃣ &nbsp;Logga in på <a href="${baseUrl}" style="color:#818cf8;">app.joakimjaksen.se</a></p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">2️⃣ &nbsp;Ladda upp ditt första kundsamtal för AI-analys</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">3️⃣ &nbsp;Eller börja med Block 1 om du vill bygga grunden</p>`
    : isPremium
    ? `
        <p style="margin:0;color:#94a3b8;font-size:14px;">1️⃣ &nbsp;Logga in på <a href="${baseUrl}" style="color:#818cf8;">app.joakimjaksen.se</a></p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">2️⃣ &nbsp;Börja med Block 1 — eller hoppa till det område du vill bemästra</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">3️⃣ &nbsp;Träna med Jocke (AI-rollspel) i varje block</p>`
    : `
        <p style="margin:0;color:#94a3b8;font-size:14px;">1️⃣ &nbsp;Logga in på <a href="${baseUrl}" style="color:#818cf8;">app.joakimjaksen.se</a></p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">2️⃣ &nbsp;Läs teorin i Block 1</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;">3️⃣ &nbsp;Gör provet och se hur du presterar</p>`;

  // Primär CTA — destination + text matchar tier
  const ctaUrl = isPro
    ? `${baseUrl}/pro`
    : isPremium
    ? `${baseUrl}/learn`
    : `${baseUrl}/learn/inledning`;

  const ctaText = isPro
    ? '🎙️ Öppna Pro-Samtalsanalys →'
    : isPremium
    ? 'Öppna utbildningen →'
    : 'Gå till Block 1 →';

  // Footer-uppgrade-prompt visas BARA för free-users (premium/pro behöver inte säljas till)
  const upgradeFooter = !isPremium
    ? `<p style="color:#475569;font-size:13px;line-height:1.6;margin:0 0 8px;">
         När du är redo för mer — uppgradera till Premium och lås upp alla ${totalBlocks} block, AI-coachen Jocke och videogenomgångarna.
       </p>`
    : '';

  return emailShell(`
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#f1f5f9;">Välkommen, ${username}! 🎯</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Ditt konto är nu aktivt.</p>

    <p style="color:#94a3b8;line-height:1.7;margin:0 0 16px;">
      ${accessLine}
    </p>

    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em;">Kom igång på 3 steg</p>
      <div style="display:flex;flex-direction:column;gap:8px;">${stepsHtml}
      </div>
    </div>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr><td style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:15px;">
          ${ctaText}
        </a>
      </td></tr>
    </table>

    ${upgradeFooter}

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
  // Vid impersonation: endast ursprungs-admin får komma åt admin-panelen
  // (session.role kan vara 'free'/'premium' under impersonation).
  if (req.session?.impersonatedBy?.role === 'admin') return next();
  if (req.session?.role === 'admin') return next();
  res.status(403).send('Åtkomst nekad.');
}

// ── CI (Conversation Intelligence) access control ───────────────────────────
// Admin har alltid tillgång. Därutöver kan specifika user-IDs ges tillgång
// via env-var CI_ALLOWED_USER_IDS=12,47,89 (komma-separerade integers).
// Används för att ge testkonton (t.ex. arbetsledare) åtkomst till /admin/calls
// UTAN att ge full admin-roll. Håller rollen som 'pro' eller 'premium' kvar.
// Tomt/osatt env-var = bara admin får åtkomst (default-säkert).
const CI_ALLOWED_USER_IDS = new Set(
  (process.env.CI_ALLOWED_USER_IDS || '')
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isInteger(n) && n > 0)
);

function requireCIAccess(req, res, next) {
  // Admin (inkl. impersonation som admin) — alltid OK
  if (req.session?.impersonatedBy?.role === 'admin') return next();
  if (req.session?.role === 'admin') return next();
  // Allowlist via env-var
  if (CI_ALLOWED_USER_IDS.has(req.session?.userId)) return next();
  res.status(403).send('Åtkomst nekad. Kontakta Joakim om du ska ha tillgång till samtalsanalysen.');
}

// Destruktiva actions (radera, retry) på /admin/calls kräver admin även om
// user är på allowlisten. Arbetsledare ska kunna SE och LADDA UPP samtal, men
// inte råka radera andras arbete.
function requireAdminForDestructive(req, res, next) {
  if (req.session?.impersonatedBy?.role === 'admin') return next();
  if (req.session?.role === 'admin') return next();
  res.status(403).send('Bara admin kan radera eller retry:a samtal. Kontakta Joakim.');
}

/**
 * Audit-log-wrapper: fire-and-forget loggning av admin-åtgärd från en route.
 * Använder impersonatedBy-adminId om under impersonation, annars session.userId.
 * ip hämtas från request — anonymiserad (bara /24-prefix) för att undvika
 * onödig personuppgifts-lagring.
 */
function audit(req, action, target, metadata) {
  try {
    const adminId  = req.session?.impersonatedBy?.adminUserId || req.session?.userId;
    const adminUsr = req.session?.impersonatedBy?.username    || req.session?.username;
    if (!adminId) return;
    // Anonymisera IP till /24 prefix (sista oktett 0)
    const rawIp = req.ip || req.connection?.remoteAddress || '';
    const anonIp = rawIp.replace(/\.\d+$/, '.0').replace(/:[0-9a-f]+:[0-9a-f]+$/i, '::0/64');
    logAdminAction(adminId, adminUsr, action, target, metadata, anonIp);
  } catch (_) { /* never throw from audit */ }
}

// ── Impersonation guard ──────────────────────────────────────────────────────
// Under impersonation BLOCKERAS destruktiva actions som skulle ändra target-
// users permanenta data (lösenord, kontoradering, billing-portal, betalning).
// Alla "read-only + create content" är tillåtna för autentisk support-debugging.
function blockWhenImpersonating(req, res, next) {
  if (req.session?.impersonatedBy) {
    return res.status(403).send(
      'Åtgärden är blockerad under impersonation. ' +
      'Stoppa impersonation först (banner högst upp) och logga in som admin.'
    );
  }
  next();
}

// Middleware som injicerar impersonation-status i res.locals så alla views
// kan visa banner utan att varje render-anrop måste skicka flaggan.
app.use((req, res, next) => {
  if (req.session?.impersonatedBy) {
    res.locals.impersonation = {
      active: true,
      targetUsername: req.session.username,
      adminUsername:  req.session.impersonatedBy.username,
    };
  } else {
    res.locals.impersonation = { active: false };
  }

  // Pro-trial-status: lookup:as från DB för inloggade users och exponeras
  // till alla views via res.locals.proTrial (active + hoursLeft + endsAt)
  res.locals.proTrial = { active: false };
  if (req.session?.userId && req.session?.role === 'pro') {
    try {
      const user = findUserById(req.session.userId);
      if (user?.pro_trial_end_at) {
        const endMs = new Date(user.pro_trial_end_at).getTime();
        const nowMs = Date.now();
        if (endMs > nowMs) {
          const hoursLeft = Math.max(1, Math.round((endMs - nowMs) / (60 * 60 * 1000)));
          res.locals.proTrial = {
            active:     true,
            hoursLeft,
            endsAt:     user.pro_trial_end_at,
            endsAtDate: new Date(endMs).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }),
          };
        }
      }
    } catch (_) {}
  }
  next();
});

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
  // Email är nu primär identifier. Vi accepterar också gammalt `username`-fält
  // (backwards-compat för ev. cachade formulär i browsers) och försöker via
  // username-lookup som fallback — så ingen ruttar på ett tidigare inloggningssätt.
  const rawId = (req.body.email || req.body.username || '').trim().toLowerCase();
  const password = req.body.password || '';

  // Försök email först om input innehåller @, annars fallback till username
  let user = null;
  if (rawId.includes('@')) {
    user = findUserByEmail(rawId);
  } else {
    user = findUserByUsername(rawId);
  }

  // Account-lockout: kolla om kontot är låst pga för många failed logins
  // (skydd mot distribuerad brute-force som kringgår per-IP-rate-limit).
  if (user) {
    const lockStatus = isUserLocked(user);
    if (lockStatus.locked) {
      console.warn(`🔒 Login attempt på låst konto: user ${user.id}, ${lockStatus.minutesLeft}m kvar`);
      return res.render('login', {
        error: `Kontot är tillfälligt låst pga för många misslyckade inloggningar. Försök igen om ${lockStatus.minutesLeft} minuter.`,
        registerError: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      });
    }
  }

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    // Räkna failed attempt om user finns (skippa om user inte finns —
    // vi vill inte heller läcka info om vilka konton som existerar).
    if (user) {
      const result = recordFailedLogin(user.id);
      if (result.locked) {
        // Larma warning — admin-konto låst = potentiellt riktig attack
        const isAdmin = user.role === 'admin';
        notifyAdmin(isAdmin ? 'critical' : 'warning',
          `Account locked: ${user.username}${isAdmin ? ' (ADMIN)' : ''}`,
          `Konto låst i 15 min efter 5 misslyckade login-försök. ${isAdmin ? 'ADMIN-konto — möjlig riktad attack.' : 'Möjlig brute-force eller user glömde lösenord.'}`,
          { userId: user.id, username: user.username, email: user.email, role: user.role, ip: req.ip }
        );
        return res.render('login', {
          error: 'Kontot är nu låst i 15 minuter pga för många misslyckade försök.',
          registerError: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
        });
      }
    }
    return res.render('login', {
      error: 'Fel e-post eller lösenord.',
      registerError: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
    });
  }

  // Successful login → reset failed-counter
  clearFailedLogins(user.id);

  // Läs returnTo INNAN regenerate — sessionen nollställs annars
  const returnTo = (isSafeReturnPath(req.session?.returnTo) ? req.session.returnTo : null);

  // Regenerate session ID to prevent session fixation attacks
  req.session.regenerate((err) => {
    if (err) return res.redirect('/login');
    req.session.userId    = user.id;
    // session.username används som display i templates. Prio: first_name,
    // fallback till user.username. Så "Hej, Joakim" istället för "Hej, jaksen".
    req.session.username  = displayName(user);
    req.session.role      = user.role;
    req.session.pwVersion = user.pw_version || 0; // stored for session-invalidation after pw reset
    updateLastLogin(user.id);
    // Landa på deep-link om sådan sparades av requireLogin — annars dashboard
    res.redirect(returnTo || '/dashboard');
  });
});

app.post('/register', registerLimiter, async (req, res) => {
  const { email, password, confirmPassword, gdpr, firstName, lastName } = req.body;
  const turnstileToken = req.body['cf-turnstile-response'];

  // Verify Turnstile CAPTCHA (skip if no secret key configured)
  const turnstileSecret = process.env['TURNSTILE_SECRET_KEY'];
  if (turnstileSecret) {
    if (!turnstileToken) {
      return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
        registerError: 'Verifiera att du inte är en robot.' });
    }
    try {
      const verify = await fetchWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
      }, TIMEOUT.fast);
      const result = await verify.json();
      if (!result.success) {
        return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
          registerError: 'CAPTCHA-verifiering misslyckades. Försök igen.' });
      }
    } catch (err) {
      // Turnstile down/timeout → blockera registrering hellre än att släppa förbi
      // (open-fail = bot-vågor som dränker DB). Larma så vi vet om Cloudflare hänger.
      console.error('Turnstile verify error:', err.message);
      notifyAdmin('warning', 'Turnstile verify failed/timeout',
        'Registreringar blockas tills detta löser sig — open-fail är värre.',
        { error: err.message });
      return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
        registerError: 'Verifiering kunde inte slutföras just nu. Försök igen om en stund.' });
    }
  }

  if (!email || !password || !firstName || !lastName)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Fyll i alla fält.' });

  // Namn-validering: 1-50 tecken, ingen HTML-garbage
  const cleanFirst = firstName.trim();
  const cleanLast  = lastName.trim();
  if (cleanFirst.length < 1 || cleanFirst.length > 50 || cleanLast.length < 1 || cleanLast.length > 50)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'För- och efternamn måste vara 1–50 tecken.' });
  if (/<|>|\{|\}/.test(cleanFirst + cleanLast))
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Namn kan inte innehålla HTML-tecken.' });

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

  // Auto-derivera unikt username-slug: prio 1 från förnamn (lowercase, rensat),
  // fallback från email-local-part om förnamn inte ger unik match.
  // Username är internt; displayName() visar först förnamn, sen username.
  const firstNameSlug = cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  let username;
  if (firstNameSlug && !findUserByUsername(firstNameSlug)) {
    username = firstNameSlug;
  } else {
    // Förnamn upptaget eller tom slug → generera från email
    username = generateUsernameFromEmail(email.trim());
  }

  // IP fångas för fraud-detection vid framtida referral-grants
  const registerIp = req.ip || req.connection?.remoteAddress || null;
  const result = createUser(username, email.trim(), password, cleanFirst, cleanLast, registerIp);
  if (!result.ok)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: result.error });

  // Funnel: registrering klar (kohort-startpunkt)
  logFunnelEvent(result.userId, 'register_completed');

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
  // Reliable wrapper: vid tillfälligt Resend-fel queue:as mejlet och retry:as i bg-worker.
  // Förstaintrycket är kritiskt — vi vill inte tappa det pga API-hicka.
  const baseUrl = process.env['APP_URL'] || 'https://manapp-production.up.railway.app';
  try {
    await sendEmailReliable({
      to:      email.trim(),
      subject: `Välkommen, ${cleanFirst}! Ditt konto är aktivt 🎯`,
      html:    buildWelcomeEmail(cleanFirst, baseUrl),
      kind:    'welcome',
    });
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
          success: `Konto skapat! Logga in med ${email.trim()}.` });
      }
      req.session.userId    = newUser.id;
      req.session.username  = displayName(newUser); // först förnamn, sen username
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
    success: `Konto skapat! Välkommen ${cleanFirst} — logga in med ${email.trim()}.` });
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
  const startTime = Date.now();
  const user = findUserByEmail(email?.trim().toLowerCase());

  // Skicka mejl + skapa token om user finns. Annars: kör en dummy-delay
  // så response-tiden är jämn oavsett — eliminerar timing-side-channel
  // för email-enumeration. Industri-standard säkerhetsmönster.
  if (user) {
    const token   = createResetToken(user.id);
    const baseUrl = process.env['APP_URL'] || 'https://app.joakimjaksen.se';
    const link    = `${baseUrl}/reset-password/${token}`;

    try {
      // KRITISKT mejl — user är utlåst utan reset-länken. Reliable wrapper queue:ar vid fail
      // så de retry:as i bg-worker även om Resend är tillfälligt nere/rate-limited.
      await sendEmailReliable({
        to:      user.email,
        subject: 'Återställ ditt lösenord — Joakim Jaksen',
        html:    buildPasswordResetEmail(user.first_name || user.username, link),
        kind:    'password_reset',
      });
    } catch (err) {
      console.error('Resend error:', err.message);
    }
  } else {
    // Constant-time-ish: vänta ungefär lika länge som token-creation + mail-send
    // skulle tagit (200-400ms typiskt). Litet jitter förhindrar exakt-match-detection.
    const baseDelay = 250 + Math.floor(Math.random() * 150);
    const elapsed = Date.now() - startTime;
    const remainingDelay = Math.max(0, baseDelay - elapsed);
    await new Promise(r => setTimeout(r, remainingDelay));
  }

  // Always show same success message — prevent email enumeration
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
  // Funnel: första dashboard-besök (idempotent — INSERT OR IGNORE)
  logFunnelEvent(req.session.userId, 'first_dashboard_visit');

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

  // "Fortsätt där du slutade" — smart deeplink till senaste relevanta block
  const continueTarget = getContinueTarget(req.session.userId);
  let continueBlock = null;
  if (continueTarget) {
    const block = salesBlocks.find(b => b.id === continueTarget.blockId);
    if (block) {
      const blockIdx = salesBlocks.findIndex(b => b.id === block.id);
      continueBlock = {
        id: block.id,
        title: block.title,
        icon: block.icon,
        index: blockIdx + 1,
        reason: continueTarget.reason,
        // Reason-specifikt CTA-label
        cta: continueTarget.reason === 'mission_in_progress' ? 'Fortsätt ditt uppdrag'
           : continueTarget.reason === 'recently_visited'    ? 'Fortsätt där du slutade'
           : continueTarget.reason === 'steps_remaining'     ? 'Slutför alla 4 steg'
           : 'Fortsätt',
      };
    }
  }

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
    continueBlock,
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

// ── Block-search — fulltext över theory + outcomes + scripts ───────────────
// Existing client-filter på /learn söker bara block-titel/subtitle.
// Detta är djupsök i hela innehållet — hitta var ett specifikt begrepp diskuteras.
app.get('/learn/sok', requireLogin, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  let results = [];

  if (q && q.length >= 2) {
    const role = req.session.role;
    const isPremium = isPremiumOrHigher(role);

    for (const block of salesBlocks) {
      const isLocked = !isPremium && !FREE_BLOCK_IDS.includes(block.id);
      let score = 0;
      const matches = [];

      // Title-match (highest weight)
      if (block.title && block.title.toLowerCase().includes(q)) {
        score += 5;
        matches.push({ where: 'title', text: block.title });
      }
      if (block.subtitle && block.subtitle.toLowerCase().includes(q)) {
        score += 3;
        matches.push({ where: 'subtitle', text: block.subtitle });
      }
      if (block.outcomeTitle && block.outcomeTitle.toLowerCase().includes(q)) {
        score += 4;
        matches.push({ where: 'outcome', text: block.outcomeTitle });
      }

      // Theory-fulltext: räkna träffar och extrahera snippet runt första
      if (block.theory) {
        const plainTheory = block.theory.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const lower = plainTheory.toLowerCase();
        let idx = lower.indexOf(q);
        let occurrences = 0;
        while (idx !== -1) {
          occurrences++;
          idx = lower.indexOf(q, idx + q.length);
        }
        if (occurrences > 0) {
          score += occurrences;
          // Snippet runt första träffen — 120 tecken före + 180 efter
          const firstIdx = lower.indexOf(q);
          const start = Math.max(0, firstIdx - 120);
          const end = Math.min(plainTheory.length, firstIdx + q.length + 180);
          let snippet = plainTheory.slice(start, end).trim();
          if (start > 0) snippet = '…' + snippet;
          if (end < plainTheory.length) snippet = snippet + '…';
          matches.push({ where: 'theory', text: snippet, occurrences });
        }
      }

      // Concrete scripts
      if (block.concreteScripts && block.concreteScripts.length) {
        for (const s of block.concreteScripts) {
          if (s.toLowerCase().includes(q)) {
            score += 2;
            matches.push({ where: 'script', text: s });
          }
        }
      }

      if (score > 0) {
        results.push({
          block: { id: block.id, title: block.title, subtitle: block.subtitle, icon: block.icon, gradient: block.gradient },
          score,
          matches,
          isLocked,
        });
      }
    }

    // Sortera efter score desc, max 20 resultat
    results.sort((a, b) => b.score - a.score);
    results = results.slice(0, 20);
  }

  res.render('learn-sok', {
    username: req.session.username,
    role:     req.session.role,
    query:    req.query.q || '',
    results,
    totalBlocks: salesBlocks.length,
  });
});

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

/**
 * Beräkna ETT primärt nästa-steg för blocket — coach-tonalitet, inte meny.
 * Driver användaren från konsumtion → handling → progression.
 * Tar emot journey-status (kan vara null för teaser-läge) och returnerar
 * { label, href, icon, desc } eller null om inget nästa-steg behövs.
 */
function computeNextBestStep(block, journey, blocks) {
  if (!journey) return null;

  // Steg 1: läs teorin → ta provet (provet är gating för "theoryDone")
  if (!journey.theoryDone) {
    return {
      icon: '🧠',
      label: 'Testa om du fattat blocket',
      href:  `/learn/${block.id}/prov`,
      desc:  '10 frågor — bekräfta din förståelse innan du tränar.',
    };
  }
  // Steg 2: öva med Jocke
  if (!journey.roleplayDone && block.roleplays && block.roleplays.length) {
    return {
      icon: '🎭',
      label: 'Öva med Jocke',
      href:  `/learn/${block.id}/ova`,
      desc:  `${block.roleplays.length} scenarier — träna i tryggt läge innan riktiga kunder.`,
    };
  }
  // Steg 3: veckans uppdrag
  if (!journey.missionDone && block.mission) {
    return {
      icon: '🎯',
      label: 'Gör veckans uppdrag',
      href:  `/learn/${block.id}/uppdrag`,
      desc:  block.mission.title || 'Konkret handling att göra IRL den här veckan.',
    };
  }
  // Steg 4: reflektion
  if (!journey.reflectionDone && block.reflections && block.reflections.length) {
    return {
      icon: '💭',
      label: 'Skriv reflektion',
      href:  `/learn/${block.id}/reflektion`,
      desc:  'Stäng cirkeln — låt lärandet sjunka in via egna ord.',
    };
  }
  // Allt klart → nästa block, eller hela kursen klar
  const idx = blocks.findIndex(b => b.id === block.id);
  const next = blocks[idx + 1];
  if (next) {
    return {
      icon: '➡️',
      label: `Nästa block: ${next.title}`,
      href:  `/learn/${next.id}`,
      desc:  'Du har bemästrat detta. Vidare.',
    };
  }
  return {
    icon: '🏆',
    label: `Du har klarat alla ${salesBlocks.length} block`,
    href:  '/learn',
    desc:  'Hela utbildningen genomförd. Tillbaka till översikten.',
  };
}

app.get('/learn/:id', requireLogin, (req, res) => {
  const block      = salesBlocks.find(b => b.id === req.params.id);
  if (!block) return res.redirect('/learn');

  const isPremium  = !FREE_BLOCK_IDS.includes(block.id);
  const hasAccess  = isPremiumOrHigher(req.session.role);
  const isTeaser   = isPremium && !hasAccess;

  // Funnel: första block-öppning (oavsett vilket block). Inkluderar teaser-besök
  // — det är fortfarande en aktivering signal ("användaren utforskar content").
  logFunnelEvent(req.session.userId, 'first_block_opened', { blockId: block.id, isTeaser });

  const progress   = getBlockProgress(req.session.userId);
  const blockProg  = progress[block.id] || {};

  // Estimate reading time (200 wpm average)
  const wordCount  = (block.theory || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const readTime   = Math.max(1, Math.round(wordCount / 200));

  // 4-step journey status (only for users with access)
  const journey = hasAccess || FREE_BLOCK_IDS.includes(block.id)
    ? getJourneyStatus(req.session.userId, block.id)
    : null;

  // Server-beräknat nästa-steg (driver progression i bottom-CTA)
  const nextBestStep = computeNextBestStep(block, journey, salesBlocks);

  // Block-audio: om Joakim laddat upp en MP3 visar vi player ovanför teori.
  // Bara metadata behövs här (för UI-toggle); URL:en hämtas via /audio/blocks/:id.mp3
  // som redirect:ar till signed R2-URL eller streamar.
  const audioMeta = !isTeaser ? getBlockAudio(block.id) : null;
  const blockAudio = audioMeta ? {
    url:         `/audio/blocks/${block.id}.mp3?v=${audioMeta.version}`,
    durationSec: audioMeta.duration_sec,
    bytes:       audioMeta.bytes,
    version:     audioMeta.version,
  } : null;

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
    nextBestStep,
    blockAudio,
    welcome:            req.query.welcome === '1',
    freeTierCompleted,
    justUnlockedFreeTier,
    csrfToken:    generateCsrfToken(req),
  });
});

// ── Prov (quiz) som egen route ─────────────────────────────────────────────
// Quiz är inte material — det är kontroll av förståelse. Egen sida = konsekvent
// med Öva/Gör/Reflektera, och låter block-sidan vara renodlad lektion (video + teori).
app.get('/learn/:id/prov', requireLogin, (req, res) => {
  const block = resolveBlock(req, res);
  if (!block) return;
  if (!block.quiz || !block.quiz.length) return res.redirect('/learn/' + block.id);

  // Funnel: första prov-besök
  logFunnelEvent(req.session.userId, 'first_quiz_attempted', { blockId: block.id });

  const journey = getJourneyStatus(req.session.userId, block.id);
  res.render('prov', {
    username:     req.session.username,
    role:         req.session.role,
    block,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
    journey,
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

  // Funnel: första rollspels-besök — premium killer feature engagement
  logFunnelEvent(req.session.userId, 'first_roleplay_visit', { blockId: block.id });

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

app.post('/quiz-result', requireLogin, quizLimiter, verifyCsrf, async (req, res) => {
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

  const result = saveQuizResult(req.session.userId, blockId, scoreNum, totalNum);

  // Funnel: första gången användaren passar (>=60%) ett quiz — central aktivering
  // (visar att de inte bara öppnat material utan faktiskt absorberat det)
  if (scoreNum / totalNum >= 0.6) {
    logFunnelEvent(req.session.userId, 'first_quiz_passed', { blockId, score: scoreNum, total: totalNum });
  }

  // Svara direkt — mail triggas fire-and-forget så användaren inte väntar
  res.json({ ok: true });

  // ── Block-completion-mejl: fire ENDAST vid första-gångs-pass ─────────────
  // Idempotent via firstCompletion-flaggan från saveQuizResult
  if (!result.firstCompletion || !resend) return;
  try {
    const user = findUserById(req.session.userId);
    if (!user?.email) return;
    const prefs = getUserPreferences(req.session.userId);
    if (prefs.email_retention === false) return; // respektera opt-out

    const blockIndex = salesBlocks.findIndex(b => b.id === blockId);
    const nextBlockRaw = salesBlocks[blockIndex + 1];
    const totalDone = getCompletedBlockCount(req.session.userId);

    // Om user är free och nästa block är premium → flagga som "free-tier-end"
    const isFreeTierEnd = req.session.role === 'free' &&
                          FREE_BLOCK_IDS.includes(blockId) &&
                          nextBlockRaw && !FREE_BLOCK_IDS.includes(nextBlockRaw.id);

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const unsubToken = emails.createUnsubscribeToken(user.id);
    const unsubUrl   = `${baseUrl}/unsubscribe/${unsubToken}`;

    const personalName = displayName(user); // först förnamn, fallback username
    // Engagement-loop mejl — viktigt att det når fram så user kommer tillbaka till nästa block.
    await sendEmailReliable({
      to:      user.email,
      subject: `🎯 Grymt, ${personalName}! Du klarade Block ${blockIndex + 1}`,
      html:    emails.buildBlockCompletion({
        username:      personalName,
        block:         { id: block.id, title: block.title, icon: block.icon, index: blockIndex + 1 },
        nextBlock:     nextBlockRaw ? { id: nextBlockRaw.id, title: nextBlockRaw.title, icon: nextBlockRaw.icon, index: blockIndex + 2 } : null,
        totalDone,
        totalBlocks:   salesBlocks.length,
        baseUrl,
        unsubscribeUrl: unsubUrl,
        isFreeTierEnd,
      }),
      kind:    'block_completion',
    });
    console.log(`📧 Block-completion-mejl skickat till ${user.email} (block ${block.id})`);
  } catch (err) {
    console.error('Block completion email failed:', err.message);
  }
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
          username: displayName(user),
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
        username: displayName(user),
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
 * Admin-veckodigest — söndag morgon-mejl till alla admins.
 * Skyddas med CRON_SECRET så den kan triggas av Railway Cron eller manuellt.
 *
 * Trigger: GET /cron/admin-digest?key=<CRON_SECRET>[&dry=1]
 * - dry=1 → returnera HTML i response istället för att skicka mejl
 *
 * Skickar till alla users med role='admin' som har email satt.
 * Stats hämtas via getAdminDigestStats() — aggregerat över senaste 7 dagar.
 */
app.get('/cron/admin-digest', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.query.key !== cronSecret) {
    return res.status(403).json({ ok: false, error: 'Invalid cron key' });
  }
  const dryRun  = req.query.dry === '1';
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  try {
    const stats  = getAdminDigestStats();
    const now    = new Date();
    const start  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fmtDate = (d) => d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    const weekRange = `${fmtDate(start)} – ${fmtDate(now)}`;
    const mail = emails.buildAdminDigestEmail({ stats, baseUrl, weekRange });

    if (dryRun) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`
        <div style="background:#f1f5f9;padding:1rem;color:#475569;font-family:system-ui;">
          <strong>DRY RUN — inget skickat.</strong> Ämne: <em>${mail.subject}</em>
        </div>
        ${mail.html}
      `);
    }

    // Hitta alla admin-konton med email
    const admins = getAllUsers().filter(u => u.role === 'admin' && u.email);
    if (!admins.length) return res.json({ ok: true, sent: 0, reason: 'no admin recipients' });

    let sent = 0, failed = 0;
    for (const admin of admins) {
      try {
        await sendEmailReliable({
          to:      admin.email,
          subject: mail.subject,
          html:    mail.html,
          kind:    'admin_digest',
        });
        sent++;
      } catch (err) {
        failed++;
        console.error(`Admin digest failed för ${admin.email}:`, err.message);
      }
    }
    res.json({ ok: true, sent, failed, recipients: admins.length });
  } catch (err) {
    console.error('Admin digest job error:', err.message);
    notifyAdmin('warning', 'Admin digest cron failed', err.message, { error: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Förhandsgranska admin-digest med live data — open in browser för design-check.
 * Skyddad av requireAdmin. Skickar INGET — bara renderar.
 */
app.get('/admin/test-admin-digest', requireLogin, requireAdmin, async (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  try {
    const stats = getAdminDigestStats();
    const now = new Date();
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fmtDate = (d) => d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
    const weekRange = `${fmtDate(start)} – ${fmtDate(now)}`;
    const mail = emails.buildAdminDigestEmail({ stats, baseUrl, weekRange });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <div style="background:#0f172a;padding:1rem;color:#94a3b8;font-family:system-ui;">
        <strong>PREVIEW — admin-digest med LIVE data.</strong> Inget mejl skickas.<br>
        Ämne: <em style="color:#a5b4fc;">${mail.subject}</em><br>
        <a href="?send=1" onclick="return confirm('Skicka riktigt mejl till alla admin-konton?');" style="color:#34d399;">📧 Skicka på riktigt</a>
      </div>
      ${mail.html}
    `);
  } catch (err) {
    res.status(500).send(`<pre style="color:#ef4444;padding:2rem;">Error: ${err.message}</pre>`);
  }
});

/**
 * Admin-endpoint: skicka test-digest till inloggad admin själv.
 * Bypass CRON_SECRET eftersom vi är inloggad admin — säker route.
 */
app.get('/admin/test-trial-reminder', requireLogin, requireAdmin, async (req, res) => {
  // Förhandsgranska trial-reminder-mejl med mockdata. Ingen data skickas.
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const user = findUserById(req.session.userId);
  const mockEnd = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10h i framtiden
  const unsubToken = emails.createUnsubscribeToken(user?.id || 0);
  const html = emails.buildTrialEndingSoon({
    username:       user?.username || 'admin',
    endsAtHuman:    mockEnd.toLocaleString('sv-SE', { weekday: 'long', hour: '2-digit', minute: '2-digit' }),
    hoursLeft:      10,
    proUrl:         `${baseUrl}/pro`,
    cancelUrl:      `${baseUrl}/account`,
    unsubscribeUrl: `${baseUrl}/unsubscribe/${unsubToken}`,
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

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
        username: displayName(user),
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
        username: displayName(user),
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
    // Full name för professional presentation på publik cert-URL
    username:  user.username, // fallback för legacy-templates
    certName:  fullName(user) || user.username,
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
  // Certifikat ska visa full name om det finns — professional för LinkedIn-sharing.
  // Fallback till session.username (som redan är displayName) för legacy-konton.
  const user = findUserById(req.session.userId);
  const certName = fullName(user) || req.session.username;

  res.render('bevis', {
    username:  req.session.username, // för nav-bar (förnamn eller display)
    certName,                         // för själva certifikatet (full name)
    level,
    stats,
    totalBlocks: salesBlocks.length,
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
  // SVG visar full name om det finns — detta är vad som delas på LinkedIn
  const user = findUserById(req.session.userId);
  const name = fullName(user) || req.session.username || 'Säljare';
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
  <text x="100" y="380" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="22">Nivå ${level.id} av 5  ·  ${stats.xp} XP  ·  ${stats.totalBlocksMastered}/${salesBlocks.length} block bemästrade</text>

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

// ── Loggbok CSV-export — användaren laddar ner egen data ─────────────────────
// Separat från /account/export.json (full GDPR-dump) — detta är bara Loggboken,
// i tabular format för Excel/Sheets. Användbart för egna analys-dashboards.
app.get('/loggbok/export.csv', requireLogin, (req, res) => {
  const actions = getUserActions(req.session.userId, 10000);
  // CSV-escape: dubbla "-tecken och wrappa fält som innehåller , eller " eller \n
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ['date', 'time', 'category', 'count', 'note', 'block_id'].join(',');
  const rows = actions.map(a => {
    const dt = a.created_at ? new Date(a.created_at) : null;
    const date = dt ? dt.toISOString().slice(0, 10) : '';
    const time = dt ? dt.toISOString().slice(11, 19) : '';
    return [esc(date), esc(time), esc(a.category), esc(a.count), esc(a.note), esc(a.block_id)].join(',');
  });
  const csv = '\ufeff' + [header, ...rows].join('\n'); // BOM för Excel utf-8

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename  = `loggbok-${req.session.username}-${timestamp}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(csv);
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

app.post('/account/delete', requireLogin, blockWhenImpersonating, deleteLimiter, verifyCsrf, async (req, res) => {
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

// Stripe invoice-cache: per customerId, 5 min TTL. Sparar API-hits vid
// refreshes av /account. Enkel Map — räcker för current skala.
const invoiceCache = new Map();
const INVOICE_CACHE_TTL_MS = 5 * 60 * 1000;

async function getCachedStripeInvoices(customerId) {
  if (!customerId || !stripe) return [];
  const cached = invoiceCache.get(customerId);
  if (cached && Date.now() - cached.fetchedAt < INVOICE_CACHE_TTL_MS) {
    return cached.invoices;
  }
  try {
    const result = await stripe.invoices.list({ customer: customerId, limit: 24 });
    const simplified = result.data.map(inv => ({
      id:        inv.id,
      number:    inv.number,
      createdAt: new Date(inv.created * 1000).toISOString(),
      amountPaid: inv.amount_paid,
      amountDue:  inv.amount_due,
      currency:  inv.currency,
      status:    inv.status,
      description: (inv.lines?.data?.[0]?.description) || '',
      hostedUrl: inv.hosted_invoice_url,
      pdfUrl:    inv.invoice_pdf,
      periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      periodEnd:   inv.period_end   ? new Date(inv.period_end   * 1000).toISOString() : null,
    }));
    invoiceCache.set(customerId, { invoices: simplified, fetchedAt: Date.now() });
    return simplified;
  } catch (err) {
    console.error('Stripe invoices fetch failed:', err.message);
    return [];
  }
}

app.get('/account', requireLogin, async (req, res) => {
  const user = findUserById(req.session.userId);
  // Hämta Stripe-fakturor endast om user har stripe_customer_id (premium/pro/
  // ex-betalande). Fail-safe: om API går sönder visas tom lista.
  let invoices = [];
  if (user?.stripe_customer_id) {
    invoices = await getCachedStripeInvoices(user.stripe_customer_id);
  }
  res.render('account', {
    username:         req.session.username,
    role:             req.session.role,
    email:            user?.email || '',
    firstName:        user?.first_name || '',
    lastName:         user?.last_name  || '',
    pwError:          req.query.pwError || null,
    pwOk:             req.query.pwOk === '1',
    emailError:       req.query.emailError || null,
    emailOk:          req.query.emailOk === '1',
    nameError:        req.query.nameError || null,
    nameOk:           req.query.nameOk === '1',
    trialCancelled:   req.query.trialCancelled === '1',
    trialCancelError: req.query.trialCancelError || null,
    portalError:      req.query.portalError || null,
    invoices,
    csrfToken:        generateCsrfToken(req),
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

app.post('/account/change-password', requireLogin, blockWhenImpersonating, passwordChangeLimiter, verifyCsrf, async (req, res) => {
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

// ── Byt e-postadress ──────────────────────────────────────────────────────────
// Kräver password-re-confirm (skydd mot hijackad session).
// Syncar mot Stripe-customer så fakturor fortsätter gå till rätt adress.
app.post('/account/change-email', requireLogin, blockWhenImpersonating, passwordChangeLimiter, verifyCsrf, async (req, res) => {
  const { currentPassword, newEmail } = req.body;
  const user = findUserById(req.session.userId);

  if (!user || !(await bcrypt.compare(currentPassword || '', user.password_hash))) {
    return res.redirect('/account?emailError=pw');
  }
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
    return res.redirect('/account?emailError=invalid');
  }
  if (newEmail.trim().toLowerCase() === (user.email || '').toLowerCase()) {
    return res.redirect('/account?emailError=same');
  }

  const oldEmail = user.email;
  const result = updateUserEmail(user.id, newEmail);
  if (!result.ok) {
    const code = result.error === 'E-postadressen används redan.' ? 'taken' : 'unknown';
    return res.redirect('/account?emailError=' + code);
  }

  // Sync med Stripe så fakturor + kvitton går till nya adressen
  if (user.stripe_customer_id && stripe) {
    try {
      await stripe.customers.update(user.stripe_customer_id, {
        email: newEmail.trim().toLowerCase(),
      });
      console.log(`📧 Stripe customer-email syncad för user ${user.id}`);
    } catch (err) {
      console.error('Stripe email sync failed (DB uppdaterad ändå):', err.message);
    }
  }

  audit(req, 'user.email_change', { id: user.id, username: user.username },
        { from: oldEmail, to: newEmail.trim().toLowerCase() });
  res.redirect('/account?emailOk=1');
});

// ── Byt för-/efternamn ────────────────────────────────────────────────────────
// Ingen password-check (low-stakes, tillåter snabba updates efter giftermål etc).
app.post('/account/change-name', requireLogin, blockWhenImpersonating, verifyCsrf, (req, res) => {
  const { firstName, lastName } = req.body;

  if (!firstName?.trim() || !lastName?.trim()) {
    return res.redirect('/account?nameError=missing');
  }
  if (firstName.length > 50 || lastName.length > 50) {
    return res.redirect('/account?nameError=long');
  }
  if (/<|>|\{|\}/.test(firstName + lastName)) {
    return res.redirect('/account?nameError=html');
  }

  const user = findUserById(req.session.userId);
  if (!user) return res.redirect('/account?nameError=unknown');

  const result = updateUserName(user.id, firstName, lastName);
  if (!result.ok) return res.redirect('/account?nameError=unknown');

  // Uppdatera session.username så "Hej X"-hälsningar reflekterar nya förnamnet direkt
  req.session.username = result.firstName;

  audit(req, 'user.name_change', { id: user.id, username: user.username },
        { firstName: result.firstName, lastName: result.lastName });
  res.redirect('/account?nameOk=1');
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

// /privacy som engelskspråkig alias — samma sida (privacy.ejs är på svenska)
app.get('/privacy', (req, res) => {
  res.render('privacy', {
    username: req.session?.username || null,
    role:     req.session?.role || null,
  });
});

// ── Ordbok ────────────────────────────────────────────────────────────────────

// ── /nyheter — broadcast-arkiv för users ─────────────────────────────────────
// Gör missade announcements läsbara. Alla broadcasts synliga oavsett
// segment (transparens > exclusivity). Segment-taggen visas som kontext.

app.get('/nyheter', requireLogin, (req, res) => {
  const broadcasts = getBroadcastsForUser(50);
  res.render('nyheter', {
    username:  req.session.username,
    role:      req.session.role,
    broadcasts,
  });
});

app.get('/nyheter/:id', requireLogin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.redirect('/nyheter');
  const broadcast = getBroadcastById(id);
  if (!broadcast) return res.redirect('/nyheter');
  // Återanvänd buildBroadcastEmail-logiken för att rendera body konsistent
  // (plain-text → <p>/<br>, HTML passes through)
  const isHtml = /<\/?(p|br|div|strong|em|ul|ol|li|a|h[1-6])/i.test(broadcast.body);
  const rendered = isHtml
    ? broadcast.body
    : '<p>' + broadcast.body.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  res.render('nyhet', {
    username:   req.session.username,
    role:       req.session.role,
    broadcast,
    rendered,
  });
});

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
    emailResult: req.query.emailResult || null,
    emailUser:   req.query.emailUser   || null,
    emailMsg:    req.query.emailMsg    || null,
  });
});

// Cache för admin-analytics: dessa queries är dyra (~12 separata SQL-anrop
// per render). 60-sekunders TTL. Räcker långt eftersom data uppdateras långsamt
// och flera admins som refreshar samtidigt får samma cached snapshot.
const analyticsCache = { data: null, fetchedAt: 0 };
const ANALYTICS_CACHE_TTL_MS = 60 * 1000;

// ── Admin: email-queue-diagnostics (observability) ─────────────────────────
app.get('/admin/email-queue', requireLogin, requireAdmin, (req, res) => {
  const items = listAllEmailQueue(150);
  const counts = items.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});
  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusBadge = (s) => {
    const colors = { pending: '#fbbf24', sent: '#34d399', failed: '#f87171' };
    return `<span style="padding:0.15rem 0.45rem;background:${colors[s]||'#94a3b8'}22;color:${colors[s]||'#94a3b8'};border-radius:4px;font-size:0.72rem;font-weight:700;">${s}</span>`;
  };
  const rows = items.map(m => `
    <tr>
      <td style="font-size:0.72rem;color:#64748b;">#${m.id}</td>
      <td>${statusBadge(m.status)}</td>
      <td><span style="font-size:0.72rem;color:#a5b4fc;">${escapeHtml(m.kind || '')}</span></td>
      <td style="font-size:0.82rem;">${escapeHtml(m.to_email)}</td>
      <td style="font-size:0.82rem;color:#cbd5e1;">${escapeHtml((m.subject || '').slice(0, 60))}</td>
      <td style="font-size:0.72rem;color:#64748b;">${m.attempts || 0}</td>
      <td style="font-size:0.7rem;color:#64748b;">${m.created_at}</td>
      <td style="font-size:0.7rem;color:${m.last_error ? '#f87171' : '#64748b'};max-width:300px;word-break:break-word;">${escapeHtml((m.last_error || '').slice(0, 100))}</td>
      <td>${m.status === 'failed' ? `<form method="POST" action="/admin/email-queue/requeue/${m.id}" style="margin:0;display:inline;"><input type="hidden" name="_csrf" value="${generateCsrfToken(req)}"/><button type="submit" style="padding:0.25rem 0.55rem;background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);border-radius:5px;font-size:0.7rem;cursor:pointer;">↻ Försök igen</button></form>` : ''}</td>
    </tr>
  `).join('');

  res.send(`
    <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Email-kö</title>
    <style>body{margin:0;padding:1.5rem;font-family:system-ui;background:#0f172a;color:#e2e8f0;}
    h1{margin:0 0 0.5rem;font-size:1.4rem;}
    .nav a{color:#a5b4fc;text-decoration:none;margin-right:1rem;}
    .stats{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0 1.5rem;}
    .stat{padding:0.85rem 1.25rem;background:#1e293b;border:1px solid rgba(255,255,255,0.07);border-radius:10px;}
    .stat strong{display:block;font-size:1.4rem;color:#f1f5f9;}
    .stat span{font-size:0.78rem;color:#94a3b8;}
    table{width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);}
    th{padding:0.6rem 0.8rem;text-align:left;background:rgba(255,255,255,0.04);color:#94a3b8;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;}
    td{padding:0.5rem 0.8rem;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:top;}
    tr:last-child td{border-bottom:none;}
    </style></head><body>
    <div class="nav"><a href="/admin">← Admin</a></div>
    <h1>📧 Email-kö</h1>
    <p style="color:#94a3b8;font-size:0.88rem;margin:0;">Senaste ${items.length} mejl. Backoff vid fail: 1m → 5m → 30m → 2h → 8h → 24h → permanent failed efter 6 försök. "Försök igen" återställer attempts=0 + status=pending.</p>
    <div class="stats">
      <div class="stat"><strong>${counts.pending || 0}</strong><span>Pending</span></div>
      <div class="stat"><strong>${counts.sent || 0}</strong><span>Sent</span></div>
      <div class="stat"><strong style="color:${(counts.failed||0)>0?'#f87171':'#34d399'};">${counts.failed || 0}</strong><span>Failed (permanent)</span></div>
    </div>
    <table>
      <thead><tr><th>ID</th><th>Status</th><th>Kind</th><th>Till</th><th>Subject</th><th>#</th><th>Skapad</th><th>Sista fel</th><th>Action</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#64748b;">Tom kö</td></tr>'}</tbody>
    </table>
    </body></html>
  `);
});

app.post('/admin/email-queue/requeue/:id', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isFinite(id) && id > 0) {
    requeueEmail(id);
    audit(req, 'email.requeue', { id, username: req.session.username });
  }
  res.redirect('/admin/email-queue');
});

// ── Test-endpoint: skicka en alert till webhook för att verifiera config ──
app.get('/admin/alert-test', requireLogin, requireAdmin, (req, res) => {
  const level = ['info', 'warning', 'critical'].includes(req.query.level)
    ? req.query.level : 'warning';
  notifyAdmin(level, `Test-alert (${level})`,
    `Detta är ett test-larm utlöst manuellt av admin "${req.session.username}" från /admin/alert-test. Om du ser detta meddelande i din webhook fungerar alerting.`,
    { triggeredBy: req.session.username, level, ts: new Date().toISOString() }
  );
  const isConfigured = !!process.env.ADMIN_ALERT_WEBHOOK_URL;
  res.send(`
    <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Alert-test</title>
    <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:2rem;text-align:center;min-height:100vh;margin:0;box-sizing:border-box;}
    .w{max-width:540px;margin:3rem auto;padding:2rem;background:#1e293b;border-radius:14px;border:1px solid rgba(255,255,255,0.08);}
    h1{margin:0 0 0.75rem;} a{color:#a5b4fc;}
    code{background:rgba(99,102,241,0.15);padding:0.15rem 0.45rem;border-radius:4px;color:#a5b4fc;font-size:0.85rem;}</style></head>
    <body><div class="w">
      <h1>${isConfigured ? '✅' : '⚠️'} Alert skickad (${level})</h1>
      <p style="color:#cbd5e1;line-height:1.6;">
        ${isConfigured
          ? 'Test-alert skickad till din konfigurerade webhook. Kolla i Slack/Discord — om du inte ser den inom ~10 sekunder är webhook-URL:en fel.'
          : '<code>ADMIN_ALERT_WEBHOOK_URL</code> är inte satt på Railway, så alert gick BARA till console-loggar. Sätt env-varen för att få push-larm.'
        }
      </p>
      <p style="color:#94a3b8;font-size:0.88rem;">
        Test andra nivåer: <a href="?level=info">info</a> · <a href="?level=warning">warning</a> · <a href="?level=critical">critical</a>
      </p>
      <p><a href="/admin">← Till admin</a></p>
    </div></body></html>
  `);
});

// ── Boken (PDF) — auto-genererad från salesContent.js ───────────────────────
// Tre-lagers cache: memory → R2 → regen.
// Server-restart torcher memory; R2 överlever och ger instant download.
// Regen sker bara när content-hash ändras.

const bookGenerator = require('./services/bookGenerator');
const r2Storage = require('./services/audioStorage'); // återanvänder R2-helpers

const BOOK_R2_KEY_PREFIX = 'books/saljbok-';

let bookCache = { hash: null, buffer: null, generatedAt: null };

/**
 * Hämta boken — memory > R2 > regen. Vid regen lagras till BÅDE memory + R2
 * så framtida server-restarts inte triggar ny generering.
 */
async function getOrGenerateBook() {
  const currentHash = bookGenerator.computeContentHash(salesBlocks);

  // 1) Memory-cache hit
  if (bookCache.hash === currentHash && bookCache.buffer) {
    return { buffer: bookCache.buffer, hash: currentHash, source: 'memory', generatedAt: bookCache.generatedAt };
  }

  // 2) R2-cache hit (om enabled) — undviker regen efter server-restart
  if (r2Storage.isR2Enabled()) {
    const r2Key = `${BOOK_R2_KEY_PREFIX}${currentHash}.pdf`;
    const r2Buffer = await r2Storage.fetchObjectBuffer(r2Key).catch(() => null);
    if (r2Buffer && r2Buffer.length > 0) {
      bookCache = { hash: currentHash, buffer: r2Buffer, generatedAt: new Date().toISOString() };
      console.log(`📚 Boken hämtad från R2-cache (${Math.round(r2Buffer.length / 1024)} KB, hash ${currentHash})`);
      return { buffer: r2Buffer, hash: currentHash, source: 'r2', generatedAt: bookCache.generatedAt };
    }
  }

  // 3) Regen från content
  console.log(`📚 Genererar säljboken (hash ${currentHash})...`);
  const t0 = Date.now();
  const buffer = await bookGenerator.generateFullBookBuffer(salesBlocks, {
    title:    'Joakim Jaksens Säljutbildning',
    subtitle: 'Allt du behöver veta för att bli en bättre säljare',
    author:   'Joakim Jaksen',
  });
  console.log(`📚 Boken genererad: ${Math.round(buffer.length / 1024)} KB på ${Date.now() - t0}ms`);
  bookCache = { hash: currentHash, buffer, generatedAt: new Date().toISOString() };

  // Lagra till R2 fire-and-forget (failure påverkar inte downloaden)
  if (r2Storage.isR2Enabled()) {
    const r2Key = `${BOOK_R2_KEY_PREFIX}${currentHash}.pdf`;
    r2Storage.uploadGenericObject({ key: r2Key, buffer, contentType: 'application/pdf' })
      .then(r => {
        if (r.ok) console.log(`📚 Boken cachat till R2: ${r2Key}`);
        else console.warn(`📚 R2-cache failed: ${r.reason}`);
      })
      .catch(err => console.warn(`📚 R2-cache error: ${err.message}`));
  }

  return { buffer, hash: currentHash, source: 'regen', generatedAt: bookCache.generatedAt };
}

/**
 * Bygg licensee-objekt från user-record. Används som watermark på download.
 * Returnerar { name, email, date } — inget av detta är hemligt, bara identifierande.
 */
function buildLicensee(user) {
  if (!user) return null;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const name = fullName || user.username || 'Användare';
  return {
    name,
    email: user.email || '',
    date:  new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }),
  };
}

// User download — premium-feature. Free-users redirectas till /upgrade.
// OBS: ingen cache per-user (varje download får personlig watermark) — regen
// per request. ~1.6s extra latens, OK för låg-volym premium-feature.
app.get('/book/saljboken.pdf', requireLogin, async (req, res) => {
  if (!isPremiumOrHigher(req.session.role)) {
    return res.redirect('/upgrade?from=book');
  }
  try {
    const user = findUserById(req.session.userId);
    const licensee = buildLicensee(user);
    const hash = bookGenerator.computeContentHash(salesBlocks);

    console.log(`📚 Genererar personlig PDF för ${licensee.name} (${licensee.email})...`);
    const t0 = Date.now();
    const buffer = await bookGenerator.generateFullBookBuffer(salesBlocks, {
      title:    'Joakim Jaksens Säljutbildning',
      subtitle: 'Allt du behöver veta för att bli en bättre säljare',
      author:   'Joakim Jaksen',
      licensee,
    });
    console.log(`📚 PDF genererad på ${Date.now() - t0}ms (${Math.round(buffer.length / 1024)} KB)`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="joakim-jaksens-saljutbildning.pdf"');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate'); // varje user unik
    res.setHeader('X-Content-Hash', hash);
    res.send(buffer);
    audit(req, 'book.download', { id: req.session.userId, username: req.session.username }, { hash, format: 'pdf', licensee: licensee.name });
  } catch (err) {
    console.error('Book download error:', err.message);
    notifyAdmin('warning', 'Book PDF generation failed',
      'Användare försökte ladda ner boken men generering kraschade.',
      { error: err.message, userId: req.session.userId });
    res.status(500).send('Boken kunde inte genereras just nu. Försök igen om en stund.');
  }
});

// EPUB-download — för Kindle, Apple Books, Google Play Books, etc.
// Samma access-rules: premium-only, R2-cache, regen vid content-ändring.
const epubGenerator = require('./services/epubGenerator');
const EPUB_R2_KEY_PREFIX = 'books/saljbok-';
let epubCache = { hash: null, buffer: null, generatedAt: null };

async function getOrGenerateEpub() {
  const currentHash = epubGenerator.computeEpubContentHash(salesBlocks);
  if (epubCache.hash === currentHash && epubCache.buffer) {
    return { buffer: epubCache.buffer, hash: currentHash, source: 'memory' };
  }
  if (r2Storage.isR2Enabled()) {
    const r2Key = `${EPUB_R2_KEY_PREFIX}${currentHash}.epub`;
    const r2Buffer = await r2Storage.fetchObjectBuffer(r2Key).catch(() => null);
    if (r2Buffer && r2Buffer.length > 0) {
      epubCache = { hash: currentHash, buffer: r2Buffer, generatedAt: new Date().toISOString() };
      console.log(`📖 EPUB hämtad från R2-cache (${Math.round(r2Buffer.length / 1024)} KB)`);
      return { buffer: r2Buffer, hash: currentHash, source: 'r2' };
    }
  }
  console.log(`📖 Genererar EPUB (hash ${currentHash})...`);
  const t0 = Date.now();
  const buffer = await epubGenerator.generateFullBookEpub(salesBlocks, {
    title:    'Joakim Jaksens Säljutbildning',
    subtitle: 'Allt du behöver veta för att bli en bättre säljare',
    author:   'Joakim Jaksen',
  });
  console.log(`📖 EPUB genererad: ${Math.round(buffer.length / 1024)} KB på ${Date.now() - t0}ms`);
  epubCache = { hash: currentHash, buffer, generatedAt: new Date().toISOString() };
  if (r2Storage.isR2Enabled()) {
    const r2Key = `${EPUB_R2_KEY_PREFIX}${currentHash}.epub`;
    r2Storage.uploadGenericObject({ key: r2Key, buffer, contentType: 'application/epub+zip' })
      .then(r => r.ok && console.log(`📖 EPUB cachat till R2: ${r2Key}`))
      .catch(err => console.warn(`📖 R2-cache failed: ${err.message}`));
  }
  return { buffer, hash: currentHash, source: 'regen' };
}

app.get('/book/saljboken.epub', requireLogin, async (req, res) => {
  if (!isPremiumOrHigher(req.session.role)) {
    return res.redirect('/upgrade?from=book');
  }
  try {
    const user = findUserById(req.session.userId);
    const licensee = buildLicensee(user);
    const hash = epubGenerator.computeEpubContentHash(salesBlocks);

    console.log(`📖 Genererar personlig EPUB för ${licensee.name}...`);
    const t0 = Date.now();
    const buffer = await epubGenerator.generateFullBookEpub(salesBlocks, {
      title:    'Joakim Jaksens Säljutbildning',
      subtitle: 'Allt du behöver veta för att bli en bättre säljare',
      author:   'Joakim Jaksen',
      licensee,
    });
    console.log(`📖 EPUB genererad på ${Date.now() - t0}ms (${Math.round(buffer.length / 1024)} KB)`);

    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', 'attachment; filename="joakim-jaksens-saljutbildning.epub"');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('X-Content-Hash', hash);
    res.send(buffer);
    audit(req, 'book.download', { id: req.session.userId, username: req.session.username }, { hash, format: 'epub', licensee: licensee.name });
  } catch (err) {
    console.error('Book EPUB error:', err.message);
    notifyAdmin('warning', 'Book EPUB generation failed',
      'Användare försökte ladda ner EPUB men generering kraschade.',
      { error: err.message, userId: req.session.userId });
    res.status(500).send('EPUB:en kunde inte genereras just nu. Försök igen om en stund.');
  }
});

// Admin: tvinga regen + visa info för båda formaten
app.get('/admin/book', requireLogin, requireAdmin, async (req, res) => {
  if (req.query.regen === '1') {
    bookCache = { hash: null, buffer: null, generatedAt: null };
    epubCache = { hash: null, buffer: null, generatedAt: null };
  }
  try {
    const pdf  = await getOrGenerateBook();
    const epub = await getOrGenerateEpub();
    const { buffer, hash, source, generatedAt } = pdf;
    const sourceLabel = {
      memory: '✓ memory-cache (instant)',
      r2:     '☁️  R2-cache (instant, persistent över restart)',
      regen:  '⚡ just regen (1-2s)',
    }[source] || source;
    res.send(`
      <!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><title>Admin — Boken</title>
      <style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:2rem;margin:0;min-height:100vh;box-sizing:border-box;}
      .w{max-width:640px;margin:2rem auto;padding:2rem;background:#1e293b;border-radius:14px;border:1px solid rgba(255,255,255,0.08);}
      h1{margin:0 0 0.5rem;} a{color:#a5b4fc;text-decoration:none;}
      .stat{display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.05);}
      .stat strong{color:#f1f5f9;}
      .btn{display:inline-block;padding:0.7rem 1.2rem;margin:0.4rem 0.4rem 0 0;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;font-weight:600;}
      .btn-ghost{background:rgba(255,255,255,0.06);}</style></head>
      <body><div class="w">
        <p style="margin:0;color:#94a3b8;font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;">📚 Boken</p>
        <h1>Säljboken — auto-genererad PDF</h1>
        <p style="color:#94a3b8;margin:0.5rem 0 1.5rem;line-height:1.6;">Genereras från salesContent.js. Tre-lagers cache: memory → R2 → regen. Hash baseras på content (theory + outcomes + scripts).</p>
        <div class="stat"><span>📄 PDF — storlek</span><strong>${Math.round(buffer.length / 1024)} KB</strong></div>
        <div class="stat"><span>📄 PDF — source</span><strong>${sourceLabel}</strong></div>
        <div class="stat"><span>📖 EPUB — storlek</span><strong>${Math.round(epub.buffer.length / 1024)} KB</strong></div>
        <div class="stat"><span>📖 EPUB — source</span><strong>${epub.source}</strong></div>
        <div class="stat"><span>Content-hash (PDF)</span><strong style="font-family:monospace;">${hash}</strong></div>
        <div class="stat"><span>Content-hash (EPUB)</span><strong style="font-family:monospace;">${epub.hash}</strong></div>
        <div class="stat"><span>Genererad</span><strong>${new Date(generatedAt).toLocaleString('sv-SE')}</strong></div>
        <div class="stat"><span>R2-cache</span><strong>${r2Storage.isR2Enabled() ? '✓ enabled' : '✗ ej konfigurerat'}</strong></div>
        <div class="stat"><span>Antal block</span><strong>${salesBlocks.length}</strong></div>
        <div style="margin-top:1.5rem;">
          <a href="/book/saljboken.pdf" class="btn">📄 Ladda ner PDF</a>
          <a href="/book/saljboken.epub" class="btn">📖 Ladda ner EPUB</a>
          <a href="/admin/book?regen=1" class="btn btn-ghost">↻ Regenerera båda</a>
          <a href="/admin" class="btn btn-ghost">← Admin</a>
        </div>
        <p style="margin-top:1.5rem;color:#64748b;font-size:0.82rem;">
          När du uppdaterar block-content (theory, outcomeTitle, concreteScripts) → content-hashen ändras → nästa download = regen + ny R2-cache. Server-restart tömmer memory men R2 persisteras.
        </p>
      </div></body></html>
    `);
  } catch (err) {
    res.status(500).send(`<pre>Error: ${err.message}\n\n${err.stack}</pre>`);
  }
});

// ── Block-audio (TTS / inspelat per block) ──────────────────────────────────
// Joakim laddar upp en MP3/M4A per block. Filen lagras i Cloudflare R2;
// metadata cachas i DB. Uppspelning på block-sidan via signed URL (1h TTL).

const audioStorage = require('./services/audioStorage');

app.get('/admin/audio', requireLogin, requireAdmin, (req, res) => {
  const audios = listBlockAudios();
  const audioMap = {};
  audios.forEach(a => { audioMap[a.block_id] = a; });
  // Bygg block-lista med audio-status per block
  const blockList = salesBlocks.map((b, i) => ({
    id:       b.id,
    title:    b.title,
    index:    i + 1,
    icon:     b.icon,
    audio:    audioMap[b.id] || null,
  }));
  res.render('admin-audio', {
    username:  req.session.username,
    blocks:    blockList,
    r2Enabled: audioStorage.isR2Enabled(),
    csrfToken: generateCsrfToken(req),
    msg:       req.query.msg || null,
    error:     req.query.error || null,
  });
});

// Upload — multer parsar fil + form, sen verifyCsrf
app.post('/admin/audio/upload', requireLogin, requireAdmin, upload.single('audio'), verifyCsrf, async (req, res) => {
  try {
    const blockId = String(req.body.blockId || '').trim();
    if (!blockId) return res.redirect('/admin/audio?error=missing_blockId');
    const block = salesBlocks.find(b => b.id === blockId);
    if (!block) return res.redirect('/admin/audio?error=invalid_block');
    if (!req.file) return res.redirect('/admin/audio?error=no_file');

    if (!audioStorage.isR2Enabled()) {
      return res.redirect('/admin/audio?error=r2_not_configured');
    }

    // Kolla MIME-type — accept MP3, M4A, OGG, WebM (de vanligaste)
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
                          'audio/ogg', 'audio/webm', 'audio/aac'];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.redirect('/admin/audio?error=invalid_mime');
    }

    // Sanera filnamns-extension
    const origName = req.file.originalname || '';
    const ext = (origName.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'mp3';

    // Hämta nuvarande version för cache-busting
    const existing = getBlockAudio(blockId);
    const newVersion = existing ? (existing.version + 1) : 1;

    const uploadResult = await audioStorage.uploadBlockAudio({
      blockId,
      buffer:   req.file.buffer,
      mimeType: req.file.mimetype,
      version:  newVersion,
      ext,
    });

    if (!uploadResult.ok) {
      console.error('Audio upload failed:', uploadResult.reason);
      notifyAdmin('warning', 'Block-audio upload failed',
        `Joakim försökte ladda upp audio för block "${blockId}" men R2-upload failade.`,
        { blockId, reason: uploadResult.reason });
      return res.redirect('/admin/audio?error=upload_failed');
    }

    // Om existerande audio: radera gamla R2-objektet (cleanup, ej blockerande)
    if (existing && existing.r2_key && existing.r2_key !== uploadResult.r2Key) {
      audioStorage.deleteBlockAudioObject(existing.r2_key).catch(() => {});
    }

    upsertBlockAudio({
      blockId,
      r2Key:       uploadResult.r2Key,
      durationSec: null, // klient-side metadata kunde extracts framtida
      bytes:       uploadResult.bytes,
      mimeType:    req.file.mimetype,
      uploadedBy:  req.session.userId,
    });

    audit(req, 'block_audio.upload', { id: req.session.userId, username: req.session.username },
      { blockId, bytes: uploadResult.bytes, mime: req.file.mimetype, version: newVersion });
    console.log(`🎙️  Audio uppladdat för "${blockId}": ${Math.round(uploadResult.bytes / 1024)} KB (v${newVersion})`);
    res.redirect('/admin/audio?msg=uploaded&block=' + encodeURIComponent(blockId));
  } catch (err) {
    console.error('Audio upload error:', err.message);
    res.redirect('/admin/audio?error=' + encodeURIComponent(err.message.slice(0, 80)));
  }
});

// Radera audio för ett block
app.post('/admin/audio/:blockId/delete', requireLogin, requireAdmin, verifyCsrf, async (req, res) => {
  const blockId = String(req.params.blockId || '').trim();
  const existing = getBlockAudio(blockId);
  if (existing) {
    if (existing.r2_key) {
      await audioStorage.deleteBlockAudioObject(existing.r2_key).catch(() => {});
    }
    deleteBlockAudio(blockId);
    audit(req, 'block_audio.delete', { id: req.session.userId, username: req.session.username }, { blockId });
  }
  res.redirect('/admin/audio?msg=deleted&block=' + encodeURIComponent(blockId));
});

// Streaming-route: redirect:ar till signed R2-URL (1h TTL).
// Tillgänglig för inloggade users + free-block för anonyma (men för enkelhet
// kräver vi login överallt — premium-content protected).
app.get('/audio/blocks/:blockId.mp3', requireLogin, async (req, res) => {
  const blockId = String(req.params.blockId || '').trim();
  const block = salesBlocks.find(b => b.id === blockId);
  if (!block) return res.status(404).send('Not found');

  // Access-check: free-blocks öppna för alla med login, premium-blocks
  // kräver premium+. Audio-tillgång följer block-tillgång.
  const isPremium  = !FREE_BLOCK_IDS.includes(block.id);
  const hasAccess  = isPremiumOrHigher(req.session.role);
  if (isPremium && !hasAccess) return res.status(403).send('Premium krävs');

  const audio = getBlockAudio(blockId);
  if (!audio || !audio.r2_key) return res.status(404).send('Ingen audio uppladdad för detta block');

  // Försök signed URL först — mest effektivt (CDN, ingen server-IO)
  const signedUrl = await audioStorage.getSignedAudioUrl(audio.r2_key, 3600);
  if (signedUrl) {
    return res.redirect(302, signedUrl);
  }

  // Fallback: stream direkt via servern
  const streamRes = await audioStorage.streamAudio(audio.r2_key);
  if (!streamRes) return res.status(500).send('Audio kunde inte hämtas');
  res.setHeader('Content-Type', streamRes.contentType);
  if (streamRes.contentLength) res.setHeader('Content-Length', String(streamRes.contentLength));
  res.setHeader('Cache-Control', 'private, max-age=3600');
  streamRes.stream.pipe(res);
});

// ── Funnel-rapport: aktivering + konvertering per kohort ────────────────────
// Visar var i funneln användare droppar av — register → dashboard → block →
// quiz → upgrade. Kohort:as på registreringsdatum (default senaste 30 dagar).
app.get('/admin/funnel', requireLogin, requireAdmin, (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  const stats = getFunnelStats({ days });
  const recent = getRecentFunnelEvents(40);

  // Hjälpare: bygg rad med count + procent mot total + drop sedan föregående steg
  function row(key, label, icon, prevCount) {
    const count = stats.events[key] || 0;
    const pctOfTotal = stats.totalRegistered > 0 ? Math.round((count / stats.totalRegistered) * 1000) / 10 : 0;
    const pctOfPrev  = prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0;
    const drop       = Math.max(0, prevCount - count);
    return { key, label, icon, count, pctOfTotal, pctOfPrev, drop, prevCount };
  }

  // Aktivering: strikt linjär progression från registrering → engagemang
  const activation = [];
  let prev = stats.totalRegistered;
  const actDefs = [
    ['register_completed',     'Registrerade',         '📝'],
    ['first_dashboard_visit',  'Besökte dashboard',    '🏠'],
    ['first_block_opened',     'Öppnade ett block',    '📚'],
    ['first_quiz_attempted',   'Försökte sig på prov', '🧠'],
    ['first_quiz_passed',      'Klarade prov (≥60%)',  '✅'],
    ['first_roleplay_visit',   'Besökte rollspel',     '🎭'],
    ['first_upgrade_visit',    'Besökte /upgrade',     '👀'],
  ];
  for (const [k, l, i] of actDefs) {
    const r = row(k, l, i, prev);
    activation.push(r);
    prev = r.count;
  }

  // Konvertering Premium: branch från upgrade-visit → klick → slutförd
  const upgradeVisitCount = stats.events['first_upgrade_visit'] || 0;
  const conversionPremium = [
    row('first_upgrade_visit',       'Besökte /upgrade',           '👀', stats.totalRegistered),
    row('upgrade_clicked_premium',   'Klickade köp Premium',       '💳', upgradeVisitCount),
    row('upgrade_completed_premium', 'Premium-konvertering',       '⭐', stats.events['upgrade_clicked_premium'] || 0),
  ];

  // Konvertering Pro: branch från upgrade-visit → klick → slutförd (24h-trial)
  const conversionPro = [
    row('first_upgrade_visit',     'Besökte /upgrade',           '👀', stats.totalRegistered),
    row('upgrade_clicked_pro',     'Klickade köp Pro',           '⚡', upgradeVisitCount),
    row('upgrade_completed_pro',   'Pro-konvertering (trial)',   '🎯', stats.events['upgrade_clicked_pro'] || 0),
  ];

  res.render('admin-funnel', {
    username: req.session.username,
    days,
    stats,
    activation,
    conversionPremium,
    conversionPro,
    recent,
  });
});

app.get('/admin/analytics', requireLogin, requireAdmin, (req, res) => {
  const now = Date.now();
  let analytics, funnel, cohorts;
  if (analyticsCache.data && (now - analyticsCache.fetchedAt) < ANALYTICS_CACHE_TTL_MS) {
    ({ analytics, funnel, cohorts } = analyticsCache.data);
  } else {
    analytics = getAdminAnalytics();
    funnel    = getFunnelMetrics();
    cohorts   = getCohortRetention();
    analyticsCache.data = { analytics, funnel, cohorts };
    analyticsCache.fetchedAt = now;
  }

  const blockTitles = {};
  salesBlocks.forEach((b, i) => { blockTitles[b.id] = { title: b.title, index: i + 1, icon: b.icon }; });
  res.render('admin-analytics', {
    username: req.session.username,
    analytics,
    funnel,
    cohorts,
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
    adminNotes: getAdminNotesForUser(targetId),
    blockTime: getBlockTimeAnalytics(targetId),
    noteSaved: req.query.noteSaved === '1',
    noteDeleted: req.query.noteDeleted === '1',
    csrfToken: generateCsrfToken(req),
  });
});

// ── Admin notes: skapa + radera ───────────────────────────────────────────────
app.post('/admin/users/:id/notes', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isFinite(targetId)) return res.redirect('/admin');
  const adminId = req.session.impersonatedBy?.adminUserId || req.session.userId;
  const result = addAdminNote(targetId, adminId, req.body.content || '');
  if (!result.ok) return res.redirect(`/admin/user/${targetId}#notes`);
  const target = findUserById(targetId);
  audit(req, 'note.add', { id: targetId, username: target?.username });
  res.redirect(`/admin/user/${targetId}?noteSaved=1#notes`);
});

app.post('/admin/users/:id/notes/:noteId/delete', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const targetId = Number(req.params.id);
  const noteId = Number(req.params.noteId);
  if (Number.isFinite(noteId)) {
    deleteAdminNote(noteId);
    const target = findUserById(targetId);
    audit(req, 'note.delete', { id: targetId, username: target?.username }, { noteId });
  }
  res.redirect(`/admin/user/${targetId}?noteDeleted=1#notes`);
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
    const target = findUserById(targetId);
    const oldRole = target?.role;
    setUserRole(targetId, role);
    audit(req, 'user.role_change', { id: targetId, username: target?.username }, { from: oldRole, to: role });
  }
  res.redirect('/admin');
});

app.post('/admin/users/:id/delete', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const id = Number(req.params.id);
  if (id !== req.session.userId) {
    const target = findUserById(id);
    deleteUser(id); // can't delete yourself
    audit(req, 'user.delete', { id, username: target?.username }, { email: target?.email, role: target?.role });
  }
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
  audit(req, 'user.password_reset', { id: targetId, username: target.username });
  res.redirect('/admin?pwOk=' + targetId);
});

// ── Admin: manually send welcome email ───────────────────────────────────────

app.post('/admin/users/:id/email', requireLogin, requireAdmin, verifyCsrf, async (req, res) => {
  const user    = findUserById(Number(req.params.id));
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  if (!user) return res.redirect('/admin?emailResult=notfound');
  if (!user.email) return res.redirect('/admin?emailResult=noemail&emailUser=' + encodeURIComponent(user.username));

  // Fail loudly om Resend inte är konfigurerat (istället för tyst no-op)
  if (!resend) {
    console.error('Admin welcome email: resend client not configured (RESEND_API_KEY saknas?)');
    return res.redirect('/admin?emailResult=noresend');
  }

  try {
    // Använd first_name om det finns, annars username (display-name-logik)
    const name = user.first_name || user.username;
    // Tier-aware välkomstmejl — Pro/Premium får RÄTT content, INTE free-tier-text
    const result = await sendEmailReliable({
      to:      user.email,
      subject: `Välkommen, ${name}! Ditt konto är aktivt 🎯`,
      html:    buildWelcomeEmail(name, baseUrl, user.role || 'free'),
      kind:    'welcome_admin_resend',
    });
    audit(req, 'email.welcome_sent', { id: user.id, username: user.username, queued: !!result.queued });
    if (result.sent) {
      console.log(`✅ Välkomstmejl skickat till ${user.email}`);
      res.redirect('/admin?emailResult=ok&emailUser=' + encodeURIComponent(user.username));
    } else if (result.queued) {
      // Resend-API svarade fel → hamnade i retry-kön. Inte ett katastrofalt fel.
      console.warn(`📧 Välkomstmejl queued för ${user.email} (kommer retry:as): ${result.error || ''}`);
      res.redirect('/admin?emailResult=queued&emailUser=' + encodeURIComponent(user.username));
    } else {
      throw new Error(result.error || 'sendEmailReliable returned no result');
    }
  } catch (err) {
    console.error(`❌ Välkomstmejl misslyckades för ${user.email}:`, err.message);
    res.redirect('/admin?emailResult=failed&emailUser=' + encodeURIComponent(user.username) + '&emailMsg=' + encodeURIComponent(err.message.slice(0, 120)));
  }
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
    testSent: req.query.testSent === '1',
    error: req.query.error || null,
    pastBroadcasts: getBroadcastsForUser(30), // senaste 30 för admin-vy
  });
});

// ── Broadcast preview: render HTML utan att skicka (öppnas i ny tab) ─────────
// Låter admin se exakt hur mejlet kommer se ut INNAN det skickas till 100+ users.
// Spar från typos, brutna länkar, kass formatering som hamnar i inboxar.
app.post('/admin/broadcast/preview', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const subject = (req.body.subject || '').trim().slice(0, 200);
  const body    = (req.body.body    || '').trim().slice(0, 20000);
  if (!subject || !body) {
    return res.status(400).send('<h1>Ämne och meddelande krävs</h1><p><a href="/admin/broadcast">← Tillbaka</a></p>');
  }
  const baseUrl = process.env['APP_URL'] || `${req.protocol}://${req.get('host')}`;
  const previewUnsubUrl = `${baseUrl}/unsubscribe/PREVIEW-TOKEN-EJ-GILTIG`;
  const previewUsername = req.session.username || 'Testanvändare';
  const html = buildBroadcastEmail({
    username: previewUsername,
    body,
    unsubUrl: previewUnsubUrl,
    subject,
  });
  // Lägg till en icke-skickad-banner högst upp så det är tydligt att det är preview
  const previewBanner = `
    <div style="position:sticky;top:0;background:#fbbf24;color:#0f172a;padding:0.85rem 1.5rem;text-align:center;font-family:-apple-system,sans-serif;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      👁️ FÖRHANDSGRANSKNING — detta är inte skickat. Mottagarnamn i previewen: "${previewUsername}".
      <a href="javascript:window.close()" style="margin-left:1rem;color:#0f172a;text-decoration:underline;">Stäng</a>
    </div>
  `;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(previewBanner + html);
});

// ── Broadcast test-send: skicka endast till admin:ens egen email ─────────────
// Perfekt final-check innan mass-send — du får mejlet i din riktiga inbox
// och ser hur det ser ut i Gmail/Outlook/klient.
app.post('/admin/broadcast/test', requireLogin, requireAdmin, verifyCsrf, async (req, res) => {
  if (!resend) {
    return res.redirect('/admin/broadcast?error=no_resend');
  }
  const admin = findUserById(req.session.userId);
  if (!admin?.email) {
    return res.redirect('/admin/broadcast?error=no_admin_email');
  }
  const subject = (req.body.subject || '').trim().slice(0, 200);
  const body    = (req.body.body    || '').trim().slice(0, 20000);
  if (!subject || !body) {
    return res.redirect('/admin/broadcast?error=missing');
  }
  const baseUrl = process.env['APP_URL'] || `${req.protocol}://${req.get('host')}`;
  try {
    const unsubToken = emails.createUnsubscribeToken(admin.id);
    const unsubUrl   = `${baseUrl}/unsubscribe/${unsubToken}`;
    await resend.emails.send({
      from:    RESEND_FROM,
      to:      admin.email,
      subject: '[TEST] ' + subject,
      html:    buildBroadcastEmail({
        username: admin.first_name || admin.username,
        body,
        unsubUrl,
        subject,
      }),
    });
    audit(req, 'broadcast.test_send', null, { subject: subject.slice(0, 100) });
    res.redirect('/admin/broadcast?testSent=1');
  } catch (err) {
    console.error('Broadcast test send error:', err.message);
    res.redirect('/admin/broadcast?error=send_failed');
  }
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
        html:    buildBroadcastEmail({ username: u.first_name || u.username, body, unsubUrl, subject }),
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

  // Spara i arkivet så users kan läsa på /nyheter även om de missar mejlet
  try {
    saveBroadcast({
      subject,
      body,
      segment,
      admin_user_id: req.session.impersonatedBy?.adminUserId || req.session.userId,
      sent_count: sent,
      failed_count: failed,
    });
  } catch (err) {
    console.error('saveBroadcast archive error:', err.message);
  }

  audit(req, 'broadcast.send', null, { segment, sent, failed, subject: subject.slice(0, 100) });
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

// ── Admin impersonation: "Se som user X" för support/debugging ────────────────
// Säkerhet:
//  - Endast admin får starta impersonation
//  - Kan INTE impersonera annan admin (double-admin-escalation skydd)
//  - Original admin-identitet sparas i session.impersonatedBy
//  - Alla sidor visar banner (via res.locals.impersonation middleware)
//  - Destruktiva actions blockeras via blockWhenImpersonating-middleware
//  - Impersonation är auto-slutad efter 30 min (sessionens TTL)

app.post('/admin/users/:id/impersonate', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isFinite(targetId)) return res.redirect('/admin');
  if (targetId === req.session.userId) return res.redirect('/admin'); // no self-impersonate

  const target = findUserById(targetId);
  if (!target) return res.redirect('/admin');
  if (target.role === 'admin') {
    // Förhindra admin-impersonerar-admin (privilege-escalation-vektor)
    return res.redirect('/admin?err=no_admin_impersonate');
  }

  // Spara ursprungs-identitet i sessionen så vi kan återställa
  req.session.impersonatedBy = {
    adminUserId:  req.session.userId,
    username:     req.session.username, // admin-namnet
    role:         'admin',
    startedAt:    Date.now(),
  };
  // Byt session-state till target
  req.session.userId    = target.id;
  req.session.username  = target.username;
  req.session.role      = target.role;
  req.session.pwVersion = target.pw_version || 0;

  console.log(`🎭 Impersonation startad: admin '${req.session.impersonatedBy.username}' → user '${target.username}' (id ${target.id})`);
  audit(req, 'impersonation.start', { id: target.id, username: target.username });
  res.redirect('/dashboard');
});

// Liten JSON-endpoint som heartbeat.js kan polla för att veta om impersonation
// är aktiv och visa banner. Sparar att vi inte behöver ändra alla EJS-views.
app.get('/impersonate/status', requireLogin, (req, res) => {
  if (req.session.impersonatedBy) {
    return res.json({
      active: true,
      targetUsername: req.session.username,
      adminUsername:  req.session.impersonatedBy.username,
      startedAt:      req.session.impersonatedBy.startedAt,
    });
  }
  res.json({ active: false });
});

// Hidden form-render: ger heartbeat.js tillgång till CSRF-token för stop-form
app.get('/impersonate/csrf', requireLogin, (req, res) => {
  res.json({ token: generateCsrfToken(req) });
});

app.post('/impersonate/stop', requireLogin, verifyCsrf, (req, res) => {
  const imp = req.session.impersonatedBy;
  if (!imp) return res.redirect('/dashboard');

  // Återställ admin-identitet
  const admin = findUserById(imp.adminUserId);
  if (!admin) {
    // Admin raderad under impersonation — destroya hela sessionen säkerhetsmässigt
    return req.session.destroy(() => res.redirect('/login'));
  }

  console.log(`🎭 Impersonation stoppad av '${imp.username}' (var '${req.session.username}')`);
  const targetUsername = req.session.username;
  const targetId = req.session.userId;
  req.session.userId            = admin.id;
  req.session.username          = admin.username;
  req.session.role              = admin.role;
  req.session.pwVersion         = admin.pw_version || 0;
  delete req.session.impersonatedBy;
  audit(req, 'impersonation.stop', { id: targetId, username: targetUsername });
  res.redirect('/admin');
});

// ── Admin audit log-vy ───────────────────────────────────────────────────────

app.get('/admin/audit', requireLogin, requireAdmin, (req, res) => {
  const filters = {
    adminId:  req.query.admin  ? parseInt(req.query.admin)  : null,
    targetId: req.query.target ? parseInt(req.query.target) : null,
    action:   req.query.action || null,
    days:     req.query.days   ? parseInt(req.query.days)   : null,
  };
  const entries    = getAuditLog(filters, 300);
  const actionTypes = getAuditActionTypes();
  res.render('admin-audit', {
    username: req.session.username,
    entries,
    actionTypes,
    filters,
  });
});

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
    const target = findUserById(targetId);
    markReferralCreditsRedeemed(targetId, count);
    audit(req, 'referral.redeem', { id: targetId, username: target?.username }, { count });
  }
  res.redirect('/admin/referral-credits?saved=1');
});

// ── Admin CSV export ──────────────────────────────────────────────────────────

app.get('/admin/export/users.csv', requireLogin, requireAdmin, (req, res) => {
  const users = getAllUsers();
  const header = ['id', 'first_name', 'last_name', 'username', 'email', 'role', 'gdpr', 'created_at', 'last_login', 'stripe_customer_id'].join(',');
  const rows   = users.map(u =>
    [
      u.id,
      `"${(u.first_name        || '').replace(/"/g, '""')}"`,
      `"${(u.last_name         || '').replace(/"/g, '""')}"`,
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
  // Funnel: första /upgrade-besök — visar att användaren övervägt köp
  logFunnelEvent(req.session.userId, 'first_upgrade_visit');
  res.render('upgrade', {
    username:    req.session.username,
    role:        req.session.role,
    totalBlocks: salesBlocks.length,    // dynamiskt, undviker stale "20 block"-strings
    premiumBlocks: salesBlocks.length - FREE_BLOCK_IDS.length,
    csrfToken:   generateCsrfToken(req),
  });
});

app.post('/upgrade/checkout', requireLogin, blockWhenImpersonating, verifyCsrf, async (req, res) => {
  const currentRole = req.session.role;
  const targetTier = req.body.tier === 'pro' ? 'pro' : 'premium';

  // Hindra duplicerad checkout
  if (targetTier === 'premium' && isPremiumOrHigher(currentRole)) return res.redirect('/dashboard');
  if (targetTier === 'pro' && isProOrHigher(currentRole)) return res.redirect('/dashboard');

  // Funnel: upgrade-klick — användaren har faktiskt klickat "köp X"-knappen.
  // Mätning per tier eftersom premium- och pro-funnel är olika historier.
  logFunnelEvent(req.session.userId, 'upgrade_clicked_' + targetTier, { tier: targetTier });

  // Pro-trial: env-var-styrd. TRIAL_DAYS_PRO=1 → 24h gratis.
  // Sätt till 0 för att stänga av trial helt.
  const proTrialDays = targetTier === 'pro'
    ? parseInt(process.env.TRIAL_DAYS_PRO || '1')
    : 0;

  const priceId = targetTier === 'pro'
    ? process.env.STRIPE_PRICE_ID_PRO
    : process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return res.render('upgrade', {
      username:    req.session.username,
      role:        req.session.role,
      totalBlocks: salesBlocks.length,
      premiumBlocks: salesBlocks.length - FREE_BLOCK_IDS.length,
      csrfToken:   generateCsrfToken(req),
      error:       `${targetTier === 'pro' ? 'Pro' : 'Premium'}-prissättning är inte konfigurerad. Kontakta support.`,
    });
  }

  // OBS: använd findUserById, INTE findUserByUsername — session.username
  // är display-name (first_name) efter namn-migrering och matchar inte
  // DB-slugen längre. findUserById är alltid pålitlig identifier.
  const user    = findUserById(req.session.userId);
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  if (!user) {
    console.error('Checkout: user lookup failed for session.userId', req.session.userId);
    return res.render('upgrade', {
      username:    req.session.username,
      role:        req.session.role,
      totalBlocks: salesBlocks.length,
      premiumBlocks: salesBlocks.length - FREE_BLOCK_IDS.length,
      csrfToken:   generateCsrfToken(req),
      error:       'Ditt konto hittades inte. Logga ut och in igen, eller kontakta support.',
    });
  }

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
        // Pro-trial: 1 dag gratis (konfigurerbart via TRIAL_DAYS_PRO env-var).
        // Stripe debiterar INGET under trial; efter trial fires invoice.paid
        // och kortet debiteras. Om användaren avbryter innan trial_end = 0 kr.
        ...(proTrialDays > 0 ? { trial_period_days: proTrialDays } : {}),
      },
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe error:', err.message);
    // Larma — Stripe checkout failure = direkt förlorad betalning
    notifyAdmin('critical', 'Stripe checkout-creation failed',
      `User ${user?.username || req.session.userId} (${user?.email || '?'}) försökte starta ${targetTier}-checkout men Stripe API failade. Förlorad konvertering om det inte fixas snabbt.`,
      { tier: targetTier, userId: req.session.userId, email: user?.email, error: err.message }
    );
    res.render('upgrade', {
      username:    req.session.username,
      role:        req.session.role,
      totalBlocks: salesBlocks.length,
      premiumBlocks: salesBlocks.length - FREE_BLOCK_IDS.length,
      csrfToken:   generateCsrfToken(req),
      error:       'Betalningen kunde inte startas. Försök igen.',
    });
  }
});

app.get('/upgrade/success', requireLogin, (req, res) => {
  // Sync session role from DB — the Stripe webhook may already have upgraded the user.
  // IMPORTANT: never hardcode 'premium' here — any free user could navigate directly
  // to this URL and get an unearned premium session for 8 hours.
  const freshUser = findUserById(req.session.userId);
  if (freshUser) req.session.role = freshUser.role;

  // Tier-medveten render: Pro-användare ska INTE få "Premium aktiverat"-text.
  // Trial-aktiv flagga skiljer "🎁 Trial startad" från "✅ Köp slutfört".
  const isPro = freshUser && freshUser.role === 'pro';
  const trialActive = isPro && freshUser.pro_trial_end_at && new Date(freshUser.pro_trial_end_at) > new Date();

  res.render('upgrade-success', {
    username: req.session.username,
    tier: freshUser ? freshUser.role : 'premium',
    isPro,
    trialActive,
  });
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
// OBS: verifyCsrf MÅSTE köra EFTER multer för multipart/form-data — annars är req.body
// tom när CSRF-tokenen läses → "Ogiltig begäran"-fel. Samma bugg som CI-threaden fixat
// i sin bulk-upload-route. Multer parsar både filen och övriga form-fält (inkl. _csrf).
app.post('/pro/samtal/ny', requireLogin, requirePro, upload.single('audio'), verifyCsrf, async (req, res) => {
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

// ── CI (Conversation Intelligence) — admin-only bulk call-analytics ──────────
// Separat från Pro-tier: skalar till 1000 samtal/dag via async DB-kö.
// Routern ligger i routes/calls.js och tar middleware-deps via factory.
app.use('/admin/calls', require('./routes/calls')({
  requireLogin, requireCIAccess, requireAdminForDestructive, verifyCsrf, generateCsrfToken,
}));

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
    username:    req.session?.username || null,
    role:        req.session?.role || null,
    totalBlocks: salesBlocks.length,
    premiumBlocks: salesBlocks.length - FREE_BLOCK_IDS.length,
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

app.post('/billing/portal', requireLogin, blockWhenImpersonating, verifyCsrf, async (req, res) => {
  // findUserById (inte findUserByUsername) — session.username är display-name nu
  const user    = findUserById(req.session.userId);
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  // Tidigare: tyst redirect till /dashboard. Nu: tydligt felmeddelande på /account.
  if (!user?.stripe_customer_id) {
    return res.redirect('/account?portalError=no_customer');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripe_customer_id,
      return_url: `${baseUrl}/account`, // returnera till /account istället för /dashboard
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Billing portal error:', err.message);
    notifyAdmin('warning', 'Stripe billing portal failed',
      `User ${user?.username} kunde inte öppna billing portal. Kan blockera cancel/uppdatering av betalning.`,
      { userId: user?.id, customerId: user?.stripe_customer_id, error: err.message }
    );
    res.redirect('/account?portalError=stripe');
  }
});

// ── 1-klick avbryt Pro-trial — utan Stripe-portal-bounce ─────────────────────
// Användaren i trial klickar "Avbryt trial" → vi cancel:ar subscriptionen
// direkt via Stripe API. Webhook customer.subscription.deleted sköter sen
// DB-uppdateringen (role='free' + clearProTrial).
app.post('/pro/cancel-trial', requireLogin, blockWhenImpersonating, verifyCsrf, async (req, res) => {
  const user = findUserById(req.session.userId);
  if (!user?.stripe_customer_id) {
    return res.redirect('/account?trialCancelError=no_customer');
  }
  if (!user.pro_trial_end_at || new Date(user.pro_trial_end_at) < new Date()) {
    // Ingen aktiv trial — kanske redan gått ut eller aldrig startat
    return res.redirect('/account?trialCancelError=no_trial');
  }

  try {
    // Hitta den trialing-subscriptionen för customer:n
    const subs = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status:   'trialing',
      limit:    10,
    });
    if (!subs.data.length) {
      return res.redirect('/account?trialCancelError=no_subscription');
    }

    // Cancel alla trialing-subs (borde bara vara 1, men defensive)
    for (const sub of subs.data) {
      await stripe.subscriptions.cancel(sub.id);
    }

    // Webhook customer.subscription.deleted kommer att fire:a inom sekunder
    // och uppdatera role='free' + clearProTrial. Vi snabb-uppdaterar UI:t
    // för att inte ha "trial aktiv"-banner kvar i raceconditions-fönstret.
    try { clearProTrial(user.id); } catch (_) {}
    req.session.role = 'free';

    audit(req, 'trial.cancel', { id: user.id, username: user.username });
    console.log(`🛑 User ${user.id} avbröt Pro-trial innan konvertering`);

    res.redirect('/account?trialCancelled=1');
  } catch (err) {
    console.error('Cancel trial error:', err.message);
    res.redirect('/account?trialCancelError=stripe');
  }
});

// ── Health check ─────────────────────────────────────────────────────────────

// ── Healthcheck — används av Railway för deploy/restart-readiness ──────────
// Två lager:
//   /health           — shallow (200 OK om processen lever, used by Railway)
//   /health?deep=1    — deep ping (DB + email-queue + R2-config), endast admin
// Railway har 30s healthcheck-deadline. Shallow är instant. Deep gör DB-query.
app.get('/health', (req, res) => {
  const isAdmin = req.session?.role === 'admin';
  const wantDeep = req.query.deep === '1' && isAdmin;

  const base = {
    status: 'ok',
    ts:     new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  };

  // Shallow-mode: bara att processen är vid liv. Returneras INSTANT.
  if (!wantDeep && !isAdmin) {
    return res.json(base);
  }

  // Admin gets service-config (utan deep)
  if (isAdmin) {
    const stats = getUserStats();
    base.db = { users: stats.total, premium: stats.premium };
    base.services = {
      email:    !!process.env.RESEND_API_KEY,
      chat:     !!process.env.GROQ_API_KEY,
      stripe:   !!process.env.STRIPE_SECRET_KEY,
      stripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
      r2Backup: !!(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET),
      alerting: !!process.env.ADMIN_ALERT_WEBHOOK_URL,
      cron:     !!process.env.CRON_SECRET,
      turnstile: !!process.env.TURNSTILE_SECRET_KEY,
    };
  }

  // Deep ping — verifierar att kritiska beroenden FAKTISKT funkar, inte bara att de är konfigurerade
  if (wantDeep) {
    base.checks = {};

    // 1. DB write+read sanity-check
    try {
      const u = findUserById(req.session.userId);
      base.checks.db = u ? { ok: true, latencyMs: 0 } : { ok: false, reason: 'session user not found' };
    } catch (err) {
      base.checks.db = { ok: false, error: err.message };
      base.status = 'degraded';
    }

    // 2. Email-queue depth — hög backlog = systemiskt problem
    try {
      const pending = getPendingEmails(1);
      base.checks.emailQueue = { ok: true, pendingCount: pending.length };
    } catch (err) {
      base.checks.emailQueue = { ok: false, error: err.message };
    }

    // 3. R2 config
    base.checks.r2 = { configured: !!(process.env.R2_ACCOUNT_ID && process.env.R2_BUCKET) };

    // 4. Memory usage
    const mem = process.memoryUsage();
    base.checks.memory = {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      rssMB:      Math.round(mem.rss / 1024 / 1024),
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

  // Backfill funnel-events: register_completed för alla befintliga users.
  // Idempotent (INSERT OR IGNORE) — säker att köra varje startup. Använder
  // users.created_at som timestamp (vi vet exakt när de registrerade sig).
  // Andra events backfill:as INTE — vi har inte exakta timestamps för
  // dashboard/block/quiz historiskt och vill inte ljuga om data.
  try { backfillRegisterEvents(); } catch (err) { console.error('backfillRegisterEvents error:', err.message); }

  // Heads-up: alerting-helper är konfigurerad om ADMIN_ALERT_WEBHOOK_URL satt.
  // Logga konfig-status så admin ser i Railway-loggar om alerting fungerar.
  if (process.env.ADMIN_ALERT_WEBHOOK_URL) {
    console.log('🔔 Admin-alerting aktiverad (webhook satt)');
  } else {
    console.warn('⚠️  ADMIN_ALERT_WEBHOOK_URL ej satt — kritiska fel går endast till Railway-loggar (inga push-larm)');
  }

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

  // Clean up gammal audit-log (retention 180 dagar) — dagligen
  cleanupOldAuditLog();
  setInterval(cleanupOldAuditLog, 24 * 60 * 60 * 1000);

  // Pro-trial-påminnelse: kolla varje timme om någon har trial som slutar
  // inom kommande TRIAL_REMINDER_HOURS (default 12h). Om ja + ingen påminnelse
  // sänts än → skicka mejl. Skyddar konvertering + user-trust (ingen
  // överraskande debitering, inga chargebacks).
  const TRIAL_REMINDER_HOURS = parseInt(process.env.TRIAL_REMINDER_HOURS || '12');
  const checkAndSendTrialReminders = async () => {
    if (!resend) return; // inga mejl utan Resend-config
    try {
      const users = getUsersWithTrialEndingSoon(TRIAL_REMINDER_HOURS);
      if (!users.length) return;
      const baseUrl = process.env.APP_URL || 'https://manapp-production.up.railway.app';
      for (const u of users) {
        try {
          const endMs = new Date(u.pro_trial_end_at).getTime();
          const hoursLeft = Math.max(1, Math.round((endMs - Date.now()) / (60 * 60 * 1000)));
          const endsAtHuman = new Date(endMs).toLocaleString('sv-SE', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
          const unsubToken = emails.createUnsubscribeToken(u.id);
          // Trial-reminder skyddar 24h-trial-konvertering. Reliable wrapper queue:ar vid fail
          // så användaren ALLTID hinner få förvarning (ingen överraskande debitering → noll chargebacks).
          await sendEmailReliable({
            to:      u.email,
            subject: `⏰ Din Pro-trial slutar om ~${hoursLeft}h`,
            html:    emails.buildTrialEndingSoon({
              username:       u.username,
              endsAtHuman,
              hoursLeft,
              proUrl:         `${baseUrl}/pro`,
              cancelUrl:      `${baseUrl}/account`,
              unsubscribeUrl: `${baseUrl}/unsubscribe/${unsubToken}`,
            }),
            kind:    'trial_reminder',
          });
          markProTrialReminderSent(u.id);
          console.log(`⏰ Trial-reminder skickat till ${u.email} (${hoursLeft}h kvar)`);
        } catch (err) {
          console.error(`Trial reminder failed for user ${u.id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Trial reminder job error:', err.message);
    }
  };
  // Kör 30 sek efter startup (första check), sen varje timme
  setTimeout(checkAndSendTrialReminders, 30 * 1000);
  setInterval(checkAndSendTrialReminders, 60 * 60 * 1000);

  // Rotating DB-backups (users.db.backup.1-3) — skydd mot filkorruption.
  // Körs 10 sek efter startup (ej omedelbart — låt DB-init stabilisera först)
  // och sedan var 6:e timme. Total recovery-fönster: ~18 timmar med 3 snapshots.
  setTimeout(() => rotateDbBackups(), 10_000);
  setInterval(rotateDbBackups, 6 * 60 * 60 * 1000);

  // Email retry-queue worker: processar pending mejl var 60:e sek.
  // Säkerställer att mejl inte tappas pga tillfälliga Resend-fel.
  // Larmar om ALLA mejl i en batch failar (= systemiskt problem, ej enstaka kund).
  const emailWorker = async () => {
    if (!resend) return;
    const pending = getPendingEmails(20);
    if (!pending.length) return;
    let failed = 0;
    let succeeded = 0;
    for (const mail of pending) {
      try {
        await resend.emails.send({
          from:    mail.from_email || RESEND_FROM,
          to:      mail.to_email,
          subject: mail.subject,
          html:    mail.html,
        });
        markEmailSent(mail.id);
        succeeded++;
        // Resend free tier 10/sec — rate-limit safety
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        markEmailFailed(mail.id, err.message);
        failed++;
        console.error(`📧 Email queue retry-${mail.attempts + 1} failed for ${mail.to_email}: ${err.message}`);
      }
    }
    // Hela batchen failade = Resend nere eller config fel. Larma critical.
    // Per-mejl-fail spammar bara — ALL fail = systemiskt = vi måste agera.
    if (failed >= 3 && succeeded === 0) {
      notifyAdmin('critical', 'Email queue: ALL sends failing',
        `Email-queue-worker fick 0 OK, ${failed} fail i en batch om ${pending.length}. Resend nere, fel API-key, eller rate-limited? Mejl köas men levereras inte.`,
        { failed, succeeded, batchSize: pending.length, lastError: pending[0]?.last_error || null }
      );
    }
  };
  setTimeout(emailWorker, 30 * 1000); // första körning 30s efter startup
  setInterval(emailWorker, 60 * 1000); // sen var 60:e sek
  // Cleanup gamla rader dagligen
  setInterval(cleanupOldEmailQueue, 24 * 60 * 60 * 1000);

  // Offsite DB-backup till Cloudflare R2 (skydd mot Railway disk-failure).
  // Daglig snapshot + "latest.db" som overwritas varje gång. Retention 90d.
  // Körs första gången 5 min efter startup (sluss dagliga snapshots något),
  // sen var 24:e timme. Cleanup av gamla snapshots dagligen.
  // Larmar critical om backup failar — utan offsite har vi inget skydd mot
  // Railway disk-corruption.
  const dbBackupR2 = require('./services/dbBackup');
  const runR2Backup = async () => {
    try {
      const result = await dbBackupR2.uploadDailyBackup();
      if (!result.ok) {
        notifyAdmin('critical', 'R2 DB-backup failed',
          `Daglig DB-backup till R2 misslyckades. Reason: ${result.reason}. Utan offsite-backup är vi exponerade mot Railway disk-failure tills detta fixas.`,
          { reason: result.reason }
        );
      }
      await dbBackupR2.cleanupOldR2Backups(90);
    } catch (err) {
      notifyAdmin('critical', 'R2 DB-backup threw',
        'uploadDailyBackup() kastade — oväntat. Kolla Railway-loggar.',
        { error: err.message }
      );
    }
  };
  if (dbBackupR2.isR2Enabled()) {
    setTimeout(runR2Backup, 5 * 60 * 1000);
    setInterval(runR2Backup, 24 * 60 * 60 * 1000);
  } else {
    console.warn('⚠️  R2 not configured — offsite DB-backups disabled (only local backups exist)');
  }

  // CI (Conversation Intelligence) — bulk call-analytics worker.
  // Pollar call_jobs-tabellen efter pending uppladdningar och processar
  // en i taget via Groq (Whisper + LLM). Admin-only i Fas 1.
  require('./services/callQueue').start();

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  // Railway skickar SIGTERM vid redeploy. Utan riktig graceful shutdown:
  //   - Stripe-webhook mid-process → user betalar, ingen role-change → support-ärende
  //   - PDF/EPUB-generering → user får 502
  //   - Email-queue worker mid-send → mejlet räknas failed, retry-spam
  //
  // Korrekt sekvens:
  //   1. Stoppa acceptera nya HTTP-connections (server.close)
  //   2. Vänta på in-flight requests (eller timeout 25s — Railway dödar vid 30s)
  //   3. Flusha analytics-buffer till DB
  //   4. Exit
  //
  // SIGTERM kommer två gånger? andra gör force-exit (om något hänger 10s+).
  let server = null;
  let shuttingDown = false;
  const GRACEFUL_TIMEOUT_MS = 25000;

  const gracefulShutdown = (signal) => {
    if (shuttingDown) {
      // Använd process.stderr.write för synkron output — console.warn kan
      // buffras + appen är på väg ner ändå
      process.stderr.write(`\n${signal} igen — force-exit pga upprepad signal\n`);
      try { flushAnalytics(); } catch (_) {}
      process.exit(1);
    }
    shuttingDown = true;
    // process.stderr.write är synkron till TTY/pipe på Linux — säkrare än console
    process.stderr.write(`\n🛑 ${signal} mottaget — graceful shutdown (timeout ${GRACEFUL_TIMEOUT_MS}ms)...\n`);

    // Force-exit om vi inte hinner inom Railway:s 30s-deadline
    const forceTimer = setTimeout(() => {
      console.error('⏱️  Graceful shutdown timeout — force-exit');
      try { flushAnalytics(); } catch (_) {}
      process.exit(1);
    }, GRACEFUL_TIMEOUT_MS);
    forceTimer.unref(); // tillåt clean exit innan timer

    // Stoppa acceptera nya connections — befintliga får slutföra
    if (server) {
      server.close((err) => {
        if (err) process.stderr.write('Server close error: ' + err.message + '\n');
        try { flushAnalytics(); } catch (e) { process.stderr.write('Final flush error: ' + e.message + '\n'); }
        process.stderr.write('✅ Graceful shutdown klar\n');
        clearTimeout(forceTimer);
        // setImmediate ger event-loop chans att flusha I/O innan exit
        setImmediate(() => process.exit(0));
      });
    } else {
      try { flushAnalytics(); } catch (_) {}
      setImmediate(() => process.exit(0));
    }
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  // Catch unhandled errors istället för silent exit
  process.on('uncaughtException', (err) => {
    console.error('⚠️  uncaughtException:', err.message, err.stack);
    notifyAdmin('critical', 'uncaughtException — server kraschar',
      'Process tar emot oväntat fel utan handler. Detta dödar Node-processen om vi inte fångar.',
      { error: err.message, stack: String(err.stack || '').slice(0, 800) });
    // Försök flusha innan exit, men exit:a — state är okänt
    try { flushAnalytics(); } catch (_) {}
    process.exit(1);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️  unhandledRejection:', reason);
    const msg = reason instanceof Error ? reason.message : String(reason);
    notifyAdmin('warning', 'Unhandled promise rejection',
      'En async-operation misslyckades utan .catch(). Inte kritisk men indikerar bugg.',
      { error: msg, stack: reason instanceof Error ? String(reason.stack || '').slice(0, 800) : null });
    // Inte exit — kan vara recoverable (men logga)
  });

  server = app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
}

startServer();
