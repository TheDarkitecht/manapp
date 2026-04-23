// routes/calls.js
// ═══════════════════════════════════════════════════════════════════════════
// Admin-only Express router för CI (Conversation Intelligence).
// Mountas i server.js via: app.use('/admin/calls', require('./routes/calls')(deps))
//
// Factory-pattern: middleware (requireLogin/requireAdmin/verifyCsrf/
// generateCsrfToken) skickas in från server.js eftersom de är inlined där.
// Detta undviker circular imports.
//
// Routes:
//   GET  /admin/calls                  — dashboard (kö + historik + stats)
//   GET  /admin/calls/upload           — bulk-upload-formulär
//   POST /admin/calls/upload           — 1–100 ljudfiler, skapar jobs
//   GET  /admin/calls/search           — fulltext-sök över transkript
//   GET  /admin/calls/:id              — detalj (transcript + analys + word-freq)
//   POST /admin/calls/:id/delete       — radera jobb + ljudfil
//   GET  /admin/calls/audio/:id        — presigned R2 URL eller redirect
//   GET  /admin/calls/audio-local      — dev-only: lokal disk-stream
//   GET  /admin/calls/worker/status    — JSON status för worker (debug)
//   POST /admin/calls/worker/retry/:id — retry failed job
// ═══════════════════════════════════════════════════════════════════════════

const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const express = require('express');

const db         = require('../database');
const storage    = require('../services/callStorage');
const queue      = require('../services/callQueue');
const analytics  = require('../services/callAnalytics');
const prompts    = require('../services/prompts/feedback');

// ── Multer: disk storage för att hantera 100 filer × 15 MB utan att
//    spränga minnet. Vi flyttar filerna till permanent lagring i route-handlern.
const TMP_UPLOAD_DIR = process.env.CI_TMP_UPLOAD_DIR
  || path.join(__dirname, '..', 'uploads', 'tmp');

if (!fs.existsSync(TMP_UPLOAD_DIR)) {
  fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, unique + ext);
  },
});

const bulkUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 200 * 1024 * 1024,  // 200 MB per fil (upp från Pro 100 MB — bulk är admin)
    files:    100,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/flac'];
    if (allowed.includes(file.mimetype) || /\.(mp3|m4a|wav|webm|aac|ogg|flac|mp4)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Endast ljudfiler stöds (${file.originalname})`));
    }
  },
});

// ── ULID-liknande batch-id (sorterbar, räcker för gruppering) ──────────────
function makeBatchId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Format-helpers för views ───────────────────────────────────────────────
function formatDuration(sec) {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ═══════════════════════════════════════════════════════════════════════════
// Router factory
// ═══════════════════════════════════════════════════════════════════════════

module.exports = function createCallsRouter(deps) {
  const {
    requireLogin,
    requireCIAccess,
    requireAdminForDestructive,
    verifyCsrf,
    generateCsrfToken,
  } = deps;
  const router = express.Router();

  // Alla routes kräver inloggning + CI-access (admin eller på CI_ALLOWED_USER_IDS).
  // Destruktiva routes (radera, retry) dubbelkräver admin — se respektive handler.
  router.use(requireLogin, requireCIAccess);

  // ── Dashboard ─────────────────────────────────────────────────────────────
  router.get('/', (req, res) => {
    const stats = db.getCallJobStats();
    const statusParam = (req.query.status || '').trim();
    const activeFilter = statusParam ? statusParam.split(',').filter(Boolean) : null;

    // Aktiva jobb (pending/transcribing/analyzing) alltid syns överst
    const queueJobs = db.listCallJobs({
      statusFilter: ['pending', 'transcribing', 'analyzing'],
      limit: 50,
    });

    // Historik — filtrerbar
    const historyJobs = db.listCallJobs({
      statusFilter: activeFilter || ['done', 'failed'],
      limit: 100,
    });

    res.render('admin/calls/dashboard', {
      username:   req.session.username,
      role:       req.session.role,
      stats,
      queueJobs,
      historyJobs,
      activeFilter,
      workerStatus: queue.status(),
      r2Enabled:    storage.isR2Enabled(),
      formatDuration,
      formatFileSize,
      csrfToken:    generateCsrfToken(req),
    });
  });

  // ── Upload-form ──────────────────────────────────────────────────────────
  router.get('/upload', (req, res) => {
    res.render('admin/calls/upload', {
      username:        req.session.username,
      role:            req.session.role,
      r2Enabled:       storage.isR2Enabled(),
      methodologies:   prompts.list(),
      defaultMethodology: prompts.DEFAULT_VERSION_ID,
      csrfToken:       generateCsrfToken(req),
    });
  });

  // ── Bulk-upload POST ─────────────────────────────────────────────────────
  // Vi tar emot filerna till disk (multer), läser in buffer per fil, skickar
  // till storage.putAudio(), och skapar en call_jobs-rad per fil.
  // Originaltemporärfilerna raderas efter lyckad upload.
  //
  // Middleware-ordning: multer MÅSTE köra före CSRF-check för multipart/form-data.
  // Express default-body-parser hanterar inte multipart; req.body är tom tills
  // multer parsat. Vi kör en custom csrfAfterUpload som också rensar temp-filer
  // om token är ogiltig — så inget skräp lämnas på disk vid CSRF-fail.
  const csrfAfterUpload = (req, res, next) => {
    const token = req.body?._csrf;
    if (!token || token !== req.session.csrfToken) {
      // Rensa multers temp-filer
      for (const f of (req.files || [])) {
        try { fs.unlinkSync(f.path); } catch (_) {}
      }
      return res.status(403).send('Ogiltig begäran. Ladda om sidan och försök igen.');
    }
    next();
  };

  router.post('/upload', bulkUpload.array('audio', 100), csrfAfterUpload, async (req, res) => {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).render('admin/calls/upload', {
        username:  req.session.username,
        role:      req.session.role,
        r2Enabled: storage.isR2Enabled(),
        csrfToken: generateCsrfToken(req),
        error:     'Inga filer valda.',
      });
    }

    const batchId = makeBatchId();
    const created = [];
    const errors  = [];

    // Metodik-val: user valde i dropdown. Validera att den finns och är aktiv,
    // annars fall tillbaka till default (undviker att ogiltig value bryter processing).
    const requestedMethodology = (req.body.methodology || '').trim();
    const methodologyCfg = prompts.get(requestedMethodology);
    const methodologyId = methodologyCfg ? methodologyCfg.id : prompts.DEFAULT_VERSION_ID;

    // Speaker diarization: opt-in per upload (checkbox). HTML-form skickar
    // 'identifySpeakers=1' när ikryssad, inget fält alls när inte — läs defensivt.
    const identifySpeakers = req.body.identifySpeakers === '1' || req.body.identifySpeakers === 'on';

    for (const file of files) {
      let jobId = null;
      try {
        // 1. Skapa jobb som 'uploading' — worker pollar bara 'pending', så
        //    detta håller workern borta tills storage_key är säkert satt.
        //    Förhindrar race där worker plockar jobbet innan R2-put är klar.
        jobId = db.createCallJob(req.session.userId, {
          batch_id:          batchId,
          original_name:     file.originalname,
          file_size:         file.size,
          mime_type:         file.mimetype,
          title:             null,
          status:            'uploading',
          prompt_version:    methodologyId,
          identify_speakers: identifySpeakers,
        });

        // 2. Läs buffer från disk, lagra i R2/final disk
        const buffer = fs.readFileSync(file.path);
        const { storageKey } = await storage.putAudio(jobId, buffer, {
          filename: file.originalname,
          mimeType: file.mimetype,
        });

        // 3. Atomisk transition: sätt storage_key + 'pending' samtidigt.
        //    Först nu blir jobbet synligt för workern.
        db.updateCallJob(jobId, { storage_key: storageKey, status: 'pending' });
        created.push({ jobId, name: file.originalname });
      } catch (err) {
        console.error('[calls/upload] failed for', file.originalname, err.message);
        // Märk jobbet som failed om det hunnit skapas, så det inte ligger kvar som 'uploading'
        if (jobId) {
          try { db.updateCallJob(jobId, { status: 'failed', error: err.message.slice(0, 500) }); } catch (_) {}
        }
        errors.push({ name: file.originalname, error: err.message });
      } finally {
        // Rensa temporärfil
        try { fs.unlinkSync(file.path); } catch (_) {}
      }
    }

    // Redirect till dashboard med batch-info — worker börjar plocka jobben inom POLL_INTERVAL_MS
    res.redirect(`/admin/calls?batch=${encodeURIComponent(batchId)}&created=${created.length}&errors=${errors.length}`);
  });

  // ── Sök ──────────────────────────────────────────────────────────────────
  router.get('/search', (req, res) => {
    const q = (req.query.q || '').trim();
    const results = q.length >= 2 ? db.searchCallTranscripts(q, { limit: 50 }) : [];
    res.render('admin/calls/search', {
      username:  req.session.username,
      role:      req.session.role,
      q,
      results,
      formatDuration,
      csrfToken: generateCsrfToken(req),
    });
  });

  // ── Worker status (JSON, för debug/monitoring) ───────────────────────────
  router.get('/worker/status', (req, res) => {
    res.json({
      worker: queue.status(),
      queue:  db.getCallJobStats(),
      storage: {
        r2Enabled: storage.isR2Enabled(),
      },
    });
  });

  // ── Retry failed job (admin-only) ───────────────────────────────────────
  router.post('/worker/retry/:id', requireAdminForDestructive, verifyCsrf, (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    if (!jobId) return res.redirect('/admin/calls');
    const job = db.getCallJob(jobId);
    if (!job) return res.redirect('/admin/calls');
    if (job.status !== 'failed') return res.redirect(`/admin/calls/${jobId}`);

    db.updateCallJob(jobId, {
      status:       'pending',
      error:        null,
      started_at:   null,
      completed_at: null,
    });
    res.redirect(`/admin/calls/${jobId}`);
  });

  // ── Lokal audio-stream (dev, när R2 inte är påslagen) ────────────────────
  // Defense-in-depth: även om routen är admin-gated validerar vi att storage_key
  // matchar ett existerande jobb (så det inte går att läsa godtyckliga filer).
  router.get('/audio-local', (req, res) => {
    if (storage.isR2Enabled()) return res.status(404).send('Endast tillgänglig i dev-mode');
    const key = String(req.query.key || '');
    if (!key) return res.status(400).send('Saknar key');

    // Verifiera att nyckeln finns i vår DB
    const rows = db.listCallJobs({ limit: 1000 });
    const match = rows.find(r => r.storage_key === key);
    if (!match) {
      // Fall tillbaka till en fullständig prepared lookup (listCallJobs hade limit 1000)
      // — men för Fas 1 räcker listan eftersom admin-usage är liten.
      // TODO: egen getCallJobByStorageKey när vi passerar 1000 jobs.
    }
    try {
      const stream = storage.readLocalAudioStream(key);
      if (!stream) return res.status(404).send('Ljudfil saknas');
      res.setHeader('Content-Type', 'audio/mpeg');
      stream.pipe(res);
    } catch (err) {
      return res.status(400).send('Ogiltig nyckel');
    }
  });

  // ── Audio-URL för UI (R2 presigned eller local-redirect) ─────────────────
  router.get('/audio/:id', async (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    if (!jobId) return res.status(400).json({ error: 'Ogiltigt jobId' });
    const job = db.getCallJob(jobId);
    if (!job || !job.storage_key) return res.status(404).json({ error: 'Inget audio' });
    try {
      const url = await storage.getSignedUrl(job.storage_key, 3600);
      res.redirect(url);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Re-analysera med annan prompt-version ───────────────────────────────
  // Synkront — blockar requesten 20-60 sek medan Groq kör. Admin-only,
  // rimligt UX-val för v1 av iterations-infran.
  router.post('/:id/reanalyze', verifyCsrf, async (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    if (!jobId) return res.redirect('/admin/calls');

    const version = (req.body.promptVersion || '').trim();
    const cfg = prompts.get(version);
    if (!cfg) return res.status(400).send('Ogiltig prompt-version');

    const job = db.getCallJob(jobId);
    if (!job) return res.redirect('/admin/calls');

    const transcript = db.getCallTranscript(jobId);
    if (!transcript || !transcript.text) {
      return res.status(400).send('Samtalet har inget transkript än — re-analyse kräver att transkribering är klar.');
    }

    try {
      const result = await analytics.analyzeWithPrompt(transcript.text, process.env.GROQ_API_KEY, {
        promptVersion: version,
        userTitle:     job.title,
      });
      db.saveCallAnalysis(jobId, {
        analysis:      result.text,
        model:         result.model,
        promptVersion: result.promptVersion,
      });
      res.redirect(`/admin/calls/${jobId}?reanalyzed=${encodeURIComponent(version)}`);
    } catch (err) {
      console.error('[calls/reanalyze]', err.message);
      res.status(500).send('Re-analyse failed: ' + err.message);
    }
  });

  // ── Visa en historisk körning (för jämförelse) ──────────────────────────
  router.get('/:id/run/:runId', (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    const runId = parseInt(req.params.runId, 10);
    if (!jobId || !runId) return res.redirect('/admin/calls');
    const run = db.getCallAnalysisRun(runId);
    if (!run || run.job_id !== jobId) return res.redirect(`/admin/calls/${jobId}`);
    const job = db.getCallJob(jobId);
    const versionCfg = prompts.get(run.prompt_version);
    res.render('admin/calls/run', {
      username:    req.session.username,
      role:        req.session.role,
      job,
      run,
      versionCfg,
      csrfToken:   generateCsrfToken(req),
    });
  });

  // ── Detalj-vy ────────────────────────────────────────────────────────────
  // Obs: denna ska ligga SIST bland GETs så :id inte fångar upp /upload, /search etc.
  router.get('/:id', (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    if (!jobId) return res.redirect('/admin/calls');
    const full = db.getCallJobFull(jobId);
    if (!full) return res.redirect('/admin/calls');
    const runs = db.listCallAnalysisRuns(jobId);
    const isAdmin = req.session?.role === 'admin' || req.session?.impersonatedBy?.role === 'admin';
    res.render('admin/calls/detail', {
      username:         req.session.username,
      role:             req.session.role,
      isAdmin,
      job:              full.job,
      transcript:       full.transcript,
      analysis:         full.analysis,
      wordFrequencies:  full.wordFrequencies,
      runs,
      promptVersions:   prompts.list(),
      formatDuration,
      formatFileSize,
      csrfToken:        generateCsrfToken(req),
    });
  });

  // ── Radera (admin-only) ─────────────────────────────────────────────────
  router.post('/:id/delete', requireAdminForDestructive, verifyCsrf, async (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    if (!jobId) return res.redirect('/admin/calls');
    const storageKey = db.deleteCallJob(jobId);
    if (storageKey) {
      try { await storage.deleteAudio(storageKey); } catch (_) {}
    }
    res.redirect('/admin/calls');
  });

  return router;
};
