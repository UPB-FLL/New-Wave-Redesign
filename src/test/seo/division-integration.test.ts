// Guards that adding the New Wave: Social Engineering division left the parent
// site's SEO surface intact, and that the division's URLs are fully wired.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { allDivisionPages } from '../../divisions/socialEngineering/seo';
import {
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_CONTACT_US_PATH,
  DIVISION_CUSTOMERS_PATH,
  DIVISION_PUBLISHED,
  DIVISION_SERVICE_SLUGS,
  RETIRED_SERVICE_SLUGS,
  SITE_URL,
  divisionServicePath,
} from '../../divisions/socialEngineering/site';
import { prerenderedItRoutes } from '../../lib/routeMeta';

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

// While the division is unpublished, none of its URLs may be listed or served.
const divisionPaths = DIVISION_PUBLISHED ? allDivisionPages().map((page) => page.path) : [];
const itPrerenderedPaths = prerenderedItRoutes().map((route) => route.path);
const prerenderedPaths = [...itPrerenderedPaths, ...divisionPaths];

describe('sitemap.xml', () => {
  const locs = [...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  it('still lists every parent URL, unchanged', () => {
    PARENT_SITEMAP_PATHS.forEach((p) => expect(locs).toContain(`${SITE_URL}${p}`));
  });

  it('lists every division URL exactly once and nothing else new', () => {
    divisionPaths.forEach((p) => expect(locs.filter((loc) => loc === `${SITE_URL}${p}`)).toHaveLength(1));
    expect(locs).toHaveLength(PARENT_SITEMAP_PATHS.length + divisionPaths.length);
  });

  it('only lists URLs whose raw HTML is prerendered, apart from the homepage shell', () => {
    // A new sitemap URL without a prerendered head would be served the
    // homepage's canonical until JavaScript runs; register it in routeMeta.ts.
    locs
      .map((loc) => loc.replace(SITE_URL, ''))
      .filter((p) => p !== '/')
      .forEach((p) => expect(prerenderedPaths, p).toContain(p));
  });
});

describe('division visibility', () => {
  const config = JSON.parse(read('vercel.json')) as { redirects?: { source: string; destination: string; permanent: boolean }[] };

  it(DIVISION_PUBLISHED ? 'publishes the division (no redirect away)' : 'temporarily redirects every division URL to the home page', () => {
    const redirects = (config.redirects ?? []).filter((rule) => rule.source.startsWith('/social-engineering'));
    if (DIVISION_PUBLISHED) {
      // Only the retired first-launch service URLs redirect, permanently, to the hub. Vercel
      // matches sources exactly, so each needs its trailing-slash form too (without it,
      // /retired-slug/ falls through to the SPA shell: a blank 200 with the homepage canonical).
      expect(redirects).toEqual(
        RETIRED_SERVICE_SLUGS.flatMap((slug) => [
          { source: divisionServicePath(slug), destination: DIVISION_BASE_PATH, permanent: true },
          { source: `${divisionServicePath(slug)}/`, destination: DIVISION_BASE_PATH, permanent: true },
        ]),
      );
    } else {
      expect(redirects).toEqual([
        { source: '/social-engineering', destination: '/', permanent: false },
        { source: '/social-engineering/:path*', destination: '/', permanent: false },
      ]);
      expect(read('public/sitemap.xml')).not.toContain('/social-engineering');
    }
  });
});

describe('retired division URLs', () => {
  it('are never reused for a current service', () => {
    const current: readonly string[] = DIVISION_SERVICE_SLUGS;
    RETIRED_SERVICE_SLUGS.forEach((slug) => expect(current).not.toContain(slug));
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

  it('serves each prerendered URL its own file, ahead of the catch-all', () => {
    prerenderedPaths.forEach((p) => {
      const index = rewrites.findIndex((rule) => rule.source === p);
      expect(index, p).toBeGreaterThan(0);
      expect(index, p).toBeLessThan(catchAll);
      expect(rewrites[index].destination).toBe(`${p}/index.html`);
    });
  });

  it('rewrites exactly the prerendered URLs, plus the routes functions serve — never the homepage', () => {
    // Two rewrites go to functions rather than files: the content sitemap
    // (api/sitemap-content.ts) and blog posts, whose head comes from the
    // database (api/blog-page.ts, pinned in src/test/api/blog-page.test.ts).
    const extra = rewrites.filter((rule) => !['/api/(.*)', '/(.*)', '/sitemap-content.xml', '/blog/:slug'].includes(rule.source));
    expect(extra.map((rule) => rule.source).sort()).toEqual([...prerenderedPaths].sort());
    expect(extra.map((rule) => rule.source)).not.toContain('/');
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

describe('division pages beyond the services', () => {
  // Listed by hand, so a page dropped from allDivisionPages() cannot quietly
  // take its sitemap entry, rewrite, and route with it.
  const pages = [DIVISION_CUSTOMERS_PATH, DIVISION_CONTACT_US_PATH, DIVISION_CONTACT_PATH];
  const sitemap = read('public/sitemap.xml');
  const rewrites = (JSON.parse(read('vercel.json')) as { rewrites: { source: string; destination: string }[] }).rewrites;
  const app = read('src/App.tsx');
  const routes = read('src/divisions/socialEngineering/routes.tsx');

  it.each(pages)('wires %s into the sitemap, vercel.json, and the router', (pagePath) => {
    if (!DIVISION_PUBLISHED) return;
    expect(divisionPaths).toContain(pagePath);
    expect(sitemap).toContain(`<loc>${SITE_URL}${pagePath}</loc>`);
    expect(rewrites).toContainEqual({ source: pagePath, destination: `${pagePath}/index.html` });
  });

  it('registers each page’s route behind DIVISION_PUBLISHED and loads it lazily', () => {
    const divisionRoutes = app.slice(app.indexOf('{DIVISION_PUBLISHED ? ('), app.indexOf(') : null}'));
    [
      ['DIVISION_CUSTOMERS_PATH', 'SocialEngineeringCustomersRoute', 'SocialEngineeringCustomersPage'],
      ['DIVISION_CONTACT_US_PATH', 'SocialEngineeringContactUsRoute', 'SocialEngineeringContactUsPage'],
      ['DIVISION_CONTACT_PATH', 'SocialEngineeringContactRoute', 'SocialEngineeringContactPage'],
    ].forEach(([constant, route, page]) => {
      expect(divisionRoutes).toContain(`<Route path={${constant}} element={<${route} />} />`);
      expect(routes).toContain(`import('./pages/${page}')`);
    });
  });
});
