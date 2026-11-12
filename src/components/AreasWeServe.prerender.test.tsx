// @vitest-environment node
// The build renders the home page and /services under Node (src/lib/prerenderBody.tsx),
// so the band and its links have to be in the static HTML a crawler reads.

import { describe, expect, it } from 'vitest';
import { renderItBody } from '../lib/prerenderBody';
import { AREA_LINKS } from './AreasWeServe';

/** The band's own markup inside a rendered page. */
function band(html: string): string {
  const start = html.indexOf('<section id="areas-we-serve"');
  expect(start, 'the band is in the page').toBeGreaterThan(-1);
  return html.slice(start, html.indexOf('</section>', start));
}

describe('AreasWeServe in the build-time render', () => {
  it.each(['/', '/services'])('%s carries the band once, with a link to every local page', (routePath) => {
    const html = renderItBody(routePath);
    expect(html.split('<section id="areas-we-serve"')).toHaveLength(2);
    const section = band(html);
    expect(section).toContain('Areas we serve</h2>');
    for (const link of AREA_LINKS) expect(section, link.href).toContain(`href="${link.href}"`);
    expect(section).toContain('href="/pricing"');
    expect(section).toContain('href="/blog"');
    expect(section.includes('href="/services"')).toBe(routePath === '/');
  });

  it('comes after the home page sections and before the footer', () => {
    const html = renderItBody('/');
    const at = (marker: string) => html.indexOf(marker);
    expect(at('id="why-us"')).toBeGreaterThan(-1);
    expect(at('id="why-us"')).toBeLessThan(at('id="areas-we-serve"'));
    expect(at('id="areas-we-serve"')).toBeLessThan(at('<footer'));
  });

  it('comes before the contact form on /services', () => {
    const html = renderItBody('/services');
    expect(html.indexOf('id="areas-we-serve"')).toBeLessThan(html.indexOf('data-contact-section'));
    expect(html.indexOf('id="services"')).toBeLessThan(html.indexOf('id="areas-we-serve"'));
  });
});
