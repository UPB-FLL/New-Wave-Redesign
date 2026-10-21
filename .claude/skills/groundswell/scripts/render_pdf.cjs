// Print the three deliverables to PDF.
// Usage: node render_pdf.cjs audit <audit_out_root> <out.pdf>   one page per board, 1440px wide
//        node render_pdf.cjs deck <deck_root> <out.pdf>         1920x1080 pages from preview.html
//        node render_pdf.cjs summary <onepager.html> <out.pdf>  US Letter, must fit on one page
// Images listed in the root's assets_map.json are embedded. Prints pages, size and every link target.
const fs = require('fs');
const path = require('path');
const { launch, inlineAssets, pdfInfo } = require('./browser.cjs');

const [mode, src, out] = process.argv.slice(2);
if (!['audit', 'deck', 'summary'].includes(mode) || !src || !out) {
  console.error('usage: node render_pdf.cjs audit|deck|summary <source> <out.pdf>');
  process.exit(1);
}

function auditHtml(root) {
  const idx = JSON.parse(fs.readFileSync(path.join(root, 'project', 'canvas.json'), 'utf8'));
  const links = new Set();
  let css = '';
  let body = '';
  idx.order.forEach((file, i) => {
    const h = idx.boards[file].h;
    const html = fs.readFileSync(path.join(root, 'project', file), 'utf8');
    for (const m of html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)) links.add(m[1]);
    const x = html.split('<x-dc>')[1].split('</x-dc>')[0].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
    css += `@page b${i} { size: 1440px ${h}px; margin: 0 } .b${i} { page: b${i}; width: 1440px; height: ${h}px; overflow: hidden; break-after: page }\n`;
    body += `<div class="b${i}">${x}</div>`;
  });
  return `<!doctype html><html><head><meta charset="utf-8">${[...links].map((l) => `<link rel="stylesheet" href="${l}">`).join('')}
<style>body{margin:0} a{color:inherit} ${css}</style></head><body>${body}</body></html>`;
}

(async () => {
  const browser = await launch();
  const viewport = mode === 'summary' ? { width: 816, height: 1056 } : { width: 1920, height: 1080 };
  const page = await (await browser.newContext({ viewport })).newPage();
  let html;
  let opts;
  if (mode === 'audit') {
    html = inlineAssets(auditHtml(src), src);
    opts = { printBackground: true, preferCSSPageSize: true };
  } else if (mode === 'deck') {
    html = inlineAssets(fs.readFileSync(path.join(src, 'preview.html'), 'utf8'), src)
      .replace('<style>', '<style>@page{size:1920px 1080px;margin:0}body{background:none!important}section{margin:0!important;break-after:page}');
    opts = { width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true };
  } else {
    html = inlineAssets(fs.readFileSync(src, 'utf8'), path.dirname(src));
    opts = { format: 'Letter', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } };
  }
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.pdf({ path: out, ...opts });
  if (mode === 'summary') await page.screenshot({ path: out.replace(/\.pdf$/, '-preview.png'), fullPage: true });
  await browser.close();
  const info = pdfInfo(out);
  console.log(`${path.basename(out)}: ${info.pages} page(s), ${info.kb} KB, links: ${info.links.length ? info.links.join(' ') : 'none'}`);
  if (mode === 'summary' && info.pages !== 1) {
    console.error('The summary must fit on one Letter page; shorten it.');
    process.exit(2);
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
