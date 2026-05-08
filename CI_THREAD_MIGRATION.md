# CI-thread — Datormigration-checklista

Använd denna fil när du flyttar utvecklingsmiljön till ny dator. Skapad
vid migrationspunkt 2026-04-23 efter Fas 3-leverans.

---

## ✅ Det här följer med automatiskt (finns i git)

När du kör `git clone https://github.com/TheDarkitecht/manapp.git` på nya
datorn får du:

- All produktionskod (CI-thread + andra threads)
- `CI_ROADMAP.md` — full roadmap över vad som är levererat och nästa steg
- `migrations/ci-schema.sql` — DB-dokumentation
- `services/prompts/feedback.js` — alla 5 metodiker med prompter
- Alla service-filer, routes, views, CSS

**Senaste CI-commit:** `e484437` (speaker-fix bundle).

---

## 📦 Det här ligger UTANFÖR git och MÅSTE flyttas manuellt

### 1. Claude-memories (KRITISKT)

Path på gamla datorn:
```
C:\Users\joaki\.claude\projects\C--Users-joaki-Documents-manapp\memory\
```

Innehåller alla mina projektminnen — index i `MEMORY.md`, sen en
fil per ämne (block-struktur, deploy-workflow, thread-arkitektur,
content-stil, gamification, pedagogiskt system, video-produktion,
Skadeståndshjälpen-sidoprojekt, TikTok-strategi, lockfile-disciplin,
m.m.). Listan kan ha växt sedan denna fil skrevs — kopiera HELA mappen.

**Hur:** kopiera HELA `memory/`-mappen rekursivt till samma path på nya datorn.
Path-formatet är: `C:\Users\<NYTT_USERNAME>\.claude\projects\<PROJEKT_HASH>\memory\`.

Projekt-hashen blir SAMMA om mapp-pathen är identisk (`C--Users-joaki-Documents-manapp`).
Om nya datorn har annat username (t.ex. `joakim` istället för `joaki`), blir
projekt-hashen `C--Users-joakim-Documents-manapp` och du måste antingen:

a) Behålla samma username på nya datorn (enklast)
b) Eller ändra mapp-namnet på den nya datorn så path matchar
c) Eller manuellt kopiera filerna till nya hashen

### 2. Miljövariabler (.env)

Om du har en lokal `.env`-fil för utveckling — kopiera den. Innehåller:
- `GROQ_API_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `STRIPE_SECRET_KEY` (om lokal Stripe-test)
- Etc

**OBS:** dessa är även satta i Railway, så för pure prod-utveckling behöver
du inte ens en lokal `.env`. Bara om du vill köra `npm run dev` lokalt.

### 3. Claude Code-inställningar (rekommenderas)

Om du har anpassningar (hooks, skills, keybindings, custom slash-kommandon):
```
C:\Users\joaki\.claude\settings.json
C:\Users\joaki\.claude\settings.local.json
C:\Users\joaki\.claude\skills\
C:\Users\joaki\.claude\hooks\
C:\Users\joaki\.claude\keybindings.json
```

Kopiera ev. det du har skapat. För default-installation behövs inget.

### 4. Du behöver INTE ta med

- `node_modules/` — `npm install` återskapar
- `users.db` — lokal dev-DB, prod-data finns i Railway-volume
- `uploads/` — temp-filer
- `.claude/worktrees/` — återskapas vid behov

---

## 🚦 Status när migrationen sker

### Vad fungerar i prod (Railway):
- Hela CI-pipelinen — bulk-upload, transcribing, analys, diarization, invändningsextraktion
- 5 metodiker med metodik-val per upload
- Outcome-tagging + säljare-tag
- Säljare-dashboards (`/admin/calls/salespeople`)
- Insights (`/admin/calls/insights`)
- Invändningsregister (`/admin/calls/objections`)
- Case-study-export
- Manuell speaker-rättning ("✏️ Rätta talare"-modal)
- Allowlist för testkonton (`CI_ALLOWED_USER_IDS=2,3` i Railway)

### Var soak-testet är:
- ~7 samtal uppladdade (Amelia, hälsokost-projektet)
- Inga taggade med säljare
- Inga taggade med outcome
- Insights/säljare-dashboards/invändningar är därför mest tomma

### Nästa logiska steg (när du är på nya datorn):
1. **Soak-test:** ladda upp 20-30 samtal från flera säljare med säljare-namn + tagga outcome
2. **Bedöm prompt-kvalitet** på 5-10 verkliga samtal
3. **Coordinera med Block-content-thread** att finslipa prompterna
4. (Eventuellt) backfill av invändningsextraktion för befintliga samtal

Se `CI_ROADMAP.md` för full kontext.

---

## 🔌 Verifiera att allt funkar på nya datorn

När du har kopierat memory + klonat repo:

```bash
cd path/to/manapp
npm install                          # installerar @aws-sdk/* + alla andra deps
node -c server.js                    # syntax-check
node -c services/callAnalytics.js
node -c services/transcribe.js
```

Allt bör vara grönt. För att starta lokalt:
```bash
# Behöver .env med R2_*, GROQ_API_KEY, etc
npm run dev
```

Eller bara koda och pusha till main → Railway deployar automatiskt utan
att du behöver köra något lokalt.

---

## 🤖 När du startar Claude Code på nya datorn

1. Kontrollera att memory-filerna laddats (säg "vad finns i din memory?" till mig)
2. Säg "vi fortsätter i CI-thread" så jag aktiverar rätt context
3. Aktuell branch: `main` (alla CI-commits är pushade)
4. Senaste CI-commit: `e484437`

Om memories saknas — referera till `CI_ROADMAP.md` så har vi kontext via repot.
