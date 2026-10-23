import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSite, scanSite } from '../../../api/_lib/groundswell/currents/site';
import { factsForPrompt } from '../../../api/_lib/groundswell/model';
import { buildAuditHtml, buildSummaryHtml } from '../../../api/_lib/groundswell/reports';
import { sampleReportData } from './fixtures/groundswell-report';

const URL = 'https://business.example/services';
const scan = (html: string) => parseSite(html, URL, URL, 200);
const healthyHead = '<title>Local repairs</title><meta name="description" content="Repairs for your home."><link rel="canonical" href="/services">';
const plain = (html: string) => html.replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
afterEach(() => vi.unstubAllGlobals());

describe('Site Current technical SEO evidence', () => {
  it('measures body headings and words without counting head, scripts, comments, templates, or noscript copy', () => {
    const s = scan(`<html><head>${healthyHead}<script>const text = '<h1>Fake heading</h1>';</script></head><body>
      <!-- <h1>Comment heading</h1> --><noscript><h1>Fallback heading</h1></noscript>
      <template><h1>Template heading</h1></template><h1>Local repairs</h1><p>Care for your home.</p>
    </body></html>`);
    expect(s.h1).toEqual(['Local repairs']);
    expect(s.word_count).toBe(6);
    expect(s.technical_seo).toMatchObject({ scope: 'raw_http', body_h1_count: 1, body_word_count: 6, app_shell: false });
    expect(s.technical_seo?.findings).toEqual([]);
  });

  it('reports an empty app shell as a rendering check, not proof that Google cannot index the page', () => {
    const s = scan(`<html><head>${healthyHead}</head><body><div id="root"></div>
      <script type="module" src="/assets/app.js"></script><noscript><h1>Useful fallback</h1></noscript></body></html>`);
    expect(s.technical_seo).toMatchObject({ app_shell: true, body_word_count: 0, body_h1_count: 0 });
    const finding = s.technical_seo?.findings.find(f => f.code === 'app_shell');
    expect(finding?.evidence).toMatch(/initial|raw/i);
    expect(finding?.recommendation).toMatch(/rendered|Search Console/);
    expect(JSON.stringify(s.technical_seo)).not.toMatch(/unindexable|Google cannot index/i);
  });

  it('finds head-loaded application bundles and does not mistake JavaScript body-tag strings for document content', () => {
    const s = scan(`<html><head>${healthyHead}<script type="module" src="/assets/index.js"></script>
      <script>const snippet = '<body><h1>Not page content</h1></body>';</script></head>
      <body><div id="root"></div><noscript><h1>GroundSwell</h1></noscript></body></html>`);
    expect(s.technical_seo?.app_shell).toBe(true);
    expect(s.h1).toEqual([]);
    expect(s.technical_seo?.findings).toContainEqual(expect.objectContaining({ code: 'app_shell' }));
  });

  it('validates complete JSON-LD blocks and reads valid graph types without accepting malformed snippets', () => {
    const s = scan(`<head>${healthyHead}
      <script type="application/ld+json">{"@type":"LocalBusiness", BROKEN}</script>
      <script type='application/ld+json'>{"@graph":[{"@type":["WebPage","Service"]}]}</script>
      </head><body><h1>Local repairs</h1></body>`);
    expect(s.schema_types).toEqual(['WebPage', 'Service']);
    expect(s.technical_seo?.json_ld).toEqual({ blocks: 2, invalid_blocks: 1 });
    expect(s.technical_seo?.findings).toContainEqual(expect.objectContaining({ code: 'invalid_json_ld', severity: 'medium' }));
  });

  it('recognizes robots noindex and invalid or conflicting canonical targets', () => {
    const s = scan(`<head><title>Repairs</title><meta name=robots content="index, noindex">
      <link rel=canonical href="javascript:void(0)"><link rel="canonical" href="https://elsewhere.example/"></head><body><h1>Repairs</h1></body>`);
    const codes = s.technical_seo?.findings.map(f => f.code);
    expect(codes).toEqual(expect.arrayContaining(['noindex', 'invalid_canonical', 'multiple_canonicals']));
    expect(s.technical_seo?.findings.find(f => f.code === 'noindex')?.recommendation).toMatch(/intentional|public/i);
  });

  it('uses the HTTP robots header and does not apply another bot’s scoped noindex to Googlebot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`<head>${healthyHead}</head><h1>Repairs</h1>`, {
      status: 200, headers: { 'X-Robots-Tag': 'googlebot: noindex' },
    })));
    expect((await scanSite(URL)).technical_seo?.findings).toContainEqual(expect.objectContaining({ code: 'noindex' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`<head>${healthyHead}</head><h1>Repairs</h1>`, {
      status: 200, headers: { 'X-Robots-Tag': 'otherbot: noindex, googlebot: index' },
    })));
    expect((await scanSite(URL)).technical_seo?.findings.some(f => f.code === 'noindex')).toBe(false);
  });

  it.each([
    ['max-snippet:0, noindex', true],
    ['max-image-preview:large, noindex', true],
    ['max-video-preview:-1, noindex', true],
    ['unavailable_after: 25 Jun 2027 15:00:00 PST, noindex', true],
    ['otherbot: max-snippet:0, noindex', false],
    ['googlebot: max-image-preview:large, noindex', true],
  ])('does not confuse directive parameters with crawler scopes: %s', (header, blocked) => {
    const s = parseSite(`<head>${healthyHead}</head><h1>Repairs</h1>`, URL, URL, 200, header);
    expect(s.technical_seo?.findings.some(f => f.code === 'noindex')).toBe(blocked);
  });

  it('reports absent alt attributes while allowing empty decorative alternatives and hidden pixels', () => {
    const s = scan(`<head>${healthyHead}</head><body><h1>Repairs</h1>
      <img src="/work.jpg"><img src="/ornament.svg" alt=""><img src="/team.jpg" alt="The repair team">
      <img src="/pixel.gif" aria-hidden="true"><img src="/tracking.gif" width="1" height="1"></body>`);
    expect(s.technical_seo?.images).toMatchObject({ total: 5, missing_alt: 1, empty_alt: 1 });
    expect(s.technical_seo?.findings.find(f => f.code === 'missing_image_alt')?.recommendation).toMatch(/decorative/);
  });

  it('accepts compact pages and relative canonicals without inventing a ranking score or minimum word count', () => {
    const s = scan(`<head>${healthyHead}</head><body><h1>Repairs</h1></body>`);
    expect(s.technical_seo?.canonical_url).toBe(URL);
    expect(s.technical_seo?.findings).toEqual([]);
    expect(s.technical_seo).not.toHaveProperty('score');
  });

  it('does not mistake an unused widget mount for an app shell when the body already has its main heading', () => {
    const s = scan(`<head>${healthyHead}<script src="/widget.js"></script></head><body>
      <h1>Local repairs</h1><p>Call for service.</p><div id="app"></div></body>`);
    expect(s.technical_seo?.app_shell).toBe(false);
    expect(s.technical_seo?.findings).toEqual([]);
  });

  it('does not turn an unreachable response into claims that the website lacks metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timed out')));
    const s = await scanSite(URL);
    expect(s.error).toBe('Timed out');
    expect(s.technical_seo?.findings).toEqual([]);
  });
});

describe('technical SEO in audit facts and reports', () => {
  const report = () => {
    const d = sampleReportData();
    d.facts.site!.business = scan(`<head>${healthyHead}<meta name="robots" content="noindex"></head><body><h1>Local repairs</h1></body>`);
    return d;
  };

  it('carries scoped evidence into model facts and renders verified fixes without depending on model wording', () => {
    const d = report();
    expect(factsForPrompt(d.facts).website?.business?.technical_seo?.scope).toBe('raw_http');
    const full = plain(buildAuditHtml(d));
    expect(full).toContain('Technical SEO checks');
    expect(full).toMatch(/noindex/i);
    expect(full).toMatch(/raw HTTP|initial HTML/i);
    expect(full).toMatch(/rendered|Search Console/);
    const summary = plain(buildSummaryHtml(d, { deck: 'https://www.newwaveitfl.com/groundswell', audit: 'https://www.newwaveitfl.com/groundswell', folder: 'https://www.newwaveitfl.com/groundswell' }));
    expect(summary).toMatch(/Website:.*noindex/i);
  });

  it('preserves old SiteScan records and keeps partner reports free of engine branding and outside links', () => {
    const d = report();
    d.preparer = { name: 'Reef Growth Co', logo: null, whiteLabel: true };
    const html = buildAuditHtml(d);
    expect(html).not.toMatch(/GroundSwell|New Wave|newwaveitfl/i);
    expect(html).not.toMatch(/href=/);
    delete d.facts.site!.business!.technical_seo;
    expect(() => buildAuditHtml(d)).not.toThrow();
    expect(buildAuditHtml(d)).not.toContain('Technical SEO checks');
  });

  it('does not label an unavailable website as passing its technical SEO checks', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Timed out')));
    const d = sampleReportData();
    d.facts.site!.business = await scanSite(URL);
    const html = plain(buildAuditHtml(d));
    expect(html).toMatch(/Technical SEO.*could not be (checked|assessed)/i);
    expect(html).not.toContain('No issues were identified');
  });
});
