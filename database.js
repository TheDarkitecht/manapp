// database.js
// SQLite via sql.js. Handles schema, migrations, and all DB queries.

const initSqlJs = require('sql.js');
const bcrypt    = require('bcryptjs');
const crypto    = require('crypto');
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

  // ── Pedagogical 4-step learning system ──────────────────────────────────────
  // Tracks user's journey through each block: LÄR → ÖVA → GÖR → REFLEKTERA

  // User reflections (free-text responses to reflection prompts)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_reflections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      block_id   TEXT    NOT NULL,
      prompt_idx INTEGER NOT NULL,
      response   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User roleplay completions (each completed role-play session)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_roleplays (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      block_id     TEXT    NOT NULL,
      roleplay_id  TEXT    NOT NULL,
      turn_count   INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // User missions (field missions with real-world action + reflection)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_missions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      block_id     TEXT    NOT NULL,
      started_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      progress     INTEGER NOT NULL DEFAULT 0,
      reflection   TEXT,
      UNIQUE(user_id, block_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ── Gamification-system (prestations- och progressionssystem) ──────────────
  // Verkliga handlingar loggade av användaren — enda "nya" event-källan
  db.run(`
    CREATE TABLE IF NOT EXISTS user_actions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      category   TEXT    NOT NULL,
      count      INTEGER NOT NULL DEFAULT 1,
      note       TEXT,
      block_id   TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Preferenser som JSON-blob (schema-flexibel för framtida inställningar)
  db.run(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id     INTEGER PRIMARY KEY,
      preferences TEXT    NOT NULL DEFAULT '{}',
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Dagens challenges per användare
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_challenges (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      date           TEXT    NOT NULL,
      challenge_data TEXT    NOT NULL,
      completed_at   TEXT,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Pro-tier: call-upload analyser
  db.run(`
    CREATE TABLE IF NOT EXISTS pro_call_analyses (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      title          TEXT,
      duration_sec   INTEGER,
      transcript     TEXT,
      analysis       TEXT,
      status         TEXT NOT NULL DEFAULT 'pending',
      error_message  TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Session-store (ersätter MemoryStore så användare inte loggas ut vid redeploy)
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid        TEXT    PRIMARY KEY,
      data       TEXT    NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  // Stripe webhook idempotency — hindrar dubbelkörning om Stripe retries
  // ett event (vilket de gör vid nätverksfel). Vi loggar event.id innan vi
  // processerar; om den redan finns ignorerar vi eventet.
  db.run(`
    CREATE TABLE IF NOT EXISTS stripe_events (
      event_id     TEXT    PRIMARY KEY,
      event_type   TEXT    NOT NULL,
      processed_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Page-view tracking (for admin analytics: tid aktiv, mest besökta sidor, funnel)
  // duration_ms fylls i när nästa page_view från samma user loggas (client-side heartbeat uppdaterar senast-aktiva)
  db.run(`
    CREATE TABLE IF NOT EXISTS page_views (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      path        TEXT    NOT NULL,
      visited_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      duration_ms INTEGER,
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
    "CREATE INDEX IF NOT EXISTS idx_reflections_user_block  ON user_reflections(user_id, block_id)",
    "CREATE INDEX IF NOT EXISTS idx_roleplays_user_block    ON user_roleplays(user_id, block_id)",
    "CREATE INDEX IF NOT EXISTS idx_missions_user_block     ON user_missions(user_id, block_id)",
    "CREATE INDEX IF NOT EXISTS idx_actions_user_date       ON user_actions(user_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_actions_user_cat        ON user_actions(user_id, category)",
    "CREATE INDEX IF NOT EXISTS idx_challenges_user_date    ON daily_challenges(user_id, date DESC)",
    "CREATE INDEX IF NOT EXISTS idx_pro_calls_user          ON pro_call_analyses(user_id, created_at DESC)",
    // Referral system
    "ALTER TABLE users ADD COLUMN referral_code TEXT",
    "ALTER TABLE users ADD COLUMN referrer_id   INTEGER",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS idx_users_referrer_id          ON users(referrer_id)",
    // Page-view tracking index
    "CREATE INDEX IF NOT EXISTS idx_page_views_user_date ON page_views(user_id, visited_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_page_views_path      ON page_views(path)",
    // Session store index
    "CREATE INDEX IF NOT EXISTS idx_sessions_expires     ON sessions(expires_at)",
  ];
  migrations.forEach(sql => { try { db.run(sql); } catch (_) {} });

  // Seed admin user if table is empty
  const stmt = db.prepare('SELECT COUNT(*) AS total FROM users');
  stmt.step();
  const { total } = stmt.getAsObject();
  stmt.free();

  if (total === 0) {
    // Säker admin-seed: använd ADMIN_SEED_PASSWORD om satt, annars generera
    // slumpmässigt lösenord och logga det LOUDLY så det syns i Railway-loggar.
    // Detta fixar säkerhetshålet där gamla `admin/123456` var default i prod.
    const isProd = process.env.NODE_ENV === 'production';
    let adminPw = process.env.ADMIN_SEED_PASSWORD;
    let generated = false;
    if (!adminPw) {
      if (isProd) {
        // Genererat + loggat en gång — användaren ändrar via /account
        adminPw = crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, '').slice(0, 16);
        generated = true;
      } else {
        // Dev-miljö: ok med fix enkelt lösenord för smidig utveckling
        adminPw = '123456';
      }
    }
    const hash = bcrypt.hashSync(adminPw, 10);
    db.run(
      `INSERT INTO users (username, email, password_hash, role, gdpr, gdpr_at, created_at)
       VALUES (?, ?, ?, 'admin', 1, datetime('now'), datetime('now'))`,
      ['admin', 'admin@example.com', hash]
    );
    if (generated) {
      console.warn('╔══════════════════════════════════════════════════════════════════╗');
      console.warn('║  🔐 ADMIN USER SEEDED WITH RANDOM PASSWORD                      ║');
      console.warn('║  Användarnamn: admin                                            ║');
      console.warn(`║  Lösenord:    ${adminPw.padEnd(51)}║`);
      console.warn('║                                                                  ║');
      console.warn('║  ⚠️  Spara detta NU — det visas inte igen!                       ║');
      console.warn('║  Logga in och byt via /account, eller sätt ADMIN_RESET_PASSWORD  ║');
      console.warn('╚══════════════════════════════════════════════════════════════════╝');
    } else if (adminPw === '123456') {
      console.warn('⚠️  DEV: Seeded admin/123456 (only safe i non-production).');
      console.warn('    I prod: sätt ADMIN_SEED_PASSWORD env var eller låt systemet generera.');
    } else {
      console.log('✅ Admin seedad med ADMIN_SEED_PASSWORD från env.');
    }
  } else {
    // Ensure existing admin account has admin role
    db.run(`UPDATE users SET role = 'admin' WHERE username = 'admin' AND role = 'free'`);

    // ── Säkerhetskontroll: varna om admin fortfarande har default-lösenordet ──
    // Detta hjälper upptäcka existerande prod-deploys som seedats före fixen.
    if (process.env.NODE_ENV === 'production') {
      try {
        const adminStmt = db.prepare("SELECT password_hash FROM users WHERE username = 'admin'");
        adminStmt.step();
        const adminRow = adminStmt.getAsObject();
        adminStmt.free();
        if (adminRow?.password_hash && bcrypt.compareSync('123456', adminRow.password_hash)) {
          console.warn('╔══════════════════════════════════════════════════════════════════╗');
          console.warn('║  🔴 KRITISKT: admin-kontot har default-lösenordet "123456"      ║');
          console.warn('║  Byt genast via /account, eller sätt ADMIN_RESET_PASSWORD env    ║');
          console.warn('║  var och starta om servern för att rotera lösenordet.            ║');
          console.warn('╚══════════════════════════════════════════════════════════════════╝');
        }
      } catch (_) {}
    }
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

/**
 * Rotating DB-backups. sql.js persisterar en ENDA fil — om den korruptas
 * (disk error, SIGKILL mid-write, fs bug) förloras allt. Den här funktionen
 * skapar rotating kopior: users.db.backup.1 (senaste), .2 (6h gammal), .3 (12h).
 * Kallas från en 6-timmars cron i server.js.
 */
function rotateDbBackups() {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    // Roll .2 → .3, .1 → .2, current → .1
    const backup3 = `${DB_PATH}.backup.3`;
    const backup2 = `${DB_PATH}.backup.2`;
    const backup1 = `${DB_PATH}.backup.1`;
    if (fs.existsSync(backup2)) fs.renameSync(backup2, backup3);
    if (fs.existsSync(backup1)) fs.renameSync(backup1, backup2);
    fs.copyFileSync(DB_PATH, backup1);
    // Spara filstorlek + tidsstämpel för logg
    const stat = fs.statSync(backup1);
    console.log(`📦 DB-backup rotated: ${backup1} (${Math.round(stat.size / 1024)} KB)`);
  } catch (err) {
    console.error('rotateDbBackups failed:', err.message);
  }
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
  // Hämta nyss skapat ID
  const s = db.prepare('SELECT last_insert_rowid() AS id');
  s.step();
  const { id } = s.getAsObject();
  s.free();
  saveDb();
  return { ok: true, userId: id };
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

// ── Pedagogical 4-step tracking: reflections, roleplays, missions ─────────────

function saveReflection(userId, blockId, promptIdx, response) {
  db.run(
    'INSERT INTO user_reflections (user_id, block_id, prompt_idx, response) VALUES (?, ?, ?, ?)',
    [userId, blockId, promptIdx, response]
  );
  saveDb();
}

function getReflectionsForBlock(userId, blockId) {
  const s = db.prepare(
    'SELECT * FROM user_reflections WHERE user_id = ? AND block_id = ? ORDER BY created_at DESC'
  );
  s.bind([userId, blockId]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

function countReflectionsForBlock(userId, blockId) {
  const s = db.prepare(
    'SELECT COUNT(*) AS n FROM user_reflections WHERE user_id = ? AND block_id = ?'
  );
  s.bind([userId, blockId]);
  s.step();
  const { n } = s.getAsObject();
  s.free();
  return n;
}

function recordRoleplayCompletion(userId, blockId, roleplayId, turnCount) {
  db.run(
    'INSERT INTO user_roleplays (user_id, block_id, roleplay_id, turn_count) VALUES (?, ?, ?, ?)',
    [userId, blockId, roleplayId, turnCount]
  );
  saveDb();
}

function getRoleplaysForBlock(userId, blockId) {
  const s = db.prepare(
    'SELECT * FROM user_roleplays WHERE user_id = ? AND block_id = ? ORDER BY completed_at DESC'
  );
  s.bind([userId, blockId]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

function startMission(userId, blockId) {
  db.run(`
    INSERT INTO user_missions (user_id, block_id) VALUES (?, ?)
    ON CONFLICT(user_id, block_id) DO NOTHING
  `, [userId, blockId]);
  saveDb();
}

function updateMissionProgress(userId, blockId, progress) {
  db.run(
    'UPDATE user_missions SET progress = ? WHERE user_id = ? AND block_id = ?',
    [progress, userId, blockId]
  );
  saveDb();
}

function completeMission(userId, blockId, reflection) {
  db.run(`
    UPDATE user_missions
    SET completed_at = datetime('now'), reflection = ?
    WHERE user_id = ? AND block_id = ?
  `, [reflection || null, userId, blockId]);
  saveDb();
}

function getMissionForBlock(userId, blockId) {
  const s = db.prepare(
    'SELECT * FROM user_missions WHERE user_id = ? AND block_id = ?'
  );
  s.bind([userId, blockId]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free();
  return null;
}

function getAllMissionsForUser(userId) {
  const s = db.prepare('SELECT * FROM user_missions WHERE user_id = ? ORDER BY started_at DESC');
  s.bind([userId]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

function getAllRoleplaysForUser(userId) {
  const s = db.prepare('SELECT * FROM user_roleplays WHERE user_id = ? ORDER BY completed_at DESC');
  s.bind([userId]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

function getAllReflectionsForUser(userId) {
  const s = db.prepare('SELECT * FROM user_reflections WHERE user_id = ? ORDER BY created_at DESC');
  s.bind([userId]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

/**
 * Aggregate all learning-state data for a user in a single call.
 * Used by the recommendations engine.
 */
function getUserLearningState(userId) {
  const progressArr = [];
  const pS = db.prepare('SELECT * FROM block_progress WHERE user_id = ?');
  pS.bind([userId]);
  while (pS.step()) progressArr.push(pS.getAsObject());
  pS.free();

  const missions    = getAllMissionsForUser(userId);
  const roleplays   = getAllRoleplaysForUser(userId);
  const reflections = getAllReflectionsForUser(userId);
  const user        = findUserById(userId);

  // Build quick-lookup maps by block_id
  const progressByBlock    = {};
  progressArr.forEach(p => { progressByBlock[p.block_id] = p; });
  const missionByBlock     = {};
  missions.forEach(m => { missionByBlock[m.block_id] = m; });
  const roleplaysByBlock   = {};
  roleplays.forEach(r => {
    if (!roleplaysByBlock[r.block_id]) roleplaysByBlock[r.block_id] = [];
    roleplaysByBlock[r.block_id].push(r);
  });
  const reflectionsByBlock = {};
  reflections.forEach(r => {
    if (!reflectionsByBlock[r.block_id]) reflectionsByBlock[r.block_id] = [];
    reflectionsByBlock[r.block_id].push(r);
  });

  // Determine "last activity" — newest timestamp across all sources
  const timestamps = [
    user && user.last_login,
    ...progressArr.map(p => p.completed_at),
    ...missions.map(m => m.completed_at || m.started_at),
    ...roleplays.map(r => r.completed_at),
    ...reflections.map(r => r.created_at),
  ].filter(Boolean).map(t => new Date(t).getTime()).filter(n => !isNaN(n));
  const lastActivity = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;

  return {
    progressByBlock,
    missionByBlock,
    roleplaysByBlock,
    reflectionsByBlock,
    lastActivity,
    totalBlocksCompleted: progressArr.filter(p => p.completed).length,
    totalRoleplays:       roleplays.length,
    totalReflections:     reflections.length,
  };
}

// ── Retention: hämta alla användare med email (för digest + re-engagement) ──

function getAllUsersWithEmail() {
  const s = db.prepare("SELECT id, username, email, gdpr, last_login FROM users WHERE email IS NOT NULL AND email != ''");
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

// ── Gamification: user_actions, user_preferences, daily_challenges ────────────

function logUserAction(userId, category, count, note, blockId) {
  db.run(
    'INSERT INTO user_actions (user_id, category, count, note, block_id) VALUES (?, ?, ?, ?, ?)',
    [userId, category, Math.max(1, parseInt(count) || 1), note || null, blockId || null]
  );
  saveDb();
}

function getUserActions(userId, limit) {
  const lim = parseInt(limit) || 500;
  const s = db.prepare('SELECT * FROM user_actions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
  s.bind([userId, lim]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

function deleteUserAction(userId, actionId) {
  db.run('DELETE FROM user_actions WHERE id = ? AND user_id = ?', [actionId, userId]);
  saveDb();
}

function getActionsToday(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const s = db.prepare("SELECT * FROM user_actions WHERE user_id = ? AND date(created_at) = ?");
  s.bind([userId, today]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

function getUserPreferences(userId) {
  const s = db.prepare('SELECT preferences FROM user_preferences WHERE user_id = ?');
  s.bind([userId]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r.preferences || '{}'; }
  s.free();
  return '{}';
}

function setUserPreferences(userId, prefsJson) {
  db.run(`
    INSERT INTO user_preferences (user_id, preferences, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      preferences = excluded.preferences,
      updated_at  = excluded.updated_at
  `, [userId, prefsJson]);
  saveDb();
}

function getDailyChallenge(userId, dateStr) {
  const s = db.prepare('SELECT * FROM daily_challenges WHERE user_id = ? AND date = ?');
  s.bind([userId, dateStr]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free();
  return null;
}

function saveDailyChallenge(userId, dateStr, challengeData) {
  db.run(`
    INSERT INTO daily_challenges (user_id, date, challenge_data) VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO NOTHING
  `, [userId, dateStr, JSON.stringify(challengeData)]);
  saveDb();
}

function completeDailyChallenge(userId, dateStr) {
  db.run(`
    UPDATE daily_challenges SET completed_at = datetime('now')
    WHERE user_id = ? AND date = ? AND completed_at IS NULL
  `, [userId, dateStr]);
  saveDb();
}

/**
 * Compute full journey status per block (all 4 steps: LÄR, ÖVA, GÖR, REFLEKTERA).
 * A block is "truly mastered" when all 4 are done.
 */
function getJourneyStatus(userId, blockId) {
  // Step 1: LÄR — quiz passed counts as theory completed
  const progS = db.prepare('SELECT * FROM block_progress WHERE user_id = ? AND block_id = ?');
  progS.bind([userId, blockId]);
  const prog = progS.step() ? progS.getAsObject() : null;
  progS.free();

  // Step 2: ÖVA — at least 1 roleplay completed
  const rpS = db.prepare('SELECT COUNT(*) AS n FROM user_roleplays WHERE user_id = ? AND block_id = ?');
  rpS.bind([userId, blockId]);
  rpS.step();
  const { n: roleplayCount } = rpS.getAsObject();
  rpS.free();

  // Step 3: GÖR — mission started (in progress) or completed
  const mission = getMissionForBlock(userId, blockId);

  // Step 4: REFLEKTERA — at least 1 reflection saved
  const reflectionCount = countReflectionsForBlock(userId, blockId);

  const theoryDone     = !!(prog && prog.completed);
  const roleplayDone   = roleplayCount > 0;
  const missionDone    = !!(mission && mission.completed_at);
  const reflectionDone = reflectionCount > 0;

  return {
    theoryDone,
    roleplayDone,
    missionDone,
    reflectionDone,
    roleplayCount,
    reflectionCount,
    missionStarted: !!(mission && mission.started_at),
    missionProgress: mission ? mission.progress : 0,
    quizScore:      prog ? prog.quiz_score : null,
    quizTotal:      prog ? prog.quiz_total : null,
    fullyMastered:  theoryDone && roleplayDone && missionDone && reflectionDone,
    stepsCompleted: [theoryDone, roleplayDone, missionDone, reflectionDone].filter(Boolean).length,
  };
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

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRAL SYSTEM — compounding growth
// ═══════════════════════════════════════════════════════════════════════════════

function generateReferralCode() {
  // 6-tecken base-36 kod, alla versaler + siffror, ingen 0/O/I/1 (förvirrande)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Hämta eller skapa referral-kod för användaren. Kallas lazy — först när användaren
 * faktiskt öppnar /installningar eller är intresserad av att dela.
 */
function getOrCreateReferralCode(userId) {
  const s = db.prepare('SELECT referral_code FROM users WHERE id = ?');
  s.bind([userId]);
  if (s.step()) {
    const row = s.getAsObject();
    s.free();
    if (row.referral_code) return row.referral_code;
  } else {
    s.free();
    return null;
  }

  // Generera ny, säkerställ unik
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    try {
      db.run('UPDATE users SET referral_code = ? WHERE id = ?', [code, userId]);
      saveDb();
      return code;
    } catch (_) {
      // Collision — försök igen
    }
  }
  return null;
}

function findUserByReferralCode(code) {
  if (!code) return null;
  const s = db.prepare('SELECT * FROM users WHERE referral_code = ?');
  s.bind([code]);
  if (s.step()) { const u = s.getAsObject(); s.free(); return u; }
  s.free();
  return null;
}

function setReferrerForUser(userId, referrerId) {
  // Endast sätt om användaren ännu inte har en referrer (förhindra fusk)
  db.run(`
    UPDATE users SET referrer_id = ?
    WHERE id = ? AND referrer_id IS NULL AND id != ?
  `, [referrerId, userId, referrerId]);
  saveDb();
}

/**
 * Hämta statistik om en användares referrals.
 * Returnerar: totalReferrals, paidReferrals (premium/pro), totalMonthsEarned.
 */
function getReferralStats(userId) {
  const allRefs = rowsQuery(`
    SELECT id, username, role, created_at FROM users WHERE referrer_id = ? ORDER BY created_at DESC
  `, [userId]);
  const paid = allRefs.filter(r => r.role === 'premium' || r.role === 'pro' || r.role === 'admin');
  return {
    total: allRefs.length,
    paid: paid.length,
    referrals: allRefs.slice(0, 20), // visa senaste 20
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRO-TIER: call-upload-analyser + usage tracking
// ═══════════════════════════════════════════════════════════════════════════════

function createProCallAnalysis(userId, { title, duration_sec, status = 'pending' }) {
  db.run(
    'INSERT INTO pro_call_analyses (user_id, title, duration_sec, status) VALUES (?, ?, ?, ?)',
    [userId, title || null, duration_sec || null, status]
  );
  // Hämta ID för den nya raden
  const s = db.prepare('SELECT last_insert_rowid() AS id');
  s.step();
  const { id } = s.getAsObject();
  s.free();
  saveDb();
  return id;
}

function updateProCallAnalysis(id, updates) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (['transcript', 'analysis', 'status', 'error_message', 'duration_sec', 'title'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (!fields.length) return;
  values.push(id);
  db.run(`UPDATE pro_call_analyses SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDb();
}

function getProCallAnalysis(userId, analysisId) {
  const s = db.prepare('SELECT * FROM pro_call_analyses WHERE id = ? AND user_id = ?');
  s.bind([analysisId, userId]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free();
  return null;
}

function getProCallAnalysesForUser(userId, limit) {
  const lim = parseInt(limit) || 50;
  const s = db.prepare('SELECT id, title, duration_sec, status, created_at FROM pro_call_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
  s.bind([userId, lim]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

function countProCallAnalysesThisMonth(userId) {
  // Räkna uppladdningar senaste 30 dagar (rullande fönster — enkelt och rättvist)
  const s = db.prepare(`
    SELECT COUNT(*) AS n FROM pro_call_analyses
    WHERE user_id = ? AND created_at > datetime('now', '-30 days')
      AND status != 'failed'
  `);
  s.bind([userId]);
  s.step();
  const { n } = s.getAsObject();
  s.free();
  return n;
}

const PRO_CALL_LIMIT_PER_MONTH = 15;

function canProUserUploadCall(userId) {
  const count = countProCallAnalysesThisMonth(userId);
  return { allowed: count < PRO_CALL_LIMIT_PER_MONTH, used: count, limit: PRO_CALL_LIMIT_PER_MONTH };
}

function deleteProCallAnalysis(userId, analysisId) {
  db.run('DELETE FROM pro_call_analyses WHERE id = ? AND user_id = ?', [analysisId, userId]);
  saveDb();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS — aggregerade queries för content-insights
// ═══════════════════════════════════════════════════════════════════════════════

function scalarQuery(sql, params = []) {
  const s = db.prepare(sql);
  if (params.length) s.bind(params);
  s.step();
  const row = s.getAsObject();
  s.free();
  return row;
}

function rowsQuery(sql, params = []) {
  const s = db.prepare(sql);
  if (params.length) s.bind(params);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

/**
 * Komplett analytics-payload för /admin/analytics.
 * Alla siffror är anonymiserade aggregat.
 */
function getAdminAnalytics() {
  // ── Användare ──
  const totalUsers   = scalarQuery('SELECT COUNT(*) AS n FROM users').n;
  const premiumUsers = scalarQuery("SELECT COUNT(*) AS n FROM users WHERE role = 'premium'").n;
  const freeUsers    = scalarQuery("SELECT COUNT(*) AS n FROM users WHERE role = 'free'").n;
  const adminUsers   = scalarQuery("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").n;

  const newWeek  = scalarQuery("SELECT COUNT(*) AS n FROM users WHERE created_at > datetime('now', '-7 days')").n;
  const newMonth = scalarQuery("SELECT COUNT(*) AS n FROM users WHERE created_at > datetime('now', '-30 days')").n;

  // ── Aktiva användare (minst 1 event någon av tabellerna) ──
  // Bygg UNION över alla event-källor
  const activeWindow = (days) => {
    const sql = `
      SELECT COUNT(DISTINCT user_id) AS n FROM (
        SELECT user_id FROM block_progress WHERE completed_at > datetime('now', '-${days} days')
        UNION SELECT user_id FROM user_reflections WHERE created_at > datetime('now', '-${days} days')
        UNION SELECT user_id FROM user_roleplays WHERE completed_at > datetime('now', '-${days} days')
        UNION SELECT user_id FROM user_missions WHERE started_at > datetime('now', '-${days} days')
        UNION SELECT user_id FROM user_actions WHERE created_at > datetime('now', '-${days} days')
      )
    `;
    return scalarQuery(sql).n;
  };
  const active7  = activeWindow(7);
  const active30 = activeWindow(30);

  // ── Retention (cohort-approximering) ──
  // Av användare som registrerades 7+/14+/30+ dagar sen, hur många var aktiva senaste 7 dagar?
  const retention = (days) => {
    const eligible = scalarQuery(`
      SELECT COUNT(*) AS n FROM users WHERE created_at < datetime('now', '-${days} days')
    `).n;
    if (!eligible) return { pct: 0, active: 0, eligible: 0 };
    const activeFromCohort = scalarQuery(`
      SELECT COUNT(DISTINCT u.id) AS n
      FROM users u
      WHERE u.created_at < datetime('now', '-${days} days')
        AND u.id IN (
          SELECT user_id FROM block_progress WHERE completed_at > datetime('now', '-7 days')
          UNION SELECT user_id FROM user_reflections WHERE created_at > datetime('now', '-7 days')
          UNION SELECT user_id FROM user_roleplays WHERE completed_at > datetime('now', '-7 days')
          UNION SELECT user_id FROM user_missions WHERE started_at > datetime('now', '-7 days')
          UNION SELECT user_id FROM user_actions WHERE created_at > datetime('now', '-7 days')
        )
    `).n;
    return {
      pct: Math.round((activeFromCohort / eligible) * 100),
      active: activeFromCohort,
      eligible,
    };
  };

  // ── Block-engagement: för varje block, räkna progress per steg ──
  const blockEngagement = rowsQuery(`
    SELECT
      bp.block_id,
      COUNT(DISTINCT bp.user_id) AS theory_done,
      SUM(CASE WHEN bp.completed = 1 THEN 1 ELSE 0 END) AS quiz_passed,
      (SELECT COUNT(DISTINCT user_id) FROM user_roleplays WHERE block_id = bp.block_id) AS roleplay_users,
      (SELECT COUNT(DISTINCT user_id) FROM user_missions WHERE block_id = bp.block_id) AS mission_started,
      (SELECT COUNT(DISTINCT user_id) FROM user_missions WHERE block_id = bp.block_id AND completed_at IS NOT NULL) AS mission_done,
      (SELECT COUNT(DISTINCT user_id) FROM user_reflections WHERE block_id = bp.block_id) AS reflection_users,
      AVG(CASE WHEN bp.quiz_total > 0 THEN (CAST(bp.quiz_score AS FLOAT) / bp.quiz_total) * 100 ELSE NULL END) AS avg_quiz_pct
    FROM block_progress bp
    GROUP BY bp.block_id
    ORDER BY quiz_passed DESC
  `);

  // ── Action-kategorier (vad användare loggar i Loggboken) ──
  const actionCategories = rowsQuery(`
    SELECT category, COUNT(*) AS total_logs, SUM(count) AS total_units, COUNT(DISTINCT user_id) AS users
    FROM user_actions
    GROUP BY category
    ORDER BY total_logs DESC
  `);

  const totalActionsLogged   = scalarQuery('SELECT COUNT(*) AS n FROM user_actions').n;
  const totalRoleplays       = scalarQuery('SELECT COUNT(*) AS n FROM user_roleplays').n;
  const totalReflections     = scalarQuery('SELECT COUNT(*) AS n FROM user_reflections').n;
  const totalMissionsStarted = scalarQuery('SELECT COUNT(*) AS n FROM user_missions').n;
  const totalMissionsDone    = scalarQuery('SELECT COUNT(*) AS n FROM user_missions WHERE completed_at IS NOT NULL').n;

  // ── Fullt bemästrade block-cellar (ej bara quiz utan alla 4 steg) ──
  const masteryEvents = rowsQuery(`
    SELECT
      bp.block_id,
      COUNT(DISTINCT bp.user_id) AS users
    FROM block_progress bp
    WHERE bp.completed = 1
      AND bp.user_id IN (SELECT user_id FROM user_roleplays WHERE block_id = bp.block_id)
      AND bp.user_id IN (SELECT user_id FROM user_missions WHERE block_id = bp.block_id AND completed_at IS NOT NULL)
      AND bp.user_id IN (SELECT user_id FROM user_reflections WHERE block_id = bp.block_id)
    GROUP BY bp.block_id
    ORDER BY users DESC
  `);

  // ── Senaste aktivitet (top 10 actions över alla användare) ──
  const recentActivity = rowsQuery(`
    SELECT 'action' AS type, category AS detail, created_at, user_id FROM user_actions
    UNION ALL SELECT 'quiz', block_id, completed_at, user_id FROM block_progress WHERE completed = 1 AND completed_at IS NOT NULL
    UNION ALL SELECT 'roleplay', block_id || ':' || roleplay_id, completed_at, user_id FROM user_roleplays
    UNION ALL SELECT 'reflection', block_id, created_at, user_id FROM user_reflections
    UNION ALL SELECT 'mission_done', block_id, completed_at, user_id FROM user_missions WHERE completed_at IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 20
  `);

  return {
    users: {
      total: totalUsers,
      premium: premiumUsers,
      free: freeUsers,
      admin: adminUsers,
      newThisWeek: newWeek,
      newThisMonth: newMonth,
    },
    activity: {
      active7Days: active7,
      active30Days: active30,
    },
    retention: {
      day7:  retention(7),
      day14: retention(14),
      day30: retention(30),
    },
    blockEngagement,
    actionCategories,
    masteryEvents,
    totals: {
      actionsLogged:   totalActionsLogged,
      roleplays:       totalRoleplays,
      reflections:     totalReflections,
      missionsStarted: totalMissionsStarted,
      missionsDone:    totalMissionsDone,
    },
    recentActivity,
  };
}

// ── Page-view tracking & user analytics ───────────────────────────────────────

// Dirty-flag + debounced persist för analytics-writes.
// Vi vill inte saveDb() på varje page-view (för dyrt — hela DB skrivs om),
// men vi måste säkerställa att data inte förloras vid Railway-redeploy.
// Lösning: flagga "dirty" när analytics skriver, flusha var 30:e sekund
// om något hänt. Dessutom flush vid process-exit (SIGTERM/SIGINT).
let _analyticsDirty = false;
let _flushTimer = null;

function _markAnalyticsDirty() {
  _analyticsDirty = true;
  if (!_flushTimer) {
    _flushTimer = setTimeout(() => {
      if (_analyticsDirty) {
        _analyticsDirty = false;
        try { saveDb(); } catch (err) { console.error('Analytics flush failed:', err.message); }
      }
      _flushTimer = null;
    }, 30_000);
  }
}

/** Force-flush analytics writes. Kallas från SIGTERM-handler. */
function flushAnalytics() {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  if (_analyticsDirty) {
    _analyticsDirty = false;
    try { saveDb(); } catch (err) { console.error('flushAnalytics failed:', err.message); }
  }
}

/**
 * Logga page-view. Kallas från middleware i server.js på GET-requests
 * för inloggade användare (endast "content"-paths, ej /style.css etc.).
 * Persistens batchas via _markAnalyticsDirty (30s debounce).
 */
function logPageView(userId, path) {
  if (!userId || !path) return;
  try {
    db.run(
      'INSERT INTO page_views (user_id, path, visited_at) VALUES (?, ?, datetime(\'now\'))',
      [userId, path.slice(0, 500)]
    );
    _markAnalyticsDirty();
  } catch (err) {
    // Tyst fel — analytics får aldrig ta ner appen
    console.error('logPageView failed:', err.message);
  }
}

/**
 * Uppdaterar duration_ms för senaste page_view. Kallas från heartbeat-endpoint
 * (klient POST:ar var 30:e sekund så vi vet att de fortfarande är där).
 */
function updateLastPageViewDuration(userId, durationMs) {
  if (!userId || !Number.isFinite(durationMs) || durationMs < 0) return;
  try {
    // Hitta senaste page_view för användaren och sätt duration
    db.run(
      `UPDATE page_views
       SET duration_ms = ?
       WHERE id = (
         SELECT id FROM page_views
         WHERE user_id = ?
         ORDER BY visited_at DESC
         LIMIT 1
       )`,
      [Math.min(durationMs, 7200000), userId] // cap 2h per page
    );
    _markAnalyticsDirty();
  } catch (err) {
    console.error('updateLastPageViewDuration failed:', err.message);
  }
}

// ── Session-store primitives ──────────────────────────────────────────────────
// Används av SqlJsSessionStore-klassen i server.js. Returnerar plain JSON så
// express-session kan konsumera det; all serialisering sker i store-wrapper.

function sessionGet(sid) {
  try {
    const s = db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?');
    s.bind([sid]);
    if (s.step()) {
      const row = s.getAsObject();
      s.free();
      if (row.expires_at < Date.now()) {
        // Utgången — rensa synkront
        db.run('DELETE FROM sessions WHERE sid = ?', [sid]);
        _markAnalyticsDirty();
        return null;
      }
      return row.data;
    }
    s.free();
    return null;
  } catch (err) {
    console.error('sessionGet failed:', err.message);
    return null;
  }
}

function sessionSet(sid, data, expiresAt) {
  try {
    db.run(
      `INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at`,
      [sid, data, expiresAt]
    );
    _markAnalyticsDirty(); // batchas — sessions är skrivtunga
  } catch (err) {
    console.error('sessionSet failed:', err.message);
  }
}

function sessionDestroy(sid) {
  try {
    db.run('DELETE FROM sessions WHERE sid = ?', [sid]);
    _markAnalyticsDirty();
  } catch (err) {
    console.error('sessionDestroy failed:', err.message);
  }
}

function sessionCleanupExpired() {
  try {
    db.run('DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);
    saveDb();
  } catch (err) {
    console.error('sessionCleanupExpired failed:', err.message);
  }
}

// ── Stripe webhook idempotency ────────────────────────────────────────────────

/**
 * Kontrollera + markera ett Stripe-event som processerat.
 * Returns true om eventet är nytt (bör processeras), false om redan sett.
 * Atomisk via INSERT OR IGNORE + changes().
 */
function markStripeEventProcessed(eventId, eventType) {
  if (!eventId) return true; // ingen id = kan inte dedupa, processera
  try {
    // INSERT OR IGNORE — om PRIMARY KEY krockar sker inget och changes() = 0
    db.run(
      'INSERT OR IGNORE INTO stripe_events (event_id, event_type) VALUES (?, ?)',
      [eventId, eventType || 'unknown']
    );
    const s = db.prepare('SELECT changes() AS n');
    s.step();
    const { n } = s.getAsObject();
    s.free();
    saveDb(); // Stripe events är sällsynta nog för direkt flush
    return n > 0;
  } catch (err) {
    console.error('markStripeEventProcessed failed:', err.message);
    return true; // vid fel, låt processeringen gå vidare hellre än blockera
  }
}

function cleanupOldStripeEvents() {
  // Behåll 90 dagars event-historik för debugging. Äldre events retries
  // Stripe inte efter ~3 dagar så 90 är mer än nog.
  try {
    db.run("DELETE FROM stripe_events WHERE processed_at < datetime('now', '-90 days')");
    saveDb();
  } catch (err) {
    console.error('cleanupOldStripeEvents failed:', err.message);
  }
}

/**
 * Rensa gamla page_views (retention = 90 dagar). Körs från cron i server.js.
 * Håller tabellen liten så queries förblir snabba och disken inte fylls.
 */
function cleanupOldPageViews() {
  try {
    db.run("DELETE FROM page_views WHERE visited_at < datetime('now', '-90 days')");
    saveDb();
  } catch (err) {
    console.error('cleanupOldPageViews failed:', err.message);
  }
}

/**
 * Komplett beteendeprofil för en enskild användare.
 * Används av /admin/user/:id.
 */
function getUserAnalyticsProfile(userId) {
  const user = findUserById(userId);
  if (!user) return null;

  const scalar = (sql, params = []) => {
    const s = db.prepare(sql);
    if (params.length) s.bind(params);
    s.step();
    const r = s.getAsObject();
    s.free();
    return r;
  };
  const rows = (sql, params = []) => {
    const s = db.prepare(sql);
    if (params.length) s.bind(params);
    const out = [];
    while (s.step()) out.push(s.getAsObject());
    s.free();
    return out;
  };

  // Journey
  const blocksOpened   = scalar('SELECT COUNT(*) AS n FROM block_progress WHERE user_id = ?', [userId]).n;
  const blocksPassed   = scalar('SELECT COUNT(*) AS n FROM block_progress WHERE user_id = ? AND completed = 1', [userId]).n;
  const avgQuizPct     = scalar('SELECT AVG(CASE WHEN quiz_total > 0 THEN (CAST(quiz_score AS FLOAT)/quiz_total)*100 ELSE NULL END) AS n FROM block_progress WHERE user_id = ?', [userId]).n || 0;
  const roleplayCount  = scalar('SELECT COUNT(*) AS n FROM user_roleplays WHERE user_id = ?', [userId]).n;
  const reflectionCount= scalar('SELECT COUNT(*) AS n FROM user_reflections WHERE user_id = ?', [userId]).n;
  const missionStarted = scalar('SELECT COUNT(*) AS n FROM user_missions WHERE user_id = ?', [userId]).n;
  const missionDone    = scalar('SELECT COUNT(*) AS n FROM user_missions WHERE user_id = ? AND completed_at IS NOT NULL', [userId]).n;
  const actionsLogged  = scalar('SELECT COUNT(*) AS n, COALESCE(SUM(count),0) AS units FROM user_actions WHERE user_id = ?', [userId]);
  const challengesDone = scalar('SELECT COUNT(*) AS n FROM daily_challenges WHERE user_id = ? AND completed_at IS NOT NULL', [userId]).n;
  const proCalls       = scalar('SELECT COUNT(*) AS n FROM pro_call_analyses WHERE user_id = ?', [userId]).n;

  // Session: total tid aktiv (summa av duration_ms på page_views)
  const sessionStats = scalar(
    `SELECT COALESCE(SUM(duration_ms), 0) AS total_ms,
            COUNT(*) AS page_views,
            MIN(visited_at) AS first_seen,
            MAX(visited_at) AS last_seen
     FROM page_views WHERE user_id = ?`,
    [userId]
  );

  // Top-besökta sidor (top 10)
  const topPages = rows(
    `SELECT path, COUNT(*) AS visits, COALESCE(SUM(duration_ms),0) AS time_ms
     FROM page_views WHERE user_id = ?
     GROUP BY path
     ORDER BY time_ms DESC, visits DESC
     LIMIT 10`,
    [userId]
  );

  // Aktivitet per dag senaste 30 dagar (för sparkline)
  const dailyActivity = rows(
    `SELECT DATE(visited_at) AS day, COUNT(*) AS views,
            COALESCE(SUM(duration_ms),0) AS time_ms
     FROM page_views
     WHERE user_id = ? AND visited_at > datetime('now', '-30 days')
     GROUP BY DATE(visited_at)
     ORDER BY day ASC`,
    [userId]
  );

  // Referrals gjorda (bakåtlänk — andra users med referrer_id = userId)
  const referralsMade = rows(
    `SELECT id, username, role, created_at FROM users WHERE referrer_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  // Timeline: senaste 30 event över alla tabeller
  const timeline = rows(
    `SELECT 'quiz' AS type, block_id AS detail,
            CASE WHEN completed = 1 THEN 'klarade provet' ELSE 'startade' END AS label,
            completed_at AS at
       FROM block_progress WHERE user_id = ? AND completed_at IS NOT NULL
     UNION ALL
     SELECT 'roleplay', block_id || '/' || roleplay_id, 'rollspel',     completed_at FROM user_roleplays    WHERE user_id = ?
     UNION ALL
     SELECT 'reflection', block_id,                    'reflektion',   created_at   FROM user_reflections  WHERE user_id = ?
     UNION ALL
     SELECT 'mission_start', block_id,                 'startade uppdrag', started_at   FROM user_missions WHERE user_id = ?
     UNION ALL
     SELECT 'mission_done', block_id,                  'klarade uppdrag',  completed_at FROM user_missions WHERE user_id = ? AND completed_at IS NOT NULL
     UNION ALL
     SELECT 'action', category,                        'loggade aktion',   created_at FROM user_actions    WHERE user_id = ?
     UNION ALL
     SELECT 'pro_call', COALESCE(title,'samtal'),      'laddade upp samtal', created_at FROM pro_call_analyses WHERE user_id = ?
     ORDER BY at DESC
     LIMIT 30`,
    [userId, userId, userId, userId, userId, userId, userId]
  );

  // Referrer (om någon värvat dem)
  let referrer = null;
  if (user.referrer_id) {
    referrer = scalar('SELECT id, username FROM users WHERE id = ?', [user.referrer_id]);
  }

  return {
    user,
    referrer,
    journey: {
      blocksOpened,
      blocksPassed,
      avgQuizPct: Math.round(avgQuizPct),
      roleplays: roleplayCount,
      reflections: reflectionCount,
      missionsStarted: missionStarted,
      missionsDone: missionDone,
      actionsLogged: actionsLogged.n,
      actionUnits: actionsLogged.units,
      challengesDone,
      proCalls,
    },
    session: {
      totalMs:   sessionStats.total_ms,
      pageViews: sessionStats.page_views,
      firstSeen: sessionStats.first_seen,
      lastSeen:  sessionStats.last_seen,
    },
    topPages,
    dailyActivity,
    referralsMade,
    timeline,
  };
}

/**
 * Funnel-metrics: hur många användare når varje steg i onboarding?
 * Registrerad → öppnat block → klarat första provet → gjort första reflektionen → loggat första aktionen → blivit premium
 */
/**
 * GDPR Article 20: Right to data portability.
 * Samlar ALL data som tillhör användaren i ett JSON-exportable objekt.
 * Användaren kan ladda ner detta via /account/export.json.
 */
function getUserDataExport(userId) {
  const user = findUserById(userId);
  if (!user) return null;

  const rows = (sql, params = []) => {
    const s = db.prepare(sql);
    if (params.length) s.bind(params);
    const out = [];
    while (s.step()) out.push(s.getAsObject());
    s.free();
    return out;
  };

  // Exponera INTE password_hash, pw_version, stripe_customer_id (kanslig data).
  const profile = {
    id:              user.id,
    username:        user.username,
    email:           user.email,
    role:            user.role,
    gdpr_accepted:   !!user.gdpr,
    gdpr_accepted_at: user.gdpr_at,
    created_at:      user.created_at,
    last_login:      user.last_login,
    referral_code:   user.referral_code,
    referrer_id:     user.referrer_id,
  };

  return {
    _meta: {
      export_generated_at: new Date().toISOString(),
      export_note:         'Detta är en komplett kopia av all data vi har om dig. Enligt GDPR Artikel 20 har du rätt att få ut denna i maskinläsbart format.',
      contact:             'info@joakimjaksen.se',
    },
    profile,
    block_progress:  rows('SELECT block_id, completed, quiz_score, quiz_total, completed_at FROM block_progress WHERE user_id = ?', [userId]),
    reflections:     rows('SELECT block_id, prompt_idx, response, created_at FROM user_reflections WHERE user_id = ?', [userId]),
    roleplays:       rows('SELECT block_id, roleplay_id, turn_count, completed_at FROM user_roleplays WHERE user_id = ?', [userId]),
    missions:        rows('SELECT block_id, started_at, completed_at, progress, reflection FROM user_missions WHERE user_id = ?', [userId]),
    actions_logged:  rows('SELECT category, count, note, block_id, created_at FROM user_actions WHERE user_id = ?', [userId]),
    notes:           rows('SELECT id, content, created_at FROM notes WHERE user_id = ?', [userId]),
    preferences:     rows('SELECT preferences, updated_at FROM user_preferences WHERE user_id = ?', [userId]),
    daily_challenges:rows('SELECT date, challenge_data, completed_at FROM daily_challenges WHERE user_id = ?', [userId]),
    pro_call_analyses: rows('SELECT id, title, duration_sec, status, created_at FROM pro_call_analyses WHERE user_id = ?', [userId]),
    page_views:      rows('SELECT path, visited_at, duration_ms FROM page_views WHERE user_id = ? ORDER BY visited_at DESC', [userId]),
    referrals_made:  rows('SELECT id AS referred_user_id, username, role, created_at FROM users WHERE referrer_id = ?', [userId]),
  };
}

function getFunnelMetrics() {
  const s = (sql) => { const st = db.prepare(sql); st.step(); const r = st.getAsObject(); st.free(); return r; };

  const registered     = s('SELECT COUNT(*) AS n FROM users').n;
  const openedBlock    = s('SELECT COUNT(DISTINCT user_id) AS n FROM block_progress').n;
  const passedFirst    = s('SELECT COUNT(DISTINCT user_id) AS n FROM block_progress WHERE completed = 1').n;
  const firstReflect   = s('SELECT COUNT(DISTINCT user_id) AS n FROM user_reflections').n;
  const firstAction    = s('SELECT COUNT(DISTINCT user_id) AS n FROM user_actions').n;
  const firstRoleplay  = s('SELECT COUNT(DISTINCT user_id) AS n FROM user_roleplays').n;
  const firstMission   = s('SELECT COUNT(DISTINCT user_id) AS n FROM user_missions WHERE completed_at IS NOT NULL').n;
  const becamePremium  = s("SELECT COUNT(*) AS n FROM users WHERE role IN ('premium','pro','admin')").n;
  const becamePro      = s("SELECT COUNT(*) AS n FROM users WHERE role IN ('pro','admin')").n;

  const pct = (n) => registered > 0 ? Math.round((n / registered) * 100) : 0;

  return [
    { key: 'registered',     label: 'Registrerad',              count: registered,    pct: 100 },
    { key: 'openedBlock',    label: 'Öppnade ett block',        count: openedBlock,   pct: pct(openedBlock) },
    { key: 'passedFirst',    label: 'Klarade ett prov',         count: passedFirst,   pct: pct(passedFirst) },
    { key: 'firstRoleplay',  label: 'Gjorde ett rollspel',      count: firstRoleplay, pct: pct(firstRoleplay) },
    { key: 'firstReflect',   label: 'Skrev en reflektion',      count: firstReflect,  pct: pct(firstReflect) },
    { key: 'firstMission',   label: 'Klarade ett uppdrag',      count: firstMission,  pct: pct(firstMission) },
    { key: 'firstAction',    label: 'Loggade en aktion',        count: firstAction,   pct: pct(firstAction) },
    { key: 'becamePremium',  label: 'Blev Premium eller högre', count: becamePremium, pct: pct(becamePremium) },
    { key: 'becamePro',      label: 'Blev Pro eller högre',     count: becamePro,     pct: pct(becamePro) },
  ];
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  initDatabase, saveDb, cleanupExpiredTokens, rotateDbBackups,
  findUserByUsername, findUserByEmail, findUserById,
  createUser, getAllUsers, setUserRole, deleteUser, deleteUserAccount, getUserStats,
  setStripeCustomerId, findUserByStripeCustomerId,
  updateLastLogin,
  getNotesByUserId, createNote, deleteNote,
  getBlockProgress, saveQuizResult, getCompletedBlockCount,
  createResetToken, findValidResetToken, deleteResetToken, updateUserPassword,
  // 4-step pedagogical tracking
  saveReflection, getReflectionsForBlock, countReflectionsForBlock,
  recordRoleplayCompletion, getRoleplaysForBlock,
  startMission, updateMissionProgress, completeMission, getMissionForBlock,
  getJourneyStatus,
  // Recommendations engine
  getAllMissionsForUser, getAllRoleplaysForUser, getAllReflectionsForUser,
  getUserLearningState,
  // Gamification
  logUserAction, getUserActions, deleteUserAction, getActionsToday,
  getUserPreferences, setUserPreferences,
  getDailyChallenge, saveDailyChallenge, completeDailyChallenge,
  // Retention emails
  getAllUsersWithEmail,
  // Admin analytics
  getAdminAnalytics,
  getUserAnalyticsProfile,
  getFunnelMetrics,
  getUserDataExport,
  // Page-view tracking
  logPageView, updateLastPageViewDuration, cleanupOldPageViews, flushAnalytics,
  // Session store
  sessionGet, sessionSet, sessionDestroy, sessionCleanupExpired,
  // Stripe idempotency
  markStripeEventProcessed, cleanupOldStripeEvents,
  // Pro-tier
  createProCallAnalysis, updateProCallAnalysis, getProCallAnalysis,
  getProCallAnalysesForUser, countProCallAnalysesThisMonth,
  canProUserUploadCall, deleteProCallAnalysis,
  PRO_CALL_LIMIT_PER_MONTH,
  // Referral
  getOrCreateReferralCode, findUserByReferralCode, setReferrerForUser, getReferralStats,
};
