# DEPLOYMENT.md

How this app is built, deployed, and kept alive on Railway behind Cloudflare. Generated from the
production-readiness audit (see [REPO_AUDIT.md](REPO_AUDIT.md)).

## Deployment & Operations

### How it builds and starts

- **No build step.** `package.json:6-10` defines only `start` (`node server.js`), `dev` (`node --watch server.js`), and `test` (`node --test`). There is no bundler, transpiler, or asset pipeline — Express serves `server.js` (~5,400 lines) directly. "Typecheck" is `node --check` only (no TS, no eslint/prettier config in repo).
- **Entry point:** `server.js` → `startServer()` (`server.js:5209`, invoked at `5480`). It `await initDatabase()` first, runs a backfill + prod-env warnings, registers ~10 `setInterval` cron jobs, then `app.listen(PORT)` at `server.js:5477`.
- **Two conflicting build definitions exist in the repo root — this is a real ambiguity to resolve:**
  - `railpack.json` (`{"build":{"secrets":[]}}`) signals Railway's **Railpack** builder. Railpack auto-detects Node, runs `npm ci`/`npm install`, and uses the `start` script. With this file present, Railway will normally use Railpack and **ignore the Dockerfile**.
  - `Dockerfile` uses `FROM node:22-alpine`, `npm ci --omit=dev`, `EXPOSE 3000`, `CMD ["npm","start"]`. This only takes effect if the Railway service builder is explicitly set to "Dockerfile."
  - **Action:** confirm in the Railway service settings which builder is active. The two paths pin **different Node versions** (Railpack default vs. Docker's Node 22) and different install flags, so "works on my deploy" depends on which one Railway actually picked.

### Node engine

- `package.json:11-13` declares `"engines": { "node": ">=18.0.0" }` — a floor, not a pin. There is **no `.nvmrc` or `.node-version`** (confirmed absent). The Dockerfile hardcodes Node 22; Railpack would pick its own default (likely 20/22). This is an unpinned-runtime risk: a Railway builder default bump can change the Node minor without a code change.

### Railway assumptions baked into the code

- `app.set('trust proxy', 1)` (`server.js:534`) — assumes exactly one proxy hop (Railway's router / Cloudflare). Required for `secure` cookies and correct client IP in rate limiters (`ipKeyGenerator`).
- `isProd` / `isProdEnv` are true when `NODE_ENV==='production'` **or** `RAILWAY_ENVIRONMENT` is set (`server.js:565,668`). So on Railway the app flips to production behavior (secure cookies, HSTS, 30-day static cache, `upgradeInsecureRequests`) **even if `NODE_ENV` is unset** — Railway injects `RAILWAY_ENVIRONMENT` automatically.
- Fallback base URLs hardcode `https://manapp-production.up.railway.app` (`server.js:1397, 5284`) and `https://app.joakimjaksen.se` (`1493`) when `APP_URL` is missing — used for Stripe redirects and email links. If `APP_URL` is unset these can send users to the wrong host.
- Graceful shutdown (`server.js:5420-5456`) is tuned to Railway's SIGTERM-then-30s-SIGKILL redeploy behavior: `server.close()` + `flushAnalytics()`, with a `GRACEFUL_TIMEOUT_MS = 25000` force-exit margin under Railway's 30s deadline.

### Cloudflare in front

- `www.joakimjaksen.se → 301 → joakimjaksen.se` is enforced in-app (`server.js:540-545`) via `req.hostname`, which relies on `trust proxy` + Cloudflare forwarding the Host header.
- **Favicon:** no `.ico` file is shipped; `/favicon.ico` returns `204 No Content` (`server.js:549`) and the real icon is inline SVG in the `<head>`. Cloudflare will cache the 204.
- **CSP** (`server.js:566-593`) whitelists `challenges.cloudflare.com` (Turnstile), Stripe, and YouTube; `crossOriginResourcePolicy: 'same-site'`; HSTS `max-age=31536000; includeSubDomains` in prod. These must stay compatible with Cloudflare's proxy (Cloudflare should be in "Full (strict)" TLS; HSTS is emitted by the app, so don't double-configure conflicting HSTS at the Cloudflare edge).
- **100 MB body limit:** Pro call uploads are capped in `multer` at `100 * 1024 * 1024` (`server.js:58-60`). Cloudflare's Free/Pro plans cap request body at **100 MB** — the app limit sits exactly at that ceiling, so a maximal-size upload can be rejected by Cloudflare (413) *before* reaching the app. Set the multer limit slightly **below** the active Cloudflare plan limit, or route uploads to a subdomain / direct-to-R2 to avoid the edge cap.
- Cache-busting: `app.locals.assetVersion = Date.now().toString(36)` at boot (`server.js:235`) — every deploy changes the querystring on assets, so Cloudflare/browser 30-day caches don't serve stale CSS/JS.

### Static file serving & caching

- `express.static('public', …)` (`server.js:661-665`) with `maxAge = STATIC_MAX_AGE * 1000`, `etag: true`, `lastModified: true`.
- `STATIC_MAX_AGE` is **30 days** in prod (`NODE_ENV=production` OR `RAILWAY_ENVIRONMENT`) and **0** in dev (`server.js:658-660`). Safe because of the per-deploy `assetVersion` querystring.
- `compression()` (`server.js:602-610`) gzips text assets, `threshold: 1024`, and explicitly skips already-compressed types (pdf/zip/jpeg/png/mp3/mp4/…). Note the static route is registered **after** the dynamic `/sitemap.xml` route (`server.js:617`) so the dynamic sitemap wins over any file in `public/`.

### `/health` endpoint

- `GET /health` (`server.js:5084-5148`). Shallow by default: returns `{status:'ok', ts, uptime}` instantly for non-admins — this is what Railway's healthcheck should hit (Railway's 30s healthcheck deadline is noted at `5083`).
- Admins get service-config booleans; `?deep=1` (admin only) additionally does a DB read, email-queue depth, R2-config check, and memory stats, and can flip `status:'degraded'`.
- **Recommended Railway config:** healthcheck path `/health`. It never touches the DB for anonymous callers, so it stays green even under DB load.

### PORT handling

- `const PORT = process.env.PORT || 3000` (`server.js:147`); `app.listen(PORT)` (`5477`). Railway injects `PORT` — the code respects it. Dockerfile `EXPOSE 3000` is cosmetic; the actual bind follows the env var.

### Database persistence — HIGHEST-RISK AREA

**Architecture:** `sql.js` is pure in-memory SQLite. The entire DB lives in RAM and is serialized to a **single file** on every write.

- Path: `DB_PATH = process.env.DB_PATH || path.join(__dirname, 'users.db')` (`database.js:10`). The parent dir is auto-created (`database.js:13-16`), which is what makes `/data/users.db` work.
- Load on boot: `db = new SQL.Database(fs.readFileSync(DB_PATH))` if the file exists, else a fresh empty DB (`database.js:25-29`).
- Persist: `saveDb()` does `fs.writeFileSync(DB_PATH, db.export())` — a **full-file rewrite** — and is called after essentially every mutation (**72 call sites** in `database.js`). It swallows errors (`database.js:610-618`), logging `CRITICAL: Failed to persist database to disk` but not throwing, so a failed write can silently lose the just-made change.
- **This file MUST live on a Railway persistent volume.** Railway's container filesystem is **ephemeral** — it is wiped on every redeploy/restart. If `DB_PATH` points at the default `./users.db` (inside the app dir on ephemeral disk), **every deploy resets the database to empty** → total loss of users, subscriptions, progress, and sessions (the session store is the same sql.js DB — see `SqlJsSessionStore`, `server.js:670-714`, so a wipe also logs everyone out).
  - **Required:** attach a Railway Volume (e.g. mounted at `/data`) and set `DB_PATH=/data/users.db`. This exact value is what `.env.example:7` documents ("On Railway, set to /data/users.db for persistence").
  - **Verify at runtime:** confirm the volume mount path equals `dirname(DB_PATH)`. A mismatch (volume at `/data` but `DB_PATH=./users.db`) silently reverts to ephemeral behavior with no error.
- **Local backups are also on the same disk** and therefore *don't* survive a volume-less deploy: `rotateDbBackups()` writes `users.db.backup.1/.2/.3` next to `DB_PATH` on 6-hour rotation (`database.js:633-649`, scheduled `server.js:5323-5324`). They protect against file corruption, **not** against ephemeral-disk loss.
- **Offsite backup (the real disaster-recovery layer):** `services/dbBackup.js` uploads `users.db` to Cloudflare R2 daily (`db-backups/YYYY-MM-DD.db` + `latest.db`, 90-day retention), started 5 min after boot then every 24h (`server.js:5373-5396`). It only runs if **all four** R2 env vars are set (`isR2Enabled`, `dbBackup.js:60-62`); otherwise it logs `⚠️ R2 not configured — offsite DB-backups disabled`. RPO ≈ 24h, RTO ≈ 5 min via the manual `aws s3 cp latest.db` procedure documented at `dbBackup.js:15-45`. **No auto-restore on boot** — recovery is manual.
- **Uploaded call audio has the same ephemeral trap:** `services/callStorage.js` uses R2 in prod but **falls back to local disk `./uploads/calls/`** when R2 env is absent (`callStorage.js:5-9, 29, 35-37`). `uploads/` is gitignored and on ephemeral disk, so without R2 every redeploy also drops Pro users' uploaded recordings. Generated PDF/EPUB books are cached in R2 too (`server.js:3588-3722`).

### Required env for a successful boot

The process **boots and listens even with everything unset** (keys default to `''` or `null`), but features silently degrade. Prod startup emits warnings for missing vars (`server.js:5228-5251`) without aborting. Practical "healthy prod" set:

**Must-have for correct prod operation**
- `DB_PATH=/data/users.db` — **and a matching Railway Volume** (data-loss guard; see above).
- `SESSION_SECRET` — a random 32-byte hex. Default `'change-in-production'` makes sessions forgeable and is explicitly warned about (`server.js:5230-5231`, default at `704`).
- `NODE_ENV=production` — recommended even though `RAILWAY_ENVIRONMENT` already flips prod behavior; keeps intent explicit.
- `APP_URL=https://app.joakimjaksen.se` — email links + Stripe redirects; otherwise falls back to hardcoded hosts / request host (`server.js:1397, 1493, 2289…`).
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` — payments + upgrades. A missing/incorrect webhook secret means **every webhook is rejected and no one gets upgraded** — the code fires a `critical` admin alert on signature failure (`server.js:348-355`) and warns at boot (`5242-5243`).
- `GROQ_API_KEY` — the Jocke AI coach (OpenAI client pointed at `api.groq.com`, `server.js:290-293`). Also used by Whisper transcription for call analysis.
- `RESEND_API_KEY` (+ recommended `RESEND_FROM=Joakim Jaksen <noreply@mail.joakimjaksen.se>`, per the note at `server.js:152-164`) — transactional email. Without it, mail is silently queued, never sent (`sendEmailReliable`, `server.js:173-193`).
- `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` — registration CAPTCHA; without them CAPTCHA is disabled.

**Strongly recommended (backup + observability)**
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — offsite DB backups, call-audio storage, and book caching. **Without these you have no disaster recovery** beyond same-disk copies.
- `ADMIN_ALERT_WEBHOOK_URL` — routes `critical`/`warning` alerts (webhook failures, all-email-failing, uncaughtException) off Railway logs into push alerts (`server.js:5221-5225`). Without it, critical events only land in Railway logs.

**Optional / operational**
- `OWNER_NOTIFICATION_EMAIL` (extra owner-notify address), `EARLY_BIRD_END_DATE` (pricing countdown, auto-expires), `TRIAL_REMINDER_HOURS` (default 12), `CRON_SECRET` (external cron auth), `CI_LOCAL_AUDIO_PATH`.
- `ADMIN_RESET_PASSWORD` — **emergency-only.** On boot it resets the `admin` account password and bumps `pw_version` (`database.js:597-605`). Set it, deploy, then **remove it immediately** (the code logs "Remove it now!").

### First-deploy steps

1. Create the Railway service from GitHub repo `TheDarkitecht/manapp` (branch `main`). `node_modules/`, `users.db`, `.env`, `uploads/` are all gitignored (confirmed), so the build installs deps fresh.
2. Decide and lock the builder: either keep `railpack.json` (Railpack) or set the service to Dockerfile — don't leave it ambiguous.
3. **Create a Railway Volume and mount it at `/data`.** Set `DB_PATH=/data/users.db`. Do this *before* the first real traffic so the DB is born on persistent storage.
4. Set all env vars from the "Must-have" list, plus R2 + alerting. Generate `SESSION_SECRET` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (per `.env.example:10`).
5. Set the Railway healthcheck path to `/health`.
6. Point Cloudflare DNS (proxied) at the Railway domain; keep TLS "Full (strict)". Confirm the 100 MB edge body limit vs. the app's upload cap.
7. First boot creates schema + an `admin` user (schema/migrations run inside `initDatabase`). Watch logs for the prod-warning block (`server.js:5247`) — it should be empty; any `•` lines are missing env.
8. Hit `/health` (expect `{status:"ok"}`) and, as admin, `/health?deep=1` to confirm DB + email-queue + R2 all green.

### How data survives deploys (summary)

- **In-DB data & sessions:** survive **only** because `DB_PATH` points at a mounted Railway Volume. Written synchronously on every mutation via `saveDb()`. No volume ⇒ wiped on every deploy.
- **Corruption protection:** 3 rotating same-disk copies (`.backup.1/2/3`, 6h apart, ~18h window).
- **Disaster recovery:** daily R2 snapshot + `latest.db`, 90-day retention, manual restore (`services/dbBackup.js`). RPO 24h / RTO ~5 min.
- **Call audio / generated books:** in R2 when configured; otherwise on ephemeral `./uploads/` (lost on redeploy).

### Health check

- Railway healthcheck → `GET /health` (shallow, DB-free, instant). Deep diagnostics via `GET /health?deep=1` as an authenticated admin.

### Rollback

- **Code:** Railway "Redeploy previous deployment" (or redeploy a prior Git SHA). Because the DB lives on the persistent Volume, a code rollback does **not** touch data — safe.
- **Data:** restore from R2 per `services/dbBackup.js:15-45` — `aws s3 cp s3://$R2_BUCKET/db-backups/latest.db ./users.db --endpoint-url=https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com`, copy onto the Volume at `/data/users.db`, restart. All sessions are invalidated (same DB), so users re-login. For point-in-time, use a dated `db-backups/YYYY-MM-DD.db`. Local `.backup.1/2/3` are the fast path if only corruption (not disk loss) occurred.
- **Schema migrations** are additive `CREATE TABLE IF NOT EXISTS` / `ALTER` style (idempotent, run every boot) — there is no down-migration tooling, so a rollback that removes a column is not automated. Rolling code back is generally safe because older code ignores newer columns.

### Known operational risks

1. **Ephemeral-disk data loss (critical).** If `DB_PATH` isn't on a mounted Volume, every redeploy silently resets the entire database (users, subscriptions, progress, sessions). This is the single highest-impact risk. Verify the Volume mount path equals `dirname(DB_PATH)`.
2. **Builder ambiguity.** `railpack.json` and `Dockerfile` coexist; they pin different Node versions/install flags. Whichever Railway actually uses is not self-evident from the repo.
3. **Unpinned Node.** `engines` is a `>=18` floor with no `.nvmrc`; a builder-default bump can change the runtime without a commit.
4. **Full-file DB write on every mutation.** `saveDb()` serializes and rewrites the whole SQLite file synchronously per write (`database.js:610-613`) — fine at current scale but O(db-size) per write; it will become a latency/CPU bottleneck as the DB grows, and a crash mid-`writeFileSync` can corrupt the single file (mitigated only by the 6h rotating copies).
5. **Silent persistence failures.** `saveDb()` catches and logs but doesn't throw (`database.js:614-617`); a full disk or permission issue on the Volume loses writes while the request returns success. Watch logs for `CRITICAL: Failed to persist`.
6. **Single-instance only.** In-process sql.js means horizontal scaling is impossible — two Railway replicas would each hold a divergent in-memory DB and clobber each other's file writes. Keep replica count at 1.
7. **100 MB upload at the Cloudflare ceiling.** Max-size Pro uploads can be edge-rejected (413) before hitting multer (`server.js:60`).
8. **Backup gaps if R2 unset.** No `R2_*` ⇒ no offsite DB backup and call audio on ephemeral disk. Combined with risk #1, a redeploy could be unrecoverable.
9. **Missing deployment docs.** There is **no `DEPLOYMENT.md`, `README.md`, `railway.toml`, or `.dockerignore`** in the repo. The only deploy documentation is `.env.example` and the recovery comment block in `services/dbBackup.js`. Operational knowledge (Volume requirement, builder choice, healthcheck path, rollback) is not written down — this section is intended to fill that gap. Ancillary `.md` files exist (`HANDOVER_TILL_NY_DATOR.md`, `STATE.md`, `FINAL-REPORT.md`) but are handover/status notes, not deploy runbooks.

### Staged-but-not-deployed (context, not part of prod)

A COACH_MODE roleplay-evaluation feature is present in the tree but gated off by default: `coachEvaluation.js`, `roleplayTurnAuth.js`, the `/utvardera` + `/resultat` routes, and a `roleplay_evaluations` table. It activates only when `COACH_MODE` env is truthy (`server.js:245-246`); the flag defaults **off** and the tables/functions are additive and inert, so it has no effect on the production boot or data path until explicitly enabled. Rollback is "unset the env var." Treat it as not-yet-live for this audit.

---

Key evidence files (all absolute):
- `C:\Users\joaki\Documents\manapp\server.js` — boot/listen (5209, 5477), PORT (147), trust proxy (534), static+cache (658-665), health (5084-5148), CSP/HSTS (566-593), multer 100MB (58-60), backups scheduling (5323-5396), graceful shutdown (5420-5456), prod env warnings (5228-5251).
- `C:\Users\joaki\Documents\manapp\database.js` — DB_PATH + dir create (10-16), init/load (22-29), `saveDb` full-file write (610-618), rotating backups (633-649).
- `C:\Users\joaki\Documents\manapp\services\dbBackup.js` — R2 offsite backup + recovery runbook (whole file).
- `C:\Users\joaki\Documents\manapp\services\callStorage.js` — R2-or-ephemeral-disk audio storage (1-37).
- `C:\Users\joaki\Documents\manapp\.env.example`, `Dockerfile`, `railpack.json`, `.gitignore`, `package.json` — build/runtime config and the documented `/data/users.db` guidance.
