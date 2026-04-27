// emails.js
// Retention-mejl: veckovis digest + re-engagement för inaktiva användare.
// Pure functions: bygger HTML + text, SKICKAR INTE.
// Sändning sker i server.js via Resend-klienten.

const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// Unsubscribe tokens — HMAC baserade, ingen DB-tabell behövs
// ─────────────────────────────────────────────────────────────────────────────

function getSecret() {
  return process.env.SESSION_SECRET || process.env.UNSUBSCRIBE_SECRET || 'dev-fallback-secret';
}

function createUnsubscribeToken(userId) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000)}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex').slice(0, 16);
  // Format: base64url(userId.timestamp.sig)
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function verifyUnsubscribeToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [userId, ts, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', getSecret()).update(`${userId}.${ts}`).digest('hex').slice(0, 16);
    // Timing-safe compare
    if (sig.length !== expectedSig.length) return null;
    let ok = 0;
    for (let i = 0; i < sig.length; i++) ok |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    if (ok !== 0) return null;
    // Token giltig i 180 dagar
    const age = Math.floor(Date.now() / 1000) - parseInt(ts);
    if (age > 180 * 24 * 60 * 60) return null;
    return parseInt(userId);
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email shell — återanvänder stilen från server.js welcome-mejl
// ─────────────────────────────────────────────────────────────────────────────

function emailShell(content, unsubscribeUrl) {
  return `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07070f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#07070f;padding:40px 20px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <tr><td style="background:#111126;border-radius:16px 16px 0 0;padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <span style="font-size:22px;font-weight:900;color:#f1f5f9;">🎯 Joakim Jaksen</span>
      </td></tr>
      <tr><td style="background:#111126;padding:32px;color:#e2e8f0;">
        ${content}
      </td></tr>
      <tr><td style="background:#0a0a14;border-radius:0 0 16px 16px;padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
        <p style="margin:0 0 8px;font-size:12px;color:#475569;line-height:1.6;">
          Du får detta mejl för att du har valt att få veckovisa uppdateringar.
          <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">Avsluta prenumerationen</a>.
        </p>
        <p style="margin:0;font-size:12px;color:#334155;">© 2026 Joakim Jaksen / Brilliant Values Global AB · <a href="https://app.joakimjaksen.se/integritetspolicy" style="color:#475569;">Integritetspolicy</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly digest — "Din vecka i siffror"
// ─────────────────────────────────────────────────────────────────────────────

function buildWeeklyDigest({ username, stats, weekData, baseUrl, unsubscribeUrl, dailyChallenge }) {
  const { xp, level, streak, totalActionsThisWeek, totalRoleplays, totalBlocksMastered } = stats;
  const xpGainedThisWeek = weekData.xpGained || 0;
  const blocksTouchedThisWeek = weekData.blocksTouched || 0;

  const progressPct = level.next ? Math.round(level.progress * 100) : 100;
  const hasActivity = totalActionsThisWeek > 0 || blocksTouchedThisWeek > 0;

  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#f1f5f9;">Din vecka, ${username}</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Här är en snabb sammanfattning av veckan som gått.</p>

    ${hasActivity ? `
      <!-- Stats -->
      <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;">
        <tr>
          <td style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:18px;width:50%;">
            <p style="margin:0;font-size:11px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Nivå</p>
            <p style="margin:4px 0 2px;color:#f1f5f9;font-size:22px;font-weight:800;">${level.current.name}</p>
            <p style="margin:0;color:#64748b;font-size:12px;">${xp} XP ${level.next ? `· ${progressPct}% till ${level.next.name}` : '· toppnivå'}</p>
          </td>
          <td style="width:12px;"></td>
          <td style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:18px;width:50%;">
            <p style="margin:0;font-size:11px;color:#fbbf24;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Streak</p>
            <p style="margin:4px 0 2px;color:#f1f5f9;font-size:22px;font-weight:800;">🔥 ${streak.current} dagar</p>
            <p style="margin:0;color:#64748b;font-size:12px;">${streak.longest > streak.current ? `bäst: ${streak.longest}` : 'håll igång'}</p>
          </td>
        </tr>
      </table>

      <!-- Denna vecka -->
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:12px;padding:18px;margin:0 0 20px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#e2e8f0;">📊 Denna vecka</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:14px;">💬 Actions loggade</td>
            <td style="padding:6px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:700;">${totalActionsThisWeek}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:14px;">📚 Block du rört vid</td>
            <td style="padding:6px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:700;">${blocksTouchedThisWeek}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:14px;">🎭 Rollspel totalt</td>
            <td style="padding:6px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:700;">${totalRoleplays}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:14px;">🏆 Bemästrade block</td>
            <td style="padding:6px 0;color:#f1f5f9;font-size:14px;text-align:right;font-weight:700;">${totalBlocksMastered}/20</td>
          </tr>
          ${xpGainedThisWeek > 0 ? `
          <tr>
            <td style="padding:6px 0;color:#94a3b8;font-size:14px;">✨ XP-ökning</td>
            <td style="padding:6px 0;color:#34d399;font-size:14px;text-align:right;font-weight:700;">+${xpGainedThisWeek}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    ` : `
      <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:18px;margin:0 0 20px;">
        <p style="margin:0 0 6px;font-size:14px;color:#fbbf24;font-weight:700;">📭 Lugn vecka</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">Inga actions loggade denna vecka. Ingen dom — bara en signal att du kanske behöver komma tillbaka in i rutinen. 5 minuter idag räcker.</p>
      </div>
    `}

    ${dailyChallenge ? `
      <div style="background:rgba(99,102,241,0.06);border-left:3px solid #6366f1;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">🎯 Nästa utmaning</p>
        <p style="margin:0;color:#e2e8f0;font-size:14px;line-height:1.5;">${dailyChallenge.text}</p>
      </div>
    ` : ''}

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
        <a href="${baseUrl}/dashboard" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">
          Till dashboard →
        </a>
      </td></tr>
    </table>

    <p style="color:#475569;font-size:12px;line-height:1.6;margin:20px 0 0;">
      Veckans bästa säljare är den som gjorde 1% mer än förra veckan. Inte den som gjorde allt rätt — bara den som kom tillbaka.
    </p>

    <p style="margin:16px 0 0;color:#475569;font-size:13px;">— Joakim</p>
  `;

  return {
    html: emailShell(content, unsubscribeUrl),
    text: buildDigestText({ username, xp, level, streak, totalActionsThisWeek, blocksTouchedThisWeek, totalBlocksMastered, dailyChallenge, baseUrl, unsubscribeUrl }),
    subject: hasActivity
      ? `Din vecka: ${totalActionsThisWeek} actions, ${streak.current} dagars streak`
      : `Din vecka: dags att komma tillbaka in i rutinen?`,
  };
}

function buildDigestText({ username, xp, level, streak, totalActionsThisWeek, blocksTouchedThisWeek, totalBlocksMastered, dailyChallenge, baseUrl, unsubscribeUrl }) {
  return `Din vecka, ${username}

Nivå: ${level.current.name} (${xp} XP)
Streak: ${streak.current} dagar

Denna vecka:
- ${totalActionsThisWeek} actions loggade
- ${blocksTouchedThisWeek} block du rört vid
- ${totalBlocksMastered}/20 bemästrade

${dailyChallenge ? `Nästa utmaning: ${dailyChallenge.text}\n\n` : ''}Till dashboard: ${baseUrl}/dashboard

— Joakim

Avsluta prenumerationen: ${unsubscribeUrl}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-engagement — inaktiv 14+ dagar
// ─────────────────────────────────────────────────────────────────────────────

function buildReengagement({ username, daysInactive, stats, lastBlockTitle, lastBlockId, baseUrl, unsubscribeUrl }) {
  const hasLast = !!lastBlockId;

  const content = `
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:900;color:#f1f5f9;">${daysInactive} dagar sen, ${username}.</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Inget drama — bara en enkel vink.</p>

    <p style="color:#cbd5e1;line-height:1.7;margin:0 0 18px;font-size:15px;">
      Säljkompetens är som fysisk kondition: ${daysInactive >= 30 ? 'efter en månads paus känner kroppen skillnaden' : 'ett par veckor paus är inget drama'}.
      Kunskapen är kvar — du behöver bara komma tillbaka in i rytmen.
    </p>

    ${hasLast ? `
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:18px;margin:0 0 24px;">
        <p style="margin:0 0 6px;font-size:12px;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Där du var senast</p>
        <p style="margin:0 0 10px;color:#f1f5f9;font-size:16px;font-weight:700;">${lastBlockTitle}</p>
        <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">Ta 10 min och läs om en del. Det är allt som behövs för att återaktivera kunskapen.</p>
      </div>
    ` : ''}

    <p style="color:#cbd5e1;line-height:1.7;margin:0 0 20px;font-size:14px;">
      Så gör du:
    </p>

    <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;">
      <tr>
        <td style="padding:10px 0;color:#94a3b8;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <strong style="color:#e2e8f0;">1.</strong> &nbsp;Öppna dashboarden
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#94a3b8;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.05);">
          <strong style="color:#e2e8f0;">2.</strong> &nbsp;Gör en 5-minuters-sak — läs en teori-del eller kör ett rollspel
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#94a3b8;font-size:14px;">
          <strong style="color:#e2e8f0;">3.</strong> &nbsp;Logga EN säljhandling denna vecka — vilken som helst
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
        <a href="${baseUrl}${hasLast ? '/learn/' + lastBlockId : '/dashboard'}" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">
          ${hasLast ? 'Fortsätt där du var →' : 'Till dashboard →'}
        </a>
      </td></tr>
    </table>

    <p style="color:#475569;font-size:12px;line-height:1.6;margin:20px 0 0;">
      Ingen förväntan. Ingen press. Bara en dörr som står öppen när du är redo.
    </p>

    <p style="margin:16px 0 0;color:#475569;font-size:13px;">— Joakim</p>
  `;

  return {
    html: emailShell(content, unsubscribeUrl),
    text: `${daysInactive} dagar sen, ${username}.

Säljkompetens är som fysisk kondition. ${hasLast ? 'Där du var senast: ' + lastBlockTitle + '. Ta 10 min och läs om.' : 'Ta 5 min idag och återaktivera.'}

${baseUrl}${hasLast ? '/learn/' + lastBlockId : '/dashboard'}

— Joakim

Avsluta prenumerationen: ${unsubscribeUrl}`,
    subject: `${daysInactive} dagar sen — ${hasLast ? 'fortsätt där du var' : 'välkommen tillbaka'}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Eligibility — ska användaren få mejl nu?
// ─────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isDigestEligible(user, prefs) {
  if (!user.email) return false;
  if (prefs.email_retention === false) return false;
  if (!user.gdpr) return false; // måste ha accepterat villkor
  // Skicka max en gång per 6 dagar (så söndagsdrift alltid fungerar)
  const last = prefs.last_digest_sent_at;
  if (last) {
    const age = Date.now() - new Date(last).getTime();
    if (age < 6 * MS_PER_DAY) return false;
  }
  return true;
}

function isReengagementEligible(user, prefs, lastActivity) {
  if (!user.email) return false;
  if (prefs.email_retention === false) return false;
  if (!user.gdpr) return false;
  if (!lastActivity) return false;

  const daysInactive = Math.floor((Date.now() - new Date(lastActivity).getTime()) / MS_PER_DAY);
  if (daysInactive < 14) return false; // minst 14 dagar inaktiv
  if (daysInactive > 180) return false; // ge upp efter 6 månader

  // Max en re-engagement var 30:e dag
  const lastReengagement = prefs.last_reengagement_sent_at;
  if (lastReengagement) {
    const sinceLast = Date.now() - new Date(lastReengagement).getTime();
    if (sinceLast < 30 * MS_PER_DAY) return false;
  }
  return daysInactive;
}

/**
 * Block-completion-mejl: fires när en user klarar ett block för första gången.
 * Gratuleras + visas nästa block (om det finns) med CTA-länk.
 *
 * @param {object} opts
 * @param {string} opts.username
 * @param {object} opts.block         — { id, title, icon, index }
 * @param {object|null} opts.nextBlock — { id, title, icon, index } eller null om sista
 * @param {number} opts.totalDone     — hur många block de klarat nu
 * @param {number} opts.totalBlocks   — totalt antal i kursen (20)
 * @param {string} opts.baseUrl
 * @param {string} opts.unsubscribeUrl
 * @param {boolean} opts.isFreeTierEnd — true om user är free och just klarade sista gratis-blocket
 */
function buildBlockCompletion({ username, block, nextBlock, totalDone, totalBlocks, baseUrl, unsubscribeUrl, isFreeTierEnd }) {
  const pct = Math.round((totalDone / totalBlocks) * 100);
  const nextCtaUrl = nextBlock ? `${baseUrl}/learn/${nextBlock.id}` : `${baseUrl}/dashboard`;

  const milestone = isFreeTierEnd
    ? `<div style="margin:24px 0;padding:16px 20px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);border-radius:12px;color:#fef3c7;">
         <strong style="color:#fbbf24;">🎉 Du har klarat hela gratis-tiern!</strong><br>
         <span style="font-size:14px;">Block 3 och framåt är där det skruvas upp — invändningshantering, mental styrka, AI-verktyg. 199 kr/mån, ingen bindningstid.</span>
       </div>`
    : '';

  const nextBlockHtml = nextBlock
    ? `<div style="margin:24px 0;padding:20px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:12px;">
         <div style="color:#a5b4fc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Nästa upp</div>
         <div style="color:#f1f5f9;font-size:17px;font-weight:700;margin-bottom:8px;">${nextBlock.icon || ''} Block ${nextBlock.index}: ${nextBlock.title}</div>
         <a href="${nextCtaUrl}" style="display:inline-block;padding:12px 22px;margin-top:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Öppna Block ${nextBlock.index} →</a>
       </div>`
    : `<div style="margin:24px 0;padding:20px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:12px;text-align:center;">
         <div style="font-size:32px;margin-bottom:8px;">🏆</div>
         <div style="color:#34d399;font-size:17px;font-weight:700;">Du har klarat alla 20 block!</div>
         <div style="color:#cbd5e1;font-size:14px;margin-top:4px;">Gå tillbaka till dashboarden och se ditt certifikat.</div>
       </div>`;

  const content = `
<h1 style="color:#f1f5f9;font-size:24px;margin:0 0 16px;">Grymt ${username}!</h1>
<p style="color:#cbd5e1;font-size:16px;line-height:1.6;margin:0 0 16px;">
  Du klarade precis <strong style="color:#f1f5f9;">${block.icon || ''} Block ${block.index}: ${block.title}</strong>.
  Det är din ${ordinal(totalDone)} bemästrade block av ${totalBlocks} — <strong style="color:#a5b4fc;">${pct}%</strong> av hela kursen klar.
</p>

<div style="margin:20px 0;padding:14px;background:rgba(255,255,255,0.03);border-radius:10px;">
  <div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:4px;"></div>
  </div>
  <div style="color:#94a3b8;font-size:12px;text-align:center;margin-top:6px;">${totalDone} av ${totalBlocks} block klara</div>
</div>

${milestone}
${nextBlockHtml}

<p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:24px 0 0;">
  Tips: Öva det du just lärt dig genom att rollspela med Jocke,
  göra ett verkligt uppdrag och reflektera — det är där skicklighet byggs.
</p>
  `;

  return emailShell(content, unsubscribeUrl);
}

function ordinal(n) {
  // Enkel svensk ordinal: 1:a, 2:a, 3:e, 4:e, ... — vi kör numerisk för enkelhet
  return `${n}:e`;
}

/**
 * Trial-påminnelse: fires 12h innan Pro-trialen auto-konverterar.
 * Mål: användaren ska hinna utvärdera + välja medvetet istället för att
 * antingen glömma (→ debitering + chargeback-risk) eller panikavbryta (→
 * förlorad intäkt).
 *
 * Ton: ärlig, icke-manipulativ. Både "fortsätt"- och "avbryt"-knapp synliga.
 *
 * @param {object} opts
 * @param {string} opts.username
 * @param {string} opts.endsAtHuman   — "imorgon kl 14:00"
 * @param {number} opts.hoursLeft     — ungefärliga timmar kvar
 * @param {string} opts.proUrl        — länk till /pro (för att fortsätta testa)
 * @param {string} opts.cancelUrl     — länk till /account (för att avbryta)
 * @param {string} opts.unsubscribeUrl
 */
function buildTrialEndingSoon({ username, endsAtHuman, hoursLeft, proUrl, cancelUrl, unsubscribeUrl }) {
  const content = `
<h1 style="color:#f1f5f9;font-size:22px;margin:0 0 16px;">Din Pro-trial slutar snart</h1>

<p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 16px;">
  Hej ${username},
</p>

<p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px;">
  Din gratis-trial av Pro slutar <strong style="color:#fbbf24;">${endsAtHuman}</strong>
  (ungefär <strong>${hoursLeft}h</strong> kvar). Om du inte avbryter innan dess
  debiteras ditt kort <strong style="color:#f1f5f9;">599 kr</strong> för första
  månaden Pro.
</p>

<div style="margin:24px 0;padding:18px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:10px;">
  <div style="color:#a5b4fc;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Två tydliga alternativ</div>

  <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 14px;">
    <strong style="color:#f1f5f9;">Gillar det du sett?</strong> Ladda upp ett till samtal och jämför analyserna innan trial går ut.<br>
    <a href="${proUrl}" style="display:inline-block;margin-top:8px;padding:10px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Fortsätt testa Pro →</a>
  </p>

  <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:14px 0 0;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);">
    <strong style="color:#f1f5f9;">Inte för dig?</strong> Ett klick avbryter — ingen kostnad, inget krångel.<br>
    <a href="${cancelUrl}" style="display:inline-block;margin-top:8px;padding:10px 18px;background:rgba(255,255,255,0.05);color:#cbd5e1;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;border:1px solid rgba(255,255,255,0.15);">Avbryt trial utan kostnad</a>
  </p>
</div>

<p style="color:#94a3b8;font-size:13px;line-height:1.55;margin:20px 0 0;">
  Du kan självklart också låta trialen auto-konvertera och avsluta senare
  via kontoinställningarna — då debiteras 599 kr/mån utan bindningstid.
</p>

<p style="color:#64748b;font-size:12px;line-height:1.5;margin:16px 0 0;">
  // Joakim
</p>
  `;
  return emailShell(content, unsubscribeUrl);
}

/**
 * Veckodigest-mejl till admin (Joakim) — söndag morgon-uppdatering om
 * plattformens hälsa. Returnerar { subject, html, text }.
 *
 * Designprincip: ingen meta-text, ingen "läsa mer"-byråkrati. Top tre rader
 * = "vad som hände den här veckan". Resten = djup-data om man vill.
 */
function buildAdminDigestEmail({ stats, baseUrl, weekRange }) {
  const t = stats.totals;
  const w = stats.weekly;
  const f = stats.funnel || {};
  const cohort = f.cohortSize || 0;

  const fmt = (n) => Number(n).toLocaleString('sv-SE');
  const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

  // Funnel-narrativet: hitta största droppoint i veckans cohort
  let topDrop = null;
  if (cohort > 0) {
    const steps = [
      ['register_completed', 'Registrerade', cohort],
      ['first_dashboard_visit', 'Besökte dashboard', f.register_completed || cohort],
      ['first_block_opened', 'Öppnade block', f.first_dashboard_visit || cohort],
      ['first_quiz_attempted', 'Öppnade prov', f.first_block_opened || cohort],
      ['first_quiz_passed', 'Klarade prov', f.first_quiz_attempted || cohort],
      ['first_upgrade_visit', 'Besökte upgrade', f.first_quiz_passed || cohort],
    ];
    let maxDrop = 0;
    for (const [k, label, prev] of steps) {
      const count = f[k] || 0;
      const drop = prev - count;
      if (drop > maxDrop && prev > 0) {
        maxDrop = drop;
        topDrop = { from: label, to: k, drop, prev, current: count };
      }
    }
  }

  const alertsBlock = stats.alerts.length ? `
    <div style="margin:1.5rem 0;padding:1rem 1.25rem;background:rgba(239,68,68,0.1);border-left:3px solid #ef4444;border-radius:6px;">
      <div style="font-weight:700;color:#ef4444;margin-bottom:0.5rem;">⚠️ Värt att kolla</div>
      <ul style="margin:0;padding-left:1.25rem;color:#475569;font-size:0.92rem;line-height:1.5;">
        ${stats.alerts.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  const dropBlock = topDrop ? `
    <p style="color:#475569;font-size:0.92rem;line-height:1.55;margin:0.75rem 0;">
      <strong>📉 Största drop i veckans kohort:</strong>
      ${topDrop.from} → ${topDrop.to.replace(/_/g, ' ')}.
      ${fmt(topDrop.drop)} av ${fmt(topDrop.prev)} (${pct(topDrop.drop, topDrop.prev)}%) tappades här.
    </p>
  ` : '';

  const topBlocksBlock = stats.topBlocks && stats.topBlocks.length ? `
    <p style="color:#475569;font-size:0.92rem;margin:0.75rem 0 0;line-height:1.5;">
      <strong>🏆 Mest avklarade block:</strong>
      ${stats.topBlocks.map(b => `${b.block_id} (${b.completions})`).join(' · ')}
    </p>
  ` : '';

  const subject = `📊 Veckodigest: ${fmt(w.newUsers)} nya, ${fmt(w.premiumConvs + w.proConvs)} konverteringar, MRR ${fmt(t.mrr)} kr`;

  const html = `
<!DOCTYPE html>
<html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
      <tr><td style="padding:24px 28px 12px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:0.78rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Veckodigest · ${weekRange}</p>
        <h1 style="margin:0;color:#0f172a;font-size:1.4rem;font-weight:800;">Plattformens vecka</h1>
      </td></tr>

      <!-- Headline-siffror -->
      <tr><td style="padding:8px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
              <div style="display:inline-block;width:60%;vertical-align:top;">
                <div style="color:#475569;font-size:0.85rem;">Nya users</div>
                <div style="color:#0f172a;font-size:1.6rem;font-weight:800;">${fmt(w.newUsers)}</div>
              </div>
              <div style="display:inline-block;width:35%;vertical-align:top;text-align:right;">
                <div style="color:#475569;font-size:0.85rem;">Aktiva 7d</div>
                <div style="color:#0f172a;font-size:1.6rem;font-weight:800;">${fmt(w.activeUsers)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
              <div style="display:inline-block;width:48%;vertical-align:top;">
                <div style="color:#475569;font-size:0.85rem;">Premium-konv (7d)</div>
                <div style="color:#0f172a;font-size:1.4rem;font-weight:800;">⭐ ${fmt(w.premiumConvs)}</div>
              </div>
              <div style="display:inline-block;width:48%;vertical-align:top;text-align:right;">
                <div style="color:#475569;font-size:0.85rem;">Pro-konv (7d)</div>
                <div style="color:#0f172a;font-size:1.4rem;font-weight:800;">🎙️ ${fmt(w.proConvs)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-bottom:1px solid #f1f5f9;">
              <div style="display:inline-block;width:60%;vertical-align:top;">
                <div style="color:#475569;font-size:0.85rem;">Total MRR-est.</div>
                <div style="color:#10b981;font-size:1.6rem;font-weight:800;">${fmt(t.mrr)} kr/mån</div>
              </div>
              <div style="display:inline-block;width:35%;vertical-align:top;text-align:right;font-size:0.85rem;color:#475569;">
                <div>${fmt(t.premiumUsers)} Premium</div>
                <div>${fmt(t.proUsers)} Pro</div>
                <div>${fmt(t.freeUsers)} Free</div>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Engagement -->
      <tr><td style="padding:8px 28px 16px;">
        <h2 style="margin:16px 0 8px;color:#0f172a;font-size:1rem;font-weight:700;">📚 Engagemang denna vecka</h2>
        <p style="margin:6px 0;color:#475569;font-size:0.92rem;line-height:1.55;">
          ${fmt(w.quizPasses)} prov klarade ·
          ${fmt(w.roleplayVisits)} började öva ·
          ${fmt(w.proCalls)} samtalsanalyser uppladdade
        </p>
        ${topBlocksBlock}
      </td></tr>

      ${cohort > 0 ? `
      <!-- Funnel-snapshot -->
      <tr><td style="padding:0 28px 16px;">
        <h2 style="margin:8px 0;color:#0f172a;font-size:1rem;font-weight:700;">🔍 Veckans kohort (${fmt(cohort)} nya)</h2>
        ${dropBlock}
        <p style="margin:0;color:#475569;font-size:0.85rem;">
          <a href="${baseUrl}/admin/funnel?days=7" style="color:#6366f1;text-decoration:none;">Öppna full funnel-rapport →</a>
        </p>
      </td></tr>
      ` : ''}

      ${alertsBlock ? `<tr><td style="padding:0 28px;">${alertsBlock}</td></tr>` : ''}

      <!-- Quick links -->
      <tr><td style="padding:0 28px 24px;">
        <h2 style="margin:16px 0 8px;color:#0f172a;font-size:1rem;font-weight:700;">🛠️ Quick-links</h2>
        <p style="margin:0;color:#475569;font-size:0.88rem;line-height:1.6;">
          <a href="${baseUrl}/admin" style="color:#6366f1;text-decoration:none;">Admin-dashboard</a> ·
          <a href="${baseUrl}/admin/funnel" style="color:#6366f1;text-decoration:none;">Funnel</a> ·
          <a href="${baseUrl}/admin/analytics" style="color:#6366f1;text-decoration:none;">Analytics</a> ·
          <a href="${baseUrl}/admin/audit" style="color:#6366f1;text-decoration:none;">Audit-log</a>
        </p>
      </td></tr>

      <tr><td style="padding:16px 28px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:0.75rem;text-align:center;">
          Auto-genererat söndag morgon · Plattformen är fortfarande igång
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  // Plain-text fallback för clienter som inte renderar HTML
  const text = [
    `📊 VECKODIGEST · ${weekRange}`,
    '',
    `Nya users: ${w.newUsers}`,
    `Aktiva 7d: ${w.activeUsers}`,
    `Premium-konv: ${w.premiumConvs}  ·  Pro-konv: ${w.proConvs}`,
    `MRR-est: ${fmt(t.mrr)} kr/mån (${t.premiumUsers} Premium, ${t.proUsers} Pro, ${t.freeUsers} Free)`,
    '',
    `Engagemang: ${w.quizPasses} prov klarade · ${w.roleplayVisits} öva-besök · ${w.proCalls} samtalsanalyser`,
    '',
    topDrop ? `Största drop i veckans kohort: ${topDrop.from} → ${topDrop.to}: ${topDrop.drop}/${topDrop.prev} (${pct(topDrop.drop, topDrop.prev)}%) tappade.` : '',
    stats.alerts.length ? `\n⚠️ Att kolla: ${stats.alerts.join('; ')}` : '',
    '',
    `Funnel-rapport: ${baseUrl}/admin/funnel`,
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

module.exports = {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  buildWeeklyDigest,
  buildReengagement,
  buildBlockCompletion,
  buildTrialEndingSoon,
  buildAdminDigestEmail,
  isDigestEligible,
  isReengagementEligible,
};
