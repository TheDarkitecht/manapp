// services/callAnalytics.js
// ═══════════════════════════════════════════════════════════════════════════
// CI-kärnlogik. Kopplar ihop Groq-APIet (via proCallAnalysis.js) med
// word-frequency-extraktion. Denna fil har INGEN DB-access och ingen
// filhantering — den är pure och testbar i isolation.
//
// Fas 2+ expanderar här: sentiment-score, outcome-klassificering, etc.
// ═══════════════════════════════════════════════════════════════════════════

const proAnalysis = require('../proCallAnalysis');
const prompts     = require('./prompts/feedback');

const GROQ_API_URL = 'https://api.groq.com/openai/v1';

// ─── Rate-limit-aware retry ─────────────────────────────────────────────────
// Groq on_demand-tier har 12000 TPM. Långa samtal + diarization + analys kan
// lätt spränga det. Istället för att direkt fajla jobbet: vänta och retry:a
// upp till N gånger. Användaren behöver inte klicka "Försök igen" manuellt.
//
// Varför 30s + 45s? Groq's minute-window är rullande. 30s räcker oftast för
// att delvis återställa TPM. 45s som andra retry om det inte räckte.
async function callGroqWithRetry(fn, label = 'groq-call', maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      const is429 = msg.includes('429') || msg.toLowerCase().includes('rate limit');
      if (!is429 || attempt === maxRetries) throw err;
      const waitMs = 30000 + attempt * 15000; // 30s, 45s
      console.warn(`[callAnalytics] ${label} rate-limited (attempt ${attempt + 1}/${maxRetries + 1}) — väntar ${waitMs / 1000}s innan retry`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

// Svenska stoppord — filtrerat bort från word-frequency. Listan är lagom
// konservativ; vi vill ha kvar säljrelaterade ord som "pris", "kund", etc.
const SWEDISH_STOPWORDS = new Set([
  'och','att','det','som','är','en','på','har','de','med','för','den','var',
  'kan','om','sig','så','men','inte','ja','nej','jag','du','vi','ni','han',
  'hon','det','ett','i','till','av','från','eller','men','bara','mycket',
  'där','här','vad','när','hur','vem','vilka','vilken','vilket','detta',
  'dessa','denna','detta','också','ska','skulle','kunde','ville','får','fick',
  'kommer','kom','gör','gjorde','se','ser','såg','sa','säger','sagt','tycker',
  'tror','vet','har','hade','haft','varit','blir','blev','blivit','är','var',
  'varit','bli','vara','ha','så','mig','dig','sig','oss','er','dem','min',
  'din','sin','vår','er','deras','hans','hennes','dess','någon','något',
  'några','ingen','inget','inga','alla','allt','mer','mest','mindre','lite',
  'liten','litet','lilla','stor','stort','stora','ju','väl','nog','kanske',
  'ungefär','typ','liksom','bara','även','redan','fortfarande','aldrig',
  'alltid','ofta','sällan','gång','gånger','idag','imorgon','igår','nu',
  'då','sedan','efter','innan','före','under','över','genom','mellan',
  'jaha','okej','okay','mm','hm','eh','äh','alltså','faktiskt','precis',
]);

/**
 * Normalisera ord: lowercase + strip interpunktion.
 */
function normalizeWord(raw) {
  return raw
    .toLowerCase()
    .replace(/[.,;:!?"'`()\[\]{}<>«»„""''/\\|]/g, '')
    .replace(/^[-–—]+|[-–—]+$/g, '')
    .trim();
}

/**
 * Extrahera top-N ord från transkript. Returnerar array av { word, count }
 * sorterad fallande.
 */
function extractWordFrequencies(text, { topN = 50, minLength = 3 } = {}) {
  if (!text || typeof text !== 'string') return [];
  const counts = new Map();
  const words = text.split(/\s+/);
  for (const raw of words) {
    const w = normalizeWord(raw);
    if (!w) continue;
    if (w.length < minLength) continue;
    if (SWEDISH_STOPWORDS.has(w)) continue;
    if (/^\d+$/.test(w)) continue; // rena siffror (pris/belopp hanteras separat senare)
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Räkna totalt antal ord (för stats, inte top-N).
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

// ─── Speaker diarization via LLM post-processing ────────────────────────────
// Groq Whisper ger bara blob-text utan speaker labels. Vi kör en extra LLM-
// call som klassificerar varje yttrande som "Säljare:" eller "Kund:". Inte
// perfekt (kanske 80-90% träff), men dramatiskt bättre läsbarhet och bättre
// kontext för huvudanalys-prompten.

const DIARIZATION_SYSTEM = `Du får ett råtranskript från ett säljsamtal på svenska, utan markering av vem som säger vad. Din uppgift: dela upp texten i yttranden och klassificera varje som "Säljare:" eller "Kund:".

REGLER:
- Börja ALLTID med säljaren (säljsamtal öppnas alltid av säljaren — "Hallå?", "Hej, jag ringer från...", etc).
- Varje nytt yttrande på ny rad med "Säljare:" eller "Kund:" som prefix.
- Behåll ORD FÖR ORD vad som sagts. Ändra INTE ord, lägg INTE till, ta INTE bort. Bara split + label.
- Vid korta "mm", "ja", "okej" — gissa baserat på kontext (är det en bekräftelse från den som lyssnar, eller en öppning?).
- Om Whisper uppenbarligen missade ord (ex. "jag h inte riktigt d f vad sa du") — behåll exakt som det står, märk ändå som rimlig talare.
- Inga andra markeringar, ingen analys, ingen sammanfattning. BARA strukturerad dialog.

OUTPUT-FORMAT (strikt):
Säljare: [yttrande]

Kund: [yttrande]

Säljare: [yttrande]

(Tom rad mellan varje yttrande.)`;

async function identifySpeakers(rawText, apiKey) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');
  if (!rawText || rawText.trim().length < 20) {
    throw new Error('För kort text för diarization (min 20 tecken)');
  }

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: DIARIZATION_SYSTEM },
        { role: 'user',   content: `RÅTRANSKRIPT:\n\n${rawText}` },
      ],
      max_tokens:  4000, // diarization output är ungefär samma längd som input + labels
      temperature: 0.1,  // deterministiskt — vi vill inte ha kreativitet här
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq diarization error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Tomt svar från diarization-LLM');
  return text.trim();
}

/**
 * Kör LLM-analys med en specifik prompt-version. Ren funktion: ingen DB-access.
 * Användas både av processCall (hela pipelinen) och av re-analyze-endpointen
 * (bara LLM-steget på existerande transkript).
 */
async function analyzeWithPrompt(transcript, apiKey, { promptVersion, userTitle } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');
  if (!transcript || transcript.trim().length < 50) {
    throw new Error('För kort transkription för meningsfull analys (min 50 tecken)');
  }

  const cfg = prompts.get(promptVersion) || prompts.getActive();
  const userContent = `${userTitle ? `SAMTAL: "${userTitle}"\n\n` : ''}TRANSKRIBERING:\n\n${transcript}`;

  // Bygg messages: system + few-shot-exempel (om finns) + nytt samtal.
  // Exempel skickas som user/assistant-par så LLM:en uppfattar dem som
  // verkliga prior turns att imitera, inte som del av instruktionerna.
  const messages = [{ role: 'system', content: cfg.systemPrompt }];
  const examples = Array.isArray(cfg.examples) ? cfg.examples : [];
  for (const ex of examples) {
    if (!ex || !ex.transcript || !ex.feedback) continue;
    messages.push({ role: 'user',      content: `TRANSKRIBERING:\n\n${ex.transcript}` });
    messages.push({ role: 'assistant', content: ex.feedback });
  }
  messages.push({ role: 'user', content: userContent });

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       cfg.model,
      messages,
      max_tokens:  cfg.maxTokens,
      temperature: cfg.temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq LLM error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const analysis = data.choices?.[0]?.message?.content;
  if (!analysis) throw new Error('Tomt svar från AI');

  return {
    text:          analysis,
    model:         cfg.model,
    promptVersion: cfg.id,
  };
}

/**
 * Kör hela analysen för ett samtal: Whisper + LLM + word-freq.
 * Returnerar { transcript, analysis, wordFrequencies, meta }.
 * Kastar vid fel — caller (callQueue) hanterar status/error.
 */
async function processCall(audioBuffer, filename, { title, apiKey, promptVersion, identifySpeakers: doIdentify } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');

  // Steg 1: Transkribering (med auto-retry vid 429 — ovanligt men kan hända)
  const transcription = await callGroqWithRetry(
    () => proAnalysis.transcribeAudio(audioBuffer, filename, apiKey),
    'whisper-transcribe'
  );
  const text = transcription.text || '';
  if (text.trim().length < 50) {
    throw new Error(`För kort transkription (${text.length} tecken) — samtalet kanske är tyst eller korrupt`);
  }

  // Steg 2 (opt-in): Speaker diarization via LLM. Ger oss en strukturerad
  // "Säljare:/Kund:"-version av transkriptet. Misslyckas inte hela pipelinen
  // om diarizationen kraschar — vi loggar och fortsätter med raw text.
  let structuredText = null;
  if (doIdentify) {
    try {
      structuredText = await callGroqWithRetry(
        () => identifySpeakers(text, apiKey),
        'llm-diarization'
      );
    } catch (err) {
      console.warn('[callAnalytics] diarization misslyckades, fortsätter med raw text:', err.message);
    }
  }

  // Steg 3: LLM-analys. Använd structured_text när den finns — LLM:en får
  // bättre kontext när den vet vem som säger vad. Auto-retry vid rate limit.
  const textForAnalysis = structuredText || text;
  const analysis = await callGroqWithRetry(
    () => analyzeWithPrompt(textForAnalysis, apiKey, { promptVersion, userTitle: title }),
    'llm-analysis'
  );

  // Steg 4: Word frequencies (på raw text — vi vill inte räkna "säljare" och "kund" som riktiga ord)
  const wordFrequencies = extractWordFrequencies(text);

  return {
    transcript: {
      text,
      structured_text: structuredText,
      duration_sec:    transcription.duration ? Math.round(transcription.duration) : null,
      language:        'sv',
      word_count:      countWords(text),
    },
    analysis,
    wordFrequencies,
  };
}

// ─── Invändningsextraktor (Fas 3) ───────────────────────────────────────────
// LLM extraherar strukturerade invändningar + svar från ett samtal. Output:
// JSON-array som lagras i call_objections-tabellen för aggregerad analys.

const OBJECTION_EXTRACTOR_SYSTEM = `Du extraherar invändningar från ett säljsamtal-transkript.

DEFINITION AV "INVÄNDNING":
- Allt kunden säger som signalerar tvekan, motstånd eller skäl att INTE köpa.
- Exempel: "för dyrt", "har inte tid", "behöver fundera", "äter medicin",
  "har redan en leverantör", "vet inte om jag behöver", "min man bestämmer".
- Inkludera även mjuka invändningar ("hmm, jag vet inte...") och konkreta
  ("Det krockar med min medicin").

KATEGORISERING (välj EN per invändning):
- "pris"        — för dyrt, har inte råd, för mycket pengar
- "tid"         — har inte tid, vill tänka, kommer tillbaka senare
- "behov"       — behöver inte, har redan, ointresserad
- "förtroende"  — vet inte om det funkar, dålig erfarenhet förut, scam-misstanke
- "auktoritet"  — kan inte själv besluta, måste fråga någon
- "praktiskt"   — funkar inte med min situation (medicin, allergier, etc)
- "annan"       — om ingen annan kategori passar

BEDÖMNING AV HANTERING:
- "handled_well": true om säljaren bemötte invändningen med diagnos-fråga,
  acknowledge + relevant svar, eller styrde mot hanterbar invändningstyp.
- false om säljaren körde över, ignorerade, eller pressade.
- null om oklart.

OUTPUT (strikt JSON, inget annat):
{
  "objections": [
    {
      "objection_text": "exakt citat eller paraphrase av kundens invändning",
      "category": "pris|tid|behov|förtroende|auktoritet|praktiskt|annan",
      "salesperson_response": "exakt citat eller paraphrase av säljarens svar",
      "handled_well": true|false|null
    }
  ]
}

Om INGA invändningar finns: returnera { "objections": [] }.
Returnera INGET ANNAT än JSON. Ingen markdown-fence, ingen förklaring.`;

async function extractObjections(transcript, apiKey) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');
  if (!transcript || transcript.trim().length < 50) {
    return []; // för kort för meningsfull extraction
  }

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: OBJECTION_EXTRACTOR_SYSTEM },
        { role: 'user',   content: `TRANSKRIPT:\n\n${transcript}` },
      ],
      max_tokens:  2000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq objection-extract error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.objections) ? parsed.objections : [];
  } catch (err) {
    console.warn('[callAnalytics] objection JSON parse fel:', err.message);
    return [];
  }
}

// ─── Case-study-generator för marknadsföring ────────────────────────────────
// LLM-call som tar transcript + analys och returnerar anonymiserad markdown
// case study för Joakims marketing-site. Kritiskt: ANONYMISERING måste vara
// hårdkodad i prompten — vi vill aldrig av misstag publicera kundens namn.

const CASE_STUDY_SYSTEM = `Du genererar en case study för marknadsföring av en AI-säljcoach. Output: enkel markdown.

KRITISKA ANONYMISERINGSREGLER (bryt aldrig dessa):
- Ersätt säljarens riktiga namn med "Säljaren" eller "Säljare A".
- Ersätt kundens riktiga namn med "Kunden".
- Ta bort/maska företagsnamn, gatuadresser, personnummer, telefonnummer, e-postadresser.
- Behåll branschen generellt (t.ex. "hälsokost", "telekom") men inte specifika produktnamn eller varumärken.

STRUKTUR PÅ CASE STUDY:

# Case Study — [Samtalstyp + Bransch]

## Bakgrund
1-2 meningar: vilken typ av samtal, vilken bransch, vilket utfall.

## Tre nyckelmoment

### 1. [Kort rubrik på vad som hände]
> "Säljaren: [citat anonymiserat]"
> "Kunden: [citat anonymiserat]"

**Vad Jocke ser:** [1-2 meningar — vad som var bra eller dåligt enligt vald metodik]

### 2. [Kort rubrik]
[Samma struktur]

### 3. [Kort rubrik]
[Samma struktur]

## Coachens slutsats
2-3 meningar: vad detta samtal lär oss, hur säljaren kan förbättra sig, varför AI-coaching slår mänsklig retroaktiv feedback.

VIKTIGT:
- Markdown, klar att klistras in i hemsida eller LinkedIn-post.
- Inga personliga detaljer som kan identifiera säljaren eller kunden.
- Citera ordagrant från transkriptet (men anonymisera namn).
- Håll det punchy — case studies på marketing-site läses snabbt.`;

async function generateCaseStudy(transcript, analysis, apiKey, { methodology, salesperson, callTitle } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');
  if (!transcript) throw new Error('Inget transkript tillgängligt');

  const userContent = [
    methodology ? `METODIK: ${methodology}` : null,
    salesperson ? `SÄLJARE (anonymisera): ${salesperson}` : null,
    callTitle   ? `SAMTAL: ${callTitle}`   : null,
    '',
    'TRANSKRIPT:',
    transcript,
    '',
    'JOCKES FEEDBACK (för referens — anonymisera om citat hänvisar till namn):',
    analysis || '(ingen feedback tillgänglig)',
  ].filter(line => line !== null).join('\n');

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: CASE_STUDY_SYSTEM },
        { role: 'user',   content: userContent },
      ],
      max_tokens:  2000,
      temperature: 0.5,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq case-study error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Tomt svar från case-study-LLM');
  return text.trim();
}

module.exports = {
  processCall,
  analyzeWithPrompt,
  identifySpeakers,
  extractObjections,
  generateCaseStudy,
  extractWordFrequencies,
  countWords,
  SWEDISH_STOPWORDS,
};
