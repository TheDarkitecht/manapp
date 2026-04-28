// services/epubGenerator.js
// ═══════════════════════════════════════════════════════════════════════════
// Genererar EPUB 3.0-bok från salesContent.js — för Kindle, Apple Books,
// Google Play Books, etc.
//
// EPUB är en ZIP med specifik struktur:
//   mimetype                   (måste vara FIRST + UNCOMPRESSED)
//   META-INF/container.xml     (entry point, pekar till content.opf)
//   OEBPS/content.opf          (metadata + manifest + spine)
//   OEBPS/toc.ncx              (navigation control)
//   OEBPS/nav.xhtml            (HTML-baserad navigation, EPUB 3-krav)
//   OEBPS/style.css            (typografi)
//   OEBPS/cover.xhtml          (cover-page som XHTML)
//   OEBPS/chapter-NN.xhtml     (en fil per kapitel)
//
// Återanvänder samma HTML-content från salesContent.js theory-fält. EPUB
// är BEKVÄMARE för web-content än PDF eftersom det IS i grunden HTML.
// Kindle, Apple Books etc renderar EPUB med läsarens egen typografi-
// preferens (font-storlek, teman, etc).
// ═══════════════════════════════════════════════════════════════════════════

const JSZip = require('jszip');
const crypto = require('crypto');

// XHTML-escape — EPUB är strict XML, alla &, <, > måste escape:as
function xmlEscape(s) {
  return String(s || '')
    .replace(/&(?!(amp|lt|gt|quot|apos|#);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanera Joakims theory-HTML till valid XHTML.
 * - Stänger void-element (<br> → <br/>)
 * - Behåller h1-h6, p, ul, ol, li, strong, em, blockquote
 * - Strippar attribut (vi vill inte ha onclick eller stylings inline)
 */
function sanitizeToXhtml(html) {
  if (!html) return '';
  let s = html;

  // Stäng void-element så de blir self-closing
  s = s.replace(/<br\s*>/gi, '<br/>');
  s = s.replace(/<hr\s*>/gi, '<hr/>');
  s = s.replace(/<img([^>]*)\s*>/gi, '<img$1/>');

  // Strippa unsafe attribut — låt bara klass:er vara kvar (för stilning)
  s = s.replace(/\s+(on\w+|style|id|target|rel|href)="[^"]*"/gi, '');

  // Escape:a "&" som inte redan är entity (& → &amp;)
  s = s.replace(/&(?!(amp|lt|gt|quot|apos|#\d+);)/g, '&amp;');

  return s;
}

const STYLE_CSS = `
@charset "utf-8";
body {
  font-family: serif;
  line-height: 1.6;
  margin: 0 1em;
  text-align: left;
}
h1, h2, h3, h4, h5, h6 {
  font-family: sans-serif;
  margin-top: 1.2em;
  margin-bottom: 0.4em;
  page-break-after: avoid;
}
h1 { font-size: 1.6em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; color: #333; }
h4 { font-size: 1.05em; }
p {
  margin: 0.5em 0;
  text-indent: 0;
  orphans: 2;
  widows: 2;
}
ul, ol { margin: 0.5em 0 0.5em 1.5em; }
li { margin-bottom: 0.3em; }
blockquote {
  margin: 1em 1.5em;
  padding-left: 0.8em;
  border-left: 3px solid #999;
  font-style: italic;
}
strong { font-weight: bold; }
em { font-style: italic; }
.eyebrow {
  font-family: sans-serif;
  font-size: 0.85em;
  color: #666;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 0.3em;
}
.outcome-box {
  margin: 1em 0;
  padding: 0.8em 1em;
  background: #f5f5f7;
  border-left: 3px solid #4f46e5;
  font-style: italic;
}
.scripts-box {
  margin: 1.5em 0;
  padding: 1em;
  background: #f9f9fb;
  border: 1px solid #ddd;
}
.scripts-box h4 {
  margin-top: 0;
  font-family: sans-serif;
  font-size: 0.85em;
  color: #4f46e5;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.scripts-box .script-quote {
  font-style: italic;
  margin: 0.5em 0;
  padding-left: 1em;
}
.cover {
  text-align: center;
  margin-top: 30%;
}
.cover h1 {
  font-size: 2em;
  margin-bottom: 0.3em;
}
.cover .subtitle {
  font-size: 1.1em;
  font-style: italic;
  color: #555;
  margin-bottom: 3em;
}
.cover .author {
  font-family: sans-serif;
  font-size: 1.1em;
  margin-bottom: 0.3em;
}
.cover .date {
  font-size: 0.9em;
  color: #777;
}
.cover .watermark {
  margin-top: 4em;
  font-size: 0.78em;
  color: #999;
  font-family: sans-serif;
  line-height: 1.4;
  border-top: 1px solid #ddd;
  padding-top: 1em;
}
`;

// ───────── XHTML-generators ─────────

function chapterXhtml(block, blockIndex) {
  const chapterTitle = `${blockIndex + 1}. ${block.title}`;
  const subtitleHtml = block.subtitle
    ? `<p style="font-style:italic;color:#555;margin-top:0.3em;">${xmlEscape(block.subtitle)}</p>`
    : '';
  const outcomeHtml = block.outcomeTitle
    ? `<div class="outcome-box"><strong>Efter detta kapitel:</strong> ${xmlEscape(block.outcomeTitle)}</div>`
    : '';
  const theoryHtml = sanitizeToXhtml(block.theory || '');
  const scriptsHtml = (block.concreteScripts && block.concreteScripts.length)
    ? `<div class="scripts-box">
         <h4>Formuleringar du kommer kunna säga</h4>
         ${block.concreteScripts.map(s => `<p class="script-quote">"${xmlEscape(s)}"</p>`).join('')}
       </div>`
    : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="sv" lang="sv">
<head>
  <meta charset="utf-8"/>
  <title>${xmlEscape(chapterTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <p class="eyebrow">Kapitel ${blockIndex + 1}</p>
  <h1>${xmlEscape(block.title)}</h1>
  ${subtitleHtml}
  ${outcomeHtml}
  ${theoryHtml}
  ${scriptsHtml}
</body>
</html>`;
}

function coverXhtml({ title, subtitle, author, date, licensee }) {
  const wmHtml = licensee && licensee.name
    ? `<p class="watermark">
         Licensierad till <strong>${xmlEscape(licensee.name)}</strong>${licensee.email ? ` (${xmlEscape(licensee.email)})` : ''}<br/>
         ${licensee.date ? 'Nedladdad ' + xmlEscape(licensee.date) + ' · ' : ''}För personlig användning
       </p>`
    : '';
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="sv" lang="sv">
<head>
  <meta charset="utf-8"/>
  <title>${xmlEscape(title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="cover">
    <h1>${xmlEscape(title)}</h1>
    <p class="subtitle">${xmlEscape(subtitle || '')}</p>
    <p class="author">${xmlEscape(author)}</p>
    <p class="date">${xmlEscape(date)}</p>
    ${wmHtml}
  </div>
</body>
</html>`;
}

function navXhtml(blocks) {
  const items = blocks.map((b, i) => {
    return `<li><a href="chapter-${String(i + 1).padStart(2, '0')}.xhtml">${xmlEscape(b.title)}</a></li>`;
  }).join('\n        ');
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="sv" lang="sv">
<head>
  <meta charset="utf-8"/>
  <title>Innehåll</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Innehåll</h1>
    <ol>
        <li><a href="cover.xhtml">Titelsida</a></li>
        ${items}
    </ol>
  </nav>
</body>
</html>`;
}

function ncxXml(blocks, bookId) {
  const navPoints = blocks.map((b, i) => {
    const num = String(i + 1).padStart(2, '0');
    return `    <navPoint id="ch${num}" playOrder="${i + 2}">
      <navLabel><text>${xmlEscape(b.title)}</text></navLabel>
      <content src="chapter-${num}.xhtml"/>
    </navPoint>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>Joakim Jaksens Säljutbildning</text></docTitle>
  <navMap>
    <navPoint id="cover" playOrder="1">
      <navLabel><text>Titelsida</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>
${navPoints}
  </navMap>
</ncx>`;
}

function contentOpf({ blocks, bookId, title, author, date }) {
  const manifestItems = [
    `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="style" href="style.css" media-type="text/css"/>`,
    ...blocks.map((b, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<item id="ch${num}" href="chapter-${num}.xhtml" media-type="application/xhtml+xml"/>`;
    }),
  ].join('\n    ');
  const spineItems = [
    `<itemref idref="cover"/>`,
    `<itemref idref="nav"/>`,
    ...blocks.map((b, i) => `<itemref idref="ch${String(i + 1).padStart(2, '0')}"/>`),
  ].join('\n    ');

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="sv">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${bookId}</dc:identifier>
    <dc:title>${xmlEscape(title)}</dc:title>
    <dc:creator>${xmlEscape(author)}</dc:creator>
    <dc:language>sv</dc:language>
    <dc:date>${date}</dc:date>
    <dc:publisher>Brilliant Values Global AB</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;
}

const CONTAINER_XML = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

// ───────── Public API ─────────

/**
 * Generera EPUB 3.0 som Buffer.
 * @param {Array} blocks
 * @param {Object} opts - { title, subtitle, author, date }
 * @returns Promise<Buffer>
 */
async function generateFullBookEpub(blocks, opts = {}) {
  const meta = {
    title:    opts.title    || 'Joakim Jaksens Säljutbildning',
    subtitle: opts.subtitle || 'Allt du behöver veta för att bli en bättre säljare',
    author:   opts.author   || 'Joakim Jaksen',
    date:     opts.date     || new Date().toISOString().slice(0, 10),
    licensee: opts.licensee || null,
  };
  // UUID baserat på content-hash så samma content → samma book-ID
  const contentSig = crypto.createHash('sha256')
    .update(blocks.map(b => b.id + (b.theory || '')).join('|'))
    .digest('hex');
  const bookId = [
    contentSig.slice(0, 8),
    contentSig.slice(8, 12),
    contentSig.slice(12, 16),
    contentSig.slice(16, 20),
    contentSig.slice(20, 32),
  ].join('-');

  const zip = new JSZip();

  // KRITISKT: mimetype MÅSTE vara första filen, INTE komprimerat. JSZip default
  // är compress=true så vi explicit:t använder { compression: 'STORE' }.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.file('META-INF/container.xml', CONTAINER_XML);

  zip.file('OEBPS/content.opf', contentOpf({ blocks, bookId, ...meta }));
  zip.file('OEBPS/toc.ncx', ncxXml(blocks, bookId));
  zip.file('OEBPS/nav.xhtml', navXhtml(blocks));
  zip.file('OEBPS/style.css', STYLE_CSS);
  zip.file('OEBPS/cover.xhtml', coverXhtml(meta));

  blocks.forEach((b, i) => {
    const num = String(i + 1).padStart(2, '0');
    zip.file(`OEBPS/chapter-${num}.xhtml`, chapterXhtml(b, i));
  });

  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

/**
 * Content-hash för EPUB-cache (separat från PDF-hash eftersom EPUB-output
 * är annorlunda — t.ex. om vi ändrar EPUB-CSS men inte content).
 */
function computeEpubContentHash(blocks) {
  const data = blocks.map(b => ({
    id:              b.id,
    title:           b.title,
    subtitle:        b.subtitle,
    outcomeTitle:    b.outcomeTitle || null,
    theory:          b.theory || '',
    concreteScripts: b.concreteScripts || [],
  }));
  return crypto.createHash('sha256')
    .update('epub-v1:' + JSON.stringify(data))
    .digest('hex').slice(0, 16);
}

module.exports = {
  generateFullBookEpub,
  computeEpubContentHash,
  sanitizeToXhtml, // exporterad för testing
};
