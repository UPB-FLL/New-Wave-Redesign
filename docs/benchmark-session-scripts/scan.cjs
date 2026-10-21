const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const hosts = new Set();
  const interesting = [];
  page.on('request', (r) => {
    try { const u = new URL(r.url()); hosts.add(u.hostname);
      if (/facebook|fbcdn|doubleclick|googleads|googlesyndication|tiktok|snapchat|linkedin|pinterest|clarity|hotjar|googletagmanager|google-analytics|gtag|bing|taboola|outbrain|reddit|twitter|x\.com|hubspot|klaviyo|mailchimp|calendly/i.test(u.hostname)) interesting.push(r.url().slice(0, 160));
    } catch {}
  });
  await page.goto('https://BUSINESS_DOMAIN/', { waitUntil: 'networkidle', timeout: 60000 }).catch(e => console.log('goto', e.message));
  await page.waitForTimeout(5000);
  await page.mouse.wheel(0, 2000); await page.waitForTimeout(3000);
  const html = await page.content();
  const tags = html.match(/fbq\('init'[^)]*\)|AW-\d+|G-[A-Z0-9]{6,}|GT-[A-Z0-9]{6,}|GTM-[A-Z0-9]+|UA-\d+-\d+|ttq\.load\('[^']+'|_fbp|pintrk\('load'[^)]*\)/g) || [];
  console.log('TAGS', [...new Set(tags)]);
  console.log('HOSTS', [...hosts].sort().join('\n'));
  console.log('INTERESTING', [...new Set(interesting)].join('\n'));
  const cookies = await ctx.cookies();
  console.log('COOKIES', cookies.map(c => c.domain + ' ' + c.name).join('\n'));
  await browser.close();
})();
