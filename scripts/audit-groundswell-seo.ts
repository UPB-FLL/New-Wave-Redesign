/**
 * Reproduce a read-only Site Current audit of a public URL or a built HTML file.
 * No Google/Search Console/PageSpeed accounts, indexing, or rankings are inferred.
 * Run with: npx vite-node scripts/audit-groundswell-seo.ts --url <url> --out <file>
 * Optional: --html <built-file> --render-url <preview-url> --browser <chromium>
 *           --screenshot <outside-repository-path> (defaults to the OS temp dir)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { parseSite, scanSite, UA } from '../api/_lib/groundswell/currents/site';

const args = process.argv.slice(2);
const arg = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const url = arg('--url');
const output = arg('--out');
if (!url || !output) throw new Error('Expected --url <public-url> and --out <evidence.json>.');
const sourceFile = arg('--html');
const renderUrl = arg('--render-url');
const browserExecutable = arg('--browser');
const hash = (html: string) => createHash('sha256').update(html).digest('hex');

const response = sourceFile ? null : await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
const raw = sourceFile ? readFileSync(sourceFile, 'utf8') : await response!.text();
const finalUrl = response?.url || url;
const evidence: Record<string, unknown> = {
  observed_at: new Date().toISOString(),
  engine: 'GroundSwell Site Current: api/_lib/groundswell/currents/site.ts',
  source: sourceFile ? { kind: 'built_html', file: sourceFile, sha256: hash(raw), parser_status_context: 200 } : {
    kind: 'live_http', requested_url: url, final_url: finalUrl, status: response!.status, sha256: hash(raw),
    content_type: response!.headers.get('content-type'), x_robots_tag: response!.headers.get('x-robots-tag'),
  },
  // A built file has no HTTP status. 200 is explicitly a parser input above,
  // not a claim that this candidate has been deployed or served in production.
  raw_parse_site: parseSite(raw, url, finalUrl, response?.status ?? 200),
  limitations: [
    'Plain HTTP and local browser observations only; no Search Console, ranking, traffic, or Google indexing evidence.',
    'No PageSpeed API, Core Web Vitals, or Lighthouse scores were requested or estimated.',
  ],
};
if (!sourceFile) {
  evidence.live_scan_site = await scanSite(url);
  const ogImage = (evidence.raw_parse_site as ReturnType<typeof parseSite>).og_image;
  if (ogImage) {
    const imageResponse = await fetch(ogImage, { signal: AbortSignal.timeout(30_000) });
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    evidence.social_image = {
      url: ogImage, status: imageResponse.status, content_type: imageResponse.headers.get('content-type'),
      ...(isPng && bytes.length >= 24 ? { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) } : {}),
    };
  }
  const origin = new URL(url).origin;
  evidence.discovery = await Promise.all(['robots.txt', 'sitemap.xml'].map(async resource => {
    const resourceUrl = `${origin}/${resource}`;
    const resourceResponse = await fetch(resourceUrl, { signal: AbortSignal.timeout(30_000) });
    const text = await resourceResponse.text();
    return { url: resourceUrl, status: resourceResponse.status, sha256: hash(text),
      ...(resource === 'robots.txt' ? { text } : { includes_requested_url: text.includes(`<loc>${url}</loc>`) }) };
  }));
}
if (browserExecutable) {
  const browser = await puppeteer.launch({ executablePath: browserExecutable, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1365, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    const browserResponse = await page.goto(renderUrl ?? url, { waitUntil: 'networkidle2', timeout: 45_000 });
    const browserRaw = browserResponse ? await browserResponse.text() : '';
    if (sourceFile && hash(browserRaw) !== hash(raw)) {
      throw new Error('Preview URL did not serve the specified built HTML. For Vite preview, use the route with a trailing slash.');
    }
    await page.waitForSelector('#main h1', { timeout: 20_000 });
    const rendered = await page.content();
    evidence.browser = {
      requested_url: renderUrl ?? url, final_url: page.url(), status: browserResponse?.status() ?? null,
      response_sha256: hash(browserRaw),
      sha256: hash(rendered), page_errors: errors,
      // Use the public canonical URL as parser context for a local preview.
      parser_url_context: url,
      parse_site: parseSite(rendered, url, url, browserResponse?.status() ?? 0),
      dom: await page.evaluate(() => {
        const root = document.getElementById('root');
        return {
          root_child_count: root?.childElementCount ?? 0,
          main_word_count: document.querySelector('main')?.textContent?.trim().split(/\s+/).length ?? 0,
          h1: [...document.querySelectorAll('main h1')].map(node => node.textContent),
          faq_count: document.querySelectorAll('main details').length,
          title_count: document.head.querySelectorAll('title').length,
          canonical_count: document.head.querySelectorAll('link[rel="canonical"]').length,
          json_ld_count: document.querySelectorAll('script[type="application/ld+json"]').length,
        };
      }),
    };
    if (sourceFile) {
      // Replay the saved HTML response while loading the current built assets.
      // This checks startup from a cached document without a second SEO copy.
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
          void request.respond({ status: 200, contentType: 'text/html; charset=utf-8', body: browserRaw });
        } else void request.continue();
      });
      await page.reload({ waitUntil: 'networkidle2', timeout: 45_000 });
      await page.click('.gs-process [role="tab"]:nth-child(2)');
      await page.waitForFunction(() => document.querySelector('.gs-process [role="tab"]:nth-child(2)')?.getAttribute('aria-selected') === 'true');
      evidence.saved_html_replay = await page.evaluate(() => ({
        source: 'Saved document response replayed; current built assets loaded normally.',
        h1_count: document.querySelectorAll('#root h1').length,
        main_count: document.querySelectorAll('main').length,
        active_process_tab: document.querySelector('.gs-process [role="tab"][aria-selected="true"]')?.textContent,
        duplicate_fallback: Boolean(document.querySelector('body > noscript main')),
      }));
      // page_errors is shared so errors from the saved-document startup are
      // retained in the browser evidence as well as from the first navigation.
      await page.setJavaScriptEnabled(false);
      await page.goto(renderUrl ?? url, { waitUntil: 'networkidle2', timeout: 45_000 });
      evidence.no_javascript = await page.evaluate(() => ({
        h1: [...document.querySelectorAll('#root h1')].map(node => node.textContent),
        root_child_count: document.querySelector('#root')?.childElementCount ?? 0,
        main_count: document.querySelectorAll('main').length,
        faq_count: document.querySelectorAll('main details').length,
        visible_main_words: document.querySelector('main')?.innerText.trim().split(/\s+/).length ?? 0,
      }));
      await page.setViewport({ width: 320, height: 900 });
      await page.click('main details summary');
      evidence.no_javascript_320 = await page.evaluate(() => ({
        viewport_width: innerWidth,
        document_width: document.documentElement.scrollWidth,
        h1_count: document.querySelectorAll('#root h1').length,
        main_count: document.querySelectorAll('main').length,
        faq_count: document.querySelectorAll('main details').length,
        native_faq_opened: Boolean(document.querySelector('main details[open]')),
      }));
      await page.evaluate(() => scrollTo(0, 0));
      const screenshot = arg('--screenshot') ?? path.join(tmpdir(), `${path.basename(output, '.json')}.no-js-320.png`);
      mkdirSync(path.dirname(screenshot), { recursive: true });
      await page.screenshot({ path: screenshot });
      evidence.no_javascript_320_screenshot = screenshot;
    }
  } finally {
    await browser.close();
  }
}
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Wrote Site Current evidence to ${output}`);
