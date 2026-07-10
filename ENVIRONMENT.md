# ENVIRONMENT.md

Every environment variable, whether it is required, and how it is handled. Generated from the
production-readiness audit (see [REPO_AUDIT.md](REPO_AUDIT.md)). Never commit real secrets — set
these in the Railway dashboard; keep the `.env` file out of git (already in .gitignore).

## Environment Variable Configuration Audit

Scope: every `process.env.*` reference in `server.js`, `database.js`, and `services/*.js`. All variable names use the bracket form (`process.env['STRIPE_SECRET_KEY']`) or dot form interchangeably in this codebase; both are folded together below.

### Full reference table

| VAR | Required? | Used for | Default / fallback | Risk |
|---|---|---|---|---|
| `PORT` | No | HTTP listen port | `3000` (`server.js:147`) | None. Railway injects it. |
| `NODE_ENV` | Effectively yes in prod | Prod-mode gating: static cache, secure cookies, admin-seed behaviour, prod security warnings | Falsey (dev) — but `RAILWAY_ENVIRONMENT` also flips prod mode (`server.js:565,668`) | Medium. If neither `NODE_ENV=production` nor `RAILWAY_ENVIRONMENT` is set, the app silently runs in dev mode: insecure cookies, dev admin seed path, and the entire prod-warnings block (`server.js:5228`) is skipped. |
| `RAILWAY_ENVIRONMENT` | No (platform-set) | Alternative prod-mode trigger alongside `NODE_ENV` | unset (`server.js:565,658,668`) | Low. Provided by Railway; acts as a safety net for `NODE_ENV`. |
| `SESSION_SECRET` | **YES (prod)** | express-session signing key; also HMAC key for public cert tokens | **`'change-in-production'`** (`server.js:704`) | **CRITICAL.** Insecure hardcoded default. If unset, sessions are signable by anyone who knows the constant → full session forgery. Startup only *warns* (`server.js:5230`), it does not refuse to boot. |
| `CERT_SECRET` | No | Secondary fallback for cert-token HMAC | falls back to `SESSION_SECRET`, then **`'dev-fallback'`** (`server.js:2699`) | **HIGH.** `getCertSecret()` returns `'dev-fallback'` if *both* `SESSION_SECRET` and `CERT_SECRET` are unset. Public certificate tokens become forgeable. No boot guard. |
| `STRIPE_SECRET_KEY` | **YES (prod)** | Stripe client init | **`''`** → `Stripe('')` (`server.js:148`) | **HIGH (fragile).** `Stripe(process.env['STRIPE_SECRET_KEY'] || '')` never throws at construction — the client is built with an empty key and only fails later at the first API call. Boot succeeds silently; payments are dead. Only a startup warning (`server.js:5232`). |
| `STRIPE_WEBHOOK_SECRET` | **YES (prod)** | Verifying Stripe webhook signatures (`stripe.webhooks.constructEvent`) | none — read raw at `server.js:342` | **HIGH.** If unset, `constructEvent` throws and every webhook is rejected → no user is ever upgraded after paying. Fails closed (good) but silently breaks the upgrade flow. Warned at `server.js:5242`; an admin alert fires on rejected webhooks (`server.js:351`). |
| `STRIPE_PRICE_ID` | **YES (prod)** | Default (premium) checkout price | none (`server.js:4551`) | **HIGH.** Undefined price → Stripe checkout session creation fails. Warned at `server.js:5234`. |
| `STRIPE_PRICE_ID_PRO` | Conditional | Pro-tier checkout price; also tier detection in webhook | none (`server.js:516,4550`) | Medium. Required only if the Pro tier is sold. At `server.js:516`, `priceId === process.env.STRIPE_PRICE_ID_PRO` — if the env is `undefined` and `priceId` is also somehow undefined this could misclassify, but in practice `priceId` comes from Stripe. Not in the prod-warnings block, so a missing Pro price is silent. |
| `GROQ_API_KEY` | **YES (prod)** | OpenAI-client init for Jocke AI coach; call-queue analysis; objection extraction; Whisper transcription | none — passed directly to `new OpenAI({apiKey})` (`server.js:291`); also `callQueue.js:50,73` | Medium. `new OpenAI({apiKey: undefined})` does not crash at boot; AI features fail at call time. There *is* a guard: chat routes check `if (!process.env.GROQ_API_KEY)` (`server.js:2162`) and return gracefully. Warned at `server.js:5236`. |
| `RESEND_API_KEY` | Recommended (prod) | Resend email client init | **client = `null`** if unset (`server.js:149`) | Medium. `resend = ... ? new Resend(key) : null` — clean null-guard. All callers must null-check; `server.js:2625` and `4157` do. If unset, all transactional email (password reset, welcome, receipts) silently no-ops. Warned at `server.js:5240`. |
| `TURNSTILE_SECRET_KEY` | Recommended (prod) | Cloudflare Turnstile CAPTCHA verification on `/register` | none — presence-gated (`server.js:1293`) | Medium. **If unset, CAPTCHA is skipped entirely** (`if (turnstileSecret) {...}`) → registration is unprotected against bots. When set, it fails *closed* on Turnstile downtime (`server.js:1310-1317`), which is correct. Warned at `server.js:5238`. |
| `APP_URL` | Recommended (prod) | Absolute base URL for password-reset links, checkout redirects, cron callbacks | falls back to `` `${req.protocol}://${req.get('host')}` `` at ~12 sites (`server.js:2289,2334,...,5008`); one hardcoded fallback `'https://manapp-production.up.railway.app'` at `server.js:5284` | Medium. Request-host fallback is spoofable via `Host` header → password-reset links could be poisoned to an attacker domain. The trial-reminder job (`5284`) hardcodes a Railway URL, so if the domain changes those emails link to the wrong host. Warned at `server.js:5244`. |
| `CRON_SECRET` | Recommended | Bearer/secret gate on cron-triggered routes | none (`server.js:2329,2465`) | Medium. If unset, `cronSecret` is `undefined`; depending on the comparison the cron endpoints may be unguarded. Reported in health check (`server.js:5110`). Not in the prod-warnings block. |
| `OWNER_NOTIFICATION_EMAIL` | No | Adds an address to owner-notification recipient set | unset → not added (`server.js:211`) | Low. `.trim().toLowerCase()` is guarded by the `if`, so no crash on missing. |
| `COACH_MODE` | No | Feature flag for the staged roleplay-evaluation feature | `''` → false (`server.js:245`) | Low. Regex-parsed truthy check; safe default off. This gates the uncommitted `/utvardera`+`/resultat` work. |
| `EARLY_BIRD_END_DATE` | No | Early-bird pricing campaign end date | unset → campaign inactive (`server.js:270`); invalid date also → inactive (`server.js:273`) | Low. Well-guarded (`isNaN` check). |
| `TRIAL_DAYS_PRO` | No | Trial length for Pro checkout | `'0'` via `parseInt(... || '0')` (`server.js:4546`) | Low. Safe default. |
| `TRIAL_REMINDER_HOURS` | No | Trial-reminder job threshold | `'12'` (`server.js:5278`) | Low. Safe. |
| `ADMIN_ALERT_WEBHOOK_URL` | No | `notifyAdmin` push-alert webhook | `''` (`alerting.js:28`); presence-gated everywhere (`server.js:3557,5221`) | Low. If unset, alerts fall back to logs only (`server.js:5224`). Clean degradation. |
| `APP_NAME` | No | Alert message app name | `'Joakim Jaksens Säljutbildning'` (`alerting.js:29`) | None. |
| `ADMIN_ALERT_MIN_LEVEL` | No | Minimum severity for alerts | `'warning'` (`alerting.js:30`) | Low. |
| `CI_ALLOWED_USER_IDS` | No | Grant `/admin/calls` to non-admin test users | `''` → empty set = admin-only (default-safe) (`server.js:1074`) | Low. Explicitly default-secure; parses/validates ints. |
| `CI_POLL_MS` | No | Call-queue poll interval | `'5000'` (`callQueue.js:22`) | Low. |
| `CI_LOCAL_AUDIO_PATH` | No | Local fallback dir for call audio | `uploads/calls` (`callStorage.js:29`) | Low. |
| `CI_ACTIVE_PROMPT` | No | Active feedback-prompt version id | `'tempo'` (`prompts/feedback.js:351`) | Low. |
| `TRANSCRIBE_BACKEND` | No | Selects transcription provider | `'groq'` (`transcribe.js:59`) | Low. **Good pattern:** an unknown value *throws* rather than silently falling back (`transcribe.js:67-68`), preventing "wrong provider" surprises. |
| `DB_PATH` | No | SQLite file path (sql.js persistence) | `./users.db` (`database.js:10`, `dbBackup.js:55`) | Medium. On Railway, must point at a mounted volume or the DB is on ephemeral disk and lost on redeploy. No boot check. |
| `ADMIN_SEED_PASSWORD` | Recommended (first prod boot) | Password for the initial seeded admin user | In prod: random generated + logged once (`database.js:546`); in dev: `'123456'` (`database.js:550`) | Medium. The **old** insecure `admin/123456` default is now dev-only; prod generates a random password logged *once loudly* to Railway logs. Risk shifts to log exposure of that one-time password. |
| `ADMIN_RESET_PASSWORD` | No | Emergency admin password rotation on boot | unset → no reset (`database.js:599`) | Medium (operational). If left set across deploys, the admin password is force-reset every boot and sessions invalidated. Code even logs "Remove it now!" (`database.js:604`). |
| `R2_ACCOUNT_ID` | Conditional | Cloudflare R2 credentials for DB backup + call/audio storage | `''` (`dbBackup.js:50`, `callStorage.js:24`, `audioStorage.js:18`) | Medium. All four R2 vars default to `''`. Presence is checked as a group (`server.js:5108`, `5137`) — if incomplete, R2 backup/upload silently disabled and data lives only on the local (ephemeral) disk. No warning in the prod-warnings block. |
| `R2_ACCESS_KEY_ID` | Conditional | R2 auth | `''` (same files) | Medium (same as above). |
| `R2_SECRET_ACCESS_KEY` | Conditional | R2 auth (secret) | `''` (same files) | Medium. Secret defaults to empty; no insecure literal, but silent-disable is the failure mode. |
| `R2_BUCKET` | Conditional | R2 bucket name | `''` (same files) | Medium. Part of the group gate for backup being active. |

### Fragile-handling call-outs

1. **`Stripe(process.env['STRIPE_SECRET_KEY'] || '')` — `server.js:148`.** The `|| ''` guarantees the Stripe client constructs successfully even with no key. Boot is green, health looks partly OK, and the failure only surfaces on the first payment attempt. This masks a misconfiguration that should be loud.

2. **`SESSION_SECRET` fallback to `'change-in-production'` — `server.js:704`.** A hardcoded, publicly-known signing secret. Anyone can forge session cookies if this env is missing. The app boots anyway; the prod block only pushes a *warning* to logs (`server.js:5230`), never aborts.

3. **`CERT_SECRET` → `'dev-fallback'` — `server.js:2699`.** `getCertSecret()` chains `SESSION_SECRET || CERT_SECRET || 'dev-fallback'`. Two independent misses land on a guessable literal, making public certificate/verification tokens forgeable. No guard anywhere.

4. **`ADMIN_SEED_PASSWORD` dev default `'123456'` — `database.js:550`.** Only reachable when `NODE_ENV !== 'production'`. Because prod-mode also depends on `RAILWAY_ENVIRONMENT`, a deploy that sets *neither* env would take the dev branch and seed `admin/123456` in a live environment. There is a runtime detector (`database.js:586`) that logs a KRITISKT warning if the admin still hashes to `123456`, which partially mitigates this.

5. **`APP_URL` request-host fallback — 12 sites, e.g. `server.js:2289`.** Falling back to `req.get('host')` for password-reset and checkout URLs is Host-header-spoofable. Combined with the hardcoded `manapp-production.up.railway.app` in the trial-reminder job (`server.js:5284`), URL generation is inconsistent and partially attacker-influenced when `APP_URL` is unset.

6. **`TURNSTILE_SECRET_KEY` presence-gates CAPTCHA — `server.js:1293`.** Missing key = CAPTCHA entirely bypassed on `/register`, leaving registration open to bots. Notably, *when configured* it fails closed on Turnstile downtime (`server.js:1310`), which is the correct direction — the risk is purely the unset case.

**No module-load throw-on-missing exists.** Every secret is read with a `|| ''`, `|| default`, or presence-gate, so **no missing variable blocks boot**. This is a double-edged design: the server never crash-loops on misconfig, but it will happily serve production traffic with forgeable sessions, dead payments, and disabled backups, surfacing problems only as runtime warnings in the Railway log (`server.js:5228-5251`) that a human must notice.

### Clean summary

**REQUIRED for a correct production deploy** (app boots without them but is broken/insecure):
- `SESSION_SECRET` — else forgeable sessions (insecure literal default)
- `STRIPE_SECRET_KEY` — else payments dead (empty-key client)
- `STRIPE_WEBHOOK_SECRET` — else no post-payment upgrades
- `STRIPE_PRICE_ID` — else checkout fails
- `GROQ_API_KEY` — else the Jocke AI coach (the core product) is dead
- `APP_URL` — else spoofable/wrong password-reset & checkout links
- `NODE_ENV=production` (or Railway's `RAILWAY_ENVIRONMENT`) — else the whole prod-hardening path is skipped
- `DB_PATH` pointing at a persistent volume — else data loss on redeploy (no default guard for ephemerality)

**REQUIRED if the corresponding feature is used:**
- `STRIPE_PRICE_ID_PRO` (Pro tier), `TURNSTILE_SECRET_KEY` (bot protection — strongly recommended), `RESEND_API_KEY` (any transactional email), `R2_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` + `R2_BUCKET` (all four, for DB backup & call/audio storage), `CRON_SECRET` (to protect cron endpoints), `CERT_SECRET` (only if not relying on `SESSION_SECRET` for cert tokens).

**OPTIONAL / safe defaults:**
- `PORT`, `OWNER_NOTIFICATION_EMAIL`, `COACH_MODE`, `EARLY_BIRD_END_DATE`, `TRIAL_DAYS_PRO`, `TRIAL_REMINDER_HOURS`, `ADMIN_ALERT_WEBHOOK_URL`, `APP_NAME`, `ADMIN_ALERT_MIN_LEVEL`, `CI_ALLOWED_USER_IDS`, `CI_POLL_MS`, `CI_LOCAL_AUDIO_PATH`, `CI_ACTIVE_PROMPT`, `TRANSCRIBE_BACKEND`, `ADMIN_SEED_PASSWORD` (recommended on first boot), `ADMIN_RESET_PASSWORD` (transient — remove after use), `RAILWAY_ENVIRONMENT` (platform-set).

Relevant files: `C:\Users\joaki\Documents\manapp\server.js`, `C:\Users\joaki\Documents\manapp\database.js`, `C:\Users\joaki\Documents\manapp\services\alerting.js`, `C:\Users\joaki\Documents\manapp\services\dbBackup.js`, `C:\Users\joaki\Documents\manapp\services\callStorage.js`, `C:\Users\joaki\Documents\manapp\services\audioStorage.js`, `C:\Users\joaki\Documents\manapp\services\callQueue.js`, `C:\Users\joaki\Documents\manapp\services\transcribe.js`, `C:\Users\joaki\Documents\manapp\services\prompts\feedback.js`.
