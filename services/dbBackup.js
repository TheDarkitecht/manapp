// services/dbBackup.js
// ═══════════════════════════════════════════════════════════════════════════
// Offsite-backup av sqlite-DB till Cloudflare R2.
//
// Varför separat från callStorage.js: olika ansvar (DB vs audio-files),
// olika lifecycle, lättare att testa och swap:a senare. Återanvänder samma
// R2-credentials från env-vars.
//
// Pattern:
//   - Daglig snapshot till R2 under prefix "db-backups/users-YYYY-MM-DD.db"
//   - Också "db-backups/latest/users.db" (overwrite, för snabb recovery)
//   - Retention: 90 dagar (gamla rensas)
//
// Recovery-procedur dokumenterad i README (TODO).
// ═══════════════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const R2_ACCOUNT_ID        = process.env.R2_ACCOUNT_ID        || '';
const R2_ACCESS_KEY_ID     = process.env.R2_ACCESS_KEY_ID     || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET            = process.env.R2_BUCKET            || '';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'users.db');

let s3Client   = null;
let S3Commands = null;

function isR2Enabled() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

function initR2() {
  if (s3Client) return s3Client;
  const sdk = require('@aws-sdk/client-s3');
  S3Commands = {
    PutObjectCommand:    sdk.PutObjectCommand,
    DeleteObjectCommand: sdk.DeleteObjectCommand,
    ListObjectsV2Command: sdk.ListObjectsV2Command,
  };
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
 * Ladda upp aktuell users.db till R2 som dagligt snapshot.
 * Skapar två kopior:
 *   - db-backups/YYYY-MM-DD.db (datumstämplad, behålls 90 dagar)
 *   - db-backups/latest.db     (alltid senaste, för snabb recovery)
 */
async function uploadDailyBackup() {
  if (!isR2Enabled()) {
    console.warn('[dbBackup] R2 not configured — skipping offsite backup');
    return { ok: false, reason: 'r2_not_configured' };
  }
  if (!fs.existsSync(DB_PATH)) {
    console.warn('[dbBackup] DB-file not found:', DB_PATH);
    return { ok: false, reason: 'db_not_found' };
  }

  try {
    initR2();
    const data = fs.readFileSync(DB_PATH);
    const date = new Date().toISOString().slice(0, 10);
    const sizeKB = Math.round(data.length / 1024);

    // Datum-stämplad version
    await s3Client.send(new S3Commands.PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         `db-backups/${date}.db`,
      Body:        data,
      ContentType: 'application/x-sqlite3',
      Metadata:    { 'snapshot-date': date, 'size-kb': String(sizeKB) },
    }));

    // Latest-version (overwrite varje gång)
    await s3Client.send(new S3Commands.PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         `db-backups/latest.db`,
      Body:        data,
      ContentType: 'application/x-sqlite3',
      Metadata:    { 'snapshot-date': date, 'size-kb': String(sizeKB) },
    }));

    console.log(`☁️  R2-backup: ${date}.db (${sizeKB} KB) + latest.db`);
    return { ok: true, date, sizeKB };
  } catch (err) {
    console.error('[dbBackup] R2 upload failed:', err.message);
    return { ok: false, reason: err.message };
  }
}

/**
 * Rensa gamla backups (>90 dagar). Listar alla under db-backups/, parsar
 * datum från Key, deletear de som är äldre än cutoff.
 */
async function cleanupOldR2Backups(retentionDays = 90) {
  if (!isR2Enabled()) return;
  try {
    initR2();
    const list = await s3Client.send(new S3Commands.ListObjectsV2Command({
      Bucket: R2_BUCKET,
      Prefix: 'db-backups/',
      MaxKeys: 1000,
    }));
    if (!list.Contents) return;
    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;
    for (const obj of list.Contents) {
      // Skippa "latest.db" — alltid behåll
      if (obj.Key === 'db-backups/latest.db') continue;
      // Parsa datum från Key (format: db-backups/YYYY-MM-DD.db)
      const match = obj.Key.match(/db-backups\/(\d{4}-\d{2}-\d{2})\.db$/);
      if (!match) continue;
      const dateMs = new Date(match[1]).getTime();
      if (Number.isFinite(dateMs) && dateMs < cutoffMs) {
        await s3Client.send(new S3Commands.DeleteObjectCommand({
          Bucket: R2_BUCKET,
          Key:    obj.Key,
        }));
        deleted++;
      }
    }
    if (deleted > 0) console.log(`☁️  R2-backup-cleanup: raderade ${deleted} gamla snapshots (>${retentionDays} dagar)`);
  } catch (err) {
    console.error('[dbBackup] R2 cleanup failed:', err.message);
  }
}

module.exports = {
  isR2Enabled,
  uploadDailyBackup,
  cleanupOldR2Backups,
};
