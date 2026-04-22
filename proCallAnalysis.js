// proCallAnalysis.js
// Pro-tier: call-upload-analyser via Groq (Whisper + LLM)
// Pure funktions: ingen DB-access, ingen filhantering — enbart API-anrop.

const GROQ_API_URL = 'https://api.groq.com/openai/v1';
const WHISPER_MODEL = 'whisper-large-v3-turbo'; // Snabbast + billigast
const LLM_MODEL = 'llama-3.3-70b-versatile';

/**
 * Transkribera ljudfil via Groq Whisper.
 * @param {Buffer} audioBuffer - filens innehåll
 * @param {string} filename - originalfilnamn (används för MIME-detektion)
 * @param {string} apiKey - Groq API-nyckel
 * @returns {Promise<{text: string, duration: number|null}>}
 */
async function transcribeAudio(audioBuffer, filename, apiKey) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');

  const form = new FormData();
  const blob = new Blob([audioBuffer]);
  form.append('file', blob, filename);
  form.append('model', WHISPER_MODEL);
  form.append('language', 'sv'); // svenska — fallback till auto-detect om tveksamt
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');

  const res = await fetch(`${GROQ_API_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Whisper error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    text: data.text || '',
    duration: data.duration || null,
  };
}

/**
 * Analysera säljsamtal med Jockes expertis.
 * Returnerar strukturerad feedback som markdown.
 */
async function analyzeCall(transcript, apiKey, { userTitle = null } = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY saknas');
  if (!transcript || transcript.trim().length < 50) {
    throw new Error('För kort transkription för meningsfull analys (min 50 tecken)');
  }

  const systemPrompt = `Du är Jocke — säljcoachen på Joakim Jaksens plattform. Joakim har 22+ års erfarenhet, 200+ MSEK i säljresultat, 1000+ tränade säljare.

Du analyserar ett VERKLIGT säljsamtal användaren precis laddat upp. Din uppgift: ge konkret, skarp feedback — som Joakim själv skulle ge sin mentee efter att ha lyssnat på samtalet.

STRUKTUR PÅ SVARET (markdown):

## 🎯 Sammanfattning
Ett stycke: vad var det här för samtal? Typ (cold call / möte / uppföljning), skede, utfall om tydligt. Max 3 meningar.

## ✅ Det här fungerade
2–4 konkreta observationer. Citera FAKTISKT det säljaren sa. Förklara VARFÖR det var bra (koppla till säljteknik — SPIN, labeling, Cialdini, Voss, etc).

## ⚠️ Här tappade du mark
2–4 konkreta missar. Citera vad säljaren sa och VAD det ledde till. Var tydlig om det var:
- Tekniskt fel (fel typ av fråga i fel läge)
- Tonalt fel (pressade när det borde varit nyfikenhet)
- Strategiskt fel (avslutade inte när läge fanns)

## 💬 Exakta förbättringsformuleringar
För VAR och EN av missarna ovan: ge exakt svensk formulering säljaren SKULLE sagt istället. Inte "försök vara lugnare" — utan "istället för '[citat]', säg: '[bättre formulering]'".

## 🎯 En sak att träna denna vecka
Välj ut EN teknik som skulle flyttat nålen mest. Kort, konkret handling. Koppla gärna till ett specifikt block i utbildningen (t.ex. "Block 3 — Tonfall, förvirrad ton").

VIKTIGT:
- Skriv på svenska.
- Var direkt, inte mjuk. Säljaren betalar 599 kr/mån för att bli BÄTTRE, inte för att bli peppad.
- Citera verkliga uttalanden från transkriberingen — använd citattecken.
- Undvik generiska säljklyshor. Gå in på detaljen.
- Om transkriberingen är delvis oläslig (Whisper missade något) — nämn det kort men fokusera på det du KAN analysera.`;

  const userContent = `${userTitle ? `SAMTAL: "${userTitle}"\n\n` : ''}TRANSKRIBERING:\n\n${transcript}`;

  const res = await fetch(`${GROQ_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 2000,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq LLM error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const analysis = data.choices?.[0]?.message?.content;
  if (!analysis) throw new Error('Tomt svar från AI');
  return analysis;
}

module.exports = {
  transcribeAudio,
  analyzeCall,
};
