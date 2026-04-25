// services/transcribe.js
// ═══════════════════════════════════════════════════════════════════════════
// Transkriberings-abstraktion. Idag: Groq Whisper. Imorgon (om vi byter):
// Deepgram, AssemblyAI, eller egen Whisper-instans. Hela CI-pipeline:n
// importerar BARA denna fil — provider-bytet blir då en enrads-ändring i
// `defaultBackend`, ingen omskrivning av callQueue, callAnalytics, eller
// proCallAnalysis.
//
// API-kontrakt (alla backends måste returnera samma struktur):
//   {
//     text:     string,           // löpande text, hela transkriptet
//     duration: number | null,    // sekunder
//     language: string | null,    // ISO-kod, ex 'sv'
//     segments: Array<{ start, end, text, speaker? }> | null,  // valfritt
//     speakers: Array<string>     | null,  // valfritt — om provider stödjer
//                                          //   diarization (Deepgram et al)
//   }
//
// `segments` och `speakers` är optional. Om provider levererar dem kan
// callAnalytics skippa LLM-diarization-steget. Om inte: fallback till
// vår egen identifySpeakers-LLM-call.
// ═══════════════════════════════════════════════════════════════════════════

const proAnalysis = require('../proCallAnalysis');

// ─── Backend: Groq Whisper (default) ────────────────────────────────────────
// Wraps proCallAnalysis.transcribeAudio så att returstrukturen matchar
// vårt kontrakt. Groq Whisper saknar diarization — segments/speakers = null.
async function groqWhisperBackend(buffer, filename, apiKey) {
  const result = await proAnalysis.transcribeAudio(buffer, filename, apiKey);
  return {
    text:     result.text || '',
    duration: result.duration || null,
    language: 'sv',  // vi tvingar svenska i proCallAnalysis
    segments: null,  // Groq verbose_json ger segments men vi använder dem inte än
    speakers: null,  // Groq saknar diarization
  };
}

// ─── Framtida backends (placeholder-stubbar, ej implementerade än) ─────────
// När platform/CI-thread bestämmer att vi byter, implementera här:
//
// async function deepgramBackend(buffer, filename, apiKey) {
//   // POST till Deepgram med diarize=true
//   // Map response till vårt kontrakt:
//   //   - text:     hela transkriptet
//   //   - segments: [{ start, end, text, speaker: 'Säljare'|'Kund' }]
//   //   - speakers: ['Säljare', 'Kund']
//   // Då slipper callAnalytics köra identifySpeakers-LLM-callen.
// }
//
// async function assemblyAIBackend(buffer, filename, apiKey) { ... }

// ─── Backend-väljare ────────────────────────────────────────────────────────
// Sätts via env-var TRANSCRIBE_BACKEND. Default = 'groq'. Andra värden
// kastar tills vi implementerat dem — INGEN tyst fallback för att undvika
// att vi tror vi använder bättre provider men i själva verket kör Groq.

const BACKEND = process.env.TRANSCRIBE_BACKEND || 'groq';

async function transcribe(buffer, filename, apiKey) {
  switch (BACKEND) {
    case 'groq':
      return await groqWhisperBackend(buffer, filename, apiKey);
    // case 'deepgram':
    //   return await deepgramBackend(buffer, filename, apiKey);
    default:
      throw new Error(`Okänd TRANSCRIBE_BACKEND: ${BACKEND}. Stödda: groq.`);
  }
}

/**
 * Returnerar info om vilken backend som används + om den ger native diarization.
 * Används av callAnalytics för att bestämma om LLM-diarization behövs.
 */
function getBackendInfo() {
  return {
    name: BACKEND,
    nativeDiarization: false,  // uppdatera när Deepgram/AssemblyAI är inkopplade
  };
}

module.exports = {
  transcribe,
  getBackendInfo,
};
