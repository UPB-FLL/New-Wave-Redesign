// Check a deck before printing: content past the 920px line (952px when the slide pads 128px at the
// bottom) or the 1792px right margin, missing images, and optional screenshots.
// Usage: node check_slides.cjs <deck_root> [--shots]   (exit 2 when any slide overflows)
const fs = require('fs');
const path = require('path');
const { launch, inlineAssets } = require('./browser.cjs');

const root = process.argv[2];
const shots = process.argv.includes('--shots');

(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await page.setContent(inlineAssets(fs.readFileSync(path.join(root, 'preview.html'), 'utf8'), root), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const res = await page.evaluate(() => [...document.querySelectorAll('section')].map((sec) => {
    const r0 = sec.getBoundingClientRect();
    const bad = [];
    sec.querySelectorAll('*').forEach((el) => {
      if (el.tagName === 'ASIDE' || el.closest('aside')) return;
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const bottom = r.bottom - r0.top;
      const right = r.right - r0.left;
      const limitB = sec.style.paddingBottom === '128px' ? 952 : 920;
      if (bottom > limitB + 2 || right > 1792 + 2) bad.push(`${el.tagName} b${Math.round(bottom)} r${Math.round(right)} ${(el.textContent || '').trim().slice(0, 40)}`);
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflow === 'visible' && ['P', 'H1', 'H2', 'H3', 'TD', 'TH', 'LI'].includes(el.tagName)) bad.push(`WIDE ${el.tagName} ${(el.textContent || '').trim().slice(0, 40)}`);
    });
    sec.querySelectorAll('img').forEach((i) => { if (!i.complete || i.naturalWidth === 0) bad.push(`BROKEN IMAGE ${i.alt}`); });
    return { id: sec.id, bad: bad.slice(0, 4), badCount: bad.length };
  }));
  for (const r of res) console.log(`${r.id.padEnd(14)} ${r.badCount ? 'OVER ' + JSON.stringify(r.bad) : 'ok'}`);
  if (shots) {
    fs.mkdirSync(path.join(root, 'shots'), { recursive: true });
    const secs = await page.$$('section');
    for (let i = 0; i < secs.length; i++) await secs[i].screenshot({ path: path.join(root, 'shots', `${String(i + 1).padStart(2, '0')}-${res[i].id}.png`) });
  }
  await browser.close();
  process.exit(res.some((r) => r.badCount) ? 2 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
