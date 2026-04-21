// database.js
// SQLite via sql.js. Handles schema, migrations, and all DB queries.

const initSqlJs = require('sql.js');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

// Create directory if it doesn't exist (needed for /data/users.db on Railway)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

// ── Init & migration ──────────────────────────────────────────────────────────

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  // Core users table (original schema)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL
    )
  `);

  // Notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      content    TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Password reset tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token      TEXT    NOT NULL UNIQUE,
      expires_at TEXT    NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Block progress table
  db.run(`
    CREATE TABLE IF NOT EXISTS block_progress (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      block_id   TEXT    NOT NULL,
      completed  INTEGER NOT NULL DEFAULT 0,
      quiz_score INTEGER,
      quiz_total INTEGER,
      completed_at TEXT,
      UNIQUE(user_id, block_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Migration: add new columns if they don't exist yet.
  // SQLite doesn't support "ADD COLUMN IF NOT EXISTS" so we catch errors.
  const migrations = [
    "ALTER TABLE users ADD COLUMN email              TEXT",
    "ALTER TABLE users ADD COLUMN role               TEXT    NOT NULL DEFAULT 'free'",
    "ALTER TABLE users ADD COLUMN gdpr               INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN gdpr_at            TEXT",
    "ALTER TABLE users ADD COLUMN created_at         TEXT    DEFAULT (datetime('now'))",
    "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT",
    "ALTER TABLE users ADD COLUMN last_login         TEXT",
    // pw_version increments on every password change; sessions store a copy and are
    // invalidated if the version doesn't match — this ensures password-reset kills stolen sessions.
    "ALTER TABLE users ADD COLUMN pw_version         INTEGER NOT NULL DEFAULT 0",
    // Performance indexes (CREATE INDEX IF NOT EXISTS is idempotent)
    "CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email)",
    // Enforce email uniqueness at DB level (partial — allows NULL for users without email)
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS idx_users_stripe_customer   ON users(stripe_customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_notes_user_id           ON notes(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_block_progress_user_id  ON block_progress(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id    ON reset_tokens(user_id)",
  ];
  migrations.forEach(sql => { try { db.run(sql); } catch (_) {} });

  // Seed admin user if table is empty
  const stmt = db.prepare('SELECT COUNT(*) AS total FROM users');
  stmt.step();
  const { total } = stmt.getAsObject();
  stmt.free();

  if (total === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    db.run(
      `INSERT INTO users (username, email, password_hash, role, gdpr, gdpr_at, created_at)
       VALUES (?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))`,
      ['admin', 'admin@example.com', hash]
    );
    console.warn('⚠️  SECURITY: Seeded admin user with default password admin/123456.');
    console.warn('    → Change the password immediately via the admin panel or ADMIN_RESET_PASSWORD env var!');
  } else {
    // Ensure existing admin account has admin role
    db.run(`UPDATE users SET role = 'admin' WHERE username = 'admin' AND role = 'free'`);
  }

  // ── Emergency admin password reset via env var ────────────────────────────
  // Set ADMIN_RESET_PASSWORD=nyttLösenord in Railway → deploy → remove the var.
  const resetPw = process.env.ADMIN_RESET_PASSWORD;
  if (resetPw) {
    const newHash = bcrypt.hashSync(resetPw, 10);
    // Also increment pw_version so any existing admin sessions are invalidated
    db.run(`UPDATE users SET password_hash = ?, pw_version = pw_version + 1 WHERE username = 'admin'`, [newHash]);
    console.log('✅ Admin password has been reset via ADMIN_RESET_PASSWORD env var. Remove it now!');
  }

  saveDb();
}

function saveDb() {
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('CRITICAL: Failed to persist database to disk:', err.message);
    // Don't re-throw — let the request complete; data change is in-memory
  }
}

function cleanupExpiredTokens() {
  try {
    db.run("DELETE FROM reset_tokens WHERE expires_at <= datetime('now')");
    saveDb();
  } catch (_) {}
}

// ── User queries ──────────────────────────────────────────────────────────────

function findUserByUsername(username) {
  const s = db.prepare('SELECT * FROM users WHERE username = ?');
  s.bind([username]);
  if (s.step()) { const u = s.getAsObject(); s.free(); return u; }
  s.free(); return null;
}

function findUserByEmail(email) {
  const s = db.prepare('SELECT * FROM users WHERE email = ?');
  s.bind([email]);
  if (s.step()) { const u = s.getAsObject(); s.free(); return u; }
  s.free(); return null;
}

function findUserById(id) {
  const s = db.prepare('SELECT * FROM users WHERE id = ?');
  s.bind([id]);
  if (s.step()) { const u = s.getAsObject(); s.free(); return u; }
  s.free(); return null;
}

// Register a new user. Returns { ok, error? }
function createUser(username, email, password) {
  if (findUserByUsername(username))
    return { ok: false, error: 'Användarnamnet är redan taget.' };
  if (findUserByEmail(email))
    return { ok: false, error: 'E-postadressen används redan.' };

  const hash = bcrypt.hashSync(password, 10);
  db.run(
    `INSERT INTO users (username, email, password_hash, role, gdpr, gdpr_at, created_at)
     VALUES (?, ?, ?, 'free', 1, datetime('now'), datetime('now'))`,
    [username.trim(), email.trim().toLowerCase(), hash]
  );
  saveDb();
  return { ok: true };
}

// ── Admin queries ─────────────────────────────────────────────────────────────

function getAllUsers() {
  const s = db.prepare(
    'SELECT id, username, email, role, gdpr, gdpr_at, created_at, last_login, stripe_customer_id FROM users ORDER BY id DESC'
  );
  const users = [];
  while (s.step()) users.push(s.getAsObject());
  s.free();
  return users;
}

function setUserRole(userId, role) {
  db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  saveDb();
}

function setStripeCustomerId(userId, stripeCustomerId) {
  db.run('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [stripeCustomerId, userId]);
  saveDb();
}

function findUserByStripeCustomerId(customerId) {
  const s = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?');
  s.bind([customerId]);
  if (s.step()) { const u = s.getAsObject(); s.free(); return u; }
  s.free(); return null;
}

function _deleteUserRows(userId) {
  // Run all deletions in a single transaction
  db.run('BEGIN TRANSACTION');
  try {
    db.run('DELETE FROM block_progress WHERE user_id = ?', [userId]);
    db.run('DELETE FROM notes WHERE user_id = ?', [userId]);
    db.run('DELETE FROM reset_tokens WHERE user_id = ?', [userId]);
    db.run('DELETE FROM users WHERE id = ?', [userId]);
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
  saveDb();
}

function deleteUserAccount(userId) { _deleteUserRows(userId); }
function deleteUser(userId)        { _deleteUserRows(userId); }

function updateLastLogin(userId) {
  db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [userId]);
  saveDb();
}

function getUserStats() {
  const run = sql => {
    const s = db.prepare(sql); s.step();
    const r = s.getAsObject(); s.free(); return r;
  };
  const total   = run('SELECT COUNT(*) AS n FROM users').n;
  const premium = run("SELECT COUNT(*) AS n FROM users WHERE role = 'premium'").n;
  const free    = run("SELECT COUNT(*) AS n FROM users WHERE role = 'free'").n;
  return {
    total,
    premium,
    free,
    thisWeek:    run("SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', '-7 days')").n,
    activeToday: run("SELECT COUNT(*) AS n FROM users WHERE last_login >= datetime('now', '-1 day')").n,
    totalNotes:  run('SELECT COUNT(*) AS n FROM notes').n,
    conversion:  total > 0 ? Math.round((premium / total) * 100) : 0,
    mrr:         premium * 199,
  };
}

// ── Note queries ──────────────────────────────────────────────────────────────

function getNotesByUserId(userId) {
  const s = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC');
  s.bind([userId]);
  const notes = [];
  while (s.step()) notes.push(s.getAsObject());
  s.free();
  return notes;
}

function createNote(userId, content) {
  // Enforce limit of 50 notes per user
  const s = db.prepare('SELECT COUNT(*) AS n FROM notes WHERE user_id = ?');
  s.bind([userId]); s.step();
  const { n } = s.getAsObject(); s.free();
  if (n >= 50) return false; // limit reached — caller can inform the user
  db.run('INSERT INTO notes (user_id, content) VALUES (?, ?)', [userId, content]);
  saveDb();
  return true;
}

function deleteNote(noteId, userId) {
  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  saveDb();
}

// ── Block progress ────────────────────────────────────────────────────────────

function getBlockProgress(userId) {
  const s = db.prepare('SELECT * FROM block_progress WHERE user_id = ?');
  s.bind([userId]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  // Return as map: blockId → { completed, quiz_score, quiz_total }
  const map = {};
  rows.forEach(r => { map[r.block_id] = r; });
  return map;
}

function saveQuizResult(userId, blockId, score, total) {
  const completed = score >= Math.ceil(total * 0.6) ? 1 : 0; // 60% to pass
  // completed_at: set to now if passing, NULL if failing (consistent with completed flag)
  const completedAt = completed ? new Date().toISOString() : null;
  db.run(`
    INSERT INTO block_progress (user_id, block_id, completed, quiz_score, quiz_total, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, block_id) DO UPDATE SET
      quiz_score   = excluded.quiz_score,
      quiz_total   = excluded.quiz_total,
      completed    = excluded.completed,
      completed_at = excluded.completed_at
  `, [userId, blockId, completed, score, total, completedAt]);
  saveDb();
}

function getCompletedBlockCount(userId) {
  const s = db.prepare('SELECT COUNT(*) AS n FROM block_progress WHERE user_id = ? AND completed = 1');
  s.bind([userId]);
  s.step();
  const { n } = s.getAsObject();
  s.free();
  return n;
}

// ── Password reset ────────────────────────────────────────────────────────────

function createResetToken(userId) {
  // Delete any existing tokens for this user
  db.run('DELETE FROM reset_tokens WHERE user_id = ?', [userId]);
  const token     = require('crypto').randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
  db.run(
    'INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
  saveDb();
  return token;
}

function findValidResetToken(token) {
  const s = db.prepare(
    "SELECT * FROM reset_tokens WHERE token = ? AND expires_at > datetime('now')"
  );
  s.bind([token]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free(); return null;
}

function deleteResetToken(token) {
  db.run('DELETE FROM reset_tokens WHERE token = ?', [token]);
  saveDb();
}

function updateUserPassword(userId, newPassword) {
  const hash = require('bcryptjs').hashSync(newPassword, 10);
  // Increment pw_version so that any sessions storing the old version become invalid.
  db.run('UPDATE users SET password_hash = ?, pw_version = pw_version + 1 WHERE id = ?', [hash, userId]);
  saveDb();
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  initDatabase, saveDb, cleanupExpiredTokens,
  findUserByUsername, findUserByEmail, findUserById,
  createUser, getAllUsers, setUserRole, deleteUser, deleteUserAccount, getUserStats,
  setStripeCustomerId, findUserByStripeCustomerId,
  updateLastLogin,
  getNotesByUserId, createNote, deleteNote,
  getBlockProgress, saveQuizResult, getCompletedBlockCount,
  createResetToken, findValidResetToken, deleteResetToken, updateUserPassword,
};
