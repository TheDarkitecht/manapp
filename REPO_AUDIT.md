# REPO_AUDIT.md — Production-readiness audit

**Repo:** `manapp` (joakim-jaksen-saljutbildning) · **Date:** 2026-07-06 · **Method:** read-only
audit across 6 dimensions (routes, env, security, storage, code-health, deployment), verified
against the actual code with file:line evidence. Detailed sections follow the summary.

## Project purpose
Swedish online sales-training platform (**joakimjaksen.se**): ~23 course blocks, an AI sales
coach ("Jocke", Groq), text roleplay practice, a Pro call-analysis tool, and Stripe
subscriptions (Premium / Pro). Single-process server-rendered app.

## Stack (at a glance)
Node ≥18 · Express 4 · EJS (server-side, **no build step**) · `sql.js` (in-process SQLite → one
file) · `express-session` (persisted in the DB) · Stripe · Groq via `openai` SDK · Resend ·
`multer` · `helmet` + `express-rate-limit` + Cloudflare Turnstile · Railway behind Cloudflare.
No TypeScript, no bundler, no eslint/prettier. See [README.md](README.md).

## Overall assessment
**Healthier and more security-conscious than typical for a solo-built app of this size.**
Parameterized SQL throughout (no SQLi), CSRF on every state-changing POST, session
regeneration on login, broad per-route rate limiting, ownership-scoped queries (no IDOR
found), no hardcoded secrets, helmet + a hand-tuned CSP, and a non-leaking global error
handler. The real risks are **architectural/operational (data durability & scaling)** and
**maintainability (no shared view layout, two monolith files)** — not correctness bugs.

## Prioritized findings

### P0 — production/data risk (operational; mostly config + `database.js`)
1. **Single-instance data model.** The DB is an in-process `sql.js` buffer serialized to one
   file. The app **must run exactly one Railway instance** — horizontal scaling would give each
   instance its own divergent DB. Document + enforce (no autoscaling).
2. **`DB_PATH` must be a mounted volume.** Data lives at `$DB_PATH` (prod: `/data/users.db`). If
   that path is on Railway's **ephemeral** filesystem instead of a **persistent volume**, all
   users/progress/subscriptions are lost on every redeploy. Verify the volume mount. (Highest
   real-world risk.)
3. **`saveDb()` rewrites the entire DB file on every business write** (O(total size), synchronous,
   blocks the event loop). Fine now; degrades app-wide as Pro-call transcripts accumulate.
4. **Backups are fragile.** 3-slot rotation, ~18 h window, **all on the same volume** as the
   primary → a volume-loss/corruption event takes primary + all backups. Add an **off-box**
   backup (e.g. periodic upload of `users.db` to R2/S3).
5. **GDPR delete gap.** Account deletion (`database.js` `_deleteUserRows`) does **not** purge
   `roleplay_evaluations`, `funnel_events`, `call_jobs` + child `call_transcripts`/
   `call_analyses`/`call_objections`/`call_word_frequencies`. Transcripts (PII) survive deletion.
   Add these tables to the delete transaction.

### P1 — security (mostly narrow; one fixed this pass)
6. **[FIXED this pass] DOM-XSS in `views/pro-analysis.ejs`.** AI analysis text was markdown-
   rendered into `innerHTML` without escaping first. Now escapes HTML before markdown (mirrors
   the roleplay renderer). Was primarily self-XSS (user's own transcript → Groq), now closed.
7. **`highlightMatch` outputs unescaped** (`server.js:2899` + `views/sok.ejs`). Not exploitable
   today (author-controlled inputs, query not reflected) but a stored-XSS sink if user content
   is ever searched. Harden by escaping `text` before wrapping matches (as `learn-sok.ejs` does).
8. **Cron secret in query string + non-timing-safe compare** (`/cron/*`). Move to a header,
   compare with `crypto.timingSafeEqual`.
9. **Error-message leakage on Pro upload** (`server.js:4776` sends `err.message` to client).
   Return generic text, log detail server-side (as the global handler already does).
10. **Multer type filter is OR-based** (MIME **or** extension). Low impact (buffer only goes to
    Groq, never disk). Optionally require MIME match / magic-byte check.
11. **Admin broadcasts render raw HTML** to all users (`nyhet.ejs`). Authorized (admin-only) but
    a compromised admin could inject script. Consider allowlist-sanitizing broadcast HTML.

### P2 — maintainability / code health
12. **No shared view layout** — 43 EJS files each carry their own `<head>`/nav/footer, zero
    `include()`. Biggest maintainability drag; already causes meta/OG drift. Introduce
    `views/partials/{head,header,footer}.ejs` (pure EJS, no build step).
13. **Monoliths:** `server.js` ~5,400 lines, `database.js` ~3,800. Continue the `routes/calls.js`
    extraction pattern — split by domain (auth, billing, learn, admin, cron).
14. **Migrations swallow all errors** (`database.js:528` `try{…}catch(_){}`). Add a
    `schema_migrations` version table, or at least distinguish "column exists" from real errors.
15. **Duplicated login/register error boilerplate** (~12× `res.render('login', …)`). Extract a
    `renderLoginError()` helper.
16. **5 unfilled `TODO Joakim` methodology stubs** in `services/prompts/feedback.js` weaken the
    Jocke coaching prompt — fill or deactivate (`isActive:false`).
17. **Copy nit:** `salesContent.js:371` `"Har ni ISO-XXX?"` reads like a placeholder (it's
    narrative shorthand). Joakim's call — make it concrete (`ISO 9001`) or leave as-is.

## Quick wins (safe, high-value, small)
- [done] pro-analysis XSS escape · harden `highlightMatch` · move cron secret to header +
  timing-safe · generic Pro-upload error · `renderLoginError()` helper · fill/deactivate prompt
  stubs · add off-box DB backup.

## Larger improvements (plan, don't rush)
- Shared EJS layout · split `server.js`/`database.js` by domain · `schema_migrations` versioning ·
  consider a managed Postgres if data volume or the need to scale beyond one instance grows
  (removes the whole-file-rewrite and single-instance constraints).

## What was changed this pass
- **Fixed:** DOM-XSS in `views/pro-analysis.ejs` (escape-before-`innerHTML`).
- **Fixed earlier this session:** client-side upload validation on `/pro/samtal/ny` (size/format
  before upload → no more `ERR_CONNECTION_RESET` on oversized files).
- **Added docs:** `README.md`, `ENVIRONMENT.md`, `DEPLOYMENT.md`, `RUNBOOK.md`, `PROGRESS.md`,
  this file.
- **Not changed (documented instead):** all `server.js`/`database.js` fixes above — that file has
  an unrelated staged feature (`COACH_MODE`) in the working tree, so applying + committing them
  now would entangle/deploy un-greenlit work. They are ready-to-apply recommendations.

## Recommended next work (AFK prompt)
> "Apply the P0/P1 `database.js`+`server.js` audit fixes from REPO_AUDIT.md: (1) add
> `roleplay_evaluations`, `funnel_events`, and all `call_*` tables to the GDPR account-delete
> transaction; (2) move the `/cron/*` secret from query string to an `Authorization` header with
> `crypto.timingSafeEqual`; (3) make the Pro-upload catch return a generic error; (4) escape
> `text` in `highlightMatch`; (5) add a `renderLoginError()` helper. Then add an off-box backup
> job that uploads `users.db` to R2 every 6h. Keep each change small, run `node --check` + `npm
> test`, and verify the app still boots against a temp DB. Do not deploy `COACH_MODE`."

---

# Detailed sections
The following are the verified per-dimension audit reports.



<a id="routes"></a>

# HTTP Route Inventory — `server.js` (+ mounted `routes/calls.js`)

Total meaningful application routes: **105** — **93 declared directly in `server.js`** (excluding the 6 global infrastructure `app.use` middlewares at lines 540, 566, 596–597, 602, 661, 701, 717, 734, 1133 and the two terminal 404/500 handlers at 5153/5168), plus **22 sub-routes** in `routes/calls.js` mounted at `/admin/calls` (server.js:4805).

## Guard & middleware reference (as defined in this repo)

| Guard | Definition | Behavior |
|---|---|---|
| `requireLogin` | server.js:1033 | Redirects to `/login` if no `session.userId`; re-fetches user each request, destroys session on password-version mismatch, refreshes `session.role` from DB. |
| `requireAdmin` | server.js:1060 | 403 unless `session.role==='admin'` (or original admin during impersonation). |
| `requirePro` | server.js:4655 | Redirects to `/pro` unless `isProOrHigher(role)`. |
| `requireCIAccess` | server.js:1081 | Admin, or `session.userId` in `CI_ALLOWED_USER_IDS` env allowlist. |
| `requireAdminForDestructive` | server.js:1093 | Admin-only even for CI-allowlisted users (delete/retry on calls). |
| `isPremiumOrHigher(role)` | server.js:77 | In-handler check (not middleware) gating premium content. |
| `verifyCsrf` | server.js:867 | Rejects if `body._csrf`/`x-csrf-token` header ≠ `session.csrfToken`. |
| `blockWhenImpersonating` | server.js:1121 | 403 for destructive account/billing actions while impersonating. |
| Rate limiters | server.js:747–849, 3284, 4193 | `heartbeatLimiter`, `loginLimiter`, `registerLimiter`, `chatLimiter`, `quizLimiter`, `resetLimiter`, `noteLimiter`, `noteDeleteLimiter`, `deleteLimiter`, `passwordChangeLimiter`, `dataExportLimiter`, `broadcastLimiter`. |
| Cron secret | inline (2330, 2466) | `req.query.key === process.env.CRON_SECRET`, else 403. |
| Stripe signature | inline (346) | `stripe.webhooks.constructEvent(rawBody, sig, secret)`. |

## Public / marketing / static

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/` | Landing page | none (public) |
| GET `/favicon.ico` | 204 no-content | none |
| GET `/sitemap.xml` | SEO sitemap | none |
| GET `/terms` | Terms of service | none |
| GET `/integritetspolicy` | Privacy policy (SV) | none |
| GET `/privacy` | Privacy policy (redirect/alias) | none |
| GET `/foretag` | Company/contact page | none |
| GET `/priser`, `/pricing` | Pricing page (array route) | none |
| GET `/health` | Health/status JSON | none |
| GET `/bevis/:token` | Public certificate view by token | token in path (no login) |
| GET `/unsubscribe/:token` | Email unsubscribe by token | token in path (no login) |
| ALL (unmatched) | 404 error page | terminal `app.use` (5153) |
| ALL (thrown) | 500 error page | terminal error handler (5168) |

## Auth

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/login` | Login form | none |
| POST `/login` | Authenticate | `loginLimiter` |
| GET `/register` | Register form | none |
| POST `/register` | Create account (always `free`) | `registerLimiter` |
| GET `/logout` | Destroy session | none |
| GET `/forgot-password` | Request-reset form | none |
| POST `/forgot-password` | Send reset email | `resetLimiter`, `verifyCsrf` |
| GET `/reset-password/:token` | Reset form by token | token in path |
| POST `/reset-password/:token` | Commit new password | `verifyCsrf` |

⚠️ **`POST /login` (1214) and `POST /register` (1288) have no `verifyCsrf`.** This is the conventional exception (no session/token exists pre-auth) and both are rate-limited, so it is acceptable — noting it for completeness.

## Learning

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/dashboard` | User dashboard | `requireLogin` |
| GET `/learn` | Block index | `requireLogin` |
| GET `/learn/sok` | Search within learning | `requireLogin` |
| GET `/learn/:id` | Block detail (teaser if premium-locked) | `requireLogin` + in-handler `isPremiumOrHigher` |
| GET `/learn/:id/prov` | Block quiz | `requireLogin` |
| GET `/learn/:id/snabb` | Quick-review view | `requireLogin` |
| GET `/learn/:id/ova` | Roleplay practice list | `requireLogin` |
| GET `/learn/:id/ova/:rpid` | Single roleplay | `requireLogin` |
| GET `/learn/:id/uppdrag` | Mission view | `requireLogin` |
| GET `/learn/:id/reflektion` | Reflection view | `requireLogin` |
| POST `/learn/:id/uppdrag/start` | Start mission | `requireLogin`, `verifyCsrf` |
| POST `/learn/:id/uppdrag/progress` | Save mission progress | `requireLogin`, `verifyCsrf` |
| POST `/learn/:id/uppdrag/klar` | Complete mission | `requireLogin`, `verifyCsrf` |
| POST `/learn/:id/reflektion/spara` | Save reflection | `requireLogin`, `verifyCsrf` |
| POST `/learn/:id/ova/:rpid/klar` | Mark roleplay done | `requireLogin`, `verifyCsrf` |
| POST `/learn/:id/ova/:rpid/utvardera` | AI-evaluate roleplay (staged COACH_MODE) | `requireLogin`, `chatLimiter`, `verifyCsrf` + in-handler `isPremiumOrHigher` (2144) |
| GET `/learn/:id/ova/:rpid/resultat` | Roleplay result (staged) | `requireLogin` + in-handler premium check (2257) |
| POST `/quiz-result` | Submit quiz score | `requireLogin`, `quizLimiter`, `verifyCsrf` |
| GET `/sok` | Global search | `requireLogin` |
| GET `/ordbok` | Sales dictionary | `requireLogin` |
| GET `/nyheter`, `/nyheter/:id` | News/changelog | `requireLogin` |
| POST `/notes`, `/notes/:id/delete` | Personal notes CRUD | `requireLogin`, note limiters, `verifyCsrf` |
| POST `/heartbeat` | Page-duration telemetry | `heartbeatLimiter` only (soft session check inline) |

## Progress / logbook / content delivery

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/mina-framsteg` | Progress overview | `requireLogin` |
| GET `/mina-framsteg/bevis/:level` | Certificate page | `requireLogin` |
| GET `/mina-framsteg/bevis/:level.svg` | Certificate SVG render | `requireLogin` |
| GET `/mina-framsteg/bevis/:level/publik-url` | Public cert URL generator | `requireLogin` |
| GET `/loggbok` | Activity log | `requireLogin` |
| GET `/loggbok/export.csv` | Export log CSV | `requireLogin` |
| POST `/loggbok`, `/loggbok/:id/delete` | Log entry create/delete | `requireLogin`, `verifyCsrf` |
| GET `/book/saljboken.pdf` | Sales-book PDF | `requireLogin` + in-handler `isPremiumOrHigher` (3659) |
| GET `/book/saljboken.epub` | Sales-book EPUB | `requireLogin` + in-handler `isPremiumOrHigher` (3731) |
| GET `/audio/blocks/:blockId.mp3` | Block audio stream | `requireLogin` + in-handler premium check → 403 (3939) |
| POST `/niva/sedd` | Mark level-up seen | `requireLogin`, `verifyCsrf` |

## Account / settings

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/installningar` | Settings page | `requireLogin` |
| POST `/installningar` | Save settings | `requireLogin`, `verifyCsrf` |
| GET `/account` | Account overview | `requireLogin` |
| GET `/account/export.json` | GDPR data export | `requireLogin`, `dataExportLimiter` |
| POST `/account/change-password` | Change password | `requireLogin`, `blockWhenImpersonating`, `passwordChangeLimiter`, `verifyCsrf` |
| POST `/account/change-email` | Change email | `requireLogin`, `blockWhenImpersonating`, `passwordChangeLimiter`, `verifyCsrf` |
| POST `/account/change-name` | Change display name | `requireLogin`, `blockWhenImpersonating`, `verifyCsrf` |
| POST `/account/delete` | Delete account | `requireLogin`, `blockWhenImpersonating`, `deleteLimiter`, `verifyCsrf` |

## Pro (call analysis)

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/pro` | Pro landing/paywall | `requireLogin` |
| GET `/pro/samtal/ny` | Upload form | `requireLogin`, `requirePro` |
| POST `/pro/samtal/ny` | Upload+transcribe+analyze call | `requireLogin`, `requirePro`, `upload.single`, `verifyCsrf` (runs after multer, 4692) |
| GET `/pro/samtal/:id` | View analysis | `requireLogin`, `requirePro` |
| POST `/pro/samtal/:id/delete` | Delete analysis | `requireLogin`, `requirePro`, `verifyCsrf` |
| POST `/pro/cancel-trial` | Cancel Pro trial | `requireLogin`, `blockWhenImpersonating`, `verifyCsrf` |

## AI chat (Jocke coach)

| Method + Path | Purpose | Guards |
|---|---|---|
| POST `/chat` | General AI coach chat | `requireLogin`, `chatLimiter`, `verifyCsrf` + in-handler `isPremiumOrHigher` (4832) |
| POST `/chat/block` | Block-context chat | `requireLogin`, `chatLimiter`, `verifyCsrf` + in-handler premium (4866) |
| POST `/chat/roleplay` | Roleplay chat turn | `requireLogin`, `chatLimiter`, `verifyCsrf` + in-handler premium (4933) |

## Billing / webhook

| Method + Path | Purpose | Guards |
|---|---|---|
| POST `/webhook` | Stripe webhook (role upgrades, idempotent) | **Stripe signature verification** (346) — no session/CSRF by design |
| GET `/upgrade` | Upgrade page | `requireLogin` |
| POST `/upgrade/checkout` | Create Stripe Checkout session | `requireLogin`, `blockWhenImpersonating`, `verifyCsrf` |
| GET `/upgrade/success` | Post-checkout landing | `requireLogin` |
| POST `/billing/portal` | Stripe billing-portal redirect | `requireLogin`, `blockWhenImpersonating`, `verifyCsrf` |

## Cron (secret-keyed, no session)

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/cron/digest` | Send user digest / re-engagement emails | `CRON_SECRET` query key (2330) |
| GET `/cron/admin-digest` | Send weekly admin digest | `CRON_SECRET` query key (2466) |

⚠️ Both cron routes are **GET requests that trigger bulk email sends** (state-changing side effects via GET). Protected only by a shared secret in the query string (`?key=`), which can leak via logs/referrers/proxies. Acceptable for a scheduler behind Cloudflare, but worth flagging: prefer POST + header secret, and ensure `CRON_SECRET` is set (the guard fails-closed with 403 when unset — good).

## Admin — `server.js` (all `requireLogin` + `requireAdmin`)

| Method + Path | Purpose | Extra guards |
|---|---|---|
| GET `/admin` | Admin dashboard | — |
| GET `/admin/analytics` | Analytics | — |
| GET `/admin/funnel` | Funnel metrics | — |
| GET `/admin/audit` | Audit log viewer | — |
| GET `/admin/referral-credits` | Referral credit report | — |
| GET `/admin/email-queue` | Email queue viewer | — |
| POST `/admin/email-queue/requeue/:id` | Requeue email | `verifyCsrf` |
| GET `/admin/alert-test` | Trigger test alert | — |
| GET `/admin/test-admin-digest` | Preview admin digest | — |
| GET `/admin/test-trial-reminder` | Preview trial reminder | — |
| GET `/admin/test-digest` | Preview user digest | — |
| GET `/admin/book` | Book admin | — |
| GET `/admin/audio` | Audio admin | — |
| POST `/admin/audio/upload` | Upload block audio | `upload.single`, `verifyCsrf` |
| POST `/admin/audio/:blockId/delete` | Delete block audio | `verifyCsrf` |
| GET `/admin/user/:id` | User detail | — |
| POST `/admin/users/:id/notes` | Add admin note | `verifyCsrf` |
| POST `/admin/users/:id/notes/:noteId/delete` | Delete admin note | `verifyCsrf` |
| POST `/admin/users/:id/role` | Change user role | `verifyCsrf` |
| POST `/admin/users/:id/delete` | Delete user | `verifyCsrf` |
| POST `/admin/users/:id/password` | Reset user password | `verifyCsrf` |
| POST `/admin/users/:id/email` | Change user email / resend | `verifyCsrf` |
| POST `/admin/users/:id/redeem-credits` | Redeem referral credits | `verifyCsrf` |
| POST `/admin/users/:id/impersonate` | Start impersonation | `verifyCsrf` |
| GET `/admin/broadcast` | Broadcast composer | — |
| POST `/admin/broadcast/preview` | Preview broadcast | `verifyCsrf` |
| POST `/admin/broadcast/test` | Send test broadcast | `verifyCsrf` |
| POST `/admin/broadcast` | Send mass broadcast | `broadcastLimiter`, `verifyCsrf` |
| GET `/admin/export/users.csv` | Export all users CSV | — |

**Impersonation (not `requireAdmin` — usable by impersonated session):**

| Method + Path | Purpose | Guards |
|---|---|---|
| GET `/impersonate/status` | Impersonation banner state | `requireLogin` |
| GET `/impersonate/csrf` | Fetch CSRF token during impersonation | `requireLogin` |
| POST `/impersonate/stop` | Stop impersonation | `requireLogin`, `verifyCsrf` |

## Admin — `/admin/calls` (mounted router, `routes/calls.js`)

Router-level `router.use(requireLogin, requireCIAccess)` (calls.js:117) applies to **all** sub-routes. Destructive ones add `requireAdminForDestructive`. All state-changing POSTs carry `verifyCsrf` (or `csrfAfterUpload`, which runs CSRF after multer — calls.js:173/185).

| Method + Path (full) | Purpose | Guards (beyond requireLogin+requireCIAccess) |
|---|---|---|
| GET `/admin/calls/` | CI dashboard | — |
| GET `/admin/calls/upload` | Bulk upload form | — |
| POST `/admin/calls/upload` | Bulk call upload (≤100 files) | `bulkUpload.array`, `csrfAfterUpload` |
| GET `/admin/calls/objections` | Objection analysis | — |
| GET `/admin/calls/salespeople` | Salesperson list | — |
| GET `/admin/calls/salesperson/:name` | Per-salesperson view | — |
| GET `/admin/calls/insights` | Aggregate insights | — |
| GET `/admin/calls/search` | Search calls | — |
| GET `/admin/calls/worker/status` | Worker queue status | — |
| POST `/admin/calls/worker/retry/:id` | Retry failed job | `requireAdminForDestructive`, `verifyCsrf` |
| GET `/admin/calls/audio-local` | Local audio listing | — |
| GET `/admin/calls/audio/:id` | Stream call audio | — |
| POST `/admin/calls/:id/reanalyze` | Re-run analysis | `verifyCsrf` |
| GET `/admin/calls/:id/run/:runId` | View analysis run | — |
| GET `/admin/calls/:id` | Call detail | — |
| POST `/admin/calls/:id/outcome` | Set outcome | `verifyCsrf` |
| POST `/admin/calls/:id/case-study` | Generate case study | `verifyCsrf` |
| POST `/admin/calls/:id/structured-transcript` | Save structured transcript | `verifyCsrf` |
| POST `/admin/calls/:id/salesperson` | Assign salesperson | `verifyCsrf` |
| POST `/admin/calls/:id/delete` | Delete call | `requireAdminForDestructive`, `verifyCsrf` |

## Findings summary

**State-changing POSTs missing `verifyCsrf`:**
- `POST /login` (1214), `POST /register` (1288) — expected pre-auth exception; both rate-limited. Not a defect.
- `POST /heartbeat` (4093) — no CSRF, no `requireLogin` (soft inline `session.userId` check, returns 204 otherwise). Low risk: it only writes a bounded page-duration integer for the current session's own user and is rate-limited (`heartbeatLimiter`). No cross-user impact, but technically a CSRF-writable endpoint — acceptable given the trivial payload.
- **No other state-changing POST lacks CSRF.** Every admin, account, billing, learning, pro, and calls mutation carries `verifyCsrf`/`csrfAfterUpload`. This is a consistent, well-applied pattern.

**Sensitive routes / auth-guard gaps:**
- `POST /webhook` (340) — correctly unauthenticated but **Stripe-signature-verified**; idempotency-guarded. Correct.
- `GET /cron/digest` (2328) & `GET /cron/admin-digest` (2464) — **no session auth**, only a query-string shared secret; both are GETs that send bulk email. Fails-closed if `CRON_SECRET` unset. Recommend POST + header secret. This is the weakest auth surface in the app.
- `GET /bevis/:token` (2727), `GET /unsubscribe/:token` (2656), `GET /reset-password/:token` — intentionally token-authenticated, unauthenticated by design. Correct pattern.
- Premium-gated content routes (`/learn/:id`, `/book/*`, `/audio/blocks/*`, `/chat*`) enforce entitlement via **in-handler `isPremiumOrHigher`** rather than middleware — functional but easy to forget on new routes; a `requirePremium` middleware mirroring `requirePro` would be more robust.

**Admin routes:** all 29 `server.js` admin routes and all 22 `/admin/calls` routes are guarded (`requireAdmin`, or `requireLogin`+`requireCIAccess` with `requireAdminForDestructive` on delete/retry). No admin route is missing an authorization guard. `requireAdmin` correctly preserves original-admin authority during impersonation (1063) while `session.role` may read as a lower tier.

**Staged/uncommitted (COACH_MODE):** `POST /learn/:id/ova/:rpid/utvardera` (2142) and `GET /learn/:id/ova/:rpid/resultat` (2214) are the WIP roleplay-evaluation routes; both are properly guarded (`requireLogin` + `chatLimiter`/premium + `verifyCsrf`) and pose no additional exposure if deployed as-is.

Evidence files: `C:/Users/joaki/Documents/manapp/server.js`, `C:/Users/joaki/Documents/manapp/routes/calls.js`.

---


<a id="env"></a>

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

---


<a id="security"></a>

# Security Review — joakim-jaksen-saljutbildning

**Scope:** `server.js` (~5400 lines), `database.js` (~3800 lines), `views/*.ejs`, `services/*`, `roleplayTurnAuth.js`. Verified against the production system; the staged COACH_MODE feature is noted where relevant. Overall the codebase is markedly more security-conscious than typical for a solo-built Express app: parameterized SQL throughout, session regeneration on login, per-route CSRF, account lockout, timing-safe reset flow, no hardcoded secrets, and a non-leaking global error handler. The findings below are real but mostly narrow.

## Findings

| Severity | Location | Issue | Recommendation |
|---|---|---|---|
| **Medium** | `views/pro-analysis.ejs:88-108` | **DOM-XSS in Pro call-analysis rendering.** The client script reads `el.textContent` (the AI analysis of the user's uploaded/transcribed call) and, after applying markdown regexes, assigns the result to `el.innerHTML` (line 108) **without HTML-escaping first**. Unlike the roleplay renderer (`views/block-ova-chat.ejs:141-142`, which calls `escapeHtml(s)` before markdown), this path does no escaping. Analysis text containing `<img src=x onerror=…>` / `<script>` becomes live HTML. Source is Groq output seeded by the user's own transcript (`server.js:4748-4757`), so primarily self-XSS, but it is user-influenced content rendered as raw HTML. | Escape HTML **before** the markdown transforms, mirroring `renderMarkdown` in `block-ova-chat.ejs` (escape `& < > " '`, then apply markdown to the escaped string). |
| **Low** | `server.js:2899-2903` + `views/sok.ejs:50-51,72-73` | **Unescaped `highlightMatch` output.** `highlightMatch(text, query)` injects `text` into HTML via `text.replace(pattern,'<mark>$1</mark>')` with **no HTML-escaping**, emitted raw with `<%-`. Not currently exploitable because `text` (`r.block.title`, `t.term`, `t.definition`, `extractSnippet(b.theory)`) is author-controlled content from `salesContent.js`/`glossary.js`, and the reflected `query` only surfaces via `$1` where it matched that trusted text. It becomes a stored-XSS sink the moment any user-supplied string is ever passed through it. Contrast the sibling `learn-sok.ejs:167-182` which escapes correctly. | Escape `text` before wrapping matches (adopt the `learn-sok.ejs` `highlight` implementation). |
| **Low** | `server.js:2328-2332`, `2464-2468` (`/cron/digest`, `/cron/admin-digest`) | **Cron secret passed in query string + non-constant-time compare.** Auth is `req.query.key !== cronSecret`. Secrets in URLs land in access logs / proxy logs (Cloudflare, Railway), and `!==` is not timing-safe. It does fail-closed when `CRON_SECRET` is unset (good). | Accept the secret via an `Authorization`/custom header instead of the query string, and compare with `crypto.timingSafeEqual`. |
| **Low** | `server.js:4776` | **Error-message leakage on Pro upload.** The catch-all renders `'Något gick fel vid uppladdning: ' + err.message` to the client. Most other handlers and the global error handler (`server.js:5168-5183`) correctly return generic text + a request-id. Low impact (upload-path errors), but it deviates from the otherwise-clean pattern. | Show a generic message; log `err.message` server-side only. (Note `analysis.error_message` at `pro-analysis.ejs:49` is bounded to 500 chars and admin/self-scoped — lower concern but same category.) |
| **Low / Info** | `views/nyhet.ejs:116` + `server.js:3438-3446` | **Admin-authored raw HTML rendered to all users.** Broadcast bodies are emitted with `<%- rendered %>`; if the body "looks like HTML" it passes through verbatim. Only admins can create broadcasts (`/admin/broadcast`, `requireAdmin`), so this is an *authorized* capability, but a compromised/malicious admin can inject script into every user's `/nyheter` page. | Sanitize broadcast HTML (allowlist tags) before storage/render, or document it as a trusted-admin capability. |
| **Info** | `server.js:58-69` (multer `fileFilter`) | **File-type filter is OR-based.** A file passes if the MIME is allowed **or** the filename matches an audio extension regex, so a non-audio payload with a `.mp3` name passes the filter. Mitigated by the 100 MB size cap and the fact that the buffer only ever goes to Groq transcription (never written to disk or executed). | Acceptable; optionally tighten to require MIME match, and/or validate audio magic-bytes. |

## Area-by-area assessment (verified)

1. **Auth model + session store — solid.** Session-based (`express-session`) with a custom `SqlJsSessionStore` (`server.js:674-714`) persisting to the same sql.js DB, so sessions survive redeploys. Cookie is `httpOnly`, `secure` in prod, `sameSite:'lax'`, renamed to `sid`, 30-day rolling. Session ID is regenerated on login and register (`server.js:1274`, `1435`) — session-fixation-safe. `requireLogin` (`server.js:1047-1057`) re-fetches the user each request and invalidates the session when the user is deleted or `pw_version` changed (stolen-session mitigation). Passwords: bcrypt cost 10 (`database.js:553`, `705+`). Account lockout after 5 failed logins (`server.js:1231-1259`).

2. **CSRF coverage — comprehensive.** `verifyCsrf` (`server.js:867-878`) compares a per-session random token from `_csrf` body field or `x-csrf-token` header, applied to **every** state-changing POST (notes, loggbok, account, quiz, all `/admin/*`, impersonate, upgrade, pro upload, chat, billing) — see the route list at `server.js:1483-5035`. `/login`, `/register`, and `/forgot-password` GET render a token; `/webhook` is Stripe-signature-verified (`server.js:346`); `/heartbeat` writes only a bounded numeric and is not a meaningful CSRF target. Correct multer-before-verifyCsrf ordering is called out and used for multipart routes (`server.js:4689-4692`, `3846`). One nit: the token has no rotation/expiry, but that is low risk.

3. **Rate limiting — broad, per-route.** Dedicated limiters for login (10/15 min, `skipSuccessfulRequests`), register (5/hr), password reset (5/hr), password change (10/hr), account delete (3/15 min), chat (30/10 min, per-user key), quiz (60/10 min), notes create/delete, broadcast, data export, and heartbeat (`server.js:747-854`). `trust proxy` is set to `1` for Railway (`server.js:534`) so IP keying is correct behind Cloudflare. Good coverage.

4. **Input validation — reasonable.** Registration validates email regex, name length (1–50) and rejects `< > { }`, password 8–128, GDPR consent, and Turnstile CAPTCHA with fail-closed behavior (`server.js:1288-1354`). Chat endpoints cap to last 20 messages × 2000 chars and validate roles (`server.js:4839-4844`). Numeric route params are coerced with `parseInt`/`Number` and checked. Upload consent + monthly quota enforced (`server.js:4715-4724`).

5. **SQL injection — not present.** All queries use `db.prepare(...).bind([...])` or `db.run(sql, [params])`. Every dynamic-string SQL fragment I traced interpolates only **non-user-controlled** values: fixed segment allowlists (`database.js:1388-1395`), hardcoded day constants (`database.js:1882-1904`), `parseInt(filters.days)` (`database.js:2562`), allowlisted column names in `UPDATE` builders (`database.js:1786-1793`, `3109-3115`), placeholder strings `?,?,?` (`database.js:990`, `2209`, `3191`), and DB-derived integer IDs joined inline (`database.js:2945-2958`). No user string reaches SQL unparameterized.

6. **XSS (EJS) — mostly escaped.** `grep <%-` surfaces the raw sinks; the `JSON.stringify(...)` interpolations (`block-ova-chat.ejs:121-132`, `prov.ejs:101` which also neutralizes `</script>`) are safe patterns, and `learn-sok.ejs` escapes before highlighting. The genuine gaps are the two findings above (`pro-analysis.ejs` innerHTML, `sok.ejs` highlightMatch) plus the admin-broadcast passthrough. `block.theory`/`block.teaser` are trusted content files.

7. **Secrets — clean.** No hardcoded live secrets anywhere in source (`sk_live/whsec_/gsk_/re_` appear only as placeholders in `.env.example`/`README.md`). No `.env` on disk and only `.env.example` is git-tracked (`.gitignore` excludes `.env`, `users.db`, `uploads/`). `x-powered-by` disabled.

8. **Error leakage — well-handled.** The global handler (`server.js:5168-5203`) logs the full error + a request-id server-side but returns only a generic page (no `err.message`/stack to clients). The only deviations are the Pro-upload catch (finding above) and a couple of admin-facing spots.

9. **Sensitive-data logging — clean.** No passwords, tokens, transcripts, or `req.body` dumps to `console.*`. The one deliberate exception is the seeded admin password logged once to Railway logs at bootstrap (`database.js:559-567`), which is the intended out-of-band delivery channel. `audit()` anonymizes client IP to a /24 (`server.js:1110-1113`).

10. **Admin access — no default/seeded weak admin in prod.** Admin is determined by `req.session.role === 'admin'` (kept in sync with the DB each request) via `requireAdmin` (`server.js:1060-1066`). The seed (`database.js:536-573`) generates a **random** password in production (or uses `ADMIN_SEED_PASSWORD`), logging it once; `admin/123456` is used **only** when `NODE_ENV !== production`, and there is an active prod warning if the default hash is ever detected (`database.js:580-594`). Impersonation is admin-gated, forbids admin→admin (privilege-escalation guard, `server.js:4381-4384`), is audited, and destructive/billing actions are blocked during impersonation via `blockWhenImpersonating` (`server.js:1121-1129`). CI access is a default-safe env allowlist (`server.js:1074-1088`).

11. **File-upload safety — bounded.** Multer uses in-memory storage, a 100 MB cap, and a MIME/extension filter (`server.js:58-69`); buffers are never persisted to disk (transcribed then discarded). Only weakness is the OR-based filter (info finding). Monthly upload quota enforced per user.

12. **Security headers (helmet) — configured deliberately.** Helmet is enabled with a hand-tuned CSP (`server.js:566-593`): `defaultSrc 'self'`, `objectSrc 'none'`, `frameAncestors 'self'` (anti-clickjacking), `baseUri 'self'`, tight `connectSrc`, HSTS + `upgradeInsecureRequests` in prod only. The documented trade-off is `script-src 'unsafe-inline' 'unsafe-eval'` (needed for the 45+ EJS inline scripts), which weakens CSP's XSS protection — the code comments already flag moving to nonce-based CSP as a P2. This is why the two DOM/reflected-XSS findings above matter: CSP will not backstop them.

**Highest-leverage fix:** escape-before-innerHTML in `pro-analysis.ejs` (Medium). Everything else is low/informational. No SQLi, no auth bypass, no secret exposure, and no IDOR were found (all ownership-scoped queries — `deleteNote`, `deleteUserAction`, `getProCallAnalysis`, `deleteProCallAnalysis` — correctly include `AND user_id = ?`).

---


<a id="storage"></a>

# Data & Storage Audit — `database.js`

## Overview

The entire persistence layer is **sql.js** — a WebAssembly build of SQLite that runs **fully in-process, in memory**. There is no SQLite daemon and no native binding; the "database" is a single byte-buffer held in the Node heap and serialized to one file on disk. `database.js` (~3,850 lines) owns schema creation, migrations, every query, the session store, and all retention/cleanup logic.

### The single-file model (`DB_PATH`)

- The DB path is `process.env.DB_PATH || path.join(__dirname, 'users.db')` (`database.js:10`). In production `.env.example:7` documents `DB_PATH=/data/users.db` — i.e. the file is expected to live on a Railway **mounted volume**, not the app directory.
- On boot, `initDatabase()` reads the entire file into memory: `db = new SQL.Database(fs.readFileSync(DB_PATH))` (`database.js:25-29`). If the file is absent it starts a fresh empty DB. There is no WAL, no journal, no page cache — the whole database is one in-RAM buffer.
- The parent directory is auto-created (`fs.mkdirSync(dbDir, { recursive: true })`, `database.js:13-16`) so that `/data/users.db` works on first deploy.

### How writes persist — `saveDb()` rewrites the whole file

`saveDb()` (`database.js:610-618`) is the *only* persistence primitive:

```js
const data = db.export();               // serialize the ENTIRE database to a Buffer
fs.writeFileSync(DB_PATH, Buffer.from(data));
```

`db.export()` serializes the **complete database** (every table, every row) into a Buffer, and `fs.writeFileSync` rewrites the **whole file synchronously** on the main thread. This is called after essentially every mutation — `saveDb()` appears **72 times** in the file. Examples: `createUser` (`:728`), `saveQuizResult` (`:1116`), `createNote` (`:1073`), `markStripeEventProcessed` (`:2341`), `deleteCallJob` (`:3414`), every cleanup function, etc.

**Performance implication:** write cost is O(total DB size), not O(changed rows). A 50 MB database means a 50 MB synchronous disk rewrite on every note save, quiz submission, or role change — blocking the Node event loop (and therefore *all* concurrent requests) for the duration of the write. This scales badly with data volume, not request volume: the more Pro-call transcripts and CI data accumulate (`call_transcripts.text`, `pro_call_analyses.transcript`, `call_analysis_runs.analysis` are all large TEXT blobs), the slower *every* write across the whole app becomes.

**Partial mitigation — the analytics dirty-batch.** High-frequency, low-value writes are debounced instead of flushed immediately (`database.js:2009-2037`). `_markAnalyticsDirty()` sets a flag and schedules a single `saveDb()` 30 s later; `flushAnalytics()` force-flushes on shutdown. This path is used by `logPageView`, `sessionSet`/`sessionGet`/`sessionDestroy` (`:2277`, `:2257`, `:2286`), and `logAdminAction` (`:2545`). So the "saveDb on every write" statement is true for business writes (users, progress, Stripe, notes, CI jobs) but **not** for sessions/page-views/audit-log, which tolerate up to 30 s of loss.

### Backup rotation

`rotateDbBackups()` (`database.js:633-649`) implements a 3-slot rotation by copying the live file: `.backup.2 → .backup.3`, `.backup.1 → .backup.2`, then `copyFileSync(DB_PATH, .backup.1)`. It is wired in `server.js:5323-5324`: first run 10 s after boot, then every 6 hours via `setInterval`. So the retention window is **only ~18 hours** (backup.1 ≈ now, .2 ≈ 6 h, .3 ≈ 12–18 h). There is no off-box/off-volume backup — all three copies live on the **same Railway volume** as the primary, so a volume loss or corruption event takes the primary and all backups together.

### Schema

`CREATE TABLE IF NOT EXISTS` for the following **26 tables** (all in `initDatabase`, `database.js:32-414`):

`users` (:33), `notes` (:42), `reset_tokens` (:53), `block_progress` (:64), `user_reflections` (:82), `user_roleplays` (:95), `roleplay_evaluations` (:109, WIP COACH_MODE), `user_missions` (:135), `user_actions` (:151), `user_preferences` (:165), `daily_challenges` (:175), `pro_call_analyses` (:188), `call_jobs` (:205), `call_transcripts` (:223), `call_analyses` (:234), `call_word_frequencies` (:243), `call_analysis_runs` (:256), `call_objections` (:272), `sessions` (:286), `stripe_events` (:297), `admin_user_notes` (:308), `email_queue` (:323), `broadcasts` (:343), `admin_audit_log` (:359), `page_views` (:375), `block_audio` (:390), `funnel_events` (:406). Plus one explicit index (`idx_rp_eval_user_scenario`, :130).

### Migrations — additive-only, error-swallowed

There is **no migration framework or versioning** — no `schema_version` table, no up/down migrations. Instead there is a hand-maintained `migrations[]` array of `ALTER TABLE … ADD COLUMN` and `CREATE INDEX IF NOT EXISTS` strings (`database.js:418-527`), run via `migrations.forEach(sql => { try { db.run(sql); } catch (_) {} })` (`:528`). Because SQLite lacks `ADD COLUMN IF NOT EXISTS`, **every migration error is silently swallowed** — the pattern relies on the ALTER failing (already-applied) being indistinguishable from failing for a real reason (typo, wrong table, disk error). This is idempotent-by-accident and gives zero feedback if a migration genuinely fails. Adding a column with a non-constant default would also throw in SQLite and be silently ignored. All ~30 `users` columns beyond the original three (`id`, `username`, `password_hash`) arrive this way, including security-critical ones (`pw_version`, `locked_until`, `failed_login_attempts`).

### Session persistence

Sessions are stored **in the same SQLite file** (`sessions` table, `:286-291`; primitives at `:2243-2299`) to survive Railway redeploys — the comment at `:284` states this explicitly ("ersätter MemoryStore så användare inte loggas ut vid redeploy"). `sessionGet` lazily deletes expired rows; `sessionSet` upserts. Crucially, all session writes go through `_markAnalyticsDirty()` (**30 s debounce**, `:2277`), *not* immediate `saveDb()` — a deliberate trade because sessions are write-heavy. `sessionCleanupExpired()` (`:2292`) purges expired rows and is scheduled every 6 h (`server.js:5263-5264`). Password changes bump `users.pw_version`, and sessions carry a copy that is invalidated on mismatch (`:426-428`), so password reset kills stolen sessions.

### Data retention, PII & GDPR

**Retention jobs** (all rewrite the whole file via `saveDb()` on completion):
- `cleanupExpiredTokens` — reset tokens past expiry (`:620`)
- `cleanupOldEmailQueue` — sent/failed mail > 30 days (`:2471`)
- `cleanupOldAuditLog` — 180-day retention (`:2575`)
- `cleanupOldStripeEvents` — 90-day retention (`:2586`)
- `cleanupOldPageViews` — 90-day retention (`:2601`)
- `sessionCleanupExpired` — expired sessions (`:2292`)

**GDPR export** (`getUserDataExport`, `:2859-2907`) — Article 20 portability. Aggregates profile + block_progress, reflections, roleplays, missions, actions, notes, preferences, daily_challenges, pro_call_analyses (metadata only, not transcript text), page_views, referrals. It correctly **excludes** `password_hash`, `pw_version`, `stripe_customer_id` (`:2872`).

**GDPR delete** (`_deleteUserRows`, `:780-825`) runs all deletions in a `BEGIN…COMMIT/ROLLBACK` transaction and covers 14 tables, anonymizes `admin_audit_log` (nulls target, sets admin_user_id=0), nulls dangling `referrer_id`, and force-logs-out the user by `DELETE FROM sessions WHERE data LIKE '%"userId":N%'`. **The delete is incomplete** (see risks): it omits the CI tables (`call_jobs`/`call_transcripts`/`call_analyses`/`call_objections`/`call_word_frequencies`), the WIP `roleplay_evaluations`, and `funnel_events`.

**PII handling notes:** register IP is anonymized to /24 at insert (`:715-716`); the admin seed uses a random generated password in prod with a loud one-time log (`:536-573`); `pro_call_analyses.transcript` and the `call_transcripts.text` blobs are raw call recordings transcribed to text — the most sensitive PII in the system.

### Single-instance constraint & concurrency

Because the DB is an **in-process WASM buffer**, the app is **hard-locked to a single instance**:
- **Cannot horizontally scale.** Two Node processes would each hold their own in-memory copy and each rewrite the file, silently clobbering each other's writes (last `writeFileSync` wins, no locking). This also forbids Railway replica counts > 1 and rolling deploys that briefly run two instances against the same volume.
- **Concurrent-write safety within one process** is provided only by Node's single-threaded event loop — sql.js itself is synchronous, so individual `db.run` calls don't interleave. But there is **no OS-level file lock**: nothing prevents a second process (a stray worker, a migration script, a second deploy) from opening the same file and corrupting it.
- The `_deleteUserRows` transaction (`:786-819`) is the only multi-statement transaction in the file; almost everything else is single-statement + immediate full-file `saveDb()`, so there is no cross-statement atomicity for compound operations (e.g. Stripe role-change + credit grant are separate `saveDb()` calls).

---

## Risks

**CRITICAL**
1. **Data loss on crash between writes.** State lives in RAM; only `saveDb()` persists it. A `SIGKILL`, OOM, `uncaughtException` (`server.js:5459`), or power loss between the mutation and the next flush loses all in-memory changes. For debounced paths (sessions, page-views, audit-log via `_markAnalyticsDirty`, `:2017`) that window is **up to 30 seconds**. Graceful `SIGTERM` handling flushes (`server.js:5425-5451`) but a hard crash or force-kill bypasses it.
2. **Whole-file corruption = total loss.** A crash *during* `fs.writeFileSync` (`:613`) leaves a truncated/partial `users.db`; on next boot `new SQL.Database(fs.readFileSync(...))` may fail or load a corrupt buffer. There is **no atomic write** (no write-to-temp + `rename`), no checksum, no integrity check on load. Because all 3 backups sit on the same volume and rotate only every 6 h, corruption caught late can propagate into the backups.
3. **Railway ephemeral disk vs. volume.** Persistence depends entirely on `DB_PATH=/data/users.db` pointing at a *mounted volume*. If the volume is not attached (or `DB_PATH` is unset, falling back to `__dirname/users.db` inside the container filesystem, `:10`), the DB is **wiped on every redeploy/restart** with no error. This is a silent single-config-line-away-from-catastrophe dependency.

**HIGH**
4. **Full-file rewrite on every business write** (`saveDb`, `:610`) is O(DB size) and synchronous — blocks the event loop for all users. Degrades as CI transcripts / Pro-call blobs accumulate. No incremental persistence.
5. **Cannot horizontally scale / no concurrent-instance safety.** In-process DB + unlocked `writeFileSync` means two instances corrupt or clobber each other. Locks the product to one vertical box and complicates zero-downtime deploys (two instances briefly sharing `/data`).
6. **GDPR delete is incomplete.** `_deleteUserRows` (`:786-819`) does **not** remove the user's CI data (`call_jobs`, `call_transcripts` — raw call transcripts containing third-party PII, `call_analyses`, `call_objections`, `call_word_frequencies`), nor `roleplay_evaluations` or `funnel_events`. After an erasure request, transcribed call content and behavioral events tied to the user (or their uploads) persist as orphans. Also, `DELETE FROM sessions WHERE data LIKE '%"userId":N%'` (`:813`) is a fragile substring match that can miss or over-match depending on session serialization.

**MEDIUM**
7. **Silent migration failures.** `try { db.run(sql); } catch (_) {}` (`:528`) makes a genuinely broken migration indistinguishable from an already-applied one. No `schema_version`, no logging, no verification that a column actually exists after the loop.
8. **Backup retention is only ~18 hours and co-located.** `rotateDbBackups` (`:633`) keeps 3 copies rotated every 6 h, all on the same volume as the primary (`server.js:5323-5324`). No off-site/off-volume copy — a volume failure loses primary + all backups. A corruption or bad-delete discovered after ~18 h is unrecoverable.
9. **No atomic/transactional coupling across `saveDb()` calls.** Compound business operations (e.g. Stripe webhook role change + referral credit) are separate statements each with their own flush; a crash between them leaves partially-applied state, mitigated only by Stripe idempotency (`stripe_events`, `:297`) and idempotent handlers.

**LOW / NOTED**
10. `saveDb()` swallows write errors (`console.error` then continues, `:614-617`) — a failing disk logs "CRITICAL" but the request still returns success to the user, so persistence failures are invisible to callers.
11. WIP COACH_MODE (`roleplay_evaluations` table `:109`, insert path `:1244`) adds another large-blob table (multiple `_json` TEXT columns) that will further inflate `db.export()` size and is already excluded from GDPR delete (risk 6) — worth wiring into `_deleteUserRows` before that feature ships.

---

**Files cited:** `C:\Users\joaki\Documents\manapp\database.js` (schema :32-414; migrations :418-528; `saveDb` :610-618; `rotateDbBackups` :633-649; `_deleteUserRows` :780-825; analytics batch :2009-2037; session store :2243-2299; retention :2471/2575/2586/2601; GDPR export :2859-2907; `deleteCallJob` :3407-3416), `C:\Users\joaki\Documents\manapp\server.js` (init :5210; session/backup cron :5263-5324; graceful shutdown/flush :5404-5456), `C:\Users\joaki\Documents\manapp\.env.example` (:6-7), `C:\Users\joaki\Documents\manapp\Dockerfile`.

---


<a id="codehealth"></a>

## Code-Health & Quick-Wins Scan — joakim-jaksen-saljutbildning

Scope: production system (server.js, database.js, views, services). READ-ONLY. All items verified against the actual code. The staged-but-undeployed COACH_MODE feature is noted separately where relevant.

**Headline:** this is a healthy codebase for its size. No dead modules, no orphaned env vars, all root JS passes `node --check`, all 43 views have `<title>`, and no broken internal links were found. The real issues are structural duplication (no shared view layout) and a handful of small cleanups — not correctness bugs.

### QUICK WINS (small, safe, high-value)

1. **12× copy-pasted `res.render('login', …)` error boilerplate** — `server.js:1296,1307,1317,1323,1330,1333,1337,1341,1345,1349,1353,1372` (register handler) plus more in the login handler. Every validation branch repeats `res.render('login', { error: null, success: null, turnstileSiteKey: TURNSTILE_SITE_KEY, registerError: '…' })`. Fix: add a one-line helper `renderLoginError(res, {registerError|error})` and call it — removes ~12 duplicated literal objects and prevents drift if the login view's locals ever change.

2. **`salesContent.js:371` ships a literal placeholder into user-facing content** — `<p><em>"Har ni ISO-XXX?"</em></p>`. The `ISO-XXX` reads as an unfilled template. Fix: replace with a concrete standard (e.g. `ISO 9001`) or rephrase to `"Har ni någon ISO-certifiering?"`.

3. **5 unresolved `TODO Joakim` blocks in the AI-coach prompt** — `services/prompts/feedback.js:138,168,198,228,259`. These are methodology sections (`tempo-principer`, `abonnemang`, `behovsstyrd`, `B2B`, `inkommande`) where Joakim's own principles are still stubbed out, directly weakening the Jocke coaching prompt quality. Two of them (`228`, `259`) even instruct setting `isActive: false` if unused. Fix: fill in or deactivate the empty methodologies so the model isn't fed hollow guidance.

4. **`routes/calls.js:398` — O(n) scan flagged as a scaling cliff** — `// TODO: egen getCallJobByStorageKey när vi passerar 1000 jobs.` A concrete, acknowledged perf ceiling on the Pro call pipeline. Fix (later, but cheap): add the indexed lookup before job volume grows; harmless now, verifiable TODO.

5. **News/blog article `<title>` is unescaped user-influenced content** — `views/nyhet.ejs:6`: `<title><%= broadcast.subject %> — …`. EJS `<%= %>` escapes HTML so this is XSS-safe, but a broadcast subject with an unbalanced `—`/quotes will look ragged in the tab and social unfurls. Minor; consider truncating subject length for the title tag.

6. **`salesContent.js` is a 639 KB single-file `require`** — loaded synchronously at boot via `salesContent.js:5 → require('./blockPractice')` (94 KB). Not a bug, but every deploy parses ~730 KB of content JS on the hot path. Flagging as a known cost, not an action item.

### NON-ISSUES VERIFIED (so they don't get re-flagged later)

- **No broken internal links.** Every `href="/…"` target in views maps to a real route, including `/priser` (`server.js:4819`, aliased with `/pricing`), `/admin/calls` (mounted `server.js:4805`), `/integritetspolicy` + `/privacy` (both render `privacy.ejs`, `server.js:3401/3409`), and the two hardcoded block IDs `/learn/inledning` (`salesContent.js:11`) and `/learn/forsta-intrycket` (`salesContent.js:977`).
- **`console.log` is operational logging, not debug noise.** 28 in server.js, all structured lifecycle/emoji-tagged events (Stripe upgrades, email sends, book generation, impersonation audit). Zero `console.log` in `public/`. No cleanup needed.
- **Meta/SEO is fine on pages that matter.** All genuinely public pages (`landing`, `priser`, `foretag`, `privacy`, `terms`) have `name="description"` + canonical + OG. The views that lack meta (`nyhet`, `nyheter`, `pro-landing`, all admin/account pages) are every one `requireLogin`-gated (`server.js:3422,3431,4663`) and thus non-indexable — meta there is irrelevant.
- **Key flows have loading/error/empty states.** Roleplay chat (`views/block-ova-chat.ejs`) has a typing indicator (`:199`), `try/catch` around fetch (`:266,282`), and inline error rendering (`:274 "Något gick fel. Försök igen."`). Quiz (`views/prov.ejs`) builds a `role="alert"` inline error (`:130–138`) and validates all-questions-answered before submit.
- **Form validation is robust.** Register (`server.js:1296+`) checks Turnstile CAPTCHA (fail-closed with admin alert), all-fields-present, name length 1–50 + HTML-char rejection, email regex, password match, and 8–128 char length.
- **`.env.example` is in sync** — zero documented-but-unread vars.
- **No dead modules.** `proCallAnalysis`, `recommendations`, `glossary`, `gamification`, `emails`, `blockPractice`, `coachEvaluation`, `roleplayTurnAuth` are all `require`d.
- **COACH_MODE feature is correctly staged, not half-wired.** Gated behind `COACH_MODE` env (`server.js:245`); the `/utvardera` route returns 404 when off (`server.js:2143`) and `/resultat` redirects (`server.js:2215`). The transcript-signing auth (`roleplayTurnAuth.js`, `server.js:250,4993`) is a genuine anti-forgery measure, and the feature has test coverage (`test/coachEvaluation.test.js`, `roleplayTurnAuth.test.js`, `roleplayEvaluationDb.test.js`). Safe to leave staged.

### LARGER IMPROVEMENTS (describe, don't require)

1. **No shared view layout — all 43 EJS files carry their own `<!DOCTYPE>`/`<head>`, and there are zero `include()` calls.** This is the single largest maintainability drag: any change to the nav, `<head>` meta, favicon, or footer must be hand-edited across dozens of files (and already shows drift — some public pages have OG/canonical, others don't). Introducing a `views/partials/head.ejs` + `header.ejs` + `footer.ejs` and `<%- include(...) %>` (no build step needed, pure EJS) would collapse enormous duplication and make SEO/meta consistent by construction.

2. **`server.js` at ~5,400 lines and `database.js` at ~3,800 lines are monolithic.** Only the Pro-call routes have been extracted (`routes/calls.js`). Splitting server.js by domain (auth, billing/Stripe, learn/blocks, admin, cron) into an Express-Router-per-file layout — following the pattern `routes/calls.js` already establishes — would make the code navigable and reviewable. High effort, high long-term value; not urgent.

3. **Migrations run as `migrations.forEach(sql => { try { db.run(sql); } catch (_) {} })` (`database.js:528`), swallowing every error.** This is the standard idempotent `ALTER TABLE ADD COLUMN`-throws-if-exists trick for sql.js, so it's intentional — but it also silently hides a *genuinely* broken migration (typo'd SQL, wrong table) until a query fails at runtime. A lightweight `schema_migrations`-version table, or at minimum distinguishing "column already exists" from other errors before swallowing, would make schema evolution safe to trust.

Files of note (absolute): `C:\Users\joaki\Documents\manapp\server.js`, `C:\Users\joaki\Documents\manapp\database.js`, `C:\Users\joaki\Documents\manapp\salesContent.js`, `C:\Users\joaki\Documents\manapp\services\prompts\feedback.js`, `C:\Users\joaki\Documents\manapp\routes\calls.js`, `C:\Users\joaki\Documents\manapp\views\` (43 layout-less EJS files).

---


<a id="deploy"></a>

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

---
