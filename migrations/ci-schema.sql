-- ═══════════════════════════════════════════════════════════════════════════
-- CONVERSATION INTELLIGENCE (CI) — schema documentation
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Detta är en DOKUMENTATIONSFIL. Den faktiska tabellskapandet sker i
-- database.js under initDatabase() för att hålla en enda migration-pipeline.
--
-- Syfte: CI bygger en bulk-analys-motor ovanpå befintlig Pro-tier
-- (pro_call_analyses). Skillnader:
--   - Pro = individuell säljare, 1 samtal i taget, synkron, ~15/månad per user.
--   - CI  = Joakims säljkontor, 1000 samtal/dag, async via DB-kö, admin-only
--           i Fas 1. Audio lagras i objekt-storage (Cloudflare R2) istället
--           för att strömmas inline.
--
-- Fas 1 innehåller endast råprocessering (transkribering + per-samtal-analys
-- + word frequency). Fas 2+ lägger till sentiment/outcome/aggregation som
-- egna tabeller (call_scores, call_phrases, etc) — se VISION i thread-briefing.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── call_jobs ──────────────────────────────────────────────────────────────
-- Ett jobb per uppladdad ljudfil. Statusmaskin driver hela pipelinen.
-- Status-flow: pending → transcribing → analyzing → done
--                                                 ↘ failed (vid fel)
CREATE TABLE IF NOT EXISTS call_jobs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL,             -- admin som laddade upp (audit)
  batch_id       TEXT,                          -- grupperar samtida uploads (ULID-like)
  original_name  TEXT NOT NULL,                 -- ursprungligt filnamn
  storage_key    TEXT,                          -- R2-nyckel / disk-path (callStorage.js)
  file_size      INTEGER,                       -- bytes
  mime_type      TEXT,
  title          TEXT,                          -- valfri etikett (default = original_name)
  status         TEXT NOT NULL DEFAULT 'pending',
  error          TEXT,                          -- felmeddelande (truncerat 500 tecken)
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  started_at     TEXT,                          -- worker plockade upp
  completed_at   TEXT,                          -- done/failed
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Worker-poll (status='pending', ORDER BY created_at ASC)
CREATE INDEX IF NOT EXISTS idx_call_jobs_status_created ON call_jobs(status, created_at);
-- Admin-dashboard per user
CREATE INDEX IF NOT EXISTS idx_call_jobs_user_created   ON call_jobs(user_id, created_at DESC);
-- Batch-gruppering
CREATE INDEX IF NOT EXISTS idx_call_jobs_batch          ON call_jobs(batch_id);


-- ─── call_transcripts ───────────────────────────────────────────────────────
-- 1:1 med call_jobs. Separerad för att:
--   a) Senare queryta fulltext utan att dra in analys-kolumner
--   b) Fas 2 kan ADD sentiment/segmentering i egen tabell utan att röra texten
CREATE TABLE IF NOT EXISTS call_transcripts (
  job_id         INTEGER PRIMARY KEY,
  text           TEXT NOT NULL,
  duration_sec   INTEGER,
  language       TEXT,
  word_count     INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES call_jobs(id)
);


-- ─── call_analyses ──────────────────────────────────────────────────────────
-- Jockes markdown-feedback per samtal. 1:1 med call_jobs.
-- Fas 2 lägger till call_scores (sentiment, satisfaction, turnaround) som
-- egen tabell, inte kolumner här — så vi kan re-scora historiska samtal med
-- nya modeller utan att skriva över originalanalysen.
CREATE TABLE IF NOT EXISTS call_analyses (
  job_id         INTEGER PRIMARY KEY,
  analysis       TEXT NOT NULL,
  model          TEXT,                          -- ex. 'llama-3.3-70b-versatile'
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES call_jobs(id)
);


-- ─── call_word_frequencies ──────────────────────────────────────────────────
-- Per-samtal top-N ord (filtrerade stoppord). Samlas aggregerat i Fas 3
-- (top-10%-samtal vs bottom-10%) för att hitta "winning phrases".
CREATE TABLE IF NOT EXISTS call_word_frequencies (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id         INTEGER NOT NULL,
  word           TEXT NOT NULL,
  count          INTEGER NOT NULL,
  FOREIGN KEY (job_id) REFERENCES call_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_call_wf_job        ON call_word_frequencies(job_id);
CREATE INDEX IF NOT EXISTS idx_call_wf_word_count ON call_word_frequencies(word, count DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- DESIGN-ANTECKNINGAR
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 1. Varför separata tabeller istället för en "fat" pro_call-liknande tabell?
--    - CI-data kommer växa från 1 samtal/dag (Pro) till 1000/dag. Full-row
--      reads (som för dashboard) ska inte dra in 50 kB transcript per rad.
--    - Fas 2+ lägger till många nya dimensioner (scores, phrases, outcomes).
--      Smal jobs-tabell gör dashboarden snabb.
--    - Framtida Postgres-migration: naturlig normaliserad form passar bättre.
--
-- 2. Varför inte storage_key = CDN-URL direkt?
--    - R2-bucketen är privat. callStorage.js genererar presigned URLs
--      on-demand (1 h giltighet) när admin klickar "spela upp" i UI.
--
-- 3. Varför inget deduplicerings-schema (hash av ljudfil)?
--    - 1000 samtal/dag har försumbar dubblettrisk. Fas 2 kan lägga till
--      sha256-kolumn om behov uppstår.
--
-- 4. sql.js-begränsning
--    - Nuvarande sql.js persisterar via full-fil-export vid varje saveDb().
--      Vid ~10 000 call_jobs-rader börjar det svaja (500+ ms per write).
--      Migration till better-sqlite3 eller Postgres är flaggad i thread-
--      briefing — schemat här är kompatibelt med båda.
