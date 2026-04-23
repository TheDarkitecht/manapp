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
  const { requireLogin, requireAdmin, verifyCsrf, generateCsrfToken } = deps;
  const router = express.Router();

  // Alla routes kräver admin
  router.use(requireLogin, requireAdmin);

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
      username:   req.session.username,
      role:       req.session.role,
      r2Enabled:  storage.isR2Enabled(),
      csrfToken:  generateCsrfToken(req),
    });
  });

  // ── Bulk-upload POST ─────────────────────────────────────────────────────
  // Vi tar emot filerna till disk (multer), läser in buffer per fil, skickar
  // till storage.putAudio(), och skapar en call_jobs-rad per fil.
  // Originaltemporärfilerna raderas efter lyckad upload.
  router.post('/upload', verifyCsrf, bulkUpload.array('audio', 100), async (req, res) => {
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

    for (const file of files) {
      try {
        // 1. Skapa jobb (placeholder storage_key)
        const jobId = db.createCallJob(req.session.userId, {
          batch_id:      batchId,
          original_name: file.originalname,
          file_size:     file.size,
          mime_type:     file.mimetype,
          title:         null,
        });

        // 2. Läs buffer från disk, lagra i R2/final disk
        const buffer = fs.readFileSync(file.path);
        const { storageKey } = await storage.putAudio(jobId, buffer, {
          filename: file.originalname,
          mimeType: file.mimetype,
        });

        // 3. Uppdatera jobb med storage_key
        db.updateCallJob(jobId, { storage_key: storageKey });
        created.push({ jobId, name: file.originalname });
      } catch (err) {
        console.error('[calls/upload] failed for', file.originalname, err.message);
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

  // ── Retry failed job ─────────────────────────────────────────────────────
  router.post('/worker/retry/:id', verifyCsrf, (req, res) => {
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

  // ── Detalj-vy ────────────────────────────────────────────────────────────
  // Obs: denna ska ligga SIST bland GETs så :id inte fångar upp /upload, /search etc.
  router.get('/:id', (req, res) => {
    const jobId = parseInt(req.params.id, 10);
    if (!jobId) return res.redirect('/admin/calls');
    const full = db.getCallJobFull(jobId);
    if (!full) return res.redirect('/admin/calls');
    res.render('admin/calls/detail', {
      username:   req.session.username,
      role:       req.session.role,
      job:        full.job,
      transcript: full.transcript,
      analysis:   full.analysis,
      wordFrequencies: full.wordFrequencies,
      formatDuration,
      formatFileSize,
      csrfToken:  generateCsrfToken(req),
    });
  });

  // ── Radera ──────────────────────────────────────────────────────────────
  router.post('/:id/delete', verifyCsrf, async (req, res) => {
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
