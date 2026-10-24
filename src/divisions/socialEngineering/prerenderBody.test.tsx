// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSite } from '../../../api/_lib/groundswell/currents/site';
import { auditContent, groundswellMetricGroups } from './content';
import { renderDivisionPageHtml } from './prerender';
import { isGroundswellPublicPath, renderGroundswellBody } from './prerenderBody';
import { groundswellMetricPageSeo, groundswellPageSeo } from './seo';
import { DIVISION_CONTACT_US_PATH, absoluteUrl, groundswellMetricPath } from './site';

const shell = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');

describe('GroundSwell public HTML content', () => {
  it('serves actual React content and FAQ answers without running browser JavaScript', () => {
    const page = groundswellPageSeo();
    const body = renderGroundswellBody();
    const html = renderDivisionPageHtml(shell, page, { bodyHtml: body });
    const scan = parseSite(html, absoluteUrl(page.path), absoluteUrl(page.path), 200);

    expect(html).toContain(`<div id="root">${body}</div>`);
    expect(html).not.toContain('<noscript><main>');
    expect(scan.h1).toEqual([auditContent.headline]);
    expect(scan.technical_seo?.app_shell).toBe(false);
    expect(scan.technical_seo?.body_h1_count).toBe(1);
    expect(scan.technical_seo?.body_word_count).toBeGreaterThan(0);
    expect(scan.technical_seo?.findings).toEqual([]);
    expect(body).toContain(auditContent.summary);
    expect(body).toContain('id="how-it-works"');
    expect(body).toContain('id="reports"');
    expect(body).toContain('href="/social-engineering/contact"');
    auditContent.faqs.forEach(({ question, answer }) => {
      expect(body).toContain(question);
      expect(body).toContain(answer);
    });
    // FAQ schema and the crawlable page always use the same content source.
    const faq = page.jsonLd.find(node => node['@type'] === 'FAQPage');
    expect(faq?.mainEntity).toHaveLength(auditContent.faqs.length);
  });

  it('renders every metric page’s body with its H1, its metrics and no app shell', () => {
    expect(isGroundswellPublicPath(DIVISION_CONTACT_US_PATH)).toBe(false);
    expect(() => renderGroundswellBody(DIVISION_CONTACT_US_PATH)).toThrow(/No GroundSwell body/);
    for (const group of groundswellMetricGroups) {
      const page = groundswellMetricPageSeo(group);
      expect(isGroundswellPublicPath(page.path)).toBe(true);
      expect(page.path).toBe(groundswellMetricPath(group.slug));
      const body = renderGroundswellBody(page.path);
      const html = renderDivisionPageHtml(shell, page, { bodyHtml: body });
      const scan = parseSite(html, absoluteUrl(page.path), absoluteUrl(page.path), 200);
      expect(scan.h1).toEqual([group.headline]);
      expect(scan.technical_seo?.app_shell).toBe(false);
      expect(scan.technical_seo?.body_h1_count).toBe(1);
      expect(scan.technical_seo?.findings).toEqual([]);
      group.metrics.forEach((metric) => expect(body).toContain(metric.name));
    }
  });

  it('fails a requested body render if it is empty or has lost its heading', () => {
    for (const bodyHtml of ['', '<main>Page failed to render</main>']) {
      expect(() => renderDivisionPageHtml(shell, groundswellPageSeo(), { bodyHtml })).toThrow(/body must contain/);
    }
  });

  it('links the public WebPage to its described software without inventing commercial claims', () => {
    const { jsonLd } = groundswellPageSeo();
    const app = jsonLd.find(node => node['@type'] === 'SoftwareApplication');
    const page = jsonLd.find(node => node['@type'] === 'WebPage');
    expect(page?.mainEntity).toEqual({ '@id': app?.['@id'] });
    expect(app?.description).toBe(auditContent.metaDescription);
    expect(app).not.toHaveProperty('aggregateRating');
    expect(app).not.toHaveProperty('offers');
  });
});
