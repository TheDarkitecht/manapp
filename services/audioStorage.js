// services/audioStorage.js
// ═══════════════════════════════════════════════════════════════════════════
// Block-audio-lagring i Cloudflare R2.
//
// Joakim laddar upp en MP3/M4A per block via /admin/audio. Filen lagras
// under "audio/blocks/<block-id>.<ext>" — version-suffix kan läggas till
// för cache-busting när han uppdaterar audio.
//
// Återanvänder samma R2-credentials som dbBackup.js + callStorage.js.
// Egen modul: olika lifecycle (per-block, sparas länge) vs DB-backup
// (daglig retention) vs call-uploads (per-user, raderas efter
// transkribering).
//
// Streaming: vi GENERERAR ALDRIG public URLs. /audio/blocks/:id.mp3-routen
// returnerar en signed URL med 1h-TTL — så vi behåller access-kontroll.
// ═══════════════════════════════════════════════════════════════════════════

const R2_ACCOUNT_ID        = process.env.R2_ACCOUNT_ID        || '';
const R2_ACCESS_KEY_ID     = process.env.R2_ACCESS_KEY_ID     || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET            = process.env.R2_BUCKET            || '';

let s3Client   = null;
let S3Commands = null;
let S3Presigner = null;

function isR2Enabled() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

function initR2() {
  if (s3Client) return s3Client;
  const sdk = require('@aws-sdk/client-s3');
  S3Commands = {
    PutObjectCommand:    sdk.PutObjectCommand,
    GetObjectCommand:    sdk.GetObjectCommand,
    DeleteObjectCommand: sdk.DeleteObjectCommand,
    HeadObjectCommand:   sdk.HeadObjectCommand,
  };
  // Presigner för signed URLs (separat paket men ingår i @aws-sdk/s3-request-presigner)
  try {
    S3Presigner = require('@aws-sdk/s3-request-presigner');
  } catch (_) {
    // Om paketet inte är installerat: signed URLs ej tillgängliga, fallback
    // är att proxy:a streaming via servern (slower men funkar).
    S3Presigner = null;
  }
  s3Client = new sdk.S3Client({
    region:   'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

/**
 * Bygg R2-key för ett block. Inkluderar version-suffix för cache-busting.
 * Pattern: audio/blocks/<block-id>-v<N>.<ext>
 */
function buildR2Key(blockId, version, ext = 'mp3') {
  // Sanera blockId (bara safe chars i URL)
  const safeId = String(blockId).toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `audio/blocks/${safeId}-v${version}.${ext}`;
}

/**
 * Ladda upp audio-buffer för ett block till R2.
 * @returns { ok, r2Key, bytes } eller { ok:false, reason }
 */
async function uploadBlockAudio({ blockId, buffer, mimeType, version, ext }) {
  if (!isR2Enabled()) return { ok: false, reason: 'r2_not_configured' };
  if (!blockId || !buffer) return { ok: false, reason: 'missing_params' };

  try {
    initR2();
    const r2Key = buildR2Key(blockId, version || 1, ext || 'mp3');
    await s3Client.send(new S3Commands.PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         r2Key,
      Body:        buffer,
      ContentType: mimeType || 'audio/mpeg',
      Metadata:    {
        'block-id': blockId,
        'version':  String(version || 1),
      },
    }));
    return { ok: true, r2Key, bytes: buffer.length };
  } catch (err) {
    console.error('[audioStorage] upload failed:', err.message);
    return { ok: false, reason: err.message };
  }
}

/**
 * Generera signed URL för uppspelning. 1h TTL — räcker att hela audio:n
 * spelas upp (max ~60 min) men inte så lång att den läcker länge.
 */
async function getSignedAudioUrl(r2Key, expiresInSec = 3600) {
  if (!isR2Enabled()) return null;
  if (!r2Key) return null;
  try {
    initR2();
    if (!S3Presigner) {
      console.warn('[audioStorage] @aws-sdk/s3-request-presigner saknas — fallback till null URL');
      return null;
    }
    const cmd = new S3Commands.GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key });
    const url = await S3Presigner.getSignedUrl(s3Client, cmd, { expiresIn: expiresInSec });
    return url;
  } catch (err) {
    console.error('[audioStorage] signed URL failed:', err.message);
    return null;
  }
}

/**
 * Stream audio direkt via servern (fallback om signed URL ej tillgänglig).
 * Returnerar en Node.js readable stream + content-length headers.
 */
async function streamAudio(r2Key) {
  if (!isR2Enabled()) return null;
  if (!r2Key) return null;
  try {
    initR2();
    const res = await s3Client.send(new S3Commands.GetObjectCommand({
      Bucket: R2_BUCKET,
      Key:    r2Key,
    }));
    return {
      stream:        res.Body, // Node Readable
      contentLength: res.ContentLength,
      contentType:   res.ContentType || 'audio/mpeg',
    };
  } catch (err) {
    console.error('[audioStorage] stream failed:', err.message);
    return null;
  }
}

/**
 * Radera audio-objektet från R2.
 */
async function deleteBlockAudioObject(r2Key) {
  if (!isR2Enabled()) return { ok: false, reason: 'r2_not_configured' };
  if (!r2Key) return { ok: false, reason: 'missing_key' };
  try {
    initR2();
    await s3Client.send(new S3Commands.DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key:    r2Key,
    }));
    return { ok: true };
  } catch (err) {
    console.error('[audioStorage] delete failed:', err.message);
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  isR2Enabled,
  uploadBlockAudio,
  getSignedAudioUrl,
  streamAudio,
  deleteBlockAudioObject,
  buildR2Key,
};
