// Usage: node maps.cjs "query" [lat,lng,zoom]
const { chromium } = require('playwright-core');
const q = process.argv[2];
const at = process.argv[3] || '26.15,-80.20,10z';
(async () => {
  const launch = { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', headless: true, args: ['--lang=en-US'] };
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) { const u = new URL(proxy); launch.proxy = { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username || ''), password: decodeURIComponent(u.password || '') }; }
  const browser = await chromium.launch(launch);
  const ctx = await browser.newContext({ locale: 'en-US', geolocation: undefined, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const url = `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${at}?hl=en&gl=us`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  const out = await page.evaluate(() => {
    const txt = (el) => (el ? el.textContent.trim() : null);
    const h1 = document.querySelector('h1.DUwDvf');
    if (h1) {
      const f = document.querySelector('div.F7nice');
      const addr = document.querySelector('button[data-item-id="address"]');
      const site = document.querySelector('a[data-item-id="authority"]');
      const phone = document.querySelector('button[data-item-id^="phone"]');
      const cat = document.querySelector('button.DkEaL');
      return { mode: 'place', name: txt(h1), ratingLine: txt(f), reviewsLabel: (()=>{const s=[...document.querySelectorAll("div.F7nice span[aria-label]")].map(x=>x.getAttribute("aria-label")); return s.join(" / ");})(), category: txt(cat),
        address: addr && addr.getAttribute('aria-label'), website: site && site.getAttribute('href'),
        phone: phone && phone.getAttribute('aria-label'), url: location.href };
    }
    const cards = [...document.querySelectorAll('div[role="feed"] div.Nv2PK')];
    return { mode: 'list', results: cards.slice(0, 20).map(c => {
      const a = c.querySelector('a.hfpxzc');
      const lines = [...c.querySelectorAll('div.W4Efsd')].map(x => x.textContent.trim()).filter(Boolean);
      return { name: a && a.getAttribute('aria-label'), rating: txt(c.querySelector('span.MW4etd')), reviews: txt(c.querySelector('span.UY7F9')), info: [...new Set(lines)].slice(0,2).join(' || '), href: a && a.getAttribute('href') && a.getAttribute('href').split('?')[0] };
    }) };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
