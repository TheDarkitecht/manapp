// services/fetchTimeout.js
// ═══════════════════════════════════════════════════════════════════════════
// Fetch-wrapper med AbortController-baserad timeout.
//
// Varför: utan timeout kan en hängande extern API-call (Groq, Turnstile, etc.)
// blockera en Node.js request-handler oändligt. Tillräckligt med några sådana
// och hela Express-pool:en är slut → alla users ser timeout. Stripe-SDK och
// Resend-SDK har egna timeouts, men native fetch (Node 18+) saknar.
//
// Användning:
//   const { fetchWithTimeout } = require('./services/fetchTimeout');
//   const res = await fetchWithTimeout(url, { method: 'POST', ... }, 8000);
//   // → kastar AbortError efter 8s istället för att hänga
//
// Defaults vald per use-case (se konstanter nedan).
// ═══════════════════════════════════════════════════════════════════════════

// Default-timeouts per typ av extern call.
// Whisper-transkribering kan ta 30-60s för en 60-min-fil → 90s timeout.
// LLM-completions: ~5-15s normalt → 30s timeout med marginal.
// Snabba REST-API:s (Turnstile etc.): 8s räcker, ovanligt med långa svar.
const DEFAULTS = {
  fast:   8000,    // Turnstile, snabba endpoints
  llm:    30000,   // Groq chat-completions, OpenAI-kompatibla
  upload: 90000,   // Whisper-transkribering eller andra långsamma uploads
};

/**
 * fetch med tvingande timeout. Kastar Error med code='ETIMEDOUT' vid abort
 * istället för att hänga.
 *
 * OBS: Node 18+ undici wrappar abort i en TypeError("fetch failed") där
 * cause är AbortError. Vi inspekterar cause-chain för att detektera abort.
 */
async function fetchWithTimeout(url, opts = {}, timeoutMs = DEFAULTS.fast) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } catch (err) {
    // Mest pålitliga abort-detekteringen: kolla controller.signal.aborted.
    // Om vi abort:ade signalen var det vår timeout — oavsett hur undici/Node
    // wrappar det (AbortError, TypeError "fetch failed", SocketError, etc).
    if (controller.signal.aborted) {
      const timeoutErr = new Error(`Request timeout after ${timeoutMs}ms: ${String(url).slice(0, 80)}`);
      timeoutErr.code = 'ETIMEDOUT';
      timeoutErr.cause = err;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchWithTimeout,
  TIMEOUT: DEFAULTS,
};
