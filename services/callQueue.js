// services/callQueue.js
// ═══════════════════════════════════════════════════════════════════════════
// DB-backed jobb-kö för CI-pipeline.
//
// Hur det fungerar:
//   - setInterval pollar var POLL_INTERVAL_MS.
//   - Plockar EN pending-rad atomärt (claimNextPendingCallJob).
//   - Hämtar audio från storage, kör processCall(), sparar allt, sätter done/failed.
//   - En i taget för att inte trigga Groq rate-limits.
//   - Vid server-restart: resetStuckCallJobs() flyttar tillbaka
//     in-flight jobb till 'pending' så de plockas upp igen.
//
// Fas 2+: byt till BullMQ/Redis eller pg-boss för flera parallella workers,
// retry-logik med exponential backoff, och priority-queues.
// ═══════════════════════════════════════════════════════════════════════════

const db           = require('../database');
const storage      = require('./callStorage');
const analytics    = require('./callAnalytics');
const prompts      = require('./prompts/feedback');

const POLL_INTERVAL_MS = parseInt(process.env.CI_POLL_MS || '5000', 10);

let workerTimer = null;
let workerBusy  = false;
let startedAt   = null;
let processedCount = 0;
let failedCount    = 0;

function log(...args) {
  console.log('[callQueue]', ...args);
}

/**
 * Processa ett enskilt jobb. Kastar inte — skriver status/error till DB.
 */
async function processJob(job) {
  const jobId = job.id;
  log(`▶ Job ${jobId} — ${job.original_name}`);

  try {
    // 1. Hämta audio
    const buffer = await storage.getAudioBuffer(job.storage_key);

    // 2. Kör Whisper + LLM + word-freq med jobbets valda metodik.
    //    Fallback till default om jobbet saknar metodik (äldre jobb innan metodik-systemet).
    const methodologyId = job.prompt_version || prompts.DEFAULT_VERSION_ID;
    const result = await analytics.processCall(buffer, job.original_name, {
      title:         job.title,
      apiKey:        process.env.GROQ_API_KEY,
      promptVersion: methodologyId,
    });

    // 3. Spara transcript
    db.saveCallTranscript(jobId, result.transcript);

    // 4. Byt status till analyzing (för UI-transparens — klart för word-freq & analys-save)
    db.updateCallJob(jobId, { status: 'analyzing' });

    // 5. Spara analys (både senaste + historik-run) + word-freq
    db.saveCallAnalysis(jobId, {
      analysis:      result.analysis.text,
      model:         result.analysis.model,
      promptVersion: result.analysis.promptVersion,
    });
    db.saveCallWordFrequencies(jobId, result.wordFrequencies);

    // 6. Done
    db.updateCallJob(jobId, {
      status:       'done',
      completed_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
    processedCount++;
    log(`✓ Job ${jobId} klart (${result.transcript.word_count} ord, ${result.wordFrequencies.length} unika top-ord)`);
  } catch (err) {
    failedCount++;
    const msg = (err && err.message ? err.message : String(err)).slice(0, 500);
    log(`✗ Job ${jobId} FAILED: ${msg}`);
    db.updateCallJob(jobId, {
      status:       'failed',
      error:        msg,
      completed_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
  }
}

/**
 * En poll-cykel. Plockar ETT jobb om ledig.
 */
async function tick() {
  if (workerBusy) return;

  let job;
  try {
    job = db.claimNextPendingCallJob();
  } catch (err) {
    log('claim-error:', err.message);
    return;
  }
  if (!job) return;

  workerBusy = true;
  try {
    await processJob(job);
  } finally {
    workerBusy = false;
  }
}

/**
 * Starta workern. Kallas en gång från server.js efter initDatabase().
 * Idempotent — om redan startad, gör inget.
 */
function start() {
  if (workerTimer) return;

  // Städa upp stuck jobs från tidigare process
  try {
    const n = db.resetStuckCallJobs();
    if (n > 0) log(`Återställde ${n} stuck jobb till pending efter omstart`);
  } catch (err) {
    log('resetStuckCallJobs failed:', err.message);
  }

  startedAt = new Date();
  log(`Startad. Poll-intervall: ${POLL_INTERVAL_MS}ms. R2: ${storage.isR2Enabled() ? 'ON' : 'off (lokal disk)'}`);

  workerTimer = setInterval(() => {
    tick().catch(err => log('tick-error:', err.message));
  }, POLL_INTERVAL_MS);

  // unref så processen kan stänga vid SIGTERM utan att vänta på timern
  if (workerTimer.unref) workerTimer.unref();
}

function stop() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    log('Stoppad.');
  }
}

function status() {
  return {
    running:        Boolean(workerTimer),
    busy:           workerBusy,
    startedAt:      startedAt ? startedAt.toISOString() : null,
    processedCount,
    failedCount,
    pollIntervalMs: POLL_INTERVAL_MS,
  };
}

module.exports = { start, stop, status };
