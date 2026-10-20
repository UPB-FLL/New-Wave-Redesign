// Google Business Profile snapshot from Google Maps (logged-out "limited view").
// Usage: node gbp.cjs "<search query OR google maps place URL>" [--pick "name substring"] [--at "lat,lng,zoom"] [--raw out.txt]
// Prints JSON: place details (name, rating, category, address, phone, website, hours) + GBP posts with dates/CTAs.
// Limits: review COUNT and review text are hidden for logged-out sessions; posts come from the place payload.
const { chromium } = require('playwright-core');
const args = process.argv.slice(2);
const target = args[0];
const opt = (k) => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };
const pick = opt('--pick'); const at = opt('--at') || '26.15,-80.20,9z'; const rawOut = opt('--raw');
(async () => {
  const launch = { executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', headless: true, args: ['--lang=en-US'] };
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) { const u = new URL(proxy); launch.proxy = { server: `${u.protocol}//${u.host}`, username: decodeURIComponent(u.username || ''), password: decodeURIComponent(u.password || '') }; }
  const browser = await chromium.launch(launch);
  const page = await (await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 1000 } })).newPage();
  const payloads = [];
  page.on('response', async r => { if (r.url().includes('/maps/preview/place')) { try { payloads.push(await r.text()); } catch (e) {} } });
  const url = target.startsWith('http') ? target + (target.includes('?') ? '&' : '?') + 'hl=en&gl=us'
    : `https://www.google.com/maps/search/${encodeURIComponent(target)}/@${at}?hl=en&gl=us`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4500);
  let candidates = [];
  if (!(await page.$('h1.DUwDvf'))) {
    candidates = await page.$$eval('div[role="feed"] a.hfpxzc', as => as.map(a => a.getAttribute('aria-label')));
    const links = await page.$$('div[role="feed"] a.hfpxzc');
    let idx = 0;
    if (pick) { idx = candidates.findIndex(n => n && n.toLowerCase().includes(pick.toLowerCase())); }
    if (idx < 0 || !links[idx]) { console.log(JSON.stringify({ error: 'no matching place', candidates }, null, 1)); await browser.close(); return; }
    await links[idx].click(); await page.waitForTimeout(5000);
  }
  const place = await page.evaluate(() => {
    const txt = (el) => (el ? el.textContent.trim() : null);
    const attr = (sel, a) => { const el = document.querySelector(sel); return el ? (el.getAttribute(a) || '').replace(/^(Address|Phone|Plus code): /, '').trim() : null; };
    return {
      name: txt(document.querySelector('h1.DUwDvf')),
      rating: txt(document.querySelector('div.F7nice span[aria-hidden="true"]')),
      category: txt(document.querySelector('button.DkEaL')),
      address: attr('button[data-item-id="address"]', 'aria-label'),
      phone: attr('button[data-item-id^="phone"]', 'aria-label'),
      website: attr('a[data-item-id="authority"]', 'href'),
      hours: [...document.querySelectorAll('table.eK4R0e tr')].map(r => r.textContent.trim().replace(/\s+/g, ' ')),
      url: location.href.split('?')[0],
    };
  });
  if (!payloads.length && place.url) { await page.goto(place.url + '?hl=en&gl=us', { waitUntil: 'domcontentloaded', timeout: 45000 }); await page.waitForTimeout(5000); }
  const raw = payloads.join('\n=====\n');
  if (rawOut) require('fs').writeFileSync(rawOut, raw);
  const posts = []; const seen = new Set();
  const re = /"((?:[^"\\]|\\.){40,4000})",1\]\]\],\[(\d{10}),(\d{10})\],null,\[\d+,null,"([^"]*)"/g;
  let m; while ((m = re.exec(raw))) { let t; try { t = JSON.parse('"' + m[1] + '"'); } catch (e) { continue; }
    const k = t.slice(0, 80); if (seen.has(k)) continue; seen.add(k);
    posts.push({ date: new Date(+m[2] * 1000).toISOString().slice(0, 10), cta: m[4], text: t.slice(0, 400) }); }
  console.log(JSON.stringify({ fetchedAt: new Date().toISOString(), candidates, place, gbpPosts: posts, gbpPostCount: posts.length }, null, 1));
  await browser.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
