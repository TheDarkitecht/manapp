# Joakim Jaksens Säljutbildning (`manapp`)

A Swedish online sales-training platform: structured course blocks, an AI sales coach
("Jocke"), text-based roleplay practice, a Pro call-analysis tool, and Stripe subscriptions.
Live at **joakimjaksen.se**.

> Single-process Node/Express app rendering server-side EJS, backed by an in-process SQLite
> (`sql.js`) database persisted to one file. No build step, no framework — deliberately simple
> to operate.

## What it does
- **Läromoment (blocks):** ~23 sales blocks (theory + video slot + quiz + mission + reflection).
  Blocks 1–2 are free; the rest require Premium.
- **Jocke (AI coach):** general chat, block-context chat, and roleplay where Jocke plays a
  customer persona. Powered by Groq (`llama-3.3-70b-versatile`) via the OpenAI SDK.
- **Pro — Samtalsanalys:** upload a call recording (audio, ≤100 MB); it's transcribed and
  analysed. Pro tier, monthly quota.
- **Accounts & billing:** register/login (bcrypt + sessions), Stripe Checkout subscriptions
  (Premium / Pro), Stripe webhooks for role changes, customer portal.
- **Retention & admin:** email (Resend), funnel analytics, admin dashboards, referrals.

## Stack
| Layer | Choice |
|---|---|
| Runtime | Node ≥18 (CI/prod on 20+) |
| Web | Express 4, EJS server-side templates |
| Data | `sql.js` (WASM SQLite) persisted to a single file (`$DB_PATH`, default `users.db`) |
| Auth | `express-session` (persisted in the sql.js DB), `bcryptjs`, per-request CSRF tokens |
| Payments | Stripe (Checkout + webhooks + billing portal) |
| AI | Groq via `openai` SDK (`baseURL` = Groq) |
| Email | Resend |
| Uploads | `multer` (in-memory, 100 MB, audio only) |
| Hardening | `helmet`, `express-rate-limit`, Cloudflare Turnstile on register |
| Hosting | Railway (app) behind Cloudflare (DNS/CDN/WAF) |

## Run locally
```bash
npm install
# minimum env to boot (see ENVIRONMENT.md for the full list):
#   GROQ_API_KEY=...            # required — the OpenAI client is constructed at boot
#   STRIPE_SECRET_KEY=sk_test_… # required — Stripe SDK throws on an empty key
#   SESSION_SECRET=<random>     # required in prod; dev falls back to an insecure default
#   DB_PATH=./dev.db            # keep dev data out of the tracked users.db
npm start                       # → http://localhost:3000
```
`npm run dev` runs with `node --watch`. Health check: `GET /health`.

## Repository layout
```
server.js          Express app: all routes, middleware, Stripe/Groq/email wiring (~5.4k lines)
database.js        sql.js schema + all data-access functions + session store (~3.8k lines)
salesContent.js    course content (blocks, theory, roleplays, criteria)
blockPractice.js   per-block practice data merged into blocks at runtime
services/          call-analysis + helpers (callAnalytics.js, fetchTimeout.js, …)
emails.js          transactional/retention email templates + logic
gamification.js    streaks, actions, preferences helpers
views/*.ejs        ~45 server-rendered pages
public/            static assets (css, js, images, favicon.svg, logo, sitemap route is dynamic)
```

## Docs
- [ENVIRONMENT.md](ENVIRONMENT.md) — every env var, required vs optional, defaults, risks.
- [DEPLOYMENT.md](DEPLOYMENT.md) — Railway + Cloudflare deploy, data persistence, rollback.
- [RUNBOOK.md](RUNBOOK.md) — operational playbook: incidents, backups, common tasks.
- [REPO_AUDIT.md](REPO_AUDIT.md) — production-readiness audit (findings + recommendations).
- [PROGRESS.md](PROGRESS.md) — changelog of notable changes.

## Testing
No framework historically. A `node:test` suite exists for the (feature-flagged) coach
evaluation logic: `npm test`. Syntax check: `node --check server.js`.

## License / ownership
Private, proprietary. © Joakim Jaksen. Not for redistribution.
