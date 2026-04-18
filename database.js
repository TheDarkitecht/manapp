// database.js
// Sets up the SQLite database using sql.js (pure JavaScript — no compilation needed).
// Creates the users and notes tables, and seeds one test user on first run.

const initSqlJs = require('sql.js');
const bcrypt    = require('bcryptjs');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db');

let db; // the database connection, set by initDatabase()

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileData = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileData);
  } else {
    db = new SQL.Database();
  }

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL
    )
  `);

  // Notes table — each note belongs to a user via user_id
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      content    TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Seed test user if table is empty
  const stmt = db.prepare('SELECT COUNT(*) AS total FROM users');
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();

  if (row.total === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('Seeded test user: admin / 123456');
  }

  saveDb();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── User queries ──────────────────────────────────────────────────────────────

function findUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  stmt.bind([username]);
  if (stmt.step()) {
    const user = stmt.getAsObject();
    stmt.free();
    return user;
  }
  stmt.free();
  return null;
}

// ── Note queries ──────────────────────────────────────────────────────────────

// Get all notes for a user, newest first.
function getNotesByUserId(userId) {
  const stmt = db.prepare(
    'SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC'
  );
  stmt.bind([userId]);
  const notes = [];
  while (stmt.step()) {
    notes.push(stmt.getAsObject());
  }
  stmt.free();
  return notes;
}

// Create a new note for a user.
function createNote(userId, content) {
  db.run(
    'INSERT INTO notes (user_id, content) VALUES (?, ?)',
    [userId, content]
  );
  saveDb();
}

// Delete a note — only if it belongs to the requesting user (safety check).
function deleteNote(noteId, userId) {
  db.run(
    'DELETE FROM notes WHERE id = ? AND user_id = ?',
    [noteId, userId]
  );
  saveDb();
}

// Create a new user. Returns { ok: true } or { ok: false, error: '...' }.
function createUser(username, password) {
  const existing = findUserByUsername(username);
  if (existing) {
    return { ok: false, error: 'Användarnamnet är redan taget.' };
  }
  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
  saveDb();
  return { ok: true };
}

module.exports = {
  initDatabase,
  saveDb,
  findUserByUsername,
  createUser,
  getNotesByUserId,
  createNote,
  deleteNote,
};
