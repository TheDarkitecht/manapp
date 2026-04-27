// services/alerting.js
// ═══════════════════════════════════════════════════════════════════════════
// Error-alerting till webhook (Slack / Discord / generisk).
//
// Mål: vi vill bli LARMADE inom minuter när Stripe-webhook failar, Resend
// är nere, DB skitsig, etc. — istället för att upptäcka det dagar senare
// när någon mejlar och frågar varför de inte fick välkomstmejlet.
//
// Designprinciper:
//   - Aldrig kasta från notifyAdmin — den får inte ta ner det som redan failar
//   - Aldrig blockera hot-path — fire-and-forget med kort timeout
//   - Rate-limita: max 1 alert per (title) per 10 min → undvik webhook-spam
//   - Auto-detektera webhook-format (Slack/Discord/Generic)
//   - Fallback till console.error om ingen webhook-URL satt — funkar fortfarande
//
// Konfiguration via env:
//   ADMIN_ALERT_WEBHOOK_URL — Slack incoming webhook eller Discord webhook
//                            (om tom → bara console.error, ingen extern alert)
//   ADMIN_ALERT_MIN_LEVEL    — 'critical' (default) eller 'warning' eller 'info'
//   APP_NAME                 — visas i alert (default: "Joakim Jaksens Säljutbildning")
//
// Användning:
//   notifyAdmin('critical', 'Stripe webhook failed', 'Signature verify failed', { eventId, sig });
//   notifyAdmin('warning',  'Resend down', 'Email queue depth: 47', { queueDepth: 47 });
//   notifyAdmin('info',     'New Pro signup', 'user@example.se', { userId: 42 });
// ═══════════════════════════════════════════════════════════════════════════

const WEBHOOK_URL = process.env.ADMIN_ALERT_WEBHOOK_URL || '';
const APP_NAME    = process.env.APP_NAME || 'Joakim Jaksens Säljutbildning';
const MIN_LEVEL   = (process.env.ADMIN_ALERT_MIN_LEVEL || 'warning').toLowerCase();

const LEVEL_PRIORITY = { info: 0, warning: 1, critical: 2 };
const LEVEL_EMOJI    = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };

// Rate-limit per (title): senast skickad timestamp.
// In-memory Map — räcker för per-instans-spam-skydd. Vid restart börjar vi om.
const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 min mellan duplicerade titlar
const lastSentByTitle = new Map();

/**
 * Detektera webhook-format från URL för rätt JSON-payload-shape.
 * Slack använder { text }, Discord { content }, generisk får båda + metadata.
 */
function detectWebhookKind(url) {
  if (!url) return 'none';
  if (url.includes('hooks.slack.com')) return 'slack';
  if (url.includes('discord.com/api/webhooks') || url.includes('discordapp.com/api/webhooks')) return 'discord';
  return 'generic';
}

/**
 * Bygg payload anpassad för webhook-format.
 */
function buildPayload(kind, level, title, body, metadata) {
  const emoji = LEVEL_EMOJI[level] || '🔔';
  const head  = `${emoji} [${level.toUpperCase()}] ${APP_NAME}: ${title}`;

  // Trunkera metadata-JSON till rimlig längd för chat-vyer
  let metaText = '';
  if (metadata && typeof metadata === 'object') {
    try {
      const json = JSON.stringify(metadata, null, 2);
      metaText = json.length > 1500 ? json.slice(0, 1500) + '\n…(truncated)' : json;
    } catch (_) {
      metaText = String(metadata).slice(0, 500);
    }
  }

  if (kind === 'slack') {
    // Slack: text + ev. mrkdwn-block
    return {
      text: head,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `*${head}*` } },
        ...(body ? [{ type: 'section', text: { type: 'mrkdwn', text: body } }] : []),
        ...(metaText ? [{ type: 'section', text: { type: 'mrkdwn', text: '```\n' + metaText + '\n```' } }] : []),
      ],
    };
  }

  if (kind === 'discord') {
    // Discord accepterar { content } för enkla meddelanden, max 2000 tecken
    let content = `**${head}**`;
    if (body) content += `\n\n${body}`;
    if (metaText) content += `\n\`\`\`json\n${metaText}\n\`\`\``;
    if (content.length > 1900) content = content.slice(0, 1897) + '...';
    return { content };
  }

  // Generic — skicka allt strukturerat så servern kan parsa
  return { level, app: APP_NAME, title, body, metadata: metadata || null };
}

/**
 * Huvudfunktion: skicka alert. Aldrig blockerande, aldrig kastar.
 *
 * @param {'info'|'warning'|'critical'} level
 * @param {string} title  — kort titel (används också som rate-limit-key)
 * @param {string} [body] — längre beskrivning
 * @param {object} [metadata] — strukturerad context (loggas som JSON)
 */
function notifyAdmin(level, title, body = '', metadata = null) {
  // Validera level
  const lvl = String(level || '').toLowerCase();
  if (!(lvl in LEVEL_PRIORITY)) {
    console.error(`[alerting] invalid level "${level}" — defaulting to 'warning'`);
    return notifyAdmin('warning', title, body, metadata);
  }

  // Filtrera under min-level
  if (LEVEL_PRIORITY[lvl] < LEVEL_PRIORITY[MIN_LEVEL]) return;

  // Console-spegling alltid (även när webhook är konfigurerad — Railway-loggar
  // är guld värda för debugging)
  const emoji = LEVEL_EMOJI[lvl] || '🔔';
  console.error(`${emoji} [ALERT-${lvl.toUpperCase()}] ${title}${body ? ' — ' + body : ''}`);
  if (metadata) {
    try { console.error('   metadata:', JSON.stringify(metadata).slice(0, 300)); } catch (_) {}
  }

  // Webhook ej konfigurerad → vi är klara
  if (!WEBHOOK_URL) return;

  // Rate-limit: samma titel oftare än 10 min = skip
  const titleKey = lvl + ':' + (title || '').slice(0, 80);
  const last = lastSentByTitle.get(titleKey);
  const now = Date.now();
  if (last && (now - last) < RATE_LIMIT_MS) {
    // Suppressed — logga att vi suppressade så vi vet det vid debugging
    console.error(`   (alert suppressed — last sent ${Math.round((now - last) / 1000)}s ago)`);
    return;
  }
  lastSentByTitle.set(titleKey, now);

  // Skicka fire-and-forget. AbortController med timeout 4s — om webhook hänger
  // ska vi inte heller hänga.
  const kind = detectWebhookKind(WEBHOOK_URL);
  const payload = buildPayload(kind, lvl, title, body, metadata);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) {
        // Webhook svarade fel — logga men gör inget mer (skulle kunna loop:a annars)
        console.error(`[alerting] webhook returned ${res.status} for "${title}"`);
      }
    })
    .catch((err) => {
      // Network / abort / dns-fel — bara console
      console.error(`[alerting] webhook send failed: ${err.message}`);
    })
    .finally(() => clearTimeout(timeout));
}

/**
 * Rensa rate-limit-cache (used by tests).
 */
function _resetRateLimit() {
  lastSentByTitle.clear();
}

module.exports = {
  notifyAdmin,
  detectWebhookKind, // exported för tester
  isAlertingEnabled: () => Boolean(WEBHOOK_URL),
  _resetRateLimit,
};
