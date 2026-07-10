# PROGRESS.md — changelog

Notable changes, newest first. Dates approximate. This file is maintained by hand; commit
hashes in parentheses.

## 2026-07 — Production-readiness audit + brand
- **Audit:** full read-only production-readiness audit across routes, env, security, storage,
  code-health, and deployment → `REPO_AUDIT.md`, plus `README.md`, `ENVIRONMENT.md`,
  `DEPLOYMENT.md`, `RUNBOOK.md`, this file. No SQLi / auth-bypass / secret exposure found;
  main risks are data durability/scaling and view-layer duplication (all documented).
- **Security fix:** DOM-XSS in `views/pro-analysis.ejs` — AI analysis text now HTML-escaped
  before markdown→`innerHTML` (mirrors the roleplay renderer).
- **Fix:** client-side file validation on `/pro/samtal/ny` (size ≤100 MB + audio format) so
  oversized/wrong files get a clear message instead of `ERR_CONNECTION_RESET` (`a4f2b83`).
- **Brand:** real signature logo (script "Joakim" + bold "JAKSEN") replaces the 🎯 emoji
  wordmark in the landing header/footer; standardized favicon → `/favicon.svg` across all views
  (tab no longer hops between 🎯/🎙️/💳); added `logo-signature-white/ink.png`, `favicon.svg`,
  `logo-mark.svg` (`36f6ac6`).
- **Temp:** preview video-thumbnail in block 11 (avslut) video slot (`c29797d`, `9ec2ce6`).

## COACH_MODE — Jocke roleplay evaluation (deployed behind an admin gate)
- Schema-validated, transcript-grounded evaluation of roleplays against each scenario's
  `successCriteria`, with per-user persistence, progress across attempts, and HMAC-signed
  transcript anti-forgery. The legacy free-text `[KLAR]` path is preserved.
- **Gating:** `COACH_MODE=admin` → visible only to admin accounts (internal prod testing);
  `COACH_MODE=on` → all premium users; `COACH_MODE_USER_IDS=1,5` → specific users; unset → off.
- Shipped code behind the flag (off by default). `node:test` suite (`npm test`, 29 tests).
  Full write-up: `FINAL-REPORT.md` + `jocke-coach/` (local mission artifacts, not committed).

## 2026-06 — SEO + growth
- Dynamic `/sitemap.xml` route with per-deploy `lastmod` (`5098531`).
- Video SEO: `VideoObject` schema + video sitemap for the hero video (`8594f53`, `9ebfeec`).
- Image SEO: portrait in Om-section, workshop image on /priser, expert portrait on /foretag,
  platform screenshot on the Academy section, all with `Person.image` schema
  (`f854ef4`,`c4ccf69`,`e6f6c64`,`cc98709`).
- Owner notifications: email the admin on new signup + new purchase (`92d6121`, `3d583f5`).
- Early-bird pricing campaign + clearer price hierarchy/banner (`74054ec`, `50a809b`).
- Jocke roleplay: role-agnostic system prompt; markdown rendering in chat (`4fc39b3`,`c813567`).
- Domain migration to apex `joakimjaksen.se`; banner-above-nav layout fix (`b714aa7`).

## Conventions
- Commit style: `type(scope): summary` in Swedish (fix/feat/seo/copy/brand/temp/docs).
- Deploying = pushing to `main` (Railway auto-deploy). Push only reviewed changes.
