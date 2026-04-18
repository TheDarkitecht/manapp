// server.js
// Main entry point. Sets up Express, sessions, and all routes.

const express  = require('express');
const session  = require('express-session');
const bcrypt   = require('bcryptjs');
const OpenAI   = require('openai');
const {
  initDatabase,
  findUserByUsername,
  createUser,
  getNotesByUserId,
  createNote,
  deleteNote,
} = require('./database');

const app    = express();
const PORT   = process.env.PORT || 3000;

// Groq är OpenAI-kompatibelt — vi byter bara URL och nyckel
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Alex's persona — this is the hidden instruction sent to the AI on every chat request.
// The user never sees this text.
const ALEX_SYSTEM_PROMPT = `
Du är Alex — en avslappnad, varm och hjälpsam person som finns här för att prata och hjälpa till med vad som helst.
Du pratar på ett naturligt och personligt sätt, som en kompis snarare än ett verktyg.
Du ger aldrig långa listor om du inte ombeds. Du håller dig kortfattad och konversationell.
Avslöja aldrig att du är en AI, robot, språkmodell eller något liknande.
Om någon frågar om du är en AI eller robot, svara undvikande eller med lite humor — men bekräfta det aldrig.
Om användaren skriver på svenska, svarar du på svenska. Annars svarar du på det språk de använder.
`;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // needed for the chat API (JSON body)
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 },
}));

// ── Helper ────────────────────────────────────────────────────────────────────

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect('/');
  }
}

// ── Auth routes ───────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/dashboard');
  res.render('login', { error: null, registerError: null, success: null });
});

app.post('/register', (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (!username || !password) {
    return res.render('login', { error: null, registerError: 'Fyll i alla fält.', success: null });
  }
  if (password !== confirmPassword) {
    return res.render('login', { error: null, registerError: 'Lösenorden matchar inte.', success: null });
  }
  if (password.length < 4) {
    return res.render('login', { error: null, registerError: 'Lösenordet måste vara minst 4 tecken.', success: null });
  }

  const result = createUser(username.trim(), password);
  if (!result.ok) {
    return res.render('login', { error: null, registerError: result.error, success: null });
  }
  res.render('login', { error: null, registerError: null, success: `Kontot "${username}" skapades! Du kan nu logga in.` });
});

app.post('/', async (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username);

  if (!user) {
    return res.render('login', { error: 'Fel användarnamn eller lösenord.', registerError: null, success: null });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.render('login', { error: 'Fel användarnamn eller lösenord.', registerError: null, success: null });
  }

  req.session.userId   = user.id;
  req.session.username = user.username;
  res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

app.get('/dashboard', requireLogin, (req, res) => {
  const notes = getNotesByUserId(req.session.userId);
  res.render('dashboard', { username: req.session.username, notes });
});

// ── Note routes ───────────────────────────────────────────────────────────────

app.post('/notes', requireLogin, (req, res) => {
  const content = (req.body.content || '').trim();
  if (content) createNote(req.session.userId, content);
  res.redirect('/dashboard');
});

app.post('/notes/:id/delete', requireLogin, (req, res) => {
  deleteNote(Number(req.params.id), req.session.userId);
  res.redirect('/dashboard');
});

// ── Chat route ────────────────────────────────────────────────────────────────

// POST /chat — receives the conversation history, returns Alex's reply
app.post('/chat', requireLogin, async (req, res) => {
  const { messages } = req.body; // array of { role: 'user'|'assistant', content: '...' }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'llama-3.1-8b-instant', // gratis via Groq
      messages: [
        { role: 'system', content: ALEX_SYSTEM_PROMPT },
        ...messages,           // full conversation so Alex remembers context
      ],
      max_tokens: 500,
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error('OpenAI error:', err.message);
    res.status(500).json({ error: 'Alex är inte tillgänglig just nu. Försök igen.' });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
