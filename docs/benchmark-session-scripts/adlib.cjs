const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', viewport: { width: 1366, height: 900 }, locale: 'en-US' });
  const page = await ctx.newPage();
  const targets = [
    ['meta', 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=BUSINESS_HANDLE&search_type=keyword_unordered&media_type=all'],
    ['meta2', 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=BUSINESS%20NAME&search_type=keyword_unordered&media_type=all'],
    ['google', 'https://adstransparency.google.com/?region=US&domain=BUSINESS_DOMAIN'],
  ];
  for (const [name, url] of targets) {
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(9000);
      const title = await page.title();
      const text = (await page.innerText('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 2500);
      console.log(`=== ${name} ${resp && resp.status()} ${page.url()}\nTITLE ${title}\nTEXT ${text}\n`);
      await page.screenshot({ path: `scan/${name}.png`, fullPage: false });
    } catch (e) { console.log(`=== ${name} ERROR ${e.message}`); }
  }
  await browser.close();
})();
