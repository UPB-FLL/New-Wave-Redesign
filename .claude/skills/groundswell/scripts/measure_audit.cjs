// Measure the full audit's boards before printing.
// Usage: node measure_audit.cjs <out_root> [--shots <dir>]
// For each project/*.dc.html: strip the canvas runtime, render at 1440px wide with the board's fonts,
// measure the natural content height, report horizontal overflow, write <out_root>/heights.json, and
// optionally screenshot each board. Rebuild with build_audit.py --heights <out_root>/heights.json.
const fs = require('fs');
const path = require('path');
const { launch, inlineAssets } = require('./browser.cjs');

const root = process.argv[2];
const shotsIdx = process.argv.indexOf('--shots');
const shots = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;

(async () => {
  const browser = await launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })).newPage();
  const dir = path.join(root, 'project');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.dc.html')).sort();
  const heights = {};
  let overflowing = 0;
  if (shots) fs.mkdirSync(shots, { recursive: true });
  for (const f of files) {
    let src = fs.readFileSync(path.join(dir, f), 'utf8');
    src = src.replace('<script src="./support.js"></script>', '').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '');
    src = inlineAssets(src, root);
    await page.setContent(src, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const rootEl = document.querySelector('x-dc > div') || document.querySelector('body > div');
      const fixed = parseInt(rootEl.style.height, 10);
      rootEl.style.height = 'auto';
      const natural = Math.ceil(rootEl.getBoundingClientRect().height);
      rootEl.style.height = fixed + 'px';
      const over = [];
      rootEl.querySelectorAll('*').forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === 'visible' && el.clientWidth > 0) {
          over.push((el.tagName + ' ' + (el.textContent || '').trim().slice(0, 50)).replace(/\s+/g, ' '));
        }
      });
      const broken = [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.alt || i.src.slice(0, 40));
      return { natural, over: over.slice(0, 5), broken };
    });
    const h = Math.max(900, Math.ceil(r.natural / 20) * 20);
    heights[f] = h;
    if (r.over.length || r.broken.length) overflowing += 1;
    console.log(`${f.padEnd(24)} natural ${String(r.natural).padStart(5)} -> ${String(h).padStart(5)}  overflow:${r.over.length ? JSON.stringify(r.over) : 'none'}${r.broken.length ? '  BROKEN IMAGES ' + JSON.stringify(r.broken) : ''}`);
    if (shots) {
      await page.evaluate((hh) => { (document.querySelector('x-dc > div') || document.querySelector('body > div')).style.height = hh + 'px'; }, h);
      await page.setViewportSize({ width: 1440, height: h });
      await page.screenshot({ path: path.join(shots, f.replace('.dc.html', '.png')) });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
  fs.writeFileSync(path.join(root, 'heights.json'), JSON.stringify(heights, null, 1));
  await browser.close();
  process.exit(overflowing ? 2 : 0);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
