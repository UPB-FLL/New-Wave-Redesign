const { chromium } = require('../scan/node_modules/playwright-core');
const fs = require('fs');
(async () => {
  const urls = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', viewport: { width: 1366, height: 900 } });
  for (const u of urls) {
    const p = await ctx.newPage();
    try {
      const r = await p.goto(u, { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>null);
      await p.waitForTimeout(2500);
      for (let i=0;i<6;i++){ await p.mouse.wheel(0, 1500); await p.waitForTimeout(400); }
      const text = (await p.innerText('body')).replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n');
      const name = u.replace(/https?:\/\//,'').replace(/[^a-z0-9]+/gi,'_').slice(0,80);
      fs.writeFileSync(name + '.txt', text);
      const prices = [...new Set((text.match(/\$\s?[0-9][0-9,]*(\.[0-9]{2})?(\s?(\/|per)\s?\w+)?/g)||[]))];
      console.log(`=== ${u} (${r?r.status():'ERR'}) ${text.length} chars\nPRICES: ${prices.join(' | ') || 'none'}`);
    } catch (e) { console.log(`=== ${u} ERROR ${e.message}`); }
    await p.close();
  }
  await b.close();
})();
