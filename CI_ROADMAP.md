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

## 🚧 Pågående (Fas 2 — Resultatmaskin-positionering, prio 1)

Detta är basen för "vi gör säljteam mätbart bättre"-positionering.

### 1. Outcome-tagging per samtal
Joakim taggar varje färdiganalyserat samtal med utfall:
- `sold` — kunden sa ja och bekräftade SMS
- `lost` — kunden sa nej eller försvann
- `no_sms` — muntligt ja men inget SMS-svar (=de facto lost)
- `callback` — uppföljning bokad
- `other` — udda fall

Krävs som grundval för punkt 2 + 3.

### 2. Word/fras-frekvens-aggregation per säljare + outcome
"Vilka fraser använder top-30%-säljarna som bottom-30% INTE använder?"
"Vilka ord är överrepresenterade i sold vs lost?"

Beräkning: korstabulera `call_word_frequencies` mot `call_jobs.outcome` och `call_jobs.salesperson_name`. Visa top-50 winning + top-50 losing ord. Filter: per säljare, per metodik, per datum.

Detta är exakt det säljkontor betalar för i Voxo-liknande verktyg.

### 3. Case-study-snippet-export
Knapp på detalj-sida: "Exportera som case study". Genererar anonymiserad
markdown (kundnamn maskat, säljare initialer) med 2-3 nyckelmoment +
Jockes feedback. För Joakims marknadsförings-site ("se vad systemet gör").

---

## 📋 Nästa (Fas 3 — Aggregerad intelligens)

- **Säljare-dashboard per individ**: alla samtal, win-rate, vanligaste invändningar, signatur-fraser, framsteg över tid
- **Invändningsregister**: extrahera alla invändningar över korpusen, gruppera, ranka, koppla till bästa-svar-fras
- **Few-shot-infra för prompts**: Joakim väljer 3-5 benchmark-samtal, skriver feedback-han-skulle-gett, AI imiterar hans stil framöver
- **Throttle worker till TPM-budget**: undvik retry-overhead vid 1000/dag

---

## 🔮 Vision (Fas 4 — Content-loop)

- Extraherade insikter blir nya rollspel i kursen
- Anonymiserade benchmark-stats för Premium/Pro-users ("säljare i din nivå stänger 23% — top-10% stänger 41%")
- Auto-genererade content-uppdateringar baserade på nya mönster

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
