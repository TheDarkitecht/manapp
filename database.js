// database.js
// SQLite via sql.js. Handles schema, migrations, and all DB queries.

const initSqlJs = require('sql.js');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

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

  // Migration: add new columns if they don't exist yet.
  // SQLite doesn't support "ADD COLUMN IF NOT EXISTS" so we catch errors.
  const migrations = [
    "ALTER TABLE users ADD COLUMN email       TEXT",
    "ALTER TABLE users ADD COLUMN role        TEXT    NOT NULL DEFAULT 'free'",
    "ALTER TABLE users ADD COLUMN gdpr        INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN gdpr_at     TEXT",
    "ALTER TABLE users ADD COLUMN created_at  TEXT    DEFAULT (datetime('now'))",
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
    console.log('Seeded admin user: admin / 123456');
  } else {
    // Ensure existing admin account has admin role
    db.run(`UPDATE users SET role = 'admin' WHERE username = 'admin' AND role = 'free'`);
  }

  saveDb();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
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
    'SELECT id, username, email, role, gdpr, gdpr_at, created_at FROM users ORDER BY id DESC'
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

function deleteUser(userId) {
  db.run('DELETE FROM notes WHERE user_id = ?', [userId]);
  db.run('DELETE FROM users WHERE id = ?', [userId]);
  saveDb();
}

function getUserStats() {
  const run = sql => {
    const s = db.prepare(sql); s.step();
    const r = s.getAsObject(); s.free(); return r;
  };
  return {
    total:     run('SELECT COUNT(*) AS n FROM users').n,
    premium:   run("SELECT COUNT(*) AS n FROM users WHERE role = 'premium'").n,
    free:      run("SELECT COUNT(*) AS n FROM users WHERE role = 'free'").n,
    thisWeek:  run("SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', '-7 days')").n,
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
  db.run('INSERT INTO notes (user_id, content) VALUES (?, ?)', [userId, content]);
  saveDb();
}

function deleteNote(noteId, userId) {
  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  saveDb();
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  initDatabase, saveDb,
  findUserByUsername, findUserByEmail,
  createUser, getAllUsers, setUserRole, deleteUser, getUserStats,
  getNotesByUserId, createNote, deleteNote,
};
