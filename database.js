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

  // ── CI (Conversation Intelligence) — bulk-analys för säljkontor ───────────
  // Se migrations/ci-schema.sql för designmotivering.
  db.run(`
    CREATE TABLE IF NOT EXISTS call_jobs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      batch_id       TEXT,
      original_name  TEXT    NOT NULL,
      storage_key    TEXT,
      file_size      INTEGER,
      mime_type      TEXT,
      title          TEXT,
      status         TEXT    NOT NULL DEFAULT 'pending',
      error          TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      started_at     TEXT,
      completed_at   TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS call_transcripts (
      job_id         INTEGER PRIMARY KEY,
      text           TEXT    NOT NULL,
      duration_sec   INTEGER,
      language       TEXT,
      word_count     INTEGER,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES call_jobs(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS call_analyses (
      job_id         INTEGER PRIMARY KEY,
      analysis       TEXT    NOT NULL,
      model          TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES call_jobs(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS call_word_frequencies (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id         INTEGER NOT NULL,
      word           TEXT    NOT NULL,
      count          INTEGER NOT NULL,
      FOREIGN KEY (job_id) REFERENCES call_jobs(id)
    )
  `);

  // CI prompt-iteration: full historik av varje LLM-körning per samtal.
  // call_analyses håller ENDAST senaste (för snabb detalj-vy). Historiken
  // i denna tabell låter oss jämföra v1-v2-v3-feedback på samma samtal.
  db.run(`
    CREATE TABLE IF NOT EXISTS call_analysis_runs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id         INTEGER NOT NULL,
      prompt_version TEXT    NOT NULL,
      analysis       TEXT    NOT NULL,
      model          TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES call_jobs(id)
    )
  `);

  // Invändningsregister (Fas 3): LLM extraherar invändningar per samtal,
  // grupperar dem över korpusen, kopplar till bästa-svar-fras från sold-samtal.
  // category = normaliserad gruppering (t.ex. "pris", "tid", "intresse",
  // "förtroende", "annan"). Free-text för MVP — kan refineras senare med embedding.
  db.run(`
    CREATE TABLE IF NOT EXISTS call_objections (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id              INTEGER NOT NULL,
      objection_text      TEXT    NOT NULL,
      category            TEXT,
      salesperson_response TEXT,
      handled_well        INTEGER,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES call_jobs(id)
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

  // Admin notes per user — interna support-anteckningar. Syns ALDRIG för
  // användaren själv och exkluderas från GDPR-export (de är admin-noteringar
  // om användaren, inte användarens egna data).
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_user_notes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      target_user_id  INTEGER NOT NULL,
      admin_user_id   INTEGER NOT NULL,
      content         TEXT    NOT NULL,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (target_user_id) REFERENCES users(id),
      FOREIGN KEY (admin_user_id)  REFERENCES users(id)
    )
  `);

  // Email retry-queue: alla mejl som ska skickas via Resend hamnar här först.
  // Worker hämtar pending och skickar. Fail → retry med exponential backoff.
  // Säkerställer att inga transactional mejl tappas pga tillfälliga API-fel.
  db.run(`
    CREATE TABLE IF NOT EXISTS email_queue (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email        TEXT NOT NULL,
      subject         TEXT NOT NULL,
      html            TEXT NOT NULL,
      from_email      TEXT,
      kind            TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      attempts        INTEGER NOT NULL DEFAULT 0,
      last_error      TEXT,
      next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      sent_at         TEXT
    )
  `);

  // Broadcast-arkiv: varje admin-broadcast persisteras så users kan se
  // missade announcements på /nyheter. Original body (som admin skrev)
  // sparas — NOT rendered HTML med unsubscribe-länk (per-user).
  db.run(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      subject        TEXT    NOT NULL,
      body           TEXT    NOT NULL,
      segment        TEXT    NOT NULL,
      admin_user_id  INTEGER,
      sent_count     INTEGER NOT NULL DEFAULT 0,
      failed_count   INTEGER NOT NULL DEFAULT 0,
      sent_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Admin audit log — varje admin-åtgärd loggas för accountability + säkerhet.
  // Kritiskt för att kunna svara "vem ändrade detta?" vid support-issues eller
  // säkerhetsincidenter. Retention: 180 dagar (rensas via cron).
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id   INTEGER NOT NULL,
      admin_username  TEXT    NOT NULL,
      action          TEXT    NOT NULL,
      target_user_id  INTEGER,
      target_username TEXT,
      metadata        TEXT,
      ip              TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
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

  // Block-audio: TTS- eller inspelad audio per block, lagrad i R2.
  // Joakim laddar upp en MP3/M4A per block via /admin/audio. Filen lagras i
  // R2 (audio/blocks/<id>.mp3), bara metadata cachas här. URL:s genereras
  // signed med 1h TTL via streaming-route /audio/blocks/:id.mp3.
  db.run(`
    CREATE TABLE IF NOT EXISTS block_audio (
      block_id      TEXT    PRIMARY KEY,
      r2_key        TEXT    NOT NULL,
      duration_sec  INTEGER,
      bytes         INTEGER,
      mime_type     TEXT    DEFAULT 'audio/mpeg',
      uploaded_by   INTEGER,
      uploaded_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      version       INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Funnel-events: en rad per (user_id, event_name) — first-occurrence-only.
  // Skiljer sig från page_views (rå GET-traffic, dups) och audit-log (admin-actions).
  // Drivs av aktivering/konvertering: register → dashboard → block → quiz → upgrade.
  db.run(`
    CREATE TABLE IF NOT EXISTS funnel_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      event_name  TEXT    NOT NULL,
      metadata    TEXT,
      occurred_at TEXT    NOT NULL DEFAULT (datetime('now')),
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
    // Referral reward automation:
    //  referral_credit_granted (per-referred-user flag) — 1 när referrern krediterats
    //    hindrar dubbel-kreditering om användaren cancel:ar och re-subscribe:ar
    //  referral_credits_earned (per-referrer kumulativ) — total antal intjänade gratismånader
    //  referral_credits_redeemed (per-referrer kumulativ) — antal som Joakim markerat utbetalda
    "ALTER TABLE users ADD COLUMN referral_credit_granted    INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN referral_credits_earned    INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN referral_credits_redeemed  INTEGER NOT NULL DEFAULT 0",
    // Pro-trial: användaren har startat en trial som auto-konverterar till Pro
    // om de inte avbryter innan pro_trial_end_at. reminder_sent används av
    // cron-job för att undvika dubbel-påminnelse.
    "ALTER TABLE users ADD COLUMN pro_trial_end_at            TEXT",
    "ALTER TABLE users ADD COLUMN pro_trial_reminder_sent     INTEGER NOT NULL DEFAULT 0",
    // Förnamn + efternamn: används i personaliserade mejl ("Hej Joakim"),
    // admin-översikt och kund-support. NULL för legacy-konton (admin-seeden,
    // testkonton) som skapades innan denna migration — display faller tillbaka
    // till username då.
    "ALTER TABLE users ADD COLUMN first_name TEXT",
    "ALTER TABLE users ADD COLUMN last_name  TEXT",
    // Fraud-detection: spara IP vid registrering (anonymiserad till /24)
    // Används för att flagga potentiell self-referral-fraud när referrer
    // krediteras (samma IP-prefix på referrer + referred = flagga för review)
    "ALTER TABLE users ADD COLUMN register_ip TEXT",
    // Account-lockout: räkna failed login attempts. Lock if >5 inom 15 min.
    // Skydd mot distribuerad brute-force som kringgår per-IP-rate-limit.
    "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN failed_login_at       TEXT",
    "ALTER TABLE users ADD COLUMN locked_until          TEXT",
    // Page-view tracking index
    "CREATE INDEX IF NOT EXISTS idx_page_views_user_date ON page_views(user_id, visited_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_page_views_path      ON page_views(path)",
    // Funnel-events: UNIQUE på (user_id, event_name) → INSERT OR IGNORE ger
    // automatisk first-occurrence-only-semantik. Index på (event_name, occurred_at)
    // för aggregat-queries över tidsfönster.
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_events_unique     ON funnel_events(user_id, event_name)",
    "CREATE INDEX IF NOT EXISTS idx_funnel_events_event_date ON funnel_events(event_name, occurred_at)",
    // Session store index
    "CREATE INDEX IF NOT EXISTS idx_sessions_expires     ON sessions(expires_at)",
    // Admin notes index (för snabb lookup per target user)
    "CREATE INDEX IF NOT EXISTS idx_admin_notes_target   ON admin_user_notes(target_user_id, created_at DESC)",
    // Broadcasts index (huvudqueryn är "senaste N")
    "CREATE INDEX IF NOT EXISTS idx_broadcasts_sent_at   ON broadcasts(sent_at DESC)",
    // Admin audit log index (huvud-query är "senaste 100 händelser")
    "CREATE INDEX IF NOT EXISTS idx_audit_date           ON admin_audit_log(created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_audit_admin          ON admin_audit_log(admin_user_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_audit_target         ON admin_audit_log(target_user_id, created_at DESC)",
    // CI (Conversation Intelligence) — worker poll + admin dashboard + aggregation
    "CREATE INDEX IF NOT EXISTS idx_call_jobs_status_created ON call_jobs(status, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_call_jobs_user_created   ON call_jobs(user_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_call_jobs_batch          ON call_jobs(batch_id)",
    "CREATE INDEX IF NOT EXISTS idx_call_wf_job              ON call_word_frequencies(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_call_wf_word_count       ON call_word_frequencies(word, count DESC)",
    // Prompt-iteration: historik per samtal + senaste per version
    "ALTER TABLE call_analyses ADD COLUMN prompt_version TEXT",
    "CREATE INDEX IF NOT EXISTS idx_call_analysis_runs_job   ON call_analysis_runs(job_id, created_at DESC)",
    // Metodik-val per jobb (vilken säljstil samtalet ska bedömas mot).
    // Sätts vid upload; worker läser det när jobbet processas.
    "ALTER TABLE call_jobs ADD COLUMN prompt_version TEXT",
    // Speaker diarization: opt-in flagga per jobb. 1 = kör LLM-post-
    // processing för att identifiera "Säljare:" / "Kund:" i transkriptet.
    "ALTER TABLE call_jobs ADD COLUMN identify_speakers INTEGER NOT NULL DEFAULT 0",
    // Strukturerat transkript — markdown med Säljare:/Kund:-labels.
    // Fylls i av worker efter identifySpeakers()-steget. NULL om inte begärt.
    "ALTER TABLE call_transcripts ADD COLUMN structured_text TEXT",
    // Resultatmaskin-fält:
    // salesperson_name = vem säljaren är (admin sätter vid upload). Fri text
    //   för MVP — senare kanske egen säljare-tabell. Tomt = "okänd säljare".
    "ALTER TABLE call_jobs ADD COLUMN salesperson_name TEXT",
    // outcome = sold | lost | no_sms | callback | other | NULL (otaggat).
    //   Joakim taggar manuellt på detalj-sidan när samtalet bedömts.
    //   Grundval för aggregerad winning/losing-phrase-analys.
    "ALTER TABLE call_jobs ADD COLUMN outcome TEXT",
    "ALTER TABLE call_jobs ADD COLUMN outcome_tagged_at TEXT",
    "CREATE INDEX IF NOT EXISTS idx_call_jobs_outcome     ON call_jobs(outcome)",
    "CREATE INDEX IF NOT EXISTS idx_call_jobs_salesperson ON call_jobs(salesperson_name)",
    // Invändningsregister
    "CREATE INDEX IF NOT EXISTS idx_call_objections_job      ON call_objections(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_call_objections_category ON call_objections(category)",
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

/**
 * Generera ett unikt användarnamn från email-adressen.
 * Används vid registrering där email är primär identifier och username
 * bara finns som display-name ("Hej, joakim" istället för hela email-adressen).
 *
 * Strategi:
 *  1. Extrahera local-part (före @), lowercase, rensa till [a-z0-9._-]
 *  2. Cap vid 20 tecken, fallback till "user" om tom
 *  3. Om redan taget, lägg till siffer-suffix (joakim → joakim2 → joakim3)
 *  4. Max 100 försök innan vi ger upp med random-suffix
 */
function generateUsernameFromEmail(email) {
  if (!email || typeof email !== 'string') return 'user' + Math.floor(Math.random() * 10000);
  const base = (email.split('@')[0] || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 20) || 'user';
  let candidate = base;
  let n = 1;
  while (findUserByUsername(candidate) && n < 100) {
    n++;
    candidate = base + n;
  }
  if (findUserByUsername(candidate)) {
    // Extremt osannolik fallback efter 100 försök
    candidate = base + '_' + Math.floor(Math.random() * 100000);
  }
  return candidate;
}

function findUserById(id) {
  const s = db.prepare('SELECT * FROM users WHERE id = ?');
  s.bind([id]);
  if (s.step()) { const u = s.getAsObject(); s.free(); return u; }
  s.free(); return null;
}

// Register a new user. Returns { ok, error? }
function createUser(username, email, password, firstName, lastName, registerIp) {
  if (findUserByUsername(username))
    return { ok: false, error: 'Användarnamnet är redan taget.' };
  if (findUserByEmail(email))
    return { ok: false, error: 'E-postadressen används redan.' };

  const hash = bcrypt.hashSync(password, 10);
  const cleanFirst = firstName ? firstName.trim().slice(0, 50) : null;
  const cleanLast  = lastName  ? lastName.trim().slice(0, 50)  : null;
  // Anonymisera IP till /24-prefix (sista oktett 0). Räcker för
  // fraud-flagging utan att lagra unika personuppgifter.
  const cleanIp = registerIp ? String(registerIp).replace(/\.\d+$/, '.0').slice(0, 64) : null;

  db.run(
    `INSERT INTO users (username, email, password_hash, role, gdpr, gdpr_at, created_at, first_name, last_name, register_ip)
     VALUES (?, ?, ?, 'free', 1, datetime('now'), datetime('now'), ?, ?, ?)`,
    [username.trim(), email.trim().toLowerCase(), hash, cleanFirst, cleanLast, cleanIp]
  );
  // Hämta nyss skapat ID
  const s = db.prepare('SELECT last_insert_rowid() AS id');
  s.step();
  const { id } = s.getAsObject();
  s.free();
  saveDb();
  return { ok: true, userId: id };
}

/**
 * Få "display-namn" för en user: förnamn om satt, annars fallback till username.
 * Används i hälsningar "Hej, X" och mejl-subjects för att känna personligt.
 */
function displayName(user) {
  if (!user) return '';
  if (user.first_name && user.first_name.trim()) return user.first_name.trim();
  return user.username || '';
}

/** Full name för admin-panelen + CSV: "Förnamn Efternamn" eller fallback */
function fullName(user) {
  if (!user) return '';
  const parts = [];
  if (user.first_name) parts.push(user.first_name.trim());
  if (user.last_name)  parts.push(user.last_name.trim());
  return parts.join(' ') || user.username || '';
}

// ── Admin queries ─────────────────────────────────────────────────────────────

function getAllUsers() {
  const s = db.prepare(
    'SELECT id, username, email, first_name, last_name, role, gdpr, gdpr_at, created_at, last_login, stripe_customer_id FROM users ORDER BY id DESC'
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
  // Run all deletions in a single transaction — säkerställer att en
  // GDPR-radering är komplett eller inte alls körs (no orphans).
  // OBS: Tidigare rensade denna bara 4 tabeller — alla tabeller som lagts
  // till efter v1 (gamification, pro-calls, analytics, sessions, referrals)
  // lämnade orphan-data kvar i DB:n. Komplett lista nu:
  db.run('BEGIN TRANSACTION');
  try {
    // Lärande + progress
    db.run('DELETE FROM block_progress      WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_reflections    WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_roleplays      WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_missions       WHERE user_id = ?', [userId]);
    // Gamification
    db.run('DELETE FROM user_actions        WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_preferences    WHERE user_id = ?', [userId]);
    db.run('DELETE FROM daily_challenges    WHERE user_id = ?', [userId]);
    // Notes + auth
    db.run('DELETE FROM notes               WHERE user_id = ?', [userId]);
    db.run('DELETE FROM reset_tokens        WHERE user_id = ?', [userId]);
    // Pro-calls (innehåller transkriberingar — kritiskt att radera)
    db.run('DELETE FROM pro_call_analyses   WHERE user_id = ?', [userId]);
    // Analytics
    db.run('DELETE FROM page_views          WHERE user_id = ?', [userId]);
    // Admin notes ABOUT this user (och admin-noteringar de själva skrivit om andra)
    db.run('DELETE FROM admin_user_notes    WHERE target_user_id = ? OR admin_user_id = ?', [userId, userId]);
    // Audit-log-poster OM användaren nullas (behåll posten för accountability men ta bort
    // personlig länkning — admin-agent-delen behålls). Detta är GDPR-korrekt: vi minns att
    // en åtgärd utfördes men kan inte längre koppla den till en specifik raderad person.
    db.run('UPDATE admin_audit_log SET target_user_id = NULL, target_username = NULL WHERE target_user_id = ?', [userId]);
    // Om den raderade var admin: behåll audit-poster men anonymisera admin_user_id
    db.run('UPDATE admin_audit_log SET admin_user_id = 0 WHERE admin_user_id = ?', [userId]);
    // Sessions (logga ut aktiva sessioner)
    db.run('DELETE FROM sessions            WHERE data LIKE ?', [`%"userId":${userId}%`]);
    // Referrer-länk: om någon hänvisats av den raderade, null:a referrer_id
    // (ingen anledning att ta bort dem — de är egna konton)
    db.run('UPDATE users SET referrer_id = NULL WHERE referrer_id = ?', [userId]);
    // Slutligen användarraden själv
    db.run('DELETE FROM users               WHERE id = ?', [userId]);
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

// ── Account lockout (brute-force protection) ──────────────────────────────────
// Pattern: räkna failed login per user. Vid >= MAX_FAIL inom WINDOW → lock 15 min.
// Successful login → reset counter. Detta kompletterar per-IP-rate-limit som
// inte skyddar mot distribuerade attacker (botnet med flera IPs).

const LOCKOUT_MAX_FAILED   = 5;
const LOCKOUT_WINDOW_MS    = 15 * 60 * 1000; // 15 min
const LOCKOUT_DURATION_MS  = 15 * 60 * 1000; // 15 min lock

/**
 * Kolla om en user är låst pga för många failed logins.
 * Returnerar { locked: bool, until: ISO-string|null, minutesLeft: number }.
 */
function isUserLocked(user) {
  if (!user || !user.locked_until) return { locked: false, until: null, minutesLeft: 0 };
  const lockedUntilMs = new Date(user.locked_until).getTime();
  const nowMs = Date.now();
  if (lockedUntilMs > nowMs) {
    return {
      locked: true,
      until: user.locked_until,
      minutesLeft: Math.ceil((lockedUntilMs - nowMs) / 60000),
    };
  }
  return { locked: false, until: null, minutesLeft: 0 };
}

/**
 * Registrera ett failed login attempt. Om threshold nåtts → lås kontot.
 * Returnerar { locked: bool, attemptsRemaining: number }.
 */
function recordFailedLogin(userId) {
  if (!userId) return { locked: false, attemptsRemaining: LOCKOUT_MAX_FAILED };

  // Hämta nuvarande state
  const s = db.prepare('SELECT failed_login_attempts, failed_login_at FROM users WHERE id = ?');
  s.bind([userId]);
  if (!s.step()) { s.free(); return { locked: false, attemptsRemaining: LOCKOUT_MAX_FAILED }; }
  const row = s.getAsObject();
  s.free();

  const nowMs = Date.now();
  const lastFailMs = row.failed_login_at ? new Date(row.failed_login_at).getTime() : 0;
  const insideWindow = (nowMs - lastFailMs) < LOCKOUT_WINDOW_MS;

  // Om utanför window → reset counter (gamla fails räknas inte)
  const newCount = insideWindow ? (row.failed_login_attempts || 0) + 1 : 1;
  const nowIso = new Date(nowMs).toISOString();

  if (newCount >= LOCKOUT_MAX_FAILED) {
    const lockedUntilIso = new Date(nowMs + LOCKOUT_DURATION_MS).toISOString();
    db.run(
      'UPDATE users SET failed_login_attempts = ?, failed_login_at = ?, locked_until = ? WHERE id = ?',
      [newCount, nowIso, lockedUntilIso, userId]
    );
    saveDb();
    console.warn(`🔒 Account locked: user ${userId} after ${newCount} failed login attempts`);
    return { locked: true, attemptsRemaining: 0 };
  } else {
    db.run(
      'UPDATE users SET failed_login_attempts = ?, failed_login_at = ?, locked_until = NULL WHERE id = ?',
      [newCount, nowIso, userId]
    );
    saveDb();
    return { locked: false, attemptsRemaining: LOCKOUT_MAX_FAILED - newCount };
  }
}

/** Reset counter vid lyckad login. */
function clearFailedLogins(userId) {
  if (!userId) return;
  db.run(
    'UPDATE users SET failed_login_attempts = 0, failed_login_at = NULL, locked_until = NULL WHERE id = ?',
    [userId]
  );
  saveDb();
}

/**
 * Byt e-postadress för en user. Returnerar { ok, error? }.
 * Kollar uniqueness (om en annan user redan har den email) och att det
 * inte är SAMMA email som redan är satt.
 */
function updateUserEmail(userId, newEmail) {
  const normalized = (newEmail || '').trim().toLowerCase();
  if (!normalized) return { ok: false, error: 'E-post krävs.' };
  // Finns email redan på annan user?
  const existing = findUserByEmail(normalized);
  if (existing && existing.id !== userId) {
    return { ok: false, error: 'E-postadressen används redan.' };
  }
  db.run('UPDATE users SET email = ? WHERE id = ?', [normalized, userId]);
  saveDb();
  return { ok: true };
}

/**
 * Byt för-/efternamn. Ingen password-check (tillåt snabba ändringar).
 * Returnerar { ok, error? }.
 */
function updateUserName(userId, firstName, lastName) {
  const clean1 = (firstName || '').trim().slice(0, 50);
  const clean2 = (lastName  || '').trim().slice(0, 50);
  if (!clean1 || !clean2) return { ok: false, error: 'Förnamn och efternamn krävs.' };
  db.run('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [clean1, clean2, userId]);
  saveDb();
  return { ok: true, firstName: clean1, lastName: clean2 };
}

/**
 * Veckodigest-stats för admin-mejl. Snapshot av plattformens hälsa senaste
 * 7 dagar — körs en gång per vecka, aggregerar utan att hamra DB.
 *
 * Returnerar { totals, weekly, funnel, queue, topBlocks, alerts }.
 */
function getAdminDigestStats() {
  const run = sql => {
    const s = db.prepare(sql); s.step();
    const r = s.getAsObject(); s.free(); return r;
  };
  const runRows = (sql, binds = []) => {
    const s = db.prepare(sql);
    if (binds.length) s.bind(binds);
    const rows = [];
    while (s.step()) rows.push(s.getAsObject());
    s.free();
    return rows;
  };

  // Totals (current state)
  const totalUsers   = run('SELECT COUNT(*) AS n FROM users').n;
  const premiumUsers = run("SELECT COUNT(*) AS n FROM users WHERE role = 'premium'").n;
  const proUsers     = run("SELECT COUNT(*) AS n FROM users WHERE role = 'pro'").n;
  const freeUsers    = run("SELECT COUNT(*) AS n FROM users WHERE role = 'free'").n;

  // MRR-estimat: 199 × premium + 599 × pro (pro inkl. trials → överestimat
  // tidigt men korrigerar sig efter 24h när trials konverterar/avslutas)
  const mrr = (premiumUsers * 199) + (proUsers * 599);

  // Veckans aktivitet (senaste 7 dagar)
  const weeklyNewUsers       = run("SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', '-7 days')").n;
  const weeklyActiveUsers    = run("SELECT COUNT(*) AS n FROM users WHERE last_login >= datetime('now', '-7 days')").n;
  const weeklyPremiumConvs   = run("SELECT COUNT(*) AS n FROM funnel_events WHERE event_name = 'upgrade_completed_premium' AND occurred_at >= datetime('now', '-7 days')").n;
  const weeklyProConvs       = run("SELECT COUNT(*) AS n FROM funnel_events WHERE event_name = 'upgrade_completed_pro' AND occurred_at >= datetime('now', '-7 days')").n;
  const weeklyQuizPasses     = run("SELECT COUNT(*) AS n FROM funnel_events WHERE event_name = 'first_quiz_passed' AND occurred_at >= datetime('now', '-7 days')").n;
  const weeklyRoleplayVisits = run("SELECT COUNT(*) AS n FROM funnel_events WHERE event_name = 'first_roleplay_visit' AND occurred_at >= datetime('now', '-7 days')").n;
  const weeklyProCalls       = run("SELECT COUNT(*) AS n FROM pro_call_analyses WHERE created_at >= datetime('now', '-7 days')").n;

  // Funnel-snapshot för veckans nya kohort: vart tappar de mest?
  const cohortIds = runRows("SELECT id FROM users WHERE created_at >= datetime('now', '-7 days')").map(r => r.id);
  const cohortSize = cohortIds.length;
  const funnel = { cohortSize };
  if (cohortIds.length) {
    const placeholders = cohortIds.map(() => '?').join(',');
    const events = runRows(
      `SELECT event_name, COUNT(DISTINCT user_id) AS n FROM funnel_events WHERE user_id IN (${placeholders}) GROUP BY event_name`,
      cohortIds
    );
    for (const e of events) funnel[e.event_name] = e.n;
  }

  // Email-queue-status — varning om backlog
  const queuePending = run("SELECT COUNT(*) AS n FROM email_queue WHERE status = 'pending'").n;
  const queueFailed  = run("SELECT COUNT(*) AS n FROM email_queue WHERE status = 'failed' AND created_at >= datetime('now', '-7 days')").n;

  // Top 3 mest avklarade block senaste 7 dagar
  const topBlocks = runRows(
    `SELECT block_id, COUNT(*) AS completions
     FROM block_progress
     WHERE completed = 1 AND completed_at >= datetime('now', '-7 days')
     GROUP BY block_id ORDER BY completions DESC LIMIT 3`
  );

  // Alerts — saker admin bör titta på
  const alerts = [];
  if (queuePending > 20) alerts.push(`Email-kön har ${queuePending} pending-mejl — Resend kan vara nere`);
  if (queueFailed > 5) alerts.push(`${queueFailed} mejl gav permanent fail senaste veckan — kolla email_queue.last_error`);
  if (cohortSize > 5 && (funnel.first_block_opened || 0) < cohortSize * 0.5) {
    alerts.push('Mindre än 50% av nya users öppnar ens ett block — onboarding-friction?');
  }
  if (weeklyNewUsers === 0) alerts.push('0 nya users den här veckan — ingen trafik?');

  return {
    totals: { totalUsers, premiumUsers, proUsers, freeUsers, mrr },
    weekly: {
      newUsers:       weeklyNewUsers,
      activeUsers:    weeklyActiveUsers,
      premiumConvs:   weeklyPremiumConvs,
      proConvs:       weeklyProConvs,
      quizPasses:     weeklyQuizPasses,
      roleplayVisits: weeklyRoleplayVisits,
      proCalls:       weeklyProCalls,
    },
    funnel,
    queue: { pending: queuePending, failed: queueFailed },
    topBlocks,
    alerts,
  };
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
  const completedAt = completed ? new Date().toISOString() : null;

  // Kolla befintligt status för att detektera FÖRSTA-GÅNGS-completion
  // (används för att trigga block-completion-mejl idempotent).
  const before = db.prepare('SELECT completed FROM block_progress WHERE user_id = ? AND block_id = ?');
  before.bind([userId, blockId]);
  const wasCompletedBefore = before.step() ? (before.getAsObject().completed === 1) : false;
  before.free();

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

  return {
    completed: completed === 1,
    firstCompletion: completed === 1 && !wasCompletedBefore,
  };
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

/**
 * Hämta användare med epost för broadcast, filtrerat på segment.
 * segment: 'all' | 'premium' | 'pro' | 'free' | 'paid' (= premium OR pro)
 */
function getUsersForBroadcast(segment) {
  let where = "email IS NOT NULL AND email != ''";
  if (segment === 'premium')      where += " AND role = 'premium'";
  else if (segment === 'pro')     where += " AND role = 'pro'";
  else if (segment === 'free')    where += " AND role = 'free'";
  else if (segment === 'paid')    where += " AND role IN ('premium', 'pro')";
  // 'all' = ingen extra filtrering
  // first_name inkluderat så broadcast-mejl kan säga "Hej Anna" istället för "Hej anna"
  const s = db.prepare(`SELECT id, username, email, first_name, last_name FROM users WHERE ${where} ORDER BY id`);
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
 * Returnerar: totalReferrals, paidReferrals, credits earned/redeemed/pending.
 */
function getReferralStats(userId) {
  const allRefs = rowsQuery(`
    SELECT id, username, role, created_at, referral_credit_granted FROM users WHERE referrer_id = ? ORDER BY created_at DESC
  `, [userId]);
  const paid = allRefs.filter(r => r.role === 'premium' || r.role === 'pro' || r.role === 'admin');

  // Credits — dessa uppdateras automatiskt av Stripe-webhook när en referred user upgraderar
  const userRow = findUserById(userId);
  const earned    = userRow?.referral_credits_earned    || 0;
  const redeemed  = userRow?.referral_credits_redeemed  || 0;
  const pending   = Math.max(0, earned - redeemed);

  return {
    total: allRefs.length,
    paid: paid.length,
    referrals: allRefs.slice(0, 20), // visa senaste 20
    credits: { earned, redeemed, pending },
  };
}

/**
 * Kreditera en referrer med en gratis månad. Anropas från Stripe-webhook
 * när den REFERRED användaren upgraderar till premium eller pro för första
 * gången. Idempotent via referral_credit_granted-flaggan på den refererade.
 */
function grantReferralCreditIfEligible(referredUserId) {
  const referred = findUserById(referredUserId);
  if (!referred) return { granted: false, reason: 'user not found' };
  if (!referred.referrer_id) return { granted: false, reason: 'no referrer' };
  if (referred.referral_credit_granted) return { granted: false, reason: 'already granted' };
  if (referred.referrer_id === referred.id) return { granted: false, reason: 'self-referral' };

  // Fraud-detection: jämför register_ip + email-domän mellan referrer och refererad.
  // Om matchar → grant fortf, men flagga som suspicious i audit-loggen.
  // Joakim ser dessa i /admin/referral-credits + /admin/audit och kan revertera.
  const referrer = findUserById(referred.referrer_id);
  const fraudFlags = [];
  if (referrer && referred.register_ip && referrer.register_ip &&
      referred.register_ip === referrer.register_ip) {
    fraudFlags.push('same_ip');
  }
  if (referrer && referred.email && referrer.email) {
    const refDomain = referred.email.split('@')[1];
    const refrerDomain = referrer.email.split('@')[1];
    // Samma domän = samma företag/familj. Inte alltid fraud men värt att flagga.
    // Skippa generella mail-providers (gmail, hotmail, etc) — de är för vanliga.
    const commonProviders = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'protonmail.com'];
    if (refDomain && refrerDomain && refDomain === refrerDomain && !commonProviders.includes(refDomain.toLowerCase())) {
      fraudFlags.push('same_domain');
    }
  }

  // Atomisk: markera som granted + öka referrerns counter
  try {
    db.run('BEGIN TRANSACTION');
    db.run('UPDATE users SET referral_credit_granted = 1 WHERE id = ? AND referral_credit_granted = 0', [referred.id]);
    db.run('UPDATE users SET referral_credits_earned = referral_credits_earned + 1 WHERE id = ?', [referred.referrer_id]);
    db.run('COMMIT');
    saveDb();
    console.log(`🎁 Referral-credit: user ${referred.referrer_id} tjänade 1 gratis månad (via ${referred.username})${fraudFlags.length ? ' [FLAGGA: ' + fraudFlags.join(',') + ']' : ''}`);
    return {
      granted: true,
      referrerId: referred.referrer_id,
      fraudFlags,                             // tom om inga
      suspicious: fraudFlags.length > 0,      // för callers att enkelt logga audit
    };
  } catch (err) {
    db.run('ROLLBACK');
    console.error('grantReferralCreditIfEligible failed:', err.message);
    return { granted: false, reason: err.message };
  }
}

/**
 * Admin-åtgärd: markera N credits som utbetalda till en referrer.
 * Kallas när Joakim manuellt har applicerat en Stripe-kupong eller
 * credit på användarens nästa faktura.
 */
function markReferralCreditsRedeemed(userId, count) {
  if (!userId || !Number.isFinite(count) || count <= 0) return false;
  db.run(
    'UPDATE users SET referral_credits_redeemed = referral_credits_redeemed + ? WHERE id = ?',
    [count, userId]
  );
  saveDb();
  return true;
}

/**
 * Admin-översikt: alla referrers med pending credits.
 * Användas för att se vilka som ska krediteras.
 */
// ── Pro-trial helpers ─────────────────────────────────────────────────────────

function setProTrialEndAt(userId, endAtIso) {
  db.run('UPDATE users SET pro_trial_end_at = ?, pro_trial_reminder_sent = 0 WHERE id = ?', [endAtIso, userId]);
  saveDb();
}

function clearProTrial(userId) {
  db.run('UPDATE users SET pro_trial_end_at = NULL, pro_trial_reminder_sent = 0 WHERE id = ?', [userId]);
  saveDb();
}

function markProTrialReminderSent(userId) {
  db.run('UPDATE users SET pro_trial_reminder_sent = 1 WHERE id = ?', [userId]);
  saveDb();
}

/**
 * Hämta users vars pro_trial tar slut inom N timmar OCH inte fått påminnelse än.
 * Används av cron för att skicka 12h-innan-påminnelse.
 */
function getUsersWithTrialEndingSoon(withinHours = 24) {
  return rowsQuery(
    `SELECT id, username, email, pro_trial_end_at
     FROM users
     WHERE pro_trial_end_at IS NOT NULL
       AND pro_trial_reminder_sent = 0
       AND datetime(pro_trial_end_at) BETWEEN datetime('now') AND datetime('now', '+' || ? || ' hours')
       AND email IS NOT NULL`,
    [withinHours]
  );
}

function getUsersWithPendingReferralCredits() {
  return rowsQuery(`
    SELECT id, username, email, role,
           referral_credits_earned,
           referral_credits_redeemed,
           (referral_credits_earned - referral_credits_redeemed) AS pending
    FROM users
    WHERE referral_credits_earned > referral_credits_redeemed
    ORDER BY pending DESC, referral_credits_earned DESC
  `);
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

// ── Block audio (TTS/inspelat per block) ─────────────────────────────────────

/**
 * Spara/uppdatera block-audio metadata. Idempotent — INSERT OR REPLACE för
 * att vid re-upload ersätta existerande rad. Version bumpas så vi kan
 * cache-busta browser-side.
 */
function upsertBlockAudio({ blockId, r2Key, durationSec, bytes, mimeType, uploadedBy }) {
  if (!blockId || !r2Key) throw new Error('blockId + r2Key required');
  // Om existerande: bump version
  const existingS = db.prepare('SELECT version FROM block_audio WHERE block_id = ?');
  existingS.bind([blockId]);
  const existing = existingS.step() ? existingS.getAsObject() : null;
  existingS.free();
  const version = existing ? (existing.version + 1) : 1;

  db.run(
    `INSERT OR REPLACE INTO block_audio
     (block_id, r2_key, duration_sec, bytes, mime_type, uploaded_by, uploaded_at, version)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
    [
      blockId,
      r2Key,
      Number.isFinite(durationSec) ? Math.round(durationSec) : null,
      Number.isFinite(bytes) ? bytes : null,
      mimeType || 'audio/mpeg',
      uploadedBy || null,
      version,
    ]
  );
  saveDb();
  return { ok: true, version };
}

/** Hämta metadata för ett block. null om ingen audio uppladdad. */
function getBlockAudio(blockId) {
  if (!blockId) return null;
  const s = db.prepare('SELECT * FROM block_audio WHERE block_id = ?');
  s.bind([blockId]);
  const row = s.step() ? s.getAsObject() : null;
  s.free();
  return row;
}

/** Lista alla block med audio (för admin-vyn). */
function listBlockAudios() {
  return rowsQuery(
    `SELECT block_id, r2_key, duration_sec, bytes, mime_type, uploaded_at, version
     FROM block_audio
     ORDER BY uploaded_at DESC`
  );
}

/** Radera audio-metadata. R2-objektet raderas separat av admin-routen. */
function deleteBlockAudio(blockId) {
  db.run('DELETE FROM block_audio WHERE block_id = ?', [blockId]);
  saveDb();
}

// ── Funnel events ─────────────────────────────────────────────────────────────
// Stateful business events för konverteringsanalys. UNIQUE-index på
// (user_id, event_name) gör att INSERT OR IGNORE ger first-occurrence-only.
// Används av /admin/funnel för att se var i funneln användare droppar av.

/**
 * Logga ett funnel-event. Idempotent — andra anropet med samma (user, event)
 * blir no-op tack vare UNIQUE-index. Skriv aldrig synkront till disk här
 * (analytics-batchen klarar det), så detta blockerar inte hot-path.
 */
function logFunnelEvent(userId, eventName, metadata = null) {
  if (!userId || !eventName) return;
  try {
    db.run(
      `INSERT OR IGNORE INTO funnel_events (user_id, event_name, metadata)
       VALUES (?, ?, ?)`,
      [userId, eventName.slice(0, 80), metadata ? JSON.stringify(metadata).slice(0, 500) : null]
    );
    _markAnalyticsDirty();
  } catch (err) {
    console.error('logFunnelEvent failed:', err.message);
  }
}

/**
 * Backfill register_completed för befintliga users (kallas en gång vid startup).
 * Använder users.created_at som timestamp — vi vet exakt när dom registrerade.
 * Andra events kan inte backfill:as utan att ljuga om data, så de stannar
 * forward-only ("Funnel-data sedan deploy-datum").
 */
function backfillRegisterEvents() {
  try {
    db.run(
      `INSERT OR IGNORE INTO funnel_events (user_id, event_name, occurred_at)
       SELECT id, 'register_completed', COALESCE(created_at, datetime('now')) FROM users`
    );
    saveDb();
  } catch (err) {
    console.error('backfillRegisterEvents failed:', err.message);
  }
}

/**
 * Aggregat-rapport: hur många UNIKA users har triggat varje event i fönstret.
 * Returnerar { totalRegistered, events: { event_name: count, ... }, windowDays }.
 *
 * Tidsfönstret avser registreringsdatum — dvs. vi kohort:ar på "users som
 * registrerade sig de senaste N dagar" och tittar på vilka events de triggat
 * (oavsett när events triggades). Det är mest användbart för aktivering-analys.
 */
function getFunnelStats({ days = 30 } = {}) {
  const cutoff = new Date(Date.now() - days * 86400 * 1000).toISOString();

  // Cohort: users registrerade i fönstret
  const cohortS = db.prepare(`SELECT id FROM users WHERE created_at >= ?`);
  cohortS.bind([cutoff]);
  const cohort = [];
  while (cohortS.step()) cohort.push(cohortS.getAsObject().id);
  cohortS.free();

  if (!cohort.length) return { totalRegistered: 0, events: {}, windowDays: days, cohortSize: 0 };

  // Räkna unika users per event INOM cohorten
  const placeholders = cohort.map(() => '?').join(',');
  const evS = db.prepare(
    `SELECT event_name, COUNT(DISTINCT user_id) AS user_count
     FROM funnel_events
     WHERE user_id IN (${placeholders})
     GROUP BY event_name`
  );
  evS.bind(cohort);
  const events = {};
  while (evS.step()) {
    const r = evS.getAsObject();
    events[r.event_name] = r.user_count;
  }
  evS.free();

  return {
    totalRegistered: cohort.length,
    events,
    windowDays: days,
    cohortSize: cohort.length,
  };
}

/**
 * Lista de senaste N events (för debugging "varför ser inte mitt event upp?").
 */
function getRecentFunnelEvents(limit = 50) {
  return rowsQuery(
    `SELECT fe.id, fe.user_id, fe.event_name, fe.metadata, fe.occurred_at,
            u.username, u.email, u.role
     FROM funnel_events fe
     LEFT JOIN users u ON u.id = fe.user_id
     ORDER BY fe.occurred_at DESC
     LIMIT ?`,
    [Math.min(limit, 200)]
  );
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
 * Kontrollera om ett Stripe-event redan är processerat.
 * Returnerar true om EJ tidigare sett (bör processeras), false om redan processerat.
 *
 * OBS: ENDAST READ — inserterar INTE. Använd markStripeEventProcessed() EFTER
 * lyckad handler-execution för att markera som processerat. Detta skydd förhindrar
 * att events markeras som "processerat" om servern kraschar mid-handler — Stripe
 * kommer då att retry:a och vi kan re-execute (handlers är idempotenta).
 */
function isStripeEventProcessed(eventId) {
  if (!eventId) return false;
  try {
    const s = db.prepare('SELECT 1 FROM stripe_events WHERE event_id = ? LIMIT 1');
    s.bind([eventId]);
    const found = s.step();
    s.free();
    return found;
  } catch (err) {
    console.error('isStripeEventProcessed failed:', err.message);
    return false; // vid fel, låt processeringen gå vidare
  }
}

/**
 * Markera ett Stripe-event som processerat. ENDAST efter lyckad handler-execution.
 * Returns true om INSERT lyckades (var verkligen nytt), false om duplicate.
 */
function markStripeEventProcessed(eventId, eventType) {
  if (!eventId) return true;
  try {
    db.run(
      'INSERT OR IGNORE INTO stripe_events (event_id, event_type) VALUES (?, ?)',
      [eventId, eventType || 'unknown']
    );
    const s = db.prepare('SELECT changes() AS n');
    s.step();
    const { n } = s.getAsObject();
    s.free();
    saveDb();
    return n > 0;
  } catch (err) {
    console.error('markStripeEventProcessed failed:', err.message);
    return true;
  }
}

// ── Admin notes per user ──────────────────────────────────────────────────────

function getAdminNotesForUser(targetUserId) {
  // JOIN med users för att få admin-namnet direkt i SELECT
  return rowsQuery(`
    SELECT n.id, n.content, n.created_at, n.admin_user_id,
           u.username AS admin_username
    FROM admin_user_notes n
    LEFT JOIN users u ON u.id = n.admin_user_id
    WHERE n.target_user_id = ?
    ORDER BY n.created_at DESC
  `, [targetUserId]);
}

function addAdminNote(targetUserId, adminUserId, content) {
  const clean = (content || '').trim().slice(0, 5000);
  if (!clean) return { ok: false, error: 'Tom anteckning' };
  db.run(
    'INSERT INTO admin_user_notes (target_user_id, admin_user_id, content) VALUES (?, ?, ?)',
    [targetUserId, adminUserId, clean]
  );
  saveDb();
  return { ok: true };
}

function deleteAdminNote(noteId) {
  db.run('DELETE FROM admin_user_notes WHERE id = ?', [noteId]);
  saveDb();
}

// ── Email retry-queue ─────────────────────────────────────────────────────────

/**
 * Lägg till mejl i kön. Worker plockar nästa pending och skickar via Resend.
 * Vid fail: increment attempts, sätt next_attempt_at via exponential backoff.
 */
function enqueueEmail({ to, subject, html, from, kind }) {
  if (!to || !subject || !html) return { ok: false, error: 'missing fields' };
  db.run(
    `INSERT INTO email_queue (to_email, subject, html, from_email, kind)
     VALUES (?, ?, ?, ?, ?)`,
    [to.slice(0, 200), subject.slice(0, 300), html, (from || '').slice(0, 200), (kind || '').slice(0, 50)]
  );
  saveDb();
  return { ok: true };
}

/** Hämta pending mejl som är redo att skickas (next_attempt_at <= now). */
function getPendingEmails(limit = 20) {
  return rowsQuery(
    `SELECT * FROM email_queue
     WHERE status = 'pending' AND next_attempt_at <= datetime('now')
     ORDER BY next_attempt_at ASC
     LIMIT ?`,
    [Math.min(limit, 100)]
  );
}

/** Markera ett mejl som lyckat skickat. */
function markEmailSent(id) {
  db.run(
    `UPDATE email_queue
     SET status = 'sent', sent_at = datetime('now')
     WHERE id = ?`,
    [id]
  );
  saveDb();
}

/**
 * Markera ett mejl som failed denna gång. Schemalägger retry med exponential
 * backoff (1m, 5m, 30m, 2h, 8h, 24h). Efter 6 attempts → permanent failed.
 */
function markEmailFailed(id, errorMsg) {
  const s = db.prepare('SELECT attempts FROM email_queue WHERE id = ?');
  s.bind([id]);
  if (!s.step()) { s.free(); return; }
  const { attempts } = s.getAsObject();
  s.free();

  const newAttempts = (attempts || 0) + 1;
  const backoffMinutes = [1, 5, 30, 120, 480, 1440]; // 1m, 5m, 30m, 2h, 8h, 24h
  if (newAttempts >= backoffMinutes.length) {
    db.run(
      `UPDATE email_queue
       SET status = 'failed', attempts = ?, last_error = ?
       WHERE id = ?`,
      [newAttempts, (errorMsg || '').slice(0, 500), id]
    );
  } else {
    db.run(
      `UPDATE email_queue
       SET attempts = ?, last_error = ?, next_attempt_at = datetime('now', '+' || ? || ' minutes')
       WHERE id = ?`,
      [newAttempts, (errorMsg || '').slice(0, 500), backoffMinutes[newAttempts], id]
    );
  }
  saveDb();
}

/** Lista alla mejl i kön (admin-diagnostics). */
function listAllEmailQueue(limit = 100) {
  return rowsQuery(
    `SELECT id, to_email, subject, kind, status, attempts, last_error,
            created_at, sent_at, next_attempt_at
     FROM email_queue ORDER BY id DESC LIMIT ?`,
    [Math.min(limit, 500)]
  );
}

/** Force re-queue ett failed-mejl: status='pending', next_attempt_at=now, attempts=0. */
function requeueEmail(id) {
  db.run(
    `UPDATE email_queue
     SET status='pending', attempts=0, next_attempt_at=datetime('now'), last_error=NULL
     WHERE id = ? AND status = 'failed'`,
    [id]
  );
  saveDb();
}

/** Cleanup: ta bort sent + failed-mejl äldre än 30 dagar. */
function cleanupOldEmailQueue() {
  try {
    db.run(`DELETE FROM email_queue WHERE status IN ('sent', 'failed') AND created_at < datetime('now', '-30 days')`);
    saveDb();
  } catch (err) {
    console.error('cleanupOldEmailQueue failed:', err.message);
  }
}

// ── Broadcast-arkiv ───────────────────────────────────────────────────────────

function saveBroadcast({ subject, body, segment, admin_user_id, sent_count, failed_count }) {
  db.run(
    `INSERT INTO broadcasts (subject, body, segment, admin_user_id, sent_count, failed_count)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      (subject || '').slice(0, 200),
      (body || '').slice(0, 20000),
      (segment || 'all'),
      admin_user_id || null,
      sent_count || 0,
      failed_count || 0,
    ]
  );
  saveDb();
}

/**
 * Hämta broadcasts synliga för user. Visar alla broadcasts oavsett
 * segment — transparens > exclusivity. Users som bytt tier ser fortf
 * gamla announcements. Segment-tag visas som kontext i UI:t.
 */
function getBroadcastsForUser(limit = 50) {
  return rowsQuery(
    `SELECT id, subject, body, segment, sent_at, sent_count
     FROM broadcasts
     ORDER BY sent_at DESC
     LIMIT ?`,
    [Math.min(limit, 100)]
  );
}

function getBroadcastById(id) {
  const s = db.prepare('SELECT * FROM broadcasts WHERE id = ?');
  s.bind([id]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free(); return null;
}

// ── Admin audit log ───────────────────────────────────────────────────────────

/**
 * Logga en admin-åtgärd. Fire-and-forget — får aldrig blockera requesten.
 * action: kort kod ex 'user.role_change', 'user.delete', 'broadcast.send'
 * target: { id, username } för target user (null om systemwide-action)
 * metadata: valfritt objekt (stringified JSON) med action-specifik data
 * ip: request IP (valfritt)
 */
function logAdminAction(adminId, adminUsername, action, target, metadata, ip) {
  try {
    db.run(
      `INSERT INTO admin_audit_log
         (admin_user_id, admin_username, action, target_user_id, target_username, metadata, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        adminUsername || '',
        action,
        target?.id || null,
        target?.username || null,
        metadata ? JSON.stringify(metadata).slice(0, 2000) : null,
        (ip || '').slice(0, 64),
      ]
    );
    _markAnalyticsDirty(); // batcha skriv — audit är högfrekvent, ingen mening flusha direkt
  } catch (err) {
    console.error('logAdminAction failed:', err.message);
  }
}

/**
 * Hämta audit-log-poster med filter.
 * filters: { adminId, targetId, action, days } — alla valfria
 * limit: default 200
 */
function getAuditLog(filters = {}, limit = 200) {
  const where = [];
  const params = [];
  if (filters.adminId)  { where.push('admin_user_id = ?');  params.push(filters.adminId); }
  if (filters.targetId) { where.push('target_user_id = ?'); params.push(filters.targetId); }
  if (filters.action)   { where.push('action = ?');         params.push(filters.action); }
  if (filters.days)     { where.push(`created_at > datetime('now', '-${parseInt(filters.days)} days')`); }
  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
  return rowsQuery(
    `SELECT * FROM admin_audit_log ${whereSQL} ORDER BY created_at DESC LIMIT ?`,
    [...params, Math.min(limit, 1000)]
  );
}

/** Unika actions som förekommit i loggen (för filter-dropdown) */
function getAuditActionTypes() {
  return rowsQuery(`SELECT DISTINCT action FROM admin_audit_log ORDER BY action`).map(r => r.action);
}

function cleanupOldAuditLog() {
  // Retention 180 dagar. Juridisk sweet-spot: långt nog för forensisk analys,
  // kort nog för att inte anhopa privacy-känslig admin-metadata i evighet.
  try {
    db.run("DELETE FROM admin_audit_log WHERE created_at < datetime('now', '-180 days')");
    saveDb();
  } catch (err) {
    console.error('cleanupOldAuditLog failed:', err.message);
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
 * Block-tidsanalys per user: hur länge de spenderat på varje block,
 * mastery-hastighet, och vad de gör i varje block.
 *
 * Aggregerar page_views (alla paths som börjar med /learn/:blockId/...) +
 * block_progress (quiz-pass-tid) + 4-stegs-events (reflection, roleplay,
 * mission) för att ge en komplett bild per block.
 *
 * Returns array med en rad per block användaren har interagerat med,
 * sorterat på first_visited_at ASC (kronologisk ordning).
 */
function getBlockTimeAnalytics(userId) {
  if (!userId) return [];

  // 1. Hämta alla page_views på /learn/*
  const rawViews = rowsQuery(
    `SELECT path, visited_at, COALESCE(duration_ms, 60000) AS duration_ms
     FROM page_views
     WHERE user_id = ? AND path LIKE '/learn/%'
     ORDER BY visited_at ASC`,
    [userId]
  );

  // 2. Bucketa per block_id (extrahera första segment efter /learn/)
  const perBlock = {};
  rawViews.forEach(v => {
    const match = v.path.match(/^\/learn\/([^\/\?]+)/);
    if (!match) return;
    const blockId = match[1];
    if (!perBlock[blockId]) {
      perBlock[blockId] = {
        blockId,
        visits: 0,
        totalMs: 0,
        firstVisited: v.visited_at,
        lastVisited: v.visited_at,
      };
    }
    perBlock[blockId].visits += 1;
    perBlock[blockId].totalMs += v.duration_ms || 0;
    if (v.visited_at < perBlock[blockId].firstVisited) perBlock[blockId].firstVisited = v.visited_at;
    if (v.visited_at > perBlock[blockId].lastVisited)  perBlock[blockId].lastVisited  = v.visited_at;
  });

  // 3. Berika med quiz-pass-tid från block_progress
  const progressRows = rowsQuery(
    `SELECT block_id, completed, quiz_score, quiz_total, completed_at
     FROM block_progress WHERE user_id = ?`,
    [userId]
  );
  const progressMap = {};
  progressRows.forEach(p => { progressMap[p.block_id] = p; });

  // 4. Steg-räknare: reflection, roleplay, mission (för "mastery"-status)
  const reflectionCounts = {};
  rowsQuery(`SELECT block_id, COUNT(*) AS n FROM user_reflections WHERE user_id = ? GROUP BY block_id`, [userId])
    .forEach(r => { reflectionCounts[r.block_id] = r.n; });

  const roleplayCounts = {};
  rowsQuery(`SELECT block_id, COUNT(*) AS n FROM user_roleplays WHERE user_id = ? GROUP BY block_id`, [userId])
    .forEach(r => { roleplayCounts[r.block_id] = r.n; });

  const missionStatus = {};
  rowsQuery(`SELECT block_id, completed_at FROM user_missions WHERE user_id = ?`, [userId])
    .forEach(m => { missionStatus[m.block_id] = { started: true, completed: !!m.completed_at }; });

  // 5. Bygg slutgiltig array + beräkna derived metrics
  const result = Object.values(perBlock).map(b => {
    const progress = progressMap[b.blockId];
    const quizPassedAt = progress?.completed === 1 ? progress.completed_at : null;
    const quizScore = progress ? { score: progress.quiz_score, total: progress.quiz_total } : null;

    // Tid från första besök till quiz-pass
    let timeToQuizMs = null;
    if (quizPassedAt && b.firstVisited) {
      timeToQuizMs = new Date(quizPassedAt).getTime() - new Date(b.firstVisited).getTime();
      if (timeToQuizMs < 0) timeToQuizMs = null; // race condition safety
    }

    // 4-stegs-status för mastery-räknare
    const stepsDone = [
      progress?.completed === 1,
      (roleplayCounts[b.blockId] || 0) > 0,
      missionStatus[b.blockId]?.completed === true,
      (reflectionCounts[b.blockId] || 0) > 0,
    ].filter(Boolean).length;

    return {
      blockId:      b.blockId,
      visits:       b.visits,
      totalMs:      b.totalMs,
      firstVisited: b.firstVisited,
      lastVisited:  b.lastVisited,
      quizPassedAt,
      quizScore,
      timeToQuizMs,
      stepsDone, // 0-4
      reflections: reflectionCounts[b.blockId] || 0,
      roleplays:   roleplayCounts[b.blockId]   || 0,
      missionDone: missionStatus[b.blockId]?.completed === true,
    };
  });

  // Sortera kronologiskt (första besök först)
  result.sort((a, b) => a.firstVisited.localeCompare(b.firstVisited));
  return result;
}

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
    first_name:      user.first_name || null,
    last_name:       user.last_name  || null,
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

/**
 * Cohort retention: för varje registreringsvecka, visa vilken andel av
 * användare som var aktiva vecka 0 (signup-vecka), 1, 2, 3, 4 efter signup.
 *
 * "Aktiv" = någon meningsfull händelse i någon event-tabell under den veckan.
 * Visar senaste 8 cohort-veckor (om så mycket data finns).
 */
function getCohortRetention() {
  // Find cohort-veckor: alla veckor där någon registrerade sig, senaste 8.
  // SQLite saknar native WEEK-funktion, så vi använder strftime('%Y-W%W').
  const cohorts = rowsQuery(`
    SELECT strftime('%Y-W%W', created_at) AS cohort_week,
           DATE(created_at, 'weekday 0', '-6 days') AS cohort_start,
           COUNT(*) AS signups
    FROM users
    WHERE created_at IS NOT NULL
    GROUP BY cohort_week
    ORDER BY cohort_week DESC
    LIMIT 8
  `);

  // För varje cohort: beräkna active-count per vecka sedan signup (vecka 0-4)
  const enriched = cohorts.map(c => {
    // Hämta alla user_ids i cohorten
    const userIds = rowsQuery(
      `SELECT id FROM users WHERE strftime('%Y-W%W', created_at) = ?`,
      [c.cohort_week]
    ).map(r => r.id);

    if (!userIds.length) {
      return { ...c, weeks: [0, 0, 0, 0, 0] };
    }

    // Per vecka sedan cohort_start: räkna DISTINCT user_ids som hade aktivitet
    // Aktivitet = user_actions, user_reflections, user_roleplays, user_missions, block_progress
    // OBS sql.js har inte IN-parametrisering för arrays, bygger därför inline safe strängar
    const idsInline = userIds.join(',');
    const weeks = [0, 1, 2, 3, 4].map(weekNum => {
      const startOffset = weekNum * 7;
      const endOffset   = (weekNum + 1) * 7;
      const sql = `
        SELECT COUNT(DISTINCT user_id) AS active FROM (
          SELECT user_id, created_at AS at FROM user_actions
          UNION ALL SELECT user_id, created_at FROM user_reflections
          UNION ALL SELECT user_id, completed_at FROM user_roleplays
          UNION ALL SELECT user_id, started_at FROM user_missions
          UNION ALL SELECT user_id, completed_at FROM block_progress WHERE completed_at IS NOT NULL
          UNION ALL SELECT user_id, visited_at FROM page_views
        )
        WHERE user_id IN (${idsInline})
          AND at BETWEEN date(?, '+' || ? || ' days') AND date(?, '+' || ? || ' days')
      `;
      const r = rowsQuery(sql, [c.cohort_start, startOffset, c.cohort_start, endOffset])[0];
      return r?.active || 0;
    });

    return {
      cohortWeek: c.cohort_week,
      cohortStart: c.cohort_start,
      signups: c.signups,
      weeks, // [vecka0_active, vecka1, vecka2, vecka3, vecka4]
      pcts:  weeks.map(n => c.signups > 0 ? Math.round((n / c.signups) * 100) : 0),
    };
  });

  // Returnera med senaste cohorten överst
  return enriched;
}

/**
 * "Fortsätt där du slutade" — hittar det mest relevanta blocket att leda
 * returnerande användare till. Prioriterad logik:
 *   1. Om de just startat ett uppdrag som inte är klart → det blocket
 *   2. Annars: senaste block de besökte (page_view /learn/:id) som inte är klart
 *   3. Annars: senaste klara-quiz-block (de kanske vill göra rollspel/reflektion)
 *   4. Annars: null (helt ny eller klara med allt)
 *
 * Returns: { blockId, reason } eller null
 */
function getContinueTarget(userId) {
  // 1. Pågående uppdrag (started_at < now, completed_at IS NULL)
  const mission = rowsQuery(
    `SELECT block_id FROM user_missions
     WHERE user_id = ? AND completed_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [userId]
  )[0];
  if (mission) return { blockId: mission.block_id, reason: 'mission_in_progress' };

  // 2. Senaste /learn/X-besök som INTE är klart
  const lastVisited = rowsQuery(
    `SELECT path FROM page_views
     WHERE user_id = ? AND path LIKE '/learn/%'
     ORDER BY visited_at DESC LIMIT 10`,
    [userId]
  );
  for (const pv of lastVisited) {
    // Extrahera block-id från path: /learn/:id eller /learn/:id/ova etc
    const match = pv.path.match(/^\/learn\/([^\/]+)/);
    if (!match) continue;
    const blockId = match[1];
    // Kolla om detta block är klart
    const p = db.prepare('SELECT completed FROM block_progress WHERE user_id = ? AND block_id = ?');
    p.bind([userId, blockId]);
    const isCompleted = p.step() ? (p.getAsObject().completed === 1) : false;
    p.free();
    if (!isCompleted) {
      return { blockId, reason: 'recently_visited' };
    }
  }

  // 3. Senaste klara quiz där de KANSKE vill göra rollspel/uppdrag/reflektion
  //    (dvs block som är "quiz-klart" men inte "mastered" = alla 4 steg)
  const lastCompleted = rowsQuery(
    `SELECT block_id FROM block_progress
     WHERE user_id = ? AND completed = 1
     ORDER BY completed_at DESC LIMIT 5`,
    [userId]
  );
  for (const bp of lastCompleted) {
    // Kolla om alla 4 steg är klara (mastered)
    const hasRoleplay   = rowsQuery('SELECT 1 FROM user_roleplays   WHERE user_id = ? AND block_id = ? LIMIT 1', [userId, bp.block_id]).length > 0;
    const hasMission    = rowsQuery('SELECT 1 FROM user_missions    WHERE user_id = ? AND block_id = ? AND completed_at IS NOT NULL LIMIT 1', [userId, bp.block_id]).length > 0;
    const hasReflection = rowsQuery('SELECT 1 FROM user_reflections WHERE user_id = ? AND block_id = ? LIMIT 1', [userId, bp.block_id]).length > 0;
    if (!(hasRoleplay && hasMission && hasReflection)) {
      return { blockId: bp.block_id, reason: 'steps_remaining' };
    }
  }

  // 4. Ingen pågående — null betyder "visa normal dashboard, kanske nytt block"
  return null;
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

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSATION INTELLIGENCE (CI) — bulk call-analytics queries
// ═══════════════════════════════════════════════════════════════════════════════
// Separat från Pro-tier (pro_call_analyses). CI skalar till 1000 samtal/dag
// via en DB-backed jobb-kö. Se migrations/ci-schema.sql för designmotivering.

/**
 * Skapa ett nytt jobb. Returnerar jobId.
 * storage_key fylls i av caller efter att ljudfilen lagts i R2/disk.
 *
 * VIKTIGT: Status default är 'uploading' — inte 'pending'. Worker pollar
 * bara 'pending', så genom att starta i 'uploading' undviker vi race
 * conditions där worker hinner plocka upp jobbet INNAN storage_key är satt.
 * Caller MÅSTE uppgradera till 'pending' efter att putAudio() lyckats.
 */
function createCallJob(userId, { batch_id, original_name, storage_key, file_size, mime_type, title, status, prompt_version, identify_speakers, salesperson_name }) {
  db.run(
    `INSERT INTO call_jobs (user_id, batch_id, original_name, storage_key, file_size, mime_type, title, status, prompt_version, identify_speakers, salesperson_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, batch_id || null, original_name, storage_key || null, file_size || null, mime_type || null, title || null, status || 'uploading', prompt_version || null, identify_speakers ? 1 : 0, salesperson_name || null]
  );
  const s = db.prepare('SELECT last_insert_rowid() AS id');
  s.step();
  const { id } = s.getAsObject();
  s.free();
  saveDb();
  return id;
}

/**
 * Tillåtna kolumner för update — skyddar mot injection via callers utan att
 * kräva en full ORM. status, error, started_at, completed_at, storage_key.
 */
function updateCallJob(jobId, updates) {
  const allowed = ['status', 'error', 'started_at', 'completed_at', 'storage_key', 'file_size', 'mime_type'];
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (!fields.length) return;
  values.push(jobId);
  db.run(`UPDATE call_jobs SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDb();
}

/**
 * Atomisk "claim" av nästa pending-jobb. Returnerar jobbraden eller null.
 * Använder UPDATE ... WHERE status='pending' för att undvika dubbelprocessering
 * om flera workers startas (även om Fas 1 bara kör en).
 */
function claimNextPendingCallJob() {
  const s = db.prepare(`
    SELECT id, user_id, batch_id, original_name, storage_key, file_size, mime_type, title, prompt_version, identify_speakers
    FROM call_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 1
  `);
  if (!s.step()) { s.free(); return null; }
  const row = s.getAsObject();
  s.free();

  // Markera som transcribing — om nån annan worker hann före returneras 0 ändringar
  db.run(
    `UPDATE call_jobs SET status = 'transcribing', started_at = datetime('now')
     WHERE id = ? AND status = 'pending'`,
    [row.id]
  );
  const changes = db.getRowsModified();
  saveDb();
  if (changes === 0) return null; // någon annan tog jobbet
  return row;
}

function getCallJob(jobId) {
  const s = db.prepare('SELECT * FROM call_jobs WHERE id = ?');
  s.bind([jobId]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free();
  return null;
}

/**
 * Hämta jobb + transcript + analys för detalj-vy.
 */
function getCallJobFull(jobId) {
  const job = getCallJob(jobId);
  if (!job) return null;
  const ts = db.prepare('SELECT text, duration_sec, language, word_count, structured_text FROM call_transcripts WHERE job_id = ?');
  ts.bind([jobId]);
  let transcript = null;
  if (ts.step()) transcript = ts.getAsObject();
  ts.free();

  const an = db.prepare('SELECT analysis, model, prompt_version, created_at FROM call_analyses WHERE job_id = ?');
  an.bind([jobId]);
  let analysis = null;
  if (an.step()) analysis = an.getAsObject();
  an.free();

  const wf = db.prepare('SELECT word, count FROM call_word_frequencies WHERE job_id = ? ORDER BY count DESC LIMIT 50');
  wf.bind([jobId]);
  const wordFrequencies = [];
  while (wf.step()) wordFrequencies.push(wf.getAsObject());
  wf.free();

  return { job, transcript, analysis, wordFrequencies };
}

/**
 * Lista jobb med filter. Används av /admin/calls dashboard.
 * statusFilter: array (['pending','done'] etc) eller null = alla
 */
function listCallJobs({ statusFilter = null, batchId = null, limit = 100, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (statusFilter && statusFilter.length) {
    where.push(`status IN (${statusFilter.map(() => '?').join(',')})`);
    params.push(...statusFilter);
  }
  if (batchId) {
    where.push('batch_id = ?');
    params.push(batchId);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit, offset);

  const s = db.prepare(`
    SELECT j.id, j.user_id, j.batch_id, j.original_name, j.title, j.status, j.error,
           j.created_at, j.started_at, j.completed_at, j.file_size, j.prompt_version,
           j.salesperson_name, j.outcome,
           t.duration_sec, t.word_count
    FROM call_jobs j
    LEFT JOIN call_transcripts t ON t.job_id = j.id
    ${whereClause}
    ORDER BY j.created_at DESC
    LIMIT ? OFFSET ?
  `);
  s.bind(params);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

/**
 * Aggregerade counts för dashboard-header.
 */
function getCallJobStats() {
  const rows = rowsQuery(`
    SELECT status, COUNT(*) AS n
    FROM call_jobs
    GROUP BY status
  `);
  const stats = { pending: 0, transcribing: 0, analyzing: 0, done: 0, failed: 0, total: 0 };
  for (const r of rows) {
    stats[r.status] = r.n;
    stats.total += r.n;
  }
  // Total duration + word count från done-samtal
  const agg = rowsQuery(`
    SELECT COALESCE(SUM(t.duration_sec), 0) AS total_sec,
           COALESCE(SUM(t.word_count), 0)   AS total_words,
           COUNT(*)                          AS analyzed
    FROM call_transcripts t
    INNER JOIN call_jobs j ON j.id = t.job_id
    WHERE j.status = 'done'
  `)[0] || { total_sec: 0, total_words: 0, analyzed: 0 };
  stats.total_duration_sec = agg.total_sec;
  stats.total_words        = agg.total_words;
  stats.analyzed           = agg.analyzed;
  return stats;
}

/**
 * Spara transkript efter Whisper. word_count räknas av callern (callAnalytics).
 * structured_text = diarized markdown (Säljare:/Kund:), NULL om ej begärt.
 */
function saveCallTranscript(jobId, { text, duration_sec, language, word_count, structured_text }) {
  db.run(
    `INSERT OR REPLACE INTO call_transcripts (job_id, text, duration_sec, language, word_count, structured_text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [jobId, text, duration_sec || null, language || null, word_count || null, structured_text || null]
  );
  saveDb();
}

/**
 * Spara analys + logga till runs-historiken.
 * call_analyses = "senaste" (snabb lookup för detalj-vy).
 * call_analysis_runs = full historik för jämförelse mellan prompt-versioner.
 */
function saveCallAnalysis(jobId, { analysis, model, promptVersion }) {
  // 1. Senaste analysen (overskrivs vid re-analyse)
  db.run(
    `INSERT OR REPLACE INTO call_analyses (job_id, analysis, model, prompt_version) VALUES (?, ?, ?, ?)`,
    [jobId, analysis, model || null, promptVersion || null]
  );
  // 2. Historik-rad (append-only)
  db.run(
    `INSERT INTO call_analysis_runs (job_id, prompt_version, analysis, model) VALUES (?, ?, ?, ?)`,
    [jobId, promptVersion || 'unknown', analysis, model || null]
  );
  saveDb();
}

/**
 * Lista alla historiska körningar för ett samtal, nyast först.
 */
function listCallAnalysisRuns(jobId) {
  const s = db.prepare(`
    SELECT id, prompt_version, model, created_at, length(analysis) AS chars
    FROM call_analysis_runs
    WHERE job_id = ?
    ORDER BY created_at DESC
  `);
  s.bind([jobId]);
  const rows = [];
  while (s.step()) rows.push(s.getAsObject());
  s.free();
  return rows;
}

/**
 * Hämta en specifik körning (för historisk jämförelse-vy).
 */
function getCallAnalysisRun(runId) {
  const s = db.prepare(`
    SELECT r.id, r.job_id, r.prompt_version, r.analysis, r.model, r.created_at,
           j.original_name, j.title
    FROM call_analysis_runs r
    INNER JOIN call_jobs j ON j.id = r.job_id
    WHERE r.id = ?
  `);
  s.bind([runId]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free();
  return null;
}

/**
 * Hämta transkript separat (utan att dra in analys/word-freq).
 * Används av re-analyze — vi behöver bara texten för att köra Groq igen.
 */
function getCallTranscript(jobId) {
  const s = db.prepare('SELECT text, duration_sec, language, word_count, structured_text FROM call_transcripts WHERE job_id = ?');
  s.bind([jobId]);
  if (s.step()) { const r = s.getAsObject(); s.free(); return r; }
  s.free();
  return null;
}

/**
 * Manuell speaker-tagging — admin/säljare har rättat AI:ns gissningar i
 * structured_text (Säljare/Kund-prefixar). Vi sparar ändringarna direkt
 * i samma kolumn, ingen separat versionering. Re-analyse plockar då upp
 * det rättade transkriptet automatiskt.
 *
 * För att markera att texten är manuellt rättad: vi sätter ingen separat
 * flagga (håller schemat enkelt). Trust-modellen är att om strukturerad
 * text finns och har rationale "Säljare:/Kund:"-format, är den vad som
 * ska användas — oavsett källa.
 */
function updateStructuredTranscript(jobId, structuredText) {
  if (!structuredText || typeof structuredText !== 'string') {
    throw new Error('structured_text måste vara en sträng');
  }
  db.run(
    `UPDATE call_transcripts SET structured_text = ? WHERE job_id = ?`,
    [structuredText, jobId]
  );
  saveDb();
}

/**
 * Batch-insert av ord-frekvenser. Clear-and-reinsert eftersom job-id är unikt per analys.
 */
function saveCallWordFrequencies(jobId, pairs) {
  db.run('DELETE FROM call_word_frequencies WHERE job_id = ?', [jobId]);
  for (const { word, count } of pairs) {
    db.run(
      'INSERT INTO call_word_frequencies (job_id, word, count) VALUES (?, ?, ?)',
      [jobId, word, count]
    );
  }
  saveDb();
}

/**
 * Fulltext-sök (LIKE) över call_transcripts. Returnerar jobId + title + excerpt.
 * Enkel Fas 1-implementation — Fas 2 byter till FTS5 eller Postgres tsvector.
 */
function searchCallTranscripts(query, { limit = 30 } = {}) {
  if (!query || query.trim().length < 2) return [];
  const pattern = `%${query.replace(/[%_]/g, '')}%`;
  const s = db.prepare(`
    SELECT j.id AS job_id, j.original_name, j.title, j.status, j.created_at,
           t.text, t.duration_sec
    FROM call_transcripts t
    INNER JOIN call_jobs j ON j.id = t.job_id
    WHERE t.text LIKE ?
    ORDER BY j.created_at DESC
    LIMIT ?
  `);
  s.bind([pattern, limit]);
  const results = [];
  const lowerQuery = query.toLowerCase();
  while (s.step()) {
    const row = s.getAsObject();
    // Bygg excerpt: 80 tecken runt första träffen (case-insensitive)
    const lowerText = (row.text || '').toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    const start = Math.max(0, idx - 60);
    const end = Math.min(row.text.length, idx + query.length + 60);
    const excerpt = (start > 0 ? '…' : '') + row.text.slice(start, end) + (end < row.text.length ? '…' : '');
    results.push({
      job_id:         row.job_id,
      original_name:  row.original_name,
      title:          row.title,
      status:         row.status,
      created_at:     row.created_at,
      duration_sec:   row.duration_sec,
      excerpt,
    });
  }
  s.free();
  return results;
}

/**
 * Radera ett jobb + cascaderade rader. Returnerar storage_key så caller kan
 * rensa ljudfilen från R2/disk.
 */
function deleteCallJob(jobId) {
  const job = getCallJob(jobId);
  if (!job) return null;
  db.run('DELETE FROM call_word_frequencies WHERE job_id = ?', [jobId]);
  db.run('DELETE FROM call_analyses         WHERE job_id = ?', [jobId]);
  db.run('DELETE FROM call_transcripts      WHERE job_id = ?', [jobId]);
  db.run('DELETE FROM call_jobs             WHERE id = ?',     [jobId]);
  saveDb();
  return job.storage_key || null;
}

// ─── Resultatmaskin (outcome-tagging + aggregation) ────────────────────────

const ALLOWED_OUTCOMES = ['sold', 'lost', 'no_sms', 'callback', 'other'];

function setCallOutcome(jobId, outcome) {
  if (outcome !== null && !ALLOWED_OUTCOMES.includes(outcome)) {
    throw new Error(`Ogiltigt outcome: ${outcome}. Tillåtna: ${ALLOWED_OUTCOMES.join(', ')}`);
  }
  db.run(
    `UPDATE call_jobs SET outcome = ?, outcome_tagged_at = datetime('now') WHERE id = ?`,
    [outcome, jobId]
  );
  saveDb();
}

function setCallSalesperson(jobId, name) {
  const clean = name ? String(name).trim().slice(0, 80) : null;
  db.run(`UPDATE call_jobs SET salesperson_name = ? WHERE id = ?`, [clean, jobId]);
  saveDb();
}

/**
 * Lista distinkta säljare i datat (för dropdown-filter i insights-vy).
 */
function listSalespeople() {
  return rowsQuery(`
    SELECT salesperson_name AS name, COUNT(*) AS samtal
    FROM call_jobs
    WHERE salesperson_name IS NOT NULL AND salesperson_name != ''
    GROUP BY salesperson_name
    ORDER BY samtal DESC, salesperson_name ASC
  `);
}

/**
 * Outcome-fördelning över korpusen (eller filtrerat). Matar dashboard-stats.
 */
function getOutcomeStats({ salesperson = null, methodology = null } = {}) {
  const where = ['j.status = ?'];
  const params = ['done'];
  if (salesperson) {
    where.push('j.salesperson_name = ?');
    params.push(salesperson);
  }
  if (methodology) {
    where.push('j.prompt_version = ?');
    params.push(methodology);
  }
  const rows = rowsQuery(`
    SELECT COALESCE(outcome, 'untagged') AS outcome, COUNT(*) AS n
    FROM call_jobs j
    WHERE ${where.join(' AND ')}
    GROUP BY outcome
  `, params);
  const stats = { sold: 0, lost: 0, no_sms: 0, callback: 0, other: 0, untagged: 0, total: 0 };
  for (const r of rows) {
    stats[r.outcome] = r.n;
    stats.total += r.n;
  }
  // Win-rate beräknad på TAGGADE samtal (otaggade exkluderas — vi vet inte utfallet)
  const tagged = stats.total - stats.untagged;
  stats.tagged = tagged;
  stats.win_rate = tagged > 0 ? Math.round((stats.sold / tagged) * 100) : null;
  return stats;
}

/**
 * Winning vs losing phrases.
 *
 * Logik:
 *   1. Räkna ord-frekvenser separat över alla "sold"-samtal vs alla "lost/no_sms"-samtal.
 *   2. Normalisera: dela med antal samtal i respektive grupp för att få genomsnittlig
 *      användning per samtal.
 *   3. För varje ord, beräkna "lift" = sold-snitt / lost-snitt.
 *   4. Returnera top-N ord med högst lift (winning) och lägst lift (losing).
 *
 * Filter: salesperson, methodology, datumintervall (senaste N dagar).
 *
 * Output: { winning: [{word, sold_avg, lost_avg, lift, sold_calls, lost_calls}], losing: [...] }
 */
function getWinningLosingPhrases({ salesperson = null, methodology = null, days = 90, minOccurrences = 3 } = {}) {
  const where = ["j.status = 'done'", "j.created_at > datetime('now', ? )"];
  const params = [`-${parseInt(days, 10) || 90} days`];
  if (salesperson) { where.push('j.salesperson_name = ?'); params.push(salesperson); }
  if (methodology) { where.push('j.prompt_version = ?'); params.push(methodology); }
  const baseWhere = where.join(' AND ');

  // Antal samtal per outcome-grupp (för normalisering)
  const soldCount = (rowsQuery(
    `SELECT COUNT(*) AS n FROM call_jobs j WHERE ${baseWhere} AND outcome = 'sold'`,
    params
  )[0] || { n: 0 }).n;
  const lostCount = (rowsQuery(
    `SELECT COUNT(*) AS n FROM call_jobs j WHERE ${baseWhere} AND outcome IN ('lost','no_sms')`,
    params
  )[0] || { n: 0 }).n;

  if (soldCount < 2 || lostCount < 2) {
    // För lite data för meningsfull jämförelse
    return { winning: [], losing: [], soldCount, lostCount, insufficient: true };
  }

  // Aggregerad ord-frekvens per outcome-grupp
  const soldFreq = rowsQuery(`
    SELECT wf.word, SUM(wf.count) AS total
    FROM call_word_frequencies wf
    INNER JOIN call_jobs j ON j.id = wf.job_id
    WHERE ${baseWhere} AND j.outcome = 'sold'
    GROUP BY wf.word
    HAVING SUM(wf.count) >= ?
  `, [...params, minOccurrences]);

  const lostFreq = rowsQuery(`
    SELECT wf.word, SUM(wf.count) AS total
    FROM call_word_frequencies wf
    INNER JOIN call_jobs j ON j.id = wf.job_id
    WHERE ${baseWhere} AND j.outcome IN ('lost','no_sms')
    GROUP BY wf.word
    HAVING SUM(wf.count) >= ?
  `, [...params, minOccurrences]);

  // Map ord -> snitt-användning per samtal
  const soldMap = new Map(soldFreq.map(r => [r.word, r.total / soldCount]));
  const lostMap = new Map(lostFreq.map(r => [r.word, r.total / lostCount]));

  // Slå ihop nyckel-mängd, beräkna lift
  const allWords = new Set([...soldMap.keys(), ...lostMap.keys()]);
  const scored = [];
  for (const word of allWords) {
    const soldAvg = soldMap.get(word) || 0;
    const lostAvg = lostMap.get(word) || 0;
    // Smoothing: addera 0.1 i nämnaren så vi inte dividerar med 0 + dämpar extrema utstickare
    const lift = (soldAvg + 0.1) / (lostAvg + 0.1);
    scored.push({
      word,
      sold_avg: Math.round(soldAvg * 100) / 100,
      lost_avg: Math.round(lostAvg * 100) / 100,
      lift:     Math.round(lift * 100) / 100,
    });
  }

  scored.sort((a, b) => b.lift - a.lift);
  const winning = scored.slice(0, 30);
  const losing  = scored.slice(-30).reverse();

  return { winning, losing, soldCount, lostCount, insufficient: false };
}

// ─── Invändningsregister (Fas 3) ───────────────────────────────────────────

/**
 * Spara extraherade invändningar för ett samtal. Clear-and-reinsert pattern.
 */
function saveCallObjections(jobId, objections) {
  db.run('DELETE FROM call_objections WHERE job_id = ?', [jobId]);
  for (const o of objections) {
    if (!o || !o.objection_text) continue;
    db.run(
      `INSERT INTO call_objections (job_id, objection_text, category, salesperson_response, handled_well)
       VALUES (?, ?, ?, ?, ?)`,
      [
        jobId,
        String(o.objection_text).slice(0, 1000),
        o.category ? String(o.category).slice(0, 60) : null,
        o.salesperson_response ? String(o.salesperson_response).slice(0, 1000) : null,
        o.handled_well === true ? 1 : (o.handled_well === false ? 0 : null),
      ]
    );
  }
  saveDb();
}

function getCallObjections(jobId) {
  return rowsQuery(
    `SELECT id, objection_text, category, salesperson_response, handled_well, created_at
     FROM call_objections WHERE job_id = ? ORDER BY id ASC`,
    [jobId]
  );
}

/**
 * Aggregerad vy: invändnings-kategorier rankade på förekomst, med
 * exempel-svar från sold-samtal (winning) vs lost-samtal (losing).
 */
function getObjectionsRegister({ salesperson = null, methodology = null, days = 90 } = {}) {
  const where = ["j.status = 'done'", "j.created_at > datetime('now', ?)"];
  const params = [`-${parseInt(days, 10) || 90} days`];
  if (salesperson) { where.push('j.salesperson_name = ?'); params.push(salesperson); }
  if (methodology) { where.push('j.prompt_version = ?'); params.push(methodology); }
  const baseWhere = where.join(' AND ');

  // Ranka kategorier på förekomst
  const categories = rowsQuery(`
    SELECT
      COALESCE(o.category, 'okategoriserad') AS category,
      COUNT(*) AS occurrences,
      SUM(CASE WHEN j.outcome = 'sold' THEN 1 ELSE 0 END) AS in_sold,
      SUM(CASE WHEN j.outcome IN ('lost','no_sms') THEN 1 ELSE 0 END) AS in_lost,
      SUM(CASE WHEN o.handled_well = 1 THEN 1 ELSE 0 END) AS handled_well_count
    FROM call_objections o
    INNER JOIN call_jobs j ON j.id = o.job_id
    WHERE ${baseWhere}
    GROUP BY category
    ORDER BY occurrences DESC
    LIMIT 30
  `, params);

  // För varje kategori: hämta 2 exempel-svar från sold + 2 från lost
  const enriched = categories.map(cat => {
    const soldExamples = rowsQuery(`
      SELECT o.objection_text, o.salesperson_response, j.id AS job_id, j.salesperson_name
      FROM call_objections o
      INNER JOIN call_jobs j ON j.id = o.job_id
      WHERE ${baseWhere} AND COALESCE(o.category, 'okategoriserad') = ? AND j.outcome = 'sold'
        AND o.salesperson_response IS NOT NULL AND length(o.salesperson_response) > 10
      ORDER BY o.id DESC
      LIMIT 2
    `, [...params, cat.category]);
    const lostExamples = rowsQuery(`
      SELECT o.objection_text, o.salesperson_response, j.id AS job_id, j.salesperson_name
      FROM call_objections o
      INNER JOIN call_jobs j ON j.id = o.job_id
      WHERE ${baseWhere} AND COALESCE(o.category, 'okategoriserad') = ? AND j.outcome IN ('lost','no_sms')
        AND o.salesperson_response IS NOT NULL AND length(o.salesperson_response) > 10
      ORDER BY o.id DESC
      LIMIT 2
    `, [...params, cat.category]);
    return {
      ...cat,
      handled_well_pct: cat.occurrences > 0 ? Math.round((cat.handled_well_count / cat.occurrences) * 100) : null,
      soldExamples,
      lostExamples,
    };
  });

  return enriched;
}

// ─── Säljare-dashboards (Fas 3) ────────────────────────────────────────────

/**
 * Översikt över alla säljare med basic stats.
 * Returnerar [{ name, total, sold, lost, no_sms, callback, untagged, tagged, win_rate, total_minutes, last_call_at }]
 */
function getSalespeopleOverview() {
  const rows = rowsQuery(`
    SELECT
      j.salesperson_name AS name,
      COUNT(*) AS total,
      SUM(CASE WHEN j.outcome = 'sold'     THEN 1 ELSE 0 END) AS sold,
      SUM(CASE WHEN j.outcome = 'lost'     THEN 1 ELSE 0 END) AS lost,
      SUM(CASE WHEN j.outcome = 'no_sms'   THEN 1 ELSE 0 END) AS no_sms,
      SUM(CASE WHEN j.outcome = 'callback' THEN 1 ELSE 0 END) AS callback,
      SUM(CASE WHEN j.outcome = 'other'    THEN 1 ELSE 0 END) AS other,
      SUM(CASE WHEN j.outcome IS NULL      THEN 1 ELSE 0 END) AS untagged,
      COALESCE(SUM(t.duration_sec), 0) AS total_seconds,
      MAX(j.created_at) AS last_call_at
    FROM call_jobs j
    LEFT JOIN call_transcripts t ON t.job_id = j.id
    WHERE j.salesperson_name IS NOT NULL AND j.salesperson_name != ''
      AND j.status = 'done'
    GROUP BY j.salesperson_name
    ORDER BY total DESC, name ASC
  `);
  return rows.map(r => {
    const tagged = r.total - r.untagged;
    return {
      ...r,
      tagged,
      win_rate:      tagged > 0 ? Math.round((r.sold / tagged) * 100) : null,
      total_minutes: Math.round(r.total_seconds / 60),
    };
  });
}

/**
 * Full dashboard för en specifik säljare.
 * Returnerar { stats, recentCalls, weeklyTrend }
 */
function getSalespersonDashboard(name) {
  if (!name) return null;

  // Stats (samma som i overview men för en specifik säljare)
  const overview = getSalespeopleOverview().find(s => s.name === name);
  if (!overview) return null;

  // Senaste 50 samtalen
  const recentCalls = rowsQuery(`
    SELECT j.id, j.original_name, j.title, j.status, j.outcome, j.created_at, j.prompt_version,
           t.duration_sec, t.word_count
    FROM call_jobs j
    LEFT JOIN call_transcripts t ON t.job_id = j.id
    WHERE j.salesperson_name = ?
    ORDER BY j.created_at DESC
    LIMIT 50
  `, [name]);

  // Veckotrend: win-rate per ISO-vecka, senaste 12 veckorna
  const weeklyTrend = rowsQuery(`
    SELECT
      strftime('%Y-W%W', j.created_at) AS week,
      COUNT(*) AS calls,
      SUM(CASE WHEN j.outcome = 'sold' THEN 1 ELSE 0 END) AS sold,
      SUM(CASE WHEN j.outcome IN ('lost', 'no_sms') THEN 1 ELSE 0 END) AS lost
    FROM call_jobs j
    WHERE j.salesperson_name = ?
      AND j.status = 'done'
      AND j.created_at > datetime('now', '-84 days')
    GROUP BY week
    ORDER BY week ASC
  `, [name]).map(w => ({
    ...w,
    tagged:   w.sold + w.lost,
    win_rate: (w.sold + w.lost) > 0 ? Math.round((w.sold / (w.sold + w.lost)) * 100) : null,
  }));

  // Metodik-fördelning — vilka projekt jobbar säljaren mest på?
  const methodologyDist = rowsQuery(`
    SELECT prompt_version AS methodology, COUNT(*) AS n
    FROM call_jobs
    WHERE salesperson_name = ? AND status = 'done' AND prompt_version IS NOT NULL
    GROUP BY prompt_version
    ORDER BY n DESC
  `, [name]);

  return {
    stats:           overview,
    recentCalls,
    weeklyTrend,
    methodologyDist,
  };
}

/**
 * Återställ jobb som fastnade i 'transcribing'/'analyzing' vid en server-omstart.
 * Kallas en gång vid start av callQueue-workern.
 */
function resetStuckCallJobs() {
  db.run(`
    UPDATE call_jobs
    SET status = 'pending', started_at = NULL
    WHERE status IN ('transcribing', 'analyzing')
  `);
  const n = db.getRowsModified();
  if (n > 0) saveDb();
  return n;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  initDatabase, saveDb, cleanupExpiredTokens, rotateDbBackups,
  findUserByUsername, findUserByEmail, findUserById, generateUsernameFromEmail, displayName, fullName,
  createUser, getAllUsers, setUserRole, deleteUser, deleteUserAccount, getUserStats,
  updateUserEmail, updateUserName,
  setStripeCustomerId, findUserByStripeCustomerId,
  updateLastLogin,
  isUserLocked, recordFailedLogin, clearFailedLogins,
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
  getAllUsersWithEmail, getUsersForBroadcast,
  saveBroadcast, getBroadcastsForUser, getBroadcastById,
  enqueueEmail, getPendingEmails, markEmailSent, markEmailFailed, cleanupOldEmailQueue,
  listAllEmailQueue, requeueEmail,
  // Admin analytics
  getAdminAnalytics,
  getAdminDigestStats,
  getUserAnalyticsProfile,
  getFunnelMetrics,
  getUserDataExport,
  getCohortRetention,
  getContinueTarget,
  getBlockTimeAnalytics,
  // Page-view tracking
  logPageView, updateLastPageViewDuration, cleanupOldPageViews, flushAnalytics,
  // Funnel events (aktivering/konvertering)
  logFunnelEvent, getFunnelStats, getRecentFunnelEvents, backfillRegisterEvents,
  // Block audio (TTS/inspelat per block)
  upsertBlockAudio, getBlockAudio, listBlockAudios, deleteBlockAudio,
  // Session store
  sessionGet, sessionSet, sessionDestroy, sessionCleanupExpired,
  // Stripe idempotency
  isStripeEventProcessed, markStripeEventProcessed, cleanupOldStripeEvents,
  // Admin notes
  getAdminNotesForUser, addAdminNote, deleteAdminNote,
  // Admin audit log
  logAdminAction, getAuditLog, getAuditActionTypes, cleanupOldAuditLog,
  // Pro-tier
  createProCallAnalysis, updateProCallAnalysis, getProCallAnalysis,
  getProCallAnalysesForUser, countProCallAnalysesThisMonth,
  canProUserUploadCall, deleteProCallAnalysis,
  PRO_CALL_LIMIT_PER_MONTH,
  // Referral
  getOrCreateReferralCode, findUserByReferralCode, setReferrerForUser, getReferralStats,
  grantReferralCreditIfEligible, markReferralCreditsRedeemed, getUsersWithPendingReferralCredits,
  // Pro-trial
  setProTrialEndAt, clearProTrial, markProTrialReminderSent, getUsersWithTrialEndingSoon,
  // CI (Conversation Intelligence) — bulk call-analytics
  createCallJob, updateCallJob, claimNextPendingCallJob,
  getCallJob, getCallJobFull, listCallJobs, getCallJobStats,
  saveCallTranscript, saveCallAnalysis, saveCallWordFrequencies,
  searchCallTranscripts, deleteCallJob, resetStuckCallJobs,
  // CI prompt-iteration
  getCallTranscript, listCallAnalysisRuns, getCallAnalysisRun,
  updateStructuredTranscript,
  // CI Resultatmaskin (outcome + aggregation)
  setCallOutcome, setCallSalesperson, listSalespeople,
  getOutcomeStats, getWinningLosingPhrases, ALLOWED_OUTCOMES,
  // CI Fas 3 (säljare-dashboards)
  getSalespeopleOverview, getSalespersonDashboard,
  // CI Fas 3 (invändningsregister)
  saveCallObjections, getCallObjections, getObjectionsRegister,
};
