// services/dbBackup.js
// ═══════════════════════════════════════════════════════════════════════════
// Offsite-backup av sqlite-DB till Cloudflare R2.
//
// Varför separat från callStorage.js: olika ansvar (DB vs audio-files),
// olika lifecycle, lättare att testa och swap:a senare. Återanvänder samma
// R2-credentials från env-vars.
//
// Pattern:
//   - Daglig snapshot till R2 under prefix "db-backups/YYYY-MM-DD.db"
//   - Också "db-backups/latest.db" (overwrite varje gång, för snabb recovery)
//   - Retention: 90 dagar (gamla rensas av cleanupOldR2Backups)
//
// ═══════════════════════════════════════════════════════════════════════════
// RECOVERY-PROCEDUR (vid Railway disk-failure eller korrupt users.db)
// ═══════════════════════════════════════════════════════════════════════════
//
// 1. Verifiera att R2-creds är konfigurerade (annars kör ingen backup):
//      console.log(require('./services/dbBackup').isR2Enabled())
//
// 2. Lista tillgängliga snapshots (Cloudflare-dashboard eller via aws-cli):
//      aws s3 ls s3://${R2_BUCKET}/db-backups/ \
//        --endpoint-url=https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com
//
// 3. Hämta önskad snapshot (latest.db för snabb recovery, eller
//    YYYY-MM-DD.db för point-in-time):
//      aws s3 cp s3://${R2_BUCKET}/db-backups/latest.db ./users.db \
//        --endpoint-url=https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com
//
// 4. Stoppa Railway-deployen (eller ta ner servicen), kopiera users.db
//    till disk-mount, starta om. App läser DB vid startup → all data
//    återställd. Sessions raderas (express-session är i samma DB) — alla
//    users måste logga in igen, men det är ok-tradeoff vid disaster recovery.
//
// 5. Kör manuellt en första backup direkt efter recovery för att fånga
//    senaste state:
//      await require('./services/dbBackup').uploadDailyBackup()
//
// RPO (Recovery Point Objective): 24h (daglig snapshot)
// RTO (Recovery Time Objective): ~5 min (manuell aws cli + redeploy)
//
// För kortare RPO: trigga uploadDailyBackup() oftare i server.js cron.
// För kortare RTO: skript som auto-restorar latest.db vid startup om
// users.db saknas (TODO för senare när vi vet att vi vill ha det).
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
