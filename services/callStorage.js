// services/callStorage.js
// ═══════════════════════════════════════════════════════════════════════════
// Abstraktion för ljudfil-lagring. Två backends:
//
//   1. Cloudflare R2 (prod)  — aktiveras om R2_BUCKET + R2_ACCESS_KEY_ID +
//                              R2_SECRET_ACCESS_KEY + R2_ACCOUNT_ID finns.
//   2. Lokal disk (dev)      — fallback för lokal utveckling utan R2-creds.
//                              Filer hamnar i ./uploads/calls/ och serveras
//                              via /admin/calls/audio/:jobId (endast admins).
//
// API:
//   putAudio(jobId, buffer, { filename, mimeType }) → { storageKey, size }
//   getAudioStream(storageKey) → ReadableStream
//   getSignedUrl(storageKey, ttlSeconds = 3600) → string  (R2 only — lokal kastar)
//   deleteAudio(storageKey) → void
//   isR2Enabled() → boolean
//
// storageKey är backend-agnostisk: i R2 = object-key, på disk = relativ path.
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const R2_ACCOUNT_ID       = process.env.R2_ACCOUNT_ID       || '';
const R2_ACCESS_KEY_ID    = process.env.R2_ACCESS_KEY_ID    || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET           = process.env.R2_BUCKET           || '';

const LOCAL_ROOT = process.env.CI_LOCAL_AUDIO_PATH || path.join(__dirname, '..', 'uploads', 'calls');

// ── R2 client (lazy-loaded så dev inte kräver @aws-sdk installerad) ─────────
let s3Client = null;
let S3Commands = null;

function isR2Enabled() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

function initR2() {
  if (s3Client) return s3Client;
  const sdk        = require('@aws-sdk/client-s3');
  const presigner  = require('@aws-sdk/s3-request-presigner');
  S3Commands = {
    PutObjectCommand:    sdk.PutObjectCommand,
    GetObjectCommand:    sdk.GetObjectCommand,
    DeleteObjectCommand: sdk.DeleteObjectCommand,
    getSignedUrl:        presigner.getSignedUrl,
  };
  s3Client = new sdk.S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

// ── Key-generering ──────────────────────────────────────────────────────────
// Format: calls/<yyyy-mm-dd>/<jobId>-<sanitizedName>
// Datumprefix hjälper vid lifecycle-rules (ex. "flytta till Glacier efter 90d").
function buildStorageKey(jobId, filename) {
  const date = new Date().toISOString().slice(0, 10);
  const safe = String(filename || 'audio')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
  return `calls/${date}/${jobId}-${safe}`;
}

// ── Local disk fallback ─────────────────────────────────────────────────────

function localFullPath(storageKey) {
  // Säkerhet: storageKey får aldrig klättra ut ur LOCAL_ROOT
  const resolved = path.resolve(LOCAL_ROOT, storageKey);
  if (!resolved.startsWith(path.resolve(LOCAL_ROOT))) {
    throw new Error('Invalid storage key (path traversal)');
  }
  return resolved;
}

function ensureLocalDir(fullPath) {
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Publikt API ─────────────────────────────────────────────────────────────

/**
 * Lagrar en ljudfil. Returnerar storageKey som ska sparas i call_jobs.
 */
async function putAudio(jobId, buffer, { filename, mimeType } = {}) {
  const storageKey = buildStorageKey(jobId, filename);

  if (isR2Enabled()) {
    initR2();
    await s3Client.send(new S3Commands.PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         storageKey,
      Body:        buffer,
      ContentType: mimeType || 'application/octet-stream',
    }));
  } else {
    const full = localFullPath(storageKey);
    ensureLocalDir(full);
    fs.writeFileSync(full, buffer);
  }

  return { storageKey, size: buffer.length };
}

/**
 * Hämtar audio som Buffer. Används av worker för att skicka till Groq Whisper.
 */
async function getAudioBuffer(storageKey) {
  if (isR2Enabled()) {
    initR2();
    const res = await s3Client.send(new S3Commands.GetObjectCommand({
      Bucket: R2_BUCKET,
      Key:    storageKey,
    }));
    // Body är en Readable stream (Node) eller ReadableStream (web).
    const chunks = [];
    for await (const chunk of res.Body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } else {
    const full = localFullPath(storageKey);
    return fs.promises.readFile(full);
  }
}

/**
 * Returnerar en presigned URL (R2) eller en intern /admin/calls/audio/:key-route
 * (disk). UI använder detta för att spela upp audio i browser.
 */
async function getSignedUrl(storageKey, ttlSeconds = 3600) {
  if (isR2Enabled()) {
    initR2();
    const cmd = new S3Commands.GetObjectCommand({ Bucket: R2_BUCKET, Key: storageKey });
    return await S3Commands.getSignedUrl(s3Client, cmd, { expiresIn: ttlSeconds });
  } else {
    // Dev: returnera en intern URL. routes/calls.js måste exponera /admin/calls/audio-local.
    return `/admin/calls/audio-local?key=${encodeURIComponent(storageKey)}`;
  }
}

async function deleteAudio(storageKey) {
  if (!storageKey) return;
  if (isR2Enabled()) {
    initR2();
    try {
      await s3Client.send(new S3Commands.DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key:    storageKey,
      }));
    } catch (err) {
      console.error('[callStorage] R2 delete failed:', err.message);
    }
  } else {
    try {
      const full = localFullPath(storageKey);
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch (err) {
      console.error('[callStorage] Local delete failed:', err.message);
    }
  }
}

/**
 * För lokal dev: läs fil direkt (används av /admin/calls/audio-local-routen).
 * Kastar om vi är i R2-läge (den routen ska inte vara aktiv då).
 */
function readLocalAudioStream(storageKey) {
  if (isR2Enabled()) throw new Error('readLocalAudioStream not available when R2 is enabled');
  const full = localFullPath(storageKey);
  if (!fs.existsSync(full)) return null;
  return fs.createReadStream(full);
}

module.exports = {
  isR2Enabled,
  putAudio,
  getAudioBuffer,
  getSignedUrl,
  deleteAudio,
  readLocalAudioStream,
};
