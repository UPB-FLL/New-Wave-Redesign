// @vitest-environment node
// Every static New Wave IT page renders its real body at build time, so a
// reader that never runs the bundle gets the page, not an empty shell. Run
// under Node, as the build does: no window, no localStorage, so a component
// that touches either at render time fails here instead of in the build.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { endJsonLdCapture } from './jsonLdCapture';
import { isPrerenderedItPath, renderItBody, renderItPage } from './prerenderBody';
import { HOME_PAGE_JSON_LD, prerenderedItRoutes } from './routeMeta';

const appSource = readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
const bodyRoutes = ['/', ...prerenderedItRoutes().map((route) => route.path)].filter(isPrerenderedItPath);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('renderItBody', () => {
  it('renders every static route but the lazy partner sign-in', () => {
    const paths = prerenderedItRoutes().map((route) => route.path);
    expect(bodyRoutes).toHaveLength(paths.length); // 36 routes + "/" - "/groundswell"
    expect(isPrerenderedItPath('/groundswell')).toBe(false);
    expect(isPrerenderedItPath('/status')).toBe(true);
    expect(isPrerenderedItPath('/service/some-cms-page')).toBe(false);
    expect(() => renderItBody('/groundswell')).toThrow(/No New Wave IT body/);
  });

  it('covers every literal public route App.tsx mounts', () => {
    const literal = [...appSource.matchAll(/<Route path="(\/[^":]*)" element=/g)].map((m) => m[1]);
    const expectedShell = new Set(['/groundswell', '/admin']);
    for (const routePath of literal.filter((p) => !expectedShell.has(p))) {
      expect(isPrerenderedItPath(routePath), `${routePath} needs a row in IT_ROUTE_ELEMENTS`).toBe(true);
    }
  });

  it.each(bodyRoutes)('%s renders one H1 and readable copy', (routePath) => {
    const html = renderItBody(routePath);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(text(html).split(' ').filter(Boolean).length).toBeGreaterThan(100);
    expect(html).not.toContain('<script');
    // Reveal animations start visible in the prerender; no copy sits hidden.
    expect(html).not.toMatch(/opacity:\s*0[;"]/);
    expect(html).not.toMatch(/translateY\(\d+px\)/);
  });

  it('renders the CMS copy it is seeded with, and only for that render', () => {
    const seeded = renderItBody('/about', { footer: { phone: '(561) 000-0000' } });
    expect(seeded).toContain('(561) 000-0000');
    expect(renderItBody('/about')).not.toContain('(561) 000-0000');
    expect(renderItBody('/about')).toContain('(561) 564-1846');
  });

  it('renders each service guide at its own URL', () => {
    expect(text(renderItBody('/l/it-repair-guide'))).toMatch(/repair/i);
    expect(text(renderItBody('/l/cloud-solutions-guide'))).toMatch(/cloud/i);
  });
});

// usePageMeta writes JSON-LD in an effect, which never runs here, so the
// build takes what each page passes to it from the render itself.
describe('renderItPage', () => {
  type Node = Record<string, unknown>;
  const nodes = (routePath: string) => (renderItPage(routePath).jsonLd ?? []) as Node[];
  const types = (routePath: string) => nodes(routePath).map((node) => node['@type']);
  // The legal pages pass no JSON-LD.
  const WITHOUT_JSON_LD = '/privacy-policy';

  it('returns the body renderItBody returns', () => {
    for (const routePath of ['/', '/contact', '/it-support-fort-lauderdale', '/l/managed-it-guide', WITHOUT_JSON_LD]) {
      expect(renderItPage(routePath).bodyHtml, routePath).toBe(renderItBody(routePath));
    }
    expect(renderItPage('/about', { footer: { phone: '(561) 000-0000' } }).bodyHtml).toContain('(561) 000-0000');
    expect(() => renderItPage('/groundswell')).toThrow(/No New Wave IT body/);
  });

  it('returns the Service node a local landing page and a service category pass to usePageMeta', () => {
    const [landing] = nodes('/it-support-fort-lauderdale').filter((node) => node['@type'] === 'Service');
    expect(landing).toMatchObject({ '@context': 'https://schema.org', url: 'https://www.newwaveitfl.com/it-support-fort-lauderdale' });
    expect(types('/service-category/healthcare')).toContain('Service');
  });

  it('returns a guide’s Article and FAQPage nodes, for that guide', () => {
    expect(types('/l/managed-it-guide')).toEqual(expect.arrayContaining(['Article', 'FAQPage']));
    const article = (routePath: string) => nodes(routePath).find((node) => node['@type'] === 'Article');
    expect(article('/l/managed-it-guide')?.mainEntityOfPage).toBe('https://www.newwaveitfl.com/l/managed-it-guide');
    expect(article('/l/it-repair-guide')?.mainEntityOfPage).toBe('https://www.newwaveitfl.com/l/it-repair-guide');
    const faq = nodes('/l/managed-it-guide').find((node) => node['@type'] === 'FAQPage');
    expect((faq?.mainEntity as unknown[]).length).toBeGreaterThan(0);
  });

  it('returns the ContactPage node for /contact and the shared WebPage node for the homepage', () => {
    expect(types('/contact')).toContain('ContactPage');
    expect(renderItPage('/').jsonLd).toEqual([HOME_PAGE_JSON_LD]);
    // App.tsx's HomePage passes the same constant, so the hydrated homepage carries the same node.
    expect(appSource).toContain('usePageMeta({ ...HOME_PAGE_META, jsonLd: HOME_PAGE_JSON_LD });');
  });

  it('returns null for a page that passes no JSON-LD', () => {
    expect(renderItPage(WITHOUT_JSON_LD).jsonLd).toBeNull();
  });

  it('gives every route either null or a list of typed nodes', () => {
    for (const routePath of bodyRoutes) {
      const { jsonLd } = renderItPage(routePath);
      if (jsonLd === null) continue;
      expect(jsonLd.length, routePath).toBeGreaterThan(0);
      for (const node of jsonLd as Node[]) expect(node['@type'], routePath).toBeTruthy();
    }
  });

  it('captures nothing when no capture is open', () => {
    renderItBody('/contact');
    expect(endJsonLdCapture()).toBeNull();
    expect(renderItPage(WITHOUT_JSON_LD).jsonLd).toBeNull();
  });

  it('never carries one page’s JSON-LD into the next render', () => {
    expect(types('/contact')).toContain('ContactPage');
    expect(renderItPage(WITHOUT_JSON_LD).jsonLd).toBeNull();
    expect(types('/it-support-fort-lauderdale')).not.toContain('ContactPage');
    expect(types('/contact')).not.toContain('Service');
    expect(types('/l/it-repair-guide')).not.toContain('ContactPage');
  });
});
