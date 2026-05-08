# Handover — flytt till ny dator

Datum: 2026-04-28
Thread: lucid-napier-9fb630 (CI-thread / content-thread)
Senaste commit på main: `e672aa0`

---

## 1. KOD — vad du behöver göra på nya datorn

### Ingenting akut — allt är pushat till main

Kontrollera när du klonar:
```bash
cd /path/to/manapp
git pull origin main
git log --oneline -5
# Senaste commit ska vara: e672aa0 feat(content): manus-mentaliteten + cold call-mall + invändnings-fil
```

### Worktree-strukturen — frivillig att återskapa

Worktrees är dator-specifika. Du kan jobba direkt i main-repot på nya datorn,
eller skapa nya worktrees per thread om du vill ha samma upplägg:

```bash
cd /path/to/manapp
git worktree add .claude/worktrees/content-thread main
```

---

## 2. FILER ATT TA MED (utöver git-repot)

### Kritiska — kopiera dessa manuellt

1. **`.env`** — finns inte i git (gitignored). Innehåller API-nycklar, DB-credentials.
   - Plats: `C:\Users\joaki\Documents\manapp\.env`

2. **MEMORY.md + projekt-specifik minneshantering** — om du vill behålla samma "Claude minne":
   - Plats: `C:\Users\joaki\.claude\projects\C--Users-joaki-Documents-manapp\memory\`
   - Ta hela memory-mappen (innehåller `MEMORY.md` + alla länkade .md-filer)

3. **Bok-foton & kursmaterial** — om du fortsätter med innehållsbygget:
   - Plats: `C:\Users\joaki\Brilliant V. Uppsala Dropbox\TIKTOK\humannatute bilder\`
   - Dropbox synkar automatiskt om du installerar Dropbox-klienten på nya datorn

4. **Lokala settings** — INTE nödvändigt, men spara om du vill:
   - Plats: `.claude/settings.local.json`
   - **Notera:** dator-specifik. Tilläggen jag gjorde idag (git checkout/rebase/stash, cd, grep, ls) bör återskapas på nya datorn första gången du gör samma operationer — eller kopiera över filen.

### Behövs INTE tas med

- `node_modules/` — installeras med `npm ci` på nya datorn
- `.git/worktrees/` — dator-specifika
- Lokal databas-fil om du har sqlite (kolla `.env` och Railway-config)

---

## 3. PÅGÅENDE ARBETE — VAR VI ÄR

### Vad som landade idag (2026-04-28)

**Stora paket pushade till main:**

1. **"Emotionell kontroll som säljarens operativsystem"** (commit `781fcfc`)
   - 19 sektioner över 8 block (Block 1, 6, 7, 9, 10, 11, 17, 19)
   - Från Greene Lag 1 + Lag 7 + ChatGPT-uppdateringar, översatta till JJ-stil
   - Nyckelteman: Maker mode, Praise effort, Kunden är data, Self-opinion-diagnos,
     Kundbiaser, Magnetkunder, Konfirmera självbilden, Använd kundens ord, Tajming,
     Mental judo, Hästen+ryttaren, Stigande tryck, Reaktionstid, Flexibla sinnet

2. **"Manus-mentaliteten + cold call-mall + invändnings-fil"** (commit `e672aa0`)
   - 6 sektioner över 3 block (Block 1, 7, 10)
   - Från Linchitz Ch 11+12 + ChatGPT
   - Nyckelteman: Skriv ord för ord, Pressure protection, Cold call-mall (6 steg + 2
     varianter), Primärt+sekundärt mål, Bygg din invändnings-fil (workbook),
     "Är det den verkliga invändningen?"

### Status: 23 block — alla intakta, alla testade (`node -e "require('./salesContent')"` returnerar 23)

---

## 4. PENDING — VAD SOM ÅTERSTÅR

### Från användarens lista (väntar på input)

1. **Mini-stories till Block 1** — Joakim ska ge bullets för:
   - Skoleleven D→A (för §10 eller §12)
   - Dottern (för §2 — Alla säljer varje dag)
   - Fästmön (för §16 — Retention-matten / Dale's 50%)
   - Underchef svag→topp (för §13 — 3 inställningsprinciper)
   - Eventuellt 500+ tränade säljare med konkret exempel

2. **Joakim-case** i 8 block som saknar:
   - Block 13 Referrals
   - Block 14 LinkedIn
   - Block 15 Videosamtal
   - Block 16 E-post
   - Block 19 Mental Styrka (en till)
   - Block 20 Träning & Hälsa
   - Block 21 Tidshantering
   - Block 22 AI

### Strukturella

- **Video-DNA finalisering** + pilot-inspelning (Block 1 segment 1)
- **Splitt av 7 stora block** till 2 moduler vart (Block 3, 6, 7, 8, 10, 11, 17 är >20KB)
- **15-20 visual ramverks-grafiker** för video-overlays

### Nice-to-have

- Greene Lag 1 finputs (delvis injicerat, kan utvidgas)
- Eventuellt extra invändningskategorier i Block 10 om du vill bygga ut workbook

---

## 5. CHATGPT-PARALELL DIALOG

Jocke har bollat plan-uppdateringar med ChatGPT genomgående. ChatGPT har:
- Givit feedback på säljparadigm-strukturen
- Pushat tillbaka på "reverse psychology"-terminologin (vilket ledde till
  mjukning till "genuin acceptans" i Block 10 + 17)
- Föreslagit "Maker's Mindset", "Rising Pressure", "Hästen och ryttaren" m.m.
  som alla nu är injicerade
- Lämnat vidare invändningsbiblioteks-detaljering, probe-bank-detaljering, och
  8-delars script-mall — substansen är täckt i nuvarande struktur

Om du vill fortsätta bolla med ChatGPT på nya datorn — fortsätt så. Min
rekommendation: vi har nu en GENOMARBETAD röd tråd. Mer injektion riskerar
att överväldiga. Fokusera på:
1. Dina egna case
2. Video-produktion
3. Test med riktiga användare

---

## 6. RAILWAY / DEPLOY-STATUS

- Senaste deploy bör ske inom 2 min efter `e672aa0` pushades
- Live: dvs sajten ska visa allt nytt innehåll efter hard refresh (Ctrl+Shift+R)
- Inga env-variabler behöver ändras

---

## 7. SNABBA HÄLSOKONTROLLER PÅ NYA DATORN

```bash
# 1. Klona
git clone https://github.com/TheDarkitecht/manapp.git
cd manapp

# 2. Installera deps
npm ci

# 3. Verifiera content-blocken
node -e "console.log('Blocks:', require('./salesContent').length)"
# Ska säga: Blocks: 23

# 4. Kontrollera att alla recenta sektioner finns
node -e "
const b = require('./salesContent');
const c = {
  'manus': b.find(x=>x.id==='inledning').theory.includes('manus-mentaliteten'),
  'cold call': b.find(x=>x.id==='prospektering').theory.includes('Cold call-mallen'),
  'invändnings-fil': b.find(x=>x.id==='invandningar').theory.includes('Bygg din invändnings-fil'),
  'self-opinion': b.find(x=>x.id==='lasa-av-manniskor').theory.includes('Självbilden'),
  'mental-judo': b.find(x=>x.id==='forhandling').theory.includes('Mental judo'),
  'hästen': b.find(x=>x.id==='mental-styrka').theory.includes('Hästen och ryttaren')
};
Object.entries(c).forEach(([k,v]) => console.log((v?'✓':'✗')+' '+k));
"

# 5. Lokalt dev-server om du vill testa
npm run dev   # eller motsvarande start-script
```

---

## 8. NÄR VI MÖTS PÅ NYA DATORN

Säg bara "fortsätt content-tråden" eller "jag är på nya datorn nu", så fortsätter vi
där vi slutade. Allt är pushat — ingen kontextförlust.

Om du vill att jag ska kolla något specifikt:
- "vad gjorde vi senast?" → läs detta dokument
- "vad väntar?" → sektion 4 i detta dokument
- "vad behöver injiceras?" → mini-stories från dig + 8 case-block

Trevlig flytt. Vi ses på nya maskinen.

— Claude Opus 4.7 (1M context)
