// server.js
// Main entry point. Sets up Express, sessions, and all routes.

const express  = require('express');
const session  = require('express-session');
const bcrypt   = require('bcryptjs');
const {
  initDatabase,
  findUserByUsername,
  createUser,
  getNotesByUserId,
  createNote,
  deleteNote,
} = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(express.urlencoded({ extended: false }));
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

// POST /register — create a new user account
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

  // Success — redirect to login page with a success message
  res.render('login', { error: null, registerError: null, success: `Kontot "${username}" skapades! Du kan nu logga in.` });
});

app.post('/', async (req, res) => {
  const { username, password } = req.body;
  const user = findUserByUsername(username);

  if (!user) {
    return res.render('login', { error: 'Invalid username or password.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.render('login', { error: 'Invalid username or password.' });
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

// POST /notes — save a new note
app.post('/notes', requireLogin, (req, res) => {
  const content = (req.body.content || '').trim();
  if (content) {
    createNote(req.session.userId, content);
  }
  res.redirect('/dashboard');
});

// POST /notes/:id/delete — delete a note
app.post('/notes/:id/delete', requireLogin, (req, res) => {
  deleteNote(Number(req.params.id), req.session.userId);
  res.redirect('/dashboard');
});

// ── Start server ──────────────────────────────────────────────────────────────

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
