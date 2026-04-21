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
  initDatabase, findUserByUsername, findUserByEmail, createUser,
  getAllUsers, setUserRole, deleteUser, deleteUserAccount, getUserStats,
  setStripeCustomerId, findUserByStripeCustomerId,
  updateLastLogin,
  getNotesByUserId, createNote, deleteNote,
  getBlockProgress, saveQuizResult, getCompletedBlockCount,
  createResetToken, findValidResetToken, deleteResetToken, updateUserPassword,
} = require('./database');
const salesBlocks   = require('./salesContent');
const glossaryTerms = require('./glossary');

const app    = express();
const PORT   = process.env.PORT || 3000;
const stripe = Stripe(process.env['STRIPE_SECRET_KEY'] || '');
const resend = process.env['RESEND_API_KEY'] ? new Resend(process.env['RESEND_API_KEY']) : null;
// Set RESEND_FROM to a verified Resend sender, e.g. "Joakim Jaksen <noreply@joakimjaksen.se>"
const RESEND_FROM = process.env['RESEND_FROM'] || 'Joakim Jaksen <onboarding@resend.dev>';

// Block 1 is free; 2–16 require premium (teaser shown for locked blocks)
const FREE_BLOCK_IDS = ['forsta-intrycket'];

const openai = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const JOCKE_SYSTEM_PROMPT = `
Du heter Jocke. Du är säljcoachen på Joakim Jaksens plattform — byggd av Joakim Jaksen, 22+ år i säljbranschen, 120M SEK i resultat.

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
1. Inledning & Första Intrycket — De 7 första sekunderna, Mehrabians regel, öppna samtal rätt.
2. Behovsanalys & Lyssnandets Konst — SPIN-selling, öppna frågor, aktiv lyssning.
3. Prospektering & Leadsgenerering — ICP, cold outreach, social selling.
4. Invändningshantering — Feel-felt-found, aikidometoden, vanliga invändningar.
5. Produktkunskap & Värdepresentation — FAB, skillnaden mellan features och värde.
6. Avslutstekniker — Assumptive close, urgency, trial close.
7. Uppföljning & CRM — Systemtänk, timing, multi-touch.
8. Telefonförsäljning — Röst, tempo, öppning, gatekeeper.
9. Förhandling & Prisets Psykologi — BATNA, anchoring, value-based pricing.
10. LinkedIn & Social Selling — Profil, outreach, content.
11. Videosamtal & Digital Närvaro — Miljö, kroppsspråk, tech.
12. E-post & Skriftlig Kommunikation — Subject lines, struktur, ton.
13. Personligt Varumärke & Trovärdighet — Positionering, expertis, synlighet.
14. Tidshantering & Prioritering för Säljare — Pareto i sälj, fokusblock.
15. Mental Styrka & Resiliens — Rädsla för avslag, mindset, återhämtning.
16. Säljledarskap & Teamutveckling — Coacha säljare, KPI:er, teamkultur.

REGLER:
- Avslöja aldrig att du är en AI eller ett LLM.
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

  if (event.type === 'checkout.session.completed') {
    const sess   = event.data.object;
    const userId = parseInt(sess.metadata?.userId);
    if (userId) {
      setUserRole(userId, 'premium');
      // Store Stripe customer ID for future webhook lookups
      if (sess.customer) setStripeCustomerId(userId, sess.customer);
      console.log(`✅ User ${userId} upgraded to premium`);
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
    // If subscription is re-activated
    if (sub.status === 'active') {
      let userId = parseInt(sub.metadata?.userId);
      if (!userId && sub.customer) {
        const u = findUserByStripeCustomerId(sub.customer);
        if (u) userId = u.id;
      }
      if (userId) setUserRole(userId, 'premium');
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
}));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

const isProd = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge:   1000 * 60 * 60 * 8, // 8 hours
    httpOnly: true,
    secure:   isProd,             // HTTPS-only in production
    sameSite: 'lax',              // CSRF mitigation
  },
}));

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
    });
  },
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
      När du är redo för mer — uppgradera till Premium och lås upp alla 16 block, AI-coachen Jocke och videogenomgångarna.
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

function requireLogin(req, res, next) {
  if (req.session?.userId) return next();
  res.redirect('/login');
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
  res.render('landing', { blocks: salesBlocks });
});

// ── Login ─────────────────────────────────────────────────────────────────────

app.get('/login', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  res.render('login', { error: null, registerError: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY });
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

  // Regenerate session ID to prevent session fixation attacks
  req.session.regenerate((err) => {
    if (err) return res.redirect('/login');
    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.role     = user.role;
    updateLastLogin(user.id);
    res.redirect('/dashboard');
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

  if (password.length < 6)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: 'Lösenordet måste vara minst 6 tecken.' });

  const result = createUser(username.trim(), email.trim(), password);
  if (!result.ok)
    return res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY,
      registerError: result.error });

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
  res.render('forgot-password', { error: null, success: null });
});

app.post('/forgot-password', resetLimiter, async (req, res) => {
  const { email } = req.body;
  const user = findUserByEmail(email?.trim().toLowerCase());

  // Always show success to prevent email enumeration
  if (!user) {
    return res.render('forgot-password', {
      error: null,
      success: 'Om e-postadressen finns i systemet har vi skickat en länk.',
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
  });
});

app.get('/reset-password/:token', (req, res) => {
  const record = findValidResetToken(req.params.token);
  if (!record) {
    return res.render('reset-password', {
      token: null, error: 'Länken är ogiltig eller har gått ut.', success: null,
    });
  }
  res.render('reset-password', { token: req.params.token, error: null, success: null });
});

app.post('/reset-password/:token', async (req, res) => {
  const { password, confirmPassword } = req.body;
  const record = findValidResetToken(req.params.token);

  if (!record) {
    return res.render('reset-password', {
      token: null, error: 'Länken är ogiltig eller har gått ut.', success: null,
    });
  }
  if (!password || password.length < 6) {
    return res.render('reset-password', {
      token: req.params.token, error: 'Lösenordet måste vara minst 6 tecken.', success: null,
    });
  }
  if (password !== confirmPassword) {
    return res.render('reset-password', {
      token: req.params.token, error: 'Lösenorden matchar inte.', success: null,
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
    csrfToken:    generateCsrfToken(req),
  });
});

app.post('/notes', requireLogin, verifyCsrf, (req, res) => {
  const content = (req.body.content || '').trim().slice(0, 2000); // max 2000 chars
  if (content) createNote(req.session.userId, content);
  res.redirect('/dashboard');
});

app.post('/notes/:id/delete', requireLogin, verifyCsrf, (req, res) => {
  deleteNote(Number(req.params.id), req.session.userId);
  res.redirect('/dashboard');
});

// ── Learn ─────────────────────────────────────────────────────────────────────

app.get('/learn', requireLogin, (req, res) => {
  const progress = getBlockProgress(req.session.userId);
  res.render('learn', {
    username:     req.session.username,
    role:         req.session.role,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
    progress,
  });
});

app.get('/learn/:id', requireLogin, (req, res) => {
  const block      = salesBlocks.find(b => b.id === req.params.id);
  if (!block) return res.redirect('/learn');

  const isPremium  = !FREE_BLOCK_IDS.includes(block.id);
  const hasAccess  = req.session.role === 'premium' || req.session.role === 'admin';
  const isTeaser   = isPremium && !hasAccess;

  const progress   = getBlockProgress(req.session.userId);
  const blockProg  = progress[block.id] || {};

  // Estimate reading time (200 wpm average)
  const wordCount  = (block.theory || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const readTime   = Math.max(1, Math.round(wordCount / 200));

  res.render('block', {
    username:     req.session.username,
    role:         req.session.role,
    block,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
    isTeaser,
    blockProg,
    readTime,
  });
});

// ── Quiz result — save score to DB ───────────────────────────────────────────

app.post('/quiz-result', requireLogin, quizLimiter, (req, res) => {
  const { blockId, score, total } = req.body;
  if (!blockId || score === undefined || !total) return res.json({ ok: false });
  const block = salesBlocks.find(b => b.id === blockId);
  if (!block) return res.json({ ok: false });
  const isPremium = FREE_BLOCK_IDS.includes(block.id) || req.session.role === 'premium' || req.session.role === 'admin';
  if (!isPremium) return res.json({ ok: false });
  saveQuizResult(req.session.userId, blockId, parseInt(score), parseInt(total));
  res.json({ ok: true });
});

// ── Account deletion (GDPR right to erasure) ─────────────────────────────────

app.post('/account/delete', requireLogin, verifyCsrf, async (req, res) => {
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
  res.render('ordbok', {
    username:   req.session.username,
    role:       req.session.role,
    terms:      glossaryTerms,
    categories,
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

app.post('/admin/users/:id/role', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const { role } = req.body;
  if (['free', 'premium', 'admin'].includes(role)) {
    setUserRole(Number(req.params.id), role);
  }
  res.redirect('/admin');
});

app.post('/admin/users/:id/delete', requireLogin, requireAdmin, verifyCsrf, (req, res) => {
  const id = Number(req.params.id);
  if (id !== req.session.userId) deleteUser(id); // can't delete yourself
  res.redirect('/admin');
});

// ── Admin CSV export ──────────────────────────────────────────────────────────

app.get('/admin/export/users.csv', requireLogin, requireAdmin, (req, res) => {
  const users = getAllUsers();
  const header = ['id', 'username', 'email', 'role', 'gdpr', 'created_at', 'last_login'].join(',');
  const rows   = users.map(u =>
    [
      u.id,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.email    || '').replace(/"/g, '""')}"`,
      u.role,
      u.gdpr ? '1' : '0',
      (u.created_at  || '').slice(0, 10),
      (u.last_login  || '').slice(0, 10),
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
  if (req.session.role === 'premium' || req.session.role === 'admin') {
    return res.redirect('/dashboard');
  }
  res.render('upgrade', {
    username: req.session.username,
    role:     req.session.role,
  });
});

app.post('/upgrade/checkout', requireLogin, async (req, res) => {
  if (req.session.role === 'premium' || req.session.role === 'admin') {
    return res.redirect('/dashboard');
  }

  const user    = findUserByUsername(req.session.username);
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode:                 'subscription',
      customer_email:       user.email || undefined,
      line_items: [{
        price:    process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/upgrade`,
      metadata: {
        userId: String(req.session.userId),
      },
    });
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.render('upgrade', {
      username: req.session.username,
      role:     req.session.role,
      error:    'Betalningen kunde inte startas. Försök igen.',
    });
  }
});

app.get('/upgrade/success', requireLogin, async (req, res) => {
  // Webhook handles the DB update — just update the session here as well
  req.session.role = 'premium';
  res.render('upgrade-success', { username: req.session.username });
});

// ── Chat ──────────────────────────────────────────────────────────────────────

app.post('/chat', requireLogin, chatLimiter, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages))
    return res.status(400).json({ error: 'Invalid format.' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: JOCKE_SYSTEM_PROMPT }, ...messages],
      max_tokens: 500,
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('Groq error:', err.message);
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
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── 404 handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>404 — Joakim Jaksen</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body class="learn-page" style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div style="text-align:center;padding:2rem;">
        <div style="font-size:4rem;margin-bottom:1rem;">🎯</div>
        <h1 style="font-size:2rem;font-weight:900;color:#f1f5f9;margin-bottom:0.5rem;">404 — Sidan hittades inte</h1>
        <p style="color:#64748b;margin-bottom:2rem;">Sidan du letar efter finns inte eller har flyttats.</p>
        <a href="/dashboard" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:0.875rem 2rem;border-radius:10px;text-decoration:none;font-weight:600;">Till dashboarden →</a>
      </div>
    </body>
    </html>
  `);
});

// ── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
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
        <a href="/dashboard" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:0.875rem 2rem;border-radius:10px;text-decoration:none;font-weight:600;">Till dashboarden →</a>
      </div>
    </body>
    </html>
  `);
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
    if (!process.env.GROQ_API_KEY)
      warnings.push('GROQ_API_KEY is not set — AI chat will not work.');
    if (warnings.length > 0) {
      console.warn('\n⚠️  Production security warnings:');
      warnings.forEach(w => console.warn(`   • ${w}`));
      console.warn('');
    }
  }

  app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
}

startServer();
