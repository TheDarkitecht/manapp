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

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: cfg.systemPrompt },
        { role: 'user',   content: userContent },
      ],
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
async function processCall(audioBuffer, filename, { title, apiKey, promptVersion } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');

  // Steg 1: Transkribering (prompt-versionsoberoende)
  const transcription = await proAnalysis.transcribeAudio(audioBuffer, filename, apiKey);
  const text = transcription.text || '';
  if (text.trim().length < 50) {
    throw new Error(`För kort transkription (${text.length} tecken) — samtalet kanske är tyst eller korrupt`);
  }

  // Steg 2: LLM-analys med vald prompt-version
  const analysis = await analyzeWithPrompt(text, apiKey, { promptVersion, userTitle: title });

  // Steg 3: Word frequencies (lokalt, ingen API-kostnad)
  const wordFrequencies = extractWordFrequencies(text);

  return {
    transcript: {
      text,
      duration_sec: transcription.duration ? Math.round(transcription.duration) : null,
      language:     'sv',
      word_count:   countWords(text),
    },
    analysis,
    wordFrequencies,
  };
}

module.exports = {
  processCall,
  analyzeWithPrompt,
  extractWordFrequencies,
  countWords,
  SWEDISH_STOPWORDS,
};
