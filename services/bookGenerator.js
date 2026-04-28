// services/bookGenerator.js
// ═══════════════════════════════════════════════════════════════════════════
// Genererar PDF-bok från salesContent.js — alla block i en linjär läs-bok.
//
// Joakim har skrivit ~60k ord teori. Många användare föredrar bok-format
// framför app eller audio. Boken auto-genereras från samma content som
// driver appen → uppdateras content, regen:as boken automatiskt.
//
// Pattern:
//   - PDFKit (programmatic, ingen browser-dependency)
//   - HTML-parsing av theory-fält: <h3>, <p>, <ul>, <li>, <strong>, <em>
//   - A5-format (smidigt på telefon/tablet/print)
//   - Title page + TOC + per-block kapitel + about-page
//   - Sid-numrering, kapitel-headers
//
// Output: Buffer med PDF-data (kan strömmas, lagras i R2, skickas direkt).
// ═══════════════════════════════════════════════════════════════════════════

const PDFDocument = require('pdfkit');

// ───────── HTML-parsing ─────────
// Joakim använder ~5 tags i theory-fältet. Skriver custom mini-parser istället
// för att importera tung HTML-parser. ~80 rader. Tight, debug-vänligt.

const TAG_RE = /<\/?(h[1-6]|p|ul|ol|li|strong|em|b|i|blockquote|br)[^>]*>/gi;
const ENTITY_MAP = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
};

function decodeEntities(s) {
  return s.replace(/&[a-z#0-9]+;/gi, m => ENTITY_MAP[m] || m);
}

/**
 * Parsa HTML-content till struktur för PDF-rendering.
 * Returnerar array av { type: 'h3'|'p'|'ul'|'li', runs: [{text, bold, italic}] }
 */
function parseHtml(html) {
  if (!html) return [];
  // Normalisera whitespace mellan blocks (bevara inom paragrafer)
  const cleaned = html.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ');

  // Splittra på block-level tags. Trick: sätt en sentinel före varje block-tag
  // sen splitta på sentinel.
  const blockTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote'];
  const blocks = [];
  let remaining = cleaned;

  // Iterera: hitta nästa block-tag, kapsla in vad som var innan
  // Enklare implementation: regex split per <(h[1-6]|p|ul|ol|li|blockquote)>...</...>
  // tag-by-tag matching:
  const tagPattern = /<(h[1-6]|p|ul|ol|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = tagPattern.exec(cleaned)) !== null) {
    const tag = match[1].toLowerCase();
    const inner = match[2];
    if (tag === 'ul' || tag === 'ol') {
      // Splittra ut <li>-element
      const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      const items = [];
      let liMatch;
      while ((liMatch = liRe.exec(inner)) !== null) {
        items.push(parseInline(liMatch[1]));
      }
      blocks.push({ type: tag, items });
    } else {
      blocks.push({ type: tag, runs: parseInline(inner) });
    }
  }

  return blocks;
}

/**
 * Parsa inline-formatting: <strong>, <em>, <b>, <i>, <br>.
 * Returnerar array av { text, bold, italic }-runs.
 */
function parseInline(html) {
  const runs = [];
  let i = 0;
  let bold = 0, italic = 0;
  let buf = '';

  function flush() {
    if (buf) {
      runs.push({ text: decodeEntities(buf).replace(/\s+/g, ' '), bold: bold > 0, italic: italic > 0 });
      buf = '';
    }
  }

  while (i < html.length) {
    if (html[i] === '<') {
      const closeIdx = html.indexOf('>', i);
      if (closeIdx === -1) { buf += html[i]; i++; continue; }
      const tagSpec = html.slice(i + 1, closeIdx).trim();
      const isClose = tagSpec.startsWith('/');
      const tagName = (isClose ? tagSpec.slice(1) : tagSpec).split(/\s/)[0].toLowerCase();
      flush();
      if (tagName === 'strong' || tagName === 'b') bold += isClose ? -1 : 1;
      else if (tagName === 'em' || tagName === 'i') italic += isClose ? -1 : 1;
      else if (tagName === 'br') runs.push({ text: '\n', bold: false, italic: false });
      // Övriga inline-tags ignoreras (t.ex. <a> — vi visar bara texten)
      i = closeIdx + 1;
    } else {
      buf += html[i];
      i++;
    }
  }
  flush();
  return runs.filter(r => r.text);
}

// ───────── PDF-rendering ─────────

const COLORS = {
  text:    '#1a1a1a',
  muted:   '#555555',
  accent:  '#4f46e5',
  rule:    '#cccccc',
};

const FONTS = {
  // PDFKit har inbyggda PostScript-fonts. Helvetica för rubriker (sans-serif),
  // Times-Roman för brödtext (serif — bättre läsbarhet i längre format).
  bodyRegular: 'Times-Roman',
  bodyBold:    'Times-Bold',
  bodyItalic:  'Times-Italic',
  bodyBoldIt:  'Times-BoldItalic',
  headRegular: 'Helvetica',
  headBold:    'Helvetica-Bold',
};

function fontFor(bold, italic, isHeading) {
  if (isHeading) return bold ? FONTS.headBold : FONTS.headRegular;
  if (bold && italic) return FONTS.bodyBoldIt;
  if (bold) return FONTS.bodyBold;
  if (italic) return FONTS.bodyItalic;
  return FONTS.bodyRegular;
}

/**
 * Rendera title page (cover).
 */
function renderTitlePage(doc, { title, subtitle, author, date }) {
  doc.addPage();
  // Bakgrund/accent — enkel överlapp överst
  doc.rect(0, 0, doc.page.width, 6).fill(COLORS.accent);
  doc.fillColor(COLORS.text);

  // Mitten av sidan (ungefär 1/3 ned)
  const cx = doc.page.width / 2;
  doc.font(FONTS.headBold).fontSize(38).fillColor(COLORS.text)
     .text(title, 60, 200, { width: doc.page.width - 120, align: 'center' });
  if (subtitle) {
    doc.font(FONTS.bodyItalic).fontSize(16).fillColor(COLORS.muted)
       .text(subtitle, 60, doc.y + 20, { width: doc.page.width - 120, align: 'center' });
  }

  // Bottom: author + date
  doc.font(FONTS.headRegular).fontSize(14).fillColor(COLORS.text);
  const bottomY = doc.page.height - 100;
  doc.text(author, 60, bottomY, { width: doc.page.width - 120, align: 'center' });
  doc.font(FONTS.bodyRegular).fontSize(11).fillColor(COLORS.muted)
     .text(date, 60, doc.y + 4, { width: doc.page.width - 120, align: 'center' });
}

/**
 * Rendera table of contents.
 */
function renderToc(doc, blocks) {
  doc.addPage();
  doc.font(FONTS.headBold).fontSize(24).fillColor(COLORS.text)
     .text('Innehåll', 60, 80);
  doc.moveDown(1);

  doc.font(FONTS.bodyRegular).fontSize(11).fillColor(COLORS.text);
  blocks.forEach((b, i) => {
    const num = String(i + 1).padStart(2, ' ');
    doc.text(`${num}. ${b.title}`, { continued: false });
    if (b.subtitle) {
      doc.font(FONTS.bodyItalic).fontSize(9).fillColor(COLORS.muted)
         .text('     ' + b.subtitle, { indent: 0 });
      doc.font(FONTS.bodyRegular).fontSize(11).fillColor(COLORS.text);
    }
    doc.moveDown(0.4);
  });
}

/**
 * Rendera ett block som ett kapitel.
 */
function renderBlockChapter(doc, block, blockIndex) {
  doc.addPage();

  // Chapter number eyebrow
  doc.font(FONTS.headBold).fontSize(10).fillColor(COLORS.accent)
     .text(`KAPITEL ${blockIndex + 1}`, 60, 80, { characterSpacing: 2 });

  // Title
  doc.font(FONTS.headBold).fontSize(26).fillColor(COLORS.text)
     .text(block.title, 60, doc.y + 8, { width: doc.page.width - 120 });

  // Subtitle
  if (block.subtitle) {
    doc.font(FONTS.bodyItalic).fontSize(14).fillColor(COLORS.muted)
       .text(block.subtitle, 60, doc.y + 8, { width: doc.page.width - 120 });
  }

  // Outcome promise (från Phase 2 av lesson-page)
  if (block.outcomeTitle) {
    doc.moveDown(1.2);
    doc.font(FONTS.bodyItalic).fontSize(12).fillColor(COLORS.accent)
       .text('Efter detta kapitel: ' + block.outcomeTitle, 60, doc.y, {
         width: doc.page.width - 120,
       });
  }

  // Horizontal rule
  doc.moveDown(1);
  const ruleY = doc.y;
  doc.moveTo(60, ruleY).lineTo(doc.page.width - 60, ruleY)
     .strokeColor(COLORS.rule).lineWidth(0.5).stroke();
  doc.moveDown(1.2);

  // Theory body
  if (block.theory) {
    const nodes = parseHtml(block.theory);
    renderNodes(doc, nodes);
  }

  // Concrete scripts at end of chapter (om de finns)
  if (block.concreteScripts && block.concreteScripts.length) {
    doc.moveDown(1.5);
    // Box-style highlight
    doc.font(FONTS.headBold).fontSize(11).fillColor(COLORS.accent)
       .text('FORMULERINGAR DU KOMMER KUNNA SÄGA', 60, doc.y, { characterSpacing: 1.5 });
    doc.moveDown(0.5);
    block.concreteScripts.forEach((s) => {
      doc.font(FONTS.bodyItalic).fontSize(11).fillColor(COLORS.text)
         .text('"' + s + '"', 75, doc.y, { width: doc.page.width - 135 });
      doc.moveDown(0.6);
    });
  }
}

/**
 * Rendera array av node:s (parsad från HTML) med PDFKit.
 */
function renderNodes(doc, nodes) {
  for (const node of nodes) {
    if (node.type === 'h1' || node.type === 'h2' || node.type === 'h3' ||
        node.type === 'h4' || node.type === 'h5' || node.type === 'h6') {
      doc.moveDown(0.8);
      const sizeMap = { h1: 18, h2: 16, h3: 14, h4: 13, h5: 12, h6: 11 };
      doc.font(FONTS.headBold).fontSize(sizeMap[node.type] || 14).fillColor(COLORS.text);
      doc.text(plainText(node.runs), { width: doc.page.width - 120 });
      doc.moveDown(0.3);
    } else if (node.type === 'p') {
      doc.font(FONTS.bodyRegular).fontSize(11).fillColor(COLORS.text);
      renderRuns(doc, node.runs);
      doc.moveDown(0.6);
    } else if (node.type === 'ul' || node.type === 'ol') {
      const ordered = node.type === 'ol';
      (node.items || []).forEach((item, i) => {
        doc.font(FONTS.bodyRegular).fontSize(11).fillColor(COLORS.text);
        const bullet = ordered ? `${i + 1}.` : '•';
        doc.text(bullet + '  ', { continued: true, indent: 12 });
        renderRuns(doc, item, { indent: 0, continued: false });
      });
      doc.moveDown(0.4);
    } else if (node.type === 'blockquote') {
      doc.font(FONTS.bodyItalic).fontSize(11).fillColor(COLORS.muted);
      doc.text('   ' + plainText(node.runs), {
        width: doc.page.width - 140,
        indent: 20,
      });
      doc.moveDown(0.4);
    }
  }
}

/**
 * Rendera runs (inline-formatting) genom att kedja text-anrop med rätt font.
 */
function renderRuns(doc, runs, opts = {}) {
  if (!runs || !runs.length) {
    doc.text(' ', opts);
    return;
  }
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    const isLast = i === runs.length - 1;
    doc.font(fontFor(r.bold, r.italic, false));
    doc.text(r.text, { ...opts, continued: !isLast });
  }
}

function plainText(runs) {
  return (runs || []).map(r => r.text).join('').trim();
}

/**
 * Rendera about/colophon-page sist i boken.
 */
function renderAboutPage(doc, { author, date }) {
  doc.addPage();
  doc.font(FONTS.headBold).fontSize(20).fillColor(COLORS.text)
     .text('Om denna bok', 60, 100);
  doc.moveDown(1);
  doc.font(FONTS.bodyRegular).fontSize(11).fillColor(COLORS.text);
  doc.text(
    'Denna bok är genererad direkt från innehållet i Joakim Jaksens säljutbildningsplattform. ' +
    'Allt material finns även som interaktiv kurs på app.joakimjaksen.se — där du kan göra ' +
    'prov, träna med AI-rollspel, lyssna på ljudversionen, och få konkret feedback på dina riktiga säljsamtal.',
    { width: doc.page.width - 120 }
  );
  doc.moveDown(1);
  doc.text(
    'Boken uppdateras kontinuerligt när nytt innehåll publiceras. För senaste version: logga in på ' +
    'app.joakimjaksen.se och ladda ner från ditt konto.',
    { width: doc.page.width - 120 }
  );
  doc.moveDown(2);
  doc.font(FONTS.bodyItalic).fontSize(10).fillColor(COLORS.muted)
     .text(`© ${new Date().getFullYear()} ${author}. Alla rättigheter förbehållna.`, {
       width: doc.page.width - 120,
     });
  doc.text(`Genererad ${date}.`, { width: doc.page.width - 120 });
}

/**
 * Lägg sidnumrering på alla sidor utom den första (cover).
 */
function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  // bufferedPageRange returnerar { start, count }
  for (let i = range.start + 1; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Skriv vid bottenmarginalen
    doc.font(FONTS.bodyRegular).fontSize(9).fillColor(COLORS.muted);
    doc.text(String(i - range.start), 60, doc.page.height - 40, {
      width: doc.page.width - 120,
      align: 'center',
      lineBreak: false,
    });
  }
}

// ───────── Public API ─────────

/**
 * Generera hela boken som Buffer.
 *
 * @param {Array} blocks - salesBlocks-array från salesContent.js
 * @param {Object} opts - { title, subtitle, author }
 * @returns Promise<Buffer>
 */
async function generateFullBookBuffer(blocks, opts = {}) {
  const meta = {
    title:    opts.title    || 'Joakim Jaksens Säljutbildning',
    subtitle: opts.subtitle || 'Allt du behöver veta för att bli en bättre säljare',
    author:   opts.author   || 'Joakim Jaksen',
    date:     opts.date     || new Date().toLocaleDateString('sv-SE', { day:'numeric', month:'long', year:'numeric' }),
  };

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        bufferPages: true,
        info: {
          Title:    meta.title,
          Author:   meta.author,
          Subject:  meta.subtitle,
          Creator:  'Joakim Jaksens Säljutbildning',
          Producer: 'Joakim Jaksens Säljutbildning',
        },
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      renderTitlePage(doc, meta);
      renderToc(doc, blocks);
      blocks.forEach((b, i) => renderBlockChapter(doc, b, i));
      renderAboutPage(doc, meta);
      addPageNumbers(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Beräkna content-hash för att veta om regen behövs.
 * Hash:ar bara theory + outcomeTitle + concreteScripts — andra fält
 * ändrar inte boken.
 */
function computeContentHash(blocks) {
  const crypto = require('crypto');
  const data = blocks.map(b => ({
    id:              b.id,
    title:           b.title,
    subtitle:        b.subtitle,
    outcomeTitle:    b.outcomeTitle || null,
    theory:          b.theory || '',
    concreteScripts: b.concreteScripts || [],
  }));
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 16);
}

module.exports = {
  generateFullBookBuffer,
  computeContentHash,
  parseHtml, // exported för testing
  parseInline,
};
