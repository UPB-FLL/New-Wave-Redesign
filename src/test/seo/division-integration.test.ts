// Guards that adding the New Wave: Social Engineering division left the parent
// site's SEO surface intact, and that the division's URLs are fully wired.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { allDivisionPages } from '../../divisions/socialEngineering/seo';
import { SITE_URL } from '../../divisions/socialEngineering/site';

const root = path.resolve(__dirname, '../../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

/** Every URL the sitemap listed before the division existed. */
const PARENT_SITEMAP_PATHS = [
  '/', '/services', '/blog', '/pricing', '/contact', '/why-us', '/about', '/support',
  '/service-category/cybersecurity', '/service-category/managed-it-services', '/service-category/live-it-support',
  '/service-category/cloud-solutions', '/service-category/network-infrastructure', '/service-category/it-repair-upgrades',
  '/service-category/healthcare', '/service-category/family-offices', '/service-category/luxury',
  '/service-category/cellular-das-and-public-safety', '/cybersecurity', '/status', '/codenest',
  '/l/cybersecurity-guide', '/l/it-support-guide', '/l/it-repair-guide', '/l/managed-it-guide',
  '/l/cloud-solutions-guide', '/l/network-infrastructure-guide', '/privacy-policy', '/terms-and-conditions',
  '/cookie-policy',
];

const divisionPaths = allDivisionPages().map((page) => page.path);

describe('sitemap.xml', () => {
  const locs = [...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  it('still lists every parent URL, unchanged', () => {
    PARENT_SITEMAP_PATHS.forEach((p) => expect(locs).toContain(`${SITE_URL}${p}`));
  });

  it('lists every division URL exactly once and nothing else new', () => {
    divisionPaths.forEach((p) => expect(locs.filter((loc) => loc === `${SITE_URL}${p}`)).toHaveLength(1));
    expect(locs).toHaveLength(PARENT_SITEMAP_PATHS.length + divisionPaths.length);
  });
});

describe('robots.txt', () => {
  it('does not block the division', () => {
    const robots = read('public/robots.txt');
    expect(robots).not.toMatch(/Disallow:\s*\/social-engineering/);
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});

describe('vercel.json rewrites', () => {
  const config = JSON.parse(read('vercel.json')) as { rewrites: { source: string; destination: string }[] };
  const rewrites = config.rewrites;
  const catchAll = rewrites.findIndex((rule) => rule.source === '/(.*)');

  it('keeps the API passthrough first and the SPA catch-all last', () => {
    expect(rewrites[0]).toEqual({ source: '/api/(.*)', destination: '/api/$1' });
    expect(catchAll).toBe(rewrites.length - 1);
    expect(rewrites[catchAll].destination).toBe('/index.html');
  });

  it('serves each division URL its prerendered file, ahead of the catch-all', () => {
    divisionPaths.forEach((p) => {
      const index = rewrites.findIndex((rule) => rule.source === p);
      expect(index, p).toBeGreaterThan(0);
      expect(index, p).toBeLessThan(catchAll);
      expect(rewrites[index].destination).toBe(`${p}/index.html`);
    });
  });

  it('adds no rewrite for any parent URL', () => {
    const extra = rewrites.filter((rule) => rule.source !== '/api/(.*)' && rule.source !== '/(.*)');
    expect(extra.map((rule) => rule.source).sort()).toEqual([...divisionPaths].sort());
  });
});

describe('index.html (the parent shell every New Wave IT URL is served)', () => {
  const shell = read('index.html');

  it('keeps the parent homepage identity untouched', () => {
    expect(shell).toContain(
      '<title>New Wave IT — 24/7 Managed IT, Cybersecurity & Cloud in Fort Lauderdale</title>',
    );
    expect(shell).toContain('<link rel="canonical" href="https://www.newwaveitfl.com/" />');
    expect(shell).toContain('<meta property="og:site_name" content="New Wave IT" />');
    expect(shell).toContain('"@type": ["LocalBusiness", "ProfessionalService"]');
    expect(shell).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
  });
});
