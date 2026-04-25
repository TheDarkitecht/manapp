# Conversation Intelligence (CI) — Roadmap

CI-thread bygger Voxo-style call-analytics-motor ovanpå Pro-tiern.
Mål: aggregerad analys, mönsterextraktion, feedback-loop till kursinnehåll.
Skala-mål: Joakims säljkontor 1000 samtal/dag.

---

## ✅ Levererat (Fas 1 — MVP-1 + iterations-infra)

- **Bulk-upload-pipeline**: 1-100 ljudfiler, R2-storage, async DB-kö, en worker i taget
- **Cloudflare R2**: presigned URLs för audio-playback, lokal disk-fallback i dev
- **Whisper-transkribering** via Groq (svenska, verbose_json)
- **Per-samtal-analys** via llama-3.3-70b (Jocke-feedback, markdown)
- **Word-frequency** per samtal (svenska stoppord filtrerade)
- **Cross-call fulltext-sök** (LIKE över call_transcripts.text)
- **Admin-dashboard**: kö, historik, filter, stats
- **Auto-retry vid Groq 429** (TPM-rate-limit) — 30s + 45s backoff, max 2 retries
- **Speaker diarization** (opt-in checkbox per upload) — LLM-post-processing till "Säljare:/Kund:"-dialog
- **Metodik-val per samtal**: 5 säljstilar (tempo, abonnemang, behovsstyrd, b2b, inkommande), AI bedömer mot rätt kriterier
- **Re-analyse mot annan metodik**: "hur hade Amelia gjort om detta var försäkring istället?"
- **Prompt-versioning**: historik per samtal, vilken prompt som användes
- **Allowlist-middleware**: testkonton (arbetsledare) får CI-access utan full admin-roll
- **UTF-8-fix**: svenska tecken i filnamn

---

## ✅ Levererat (Fas 2 — Resultatmaskin-positionering)

### 1. Outcome-tagging per samtal ✅
Tagging-bar på detalj-sidan: sold | lost | no_sms | callback | other.
Tillgänglig för alla CI-users (admin + allowlist). Visas som färgad pill
i dashboard-tabellen. Avtaggning möjlig.

### 2. Säljare-tagging vid upload ✅
Frivilligt textfält på upload-form. Kan editeras i efterhand via detalj-
sidan. Driver per-säljare-aggregation i Insights.

### 3. Insights — winning vs losing words ✅
Ny vy: `/admin/calls/insights`
- Filter: säljare, metodik, period (30/90/365 dagar)
- Stats: outcome-fördelning + win-rate
- Top-30 winning + top-30 losing ord, sorterade på "lift" (smoothad ratio)
- Tydlig fallback när data är otillräcklig

### 4. Case-study-snippet-export ✅
Knapp på detalj-sidan: "📤 Case study". LLM genererar anonymiserad
markdown (säljare/kund/företag maskat) med 3 nyckelmoment + Jockes
coaching. Förhandsvisning + råmarkdown sida vid sida + kopiera-knapp.

---

## ✅ Levererat (Fas 3 — Aggregerad intelligens)

### 1. Säljare-dashboard per individ ✅
- Översikt: `/admin/calls/salespeople` — tabell med alla säljare, win-rate, outcome-fördelning
- Detalj: `/admin/calls/salesperson/:name` — full dashboard med:
  - Headline-stats + win-rate
  - Win-rate-trend över 12 veckor (CSS-bar-chart)
  - Metodik-fördelning (vilka projekt jobbar säljaren mest med?)
  - Per-säljare winning/losing words (top 15 vardera)
  - Senaste 50 samtalen

### 2. Invändningsregister ✅
- LLM extraherar invändningar automatiskt vid varje samtals-analys
- Kategorisering: pris/tid/behov/förtroende/auktoritet/praktiskt/annan
- Bedömning: handled_well (true/false/null)
- Detalj-sida visar invändningar i samtalet
- Aggregerad vy: `/admin/calls/objections`
  - Rankad på förekomst per kategori
  - Hanterad-bra-procent
  - Splits sold vs lost
  - Exempel-svar från sold-samtal (winning) och lost-samtal (losing)
  - Filter: säljare, metodik, period
- Misslyckad extraction = icke-fatalt (loggas, samtalet fortsätter vara done)

### 3. Few-shot-infra för prompts ✅
- `examples`-array per metodik i `services/prompts/feedback.js`
- Format: `{ transcript, feedback }`
- Skickas som user/assistant-par i Groq-anropet — LLM imiterar stilen
- Block-content-thread fyller på med benchmark-samtal löpande
- `list()` exposar exampleCount så UI kan visa "v3 har 3 examples"

---

## 📋 Nästa (Fas 4 — Content-loop, vision)

---

## 🔮 Vision (Fas 4 — Content-loop)

- Extraherade insikter blir nya rollspel i kursen
- Anonymiserade benchmark-stats för Premium/Pro-users ("säljare i din nivå stänger 23% — top-10% stänger 41%")
- Auto-genererade content-uppdateringar baserade på nya mönster
- **Throttle worker till TPM-budget** — undvik retry-overhead vid 1000/dag (just nu auto-retry, framöver: rate-limit på app-nivå)

---

## 🏷 Tekniska skulder / framtida

- **sql.js skalar inte** — vid ~10k samtal måste vi byta till `better-sqlite3` eller Postgres
- **Tonfall-analys** — Whisper ger bara text. För akustisk analys (ton, tempo, pauser) krävs byte till Deepgram eller AssemblyAI som transkriptions-provider
- **Worker-skalning** — för 1000 samtal/dag en-i-taget räcker, men för burst-load behövs BullMQ+Redis eller pg-boss

---

## 🚦 Thread-gränsdragning

- **CI-thread** (denna): pipeline, infrastruktur, aggregations-routes, UI för CI
- **Block-content-thread**: prompt-INNEHÅLL (vad metodikerna ska bedöma), few-shot-examples, koppling mellan AI-feedback och utbildningsblock
- **Platform-infrastructure-thread**: roller (om `coach`-roll behövs), email-login (klart), `requireAdmin`-middleware
- **Design-thread**: visuell polish (vi rör inte style.css/pro.css/etc)
