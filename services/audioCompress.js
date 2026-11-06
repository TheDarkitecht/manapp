// services/audioCompress.js
// Groq Whisper tar max 25 MB per fil. Långa samtal som WAV går över det
// (30 min telefonsamtal ≈ 28 MB). Whisper räknar om allt till 16 kHz mono
// internt, så vi gör samma sak innan uppladdning + Opus 24 kbit/s:
// ingen kvalitetsförlust för transkriptet, ~2 h 20 min ryms under gränsen.
//
// Kräver ffmpeg i PATH (installeras i Dockerfile). Temp-filer i stället för
// pipes: m4a/mp4 har moov-atomen sist och går inte att läsa från stdin.

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { spawn } = require('child_process');

const GROQ_MAX_BYTES     = 25 * 1024 * 1024;
const COMPRESS_THRESHOLD = 24 * 1024 * 1024; // marginal för multipart-overhead

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    p.stderr.on('data', d => { stderr = (stderr + d).slice(-2000); });
    p.on('error', err => reject(new Error(`ffmpeg kunde inte startas: ${err.message}`)));
    p.on('close', code => code === 0
      ? resolve()
      : reject(new Error(`ffmpeg avslutades med kod ${code}: ${stderr.trim().split('\n').pop()}`)));
  });
}

/**
 * Returnerar { buffer, filename } — oförändrat om filen redan ryms hos Groq,
 * annars omkodad till 16 kHz mono Opus (.ogg).
 */
async function compressForWhisper(buffer, filename) {
  if (buffer.length <= COMPRESS_THRESHOLD) return { buffer, filename };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-audio-'));
  const ext = (path.extname(filename || '') || '.bin').slice(0, 10);
  const inPath  = path.join(dir, `in${ext}`);
  const outPath = path.join(dir, 'out.ogg');
  try {
    fs.writeFileSync(inPath, buffer);
    await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', inPath,
      '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '24k', outPath]);
    const out = fs.readFileSync(outPath);
    if (out.length > GROQ_MAX_BYTES) {
      throw new Error(`Ljudfilen är för lång för transkribering även komprimerad (${Math.round(out.length / 1048576)} MB, max 25 MB ≈ 2 h 20 min). Dela upp samtalet.`);
    }
    const base = path.basename(filename || 'audio', path.extname(filename || ''));
    return { buffer: out, filename: `${base}.ogg` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { compressForWhisper };
