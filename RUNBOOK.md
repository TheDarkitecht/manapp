# RUNBOOK.md — operations playbook

Practical "how do I…" for running `manapp` in production. See [DEPLOYMENT.md](DEPLOYMENT.md)
for the deploy pipeline and [ENVIRONMENT.md](ENVIRONMENT.md) for every env var.

## Where things live
| Thing | Location |
|---|---|
| App | Railway (single instance — **do not scale horizontally**, the DB is in-process) |
| DNS / CDN / WAF | Cloudflare (proxied) |
| Database | one `sql.js` file at `$DB_PATH` (prod: `/data/users.db` on a Railway **volume**) |
| Backups | `users.db.backup.{1,2,3}` next to the DB — 3 slots, ~18 h window, **same volume** |
| Secrets | Railway → Variables (never in git) |
| Payments | Stripe dashboard (Checkout, webhooks, customer portal) |
| Email | Resend dashboard |
| Health | `GET /health` → JSON with feature flags (`email`/`chat`/`stripe` = keys present) |

## Health & first-look
- `curl https://joakimjaksen.se/health` → `200` and `{ ok: true, ... }`.
- Railway → Deployments → logs. Boot success line: `✅ Server running at http://localhost:PORT`.
- Cloudflare → Analytics for traffic; remember bot traffic inflates "requests" (use Web Analytics
  for real visitors).

## Common tasks
- **Rotate a secret:** Railway → Variables → edit → save (auto-redeploys). For `STRIPE_WEBHOOK_SECRET`
  you must also roll it in Stripe → Webhooks and paste the new value.
- **Reset the admin password:** set `ADMIN_RESET_PASSWORD` in Railway, redeploy; the app resets the
  admin login to it on boot. Remove the var afterwards.
- **Enable/disable a feature flag:** `COACH_MODE` (roleplay AI-evaluation — currently staged, off),
  `EARLY_BIRD_END_DATE` (pricing campaign). Unset = off.
- **Purge Cloudflare cache** after a CSS/asset change that isn't showing: Cloudflare → Caching →
  Purge (the app already cache-busts CSS with `?v=<assetVersion>`, but images/favicon may be cached).
- **Run the email digests manually:** `GET /cron/digest?key=$CRON_SECRET` and
  `/cron/admin-digest?key=$CRON_SECRET`. (Audit rec: move this secret to a header — see REPO_AUDIT P1.)
- **Owner notifications:** new signups + purchases email the admin address (and
  `OWNER_NOTIFICATION_EMAIL` if set).

## Backups & restore
- **Automatic:** `rotateDbBackups()` runs 10 s after boot then every 6 h → `.backup.1/2/3`.
- **Restore:** stop the app (or redeploy after), copy the chosen backup over the primary:
  `cp /data/users.db.backup.1 /data/users.db`, then restart. Verify `/health` + a login.
- **⚠️ Gap (see REPO_AUDIT P0):** all backups live on the **same volume** as the primary. Add an
  **off-box** copy (upload `users.db` to R2/S3 every 6 h) so a volume loss is survivable.

## Incident playbook
| Symptom | Likely cause | Action |
|---|---|---|
| App won't boot | Missing `GROQ_API_KEY` (OpenAI client throws at load) or empty `STRIPE_SECRET_KEY` (Stripe SDK throws) | Set the var in Railway; check boot logs |
| Purchases don't upgrade the user | Stripe webhook signature failing | Check `STRIPE_WEBHOOK_SECRET` matches Stripe; admin gets a `critical` alert; retry a real purchase |
| All data gone after a redeploy | `DB_PATH` on ephemeral disk, not the volume | **P0** — fix the volume mount; restore from backup if any survived |
| App slow / stalls under load | Whole-file `saveDb()` write blocking the event loop as data grows | Short term: fewer heavy writes; long term: see REPO_AUDIT P2 (managed DB) |
| DB file corrupt | Crash mid-write / volume issue | Restore latest good `.backup.N`; investigate volume health |
| Upload fails with connection reset | File > 100 MB (Cloudflare kills it) | Expected — client now validates size/format first; user should upload ≤100 MB audio |
| Chat/roleplay errors | Groq down / rate-limited | Transient; check Groq status; `chatLimiter` also caps abuse |

## Hard rules
- **One instance only.** The DB is in-process; a second instance = divergent data.
- **`DB_PATH` must be a persistent volume.** Confirm after any Railway infra change.
- **Never commit `.env` or `users.db`** (both gitignored). Never paste live secrets into chat/PRs.
- **Deploying = pushing to `main`.** Only push intentional, reviewed changes.
