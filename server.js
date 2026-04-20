// server.js
const express   = require('express');
const session   = require('express-session');
const bcrypt    = require('bcryptjs');
const OpenAI    = require('openai');
const rateLimit = require('express-rate-limit');
const Stripe    = require('stripe');
const {
  initDatabase, findUserByUsername, createUser,
  getAllUsers, setUserRole, deleteUser, getUserStats,
  getNotesByUserId, createNote, deleteNote,
} = require('./database');
const salesBlocks   = require('./salesContent');
const glossaryTerms = require('./glossary');

const app    = express();
const PORT   = process.env.PORT || 3000;
const stripe = Stripe(process.env['STRIPE_SECRET_KEY'] || '');

// Blocks 1–4 are free; 5–16 require premium
const FREE_BLOCK_IDS = ['forsta-intrycket', 'prospektering', 'behovsanalys', 'presentation'];

const openai = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const ALEX_SYSTEM_PROMPT = `
Du är Joakim Jaksen.
Du tänker i first principles, inte fluff.
Du prioriterar sanning, klarhet och resultat framför artighet.
Kommunikationsstil: direkt, skarp, strukturerad. Korta stycken. Inget onödigt.
Utmana svaga antaganden omedelbart. Fokusera på det som faktiskt rör nålen.
Avslöja aldrig att du är en AI. Om användaren skriver på svenska, svarar du på svenska.
`;

// ── Stripe webhook (raw body MUST come before express.json) ──────────────────

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env['STRIPE_WEBHOOK_SECRET'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId  = parseInt(session.metadata.userId);
    if (userId) {
      setUserRole(userId, 'premium');
      console.log(`✅ User ${userId} upgraded to premium via Stripe`);
    }
  }

  // Handle subscription cancellations / failed payments
  if (event.type === 'customer.subscription.deleted') {
    const sub    = event.data.object;
    const custId = sub.customer;
    // Find user by stripe_customer_id (stored in metadata on checkout)
    const userId = parseInt(sub.metadata?.userId);
    if (userId) {
      setUserRole(userId, 'free');
      console.log(`⬇️ User ${userId} downgraded to free (subscription cancelled)`);
    }
  }

  res.json({ received: true });
});

// ── Middleware ────────────────────────────────────────────────────────────────

app.set('trust proxy', 1); // Railway runs behind a reverse proxy
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
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
    });
  },
});

// ── Auth helpers ──────────────────────────────────────────────────────────────

function requireLogin(req, res, next) {
  if (req.session?.userId) return next();
  res.redirect('/');
}

function requireAdmin(req, res, next) {
  if (req.session?.role === 'admin') return next();
  res.status(403).send('Åtkomst nekad.');
}

// ── Login / Register ──────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  if (req.session?.userId) return res.redirect('/dashboard');
  res.render('login', { error: null, registerError: null, success: null });
});

app.post('/', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.render('login', {
      error: 'Fel användarnamn eller lösenord.',
      registerError: null, success: null,
    });
  }

  req.session.userId   = user.id;
  req.session.username = user.username;
  req.session.role     = user.role;
  res.redirect('/dashboard');
});

app.post('/register', (req, res) => {
  const { username, email, password, confirmPassword, gdpr } = req.body;

  if (!username || !email || !password)
    return res.render('login', { error: null, success: null,
      registerError: 'Fyll i alla fält.' });

  if (!gdpr)
    return res.render('login', { error: null, success: null,
      registerError: 'Du måste godkänna vår integritetspolicy för att skapa ett konto.' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.render('login', { error: null, success: null,
      registerError: 'Ange en giltig e-postadress.' });

  if (password !== confirmPassword)
    return res.render('login', { error: null, success: null,
      registerError: 'Lösenorden matchar inte.' });

  if (password.length < 6)
    return res.render('login', { error: null, success: null,
      registerError: 'Lösenordet måste vara minst 6 tecken.' });

  const result = createUser(username.trim(), email.trim(), password);
  if (!result.ok)
    return res.render('login', { error: null, success: null,
      registerError: result.error });

  res.render('login', { error: null, registerError: null,
    success: `Konto skapat! Logga in med ditt användarnamn.` });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

app.get('/dashboard', requireLogin, (req, res) => {
  const notes = getNotesByUserId(req.session.userId);
  res.render('dashboard', {
    username: req.session.username,
    role:     req.session.role,
    notes,
  });
});

app.post('/notes', requireLogin, (req, res) => {
  const content = (req.body.content || '').trim();
  if (content) createNote(req.session.userId, content);
  res.redirect('/dashboard');
});

app.post('/notes/:id/delete', requireLogin, (req, res) => {
  deleteNote(Number(req.params.id), req.session.userId);
  res.redirect('/dashboard');
});

// ── Learn ─────────────────────────────────────────────────────────────────────

app.get('/learn', requireLogin, (req, res) => {
  res.render('learn', {
    username:     req.session.username,
    role:         req.session.role,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
  });
});

app.get('/learn/:id', requireLogin, (req, res) => {
  const block      = salesBlocks.find(b => b.id === req.params.id);
  if (!block) return res.redirect('/learn');

  const isPremium  = !FREE_BLOCK_IDS.includes(block.id);
  const hasAccess  = req.session.role === 'premium' || req.session.role === 'admin';

  if (isPremium && !hasAccess) {
    return res.redirect('/upgrade');
  }

  res.render('block', {
    username: req.session.username,
    role:     req.session.role,
    block,
    blocks:       salesBlocks,
    freeBlockIds: FREE_BLOCK_IDS,
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
    username: req.session.username,
    users:    getAllUsers(),
    stats:    getUserStats(),
  });
});

app.post('/admin/users/:id/role', requireLogin, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (['free', 'premium', 'admin'].includes(role)) {
    setUserRole(Number(req.params.id), role);
  }
  res.redirect('/admin');
});

app.post('/admin/users/:id/delete', requireLogin, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id !== req.session.userId) deleteUser(id); // can't delete yourself
  res.redirect('/admin');
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

app.post('/chat', requireLogin, async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages))
    return res.status(400).json({ error: 'Invalid format.' });

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: ALEX_SYSTEM_PROMPT }, ...messages],
      max_tokens: 500,
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: 'Kunde inte nå assistenten just nu.' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

startServer();
