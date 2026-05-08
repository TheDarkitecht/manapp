# CSS-tråd — handoff (datorbyte)

> Denna fil är temporär. Ta bort när tråden mergeats till main eller när
> nästa session läst igenom den.

---

## TL;DR

Branch: **`claude/naughty-lumiere-cf0a87`** — pushad till origin, 3 commits framåt
av min historia, **9 commits bakom main** (andra trådar har pushat).
Inget jobb är förlorat — allt finns på GitHub.

---

## Vad du behöver fysiskt ta med dig (utöver `git clone`)

Inget från denna tråd specifikt — koden ligger på GitHub och plockas upp via:

```bash
git clone https://github.com/TheDarkitecht/manapp.git
cd manapp
git checkout claude/naughty-lumiere-cf0a87
npm install
```

Generella saker (oberoende av tråden, men relevant):

- **`.env`** — Stripe-nycklar, OpenAI-nyckel, sessionssecret. INTE i git.
- **`./database/*.sqlite`** (om du har lokal data) — backuper finns var 6:e
  timme enligt memory-not, men nyaste lokala state är inte där.
- **`~/.claude/projects/.../memory/MEMORY.md`** + länkade `.md` — din auto-memory.
  INTE i git, måste kopieras manuellt.
- **`.claude/settings.local.json`** i alla worktrees — gitignored,
  innehåller permission-allowlist (smärtfri att bygga upp på nytt, men
  spar tid att kopiera över).

---

## Trådens nuvarande state

### Levererat (3 pushade commits på branchen)

| Commit | Beskrivning | Filer |
|--------|-------------|-------|
| `50ac665` | **Design tokens** — `public/tokens.css` + 1 280 hex→token-ersättningar över 6 CSS-filer. `@import` i `style.css` ärver globalt. | `public/tokens.css` (ny), `style.css`, `gamification.css`, `journey.css`, `pro.css`, `recommendations.css`, `bevis.css` |
| `ed86bfc` | **Button-system** — `.btn` + BEM-varianter (`--primary`, `--secondary`, `--ghost`, `--success`, `--danger`, `--warning`, `--link`) + storlekar (`--sm`/`--lg`/`--xl`) + modifiers (`--full`/`--icon`/`--pill`) + `:disabled`/`.is-loading`. Net-new CSS, inga befintliga klasser renamade. | `style.css` (rad ~4047–4243) |
| `301c39b` | **Long-form readability + mobile UX** — `.theory-body`-typografi för 1500+ ords texter (70ch measure, line-height 1.78, pull-quote blockquote, `<hr>`-divider, mobil-anpassning). Body-level `padding-bottom` skyddsnät via `body:has(.app-bottom-nav)`. Reading progress bar — inline → token-baserad CSS-klass. | `style.css`, `views/block.ejs` (bara markup, ingen logikändring) |

### Originalplanen — där vi är nu

```
[1] Design tokens             ✅ DONE (50ac665)
[2] Button-system             ✅ DONE (ed86bfc)
[3] Extrahera topp-5 inline   ⏸  PAUSED — riskar konflikt med andra trådar
[4] Focus/a11y-fix            ⏸  PAUSED — säker att köra när som
[BONUS] Long-form + mobile UX ✅ DONE (301c39b) — extra brief från användaren
```

---

## Vad nästa session bör göra (i prioritetsordning)

### 1. Säker att köra direkt (CSS-only, ingen risk för konflikt)

**Step 4 — Focus/accessibility-fix (~45 min)**
- Sök i `public/style.css` efter alla `outline: none` (15+ träffar)
- Säkerställ att VARJE plats med `outline: none` har en `:focus-visible`-fallback
  med synlig ring (2px solid `var(--color-primary)`, offset 2-3px)
- Det finns redan en global `:focus-visible`-regel i slutet av `style.css`
  (rad ~4028) — men 15-20 ställen tidigare i filen overrider den
- Targeted `outline: none` ersätts med `outline: none; &:focus-visible { … }`

### 2. Måste vänta på att andra trådar landat på main

**EJS inline-button-migrering**
- 70 inline `<button style="…">`/`<a style="…">` i views/
- Hotspots: `views/dashboard.ejs` (~15), `views/block.ejs` (~12), `views/account.ejs` (~1)
- ⚠️ HÖG konfliktrisk: andra trådar kan redigera samma EJS-filer just nu
- **Vänta** tills användaren bekräftar att Platform Infra + Block Content + Tråd 4
  har landat / är pausade

**Konsolidera gamla button-klasser**
- 56 befintliga klasser i CSS (`.auth-btn`, `.lp-btn-primary`, `.jc-btn`,
  `.rp-btn-*`, `.btn-logout`, `.btn-new-note`, `.btn-cancel`, `.btn-delete`,
  `.btn-del`, `.btn-email`, `.success-btn`, `.levelup-btn` m.fl.)
- De ska antingen aliasera till nya `.btn`-systemet eller migreras i mallarna
- ⚠️ Också konfliktrisk om andra trådar lägger till nya knappar på vägen

### 3. Övriga polish-möjligheter (från audit-rapporten)

- **Skeleton loaders / loading states** — finns inga `.skeleton`-klasser idag
- **Empty states** — listvyer/admin-tabeller saknar tomma-tillstånd-styling
- **44 `!important`** kvar i style.css (mest i quiz-tillstånd, rad ~1288–2310)
  — kräver omstrukturering av specificity, inte trivialt
- **Mobile breakpoints städning** — 8 olika breakpoints (480/600/640/768/900),
  bör standardiseras till 3 (480/768/1024)

---

## Viktiga begränsningar / regler från användaren

- **`Direkt push till main är OK för godkända ändringar`** — men inte här,
  med 4 parallella trådar igång ⇒ pusha till min branch, låt användaren
  orkestrera mergen
- **RÖR INTE**: `server.js`, `database.js`, `salesContent.js` (per direkta
  instruktioner i sista briefen)
- **Bara CSS-klass-mods i EJS**: aldrig logikändringar, bara klassnamn/markup
- **Lockfile-disciplin**: `package-lock.json` ska uppdateras i samma commit
  som `package.json` om paket läggs till (Railway `npm ci` kräver exakt match).
  Inget paket har lagts till i denna tråd hittills.
- **Inga emojis i brödtext** för innehållsfiler — gäller copy/innehåll, inte
  CSS-kommentarer eller commit-meddelanden

---

## Trådens kontext

Detta är **Thread 3** i en uppsättning av 4 parallella trådar:

1. **Platform Infrastructure Thread** — server, db, deployment
2. **Block Content Thread** — salesContent.js, blockPractice.js, block-relaterat
3. **Design/CSS Polish Thread** ← DENNA
4. **Tråd 4** — okänd

Min branch är **9 commits bakom main** för att andra trådar har pushat.
Användaren orkestrerar mergen själv när alla trådar är klara.

---

## Snabbreferens — token-systemet

CSS-tokens definierade i `public/tokens.css`. Använd `var(--token-name)`
i all ny CSS. Vanligaste:

```
Färger:    --color-primary, --color-text, --color-text-dim, --color-bg,
           --color-surface, --color-success, --color-danger, --color-warning
Overlays:  --color-overlay-{02..12}, --color-primary-a{05..40}
Radius:    --radius-sm/md/lg/xl/2xl/pill
Shadows:   --shadow-sm/md/lg/xl, --shadow-primary-glow
Trans:     --transition-fast/base/slow
Gradient:  --gradient-primary, --gradient-primary-deep
```

Knapp-systemet: `<button class="btn btn--primary btn--sm">…</button>`

---

*Skriven av Claude (CSS-tråden) inför Joakims datorbyte. När du läst klart
denna kan filen tryggt raderas — all info är destillerad från commit-historik
och pågående todo-state.*
