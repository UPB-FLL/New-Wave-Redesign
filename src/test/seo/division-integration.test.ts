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
  DIVISION_GROUNDSWELL_PATH,
  DIVISION_PUBLISHED,
  DIVISION_SERVICE_SLUGS,
  GROUNDSWELL_METRIC_SLUGS,
  RETIRED_SERVICE_SLUGS,
  SITE_URL,
  divisionServicePath,
  groundswellMetricPath,
} from '../../divisions/socialEngineering/site';
import { prerenderedItRoutes } from '../../lib/routeMeta';
import { GROUNDSWELL_CUSTOMERS_PATH, GROUNDSWELL_PATH, GROUNDSWELL_SET_PASSWORD_PATH, LEGACY_PARTNER_PATH } from '../../groundswell/site';

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
  // Local landing pages added 2026-10-21 (marketing audit).
  '/it-support-fort-lauderdale', '/managed-it-services-fort-lauderdale',
  // Groundswell's sign-in (2026-10-21): the partner portal, moved out of the division.
  '/groundswell',
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
    // The partner portal's move to /groundswell has its own redirects (tested below).
    const redirects = (config.redirects ?? []).filter((rule) => rule.source.startsWith('/social-engineering') && !rule.source.startsWith(LEGACY_PARTNER_PATH) && !['/social-engineering/croissance', '/social-engineering/croissance/'].includes(rule.source));
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
    expect(rewrites[catchAll].destination).toBe('/_shell.html');
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
    // Five rewrites go to functions rather than files: the content sitemap
    // (api/sitemap-content.ts), blog posts, whose head comes from the database
    // (api/blog-page.ts, pinned in src/test/api/blog-page.test.ts), the
    // single-post API (api/blog/post.ts, pinned in blog-routes.test.ts), and the
    // audit routes' old addresses (api/groundswell/*, pinned in groundswell-routes.test.ts).
    // The homepage is dist/index.html itself (prerendered, served from the
    // filesystem ahead of any rewrite); the fallback routes get the empty
    // shell vite.config.ts writes beside it (SHELL_FILE).
    const functionRoutes = ['/api/(.*)', '/api/blog/:id', '/api/audits/run', '/api/audits/worker', '/(.*)', '/sitemap-content.xml', '/blog/:slug'];
    const extra = rewrites.filter((rule) => !functionRoutes.includes(rule.source));
    expect(extra.map((rule) => rule.source).sort()).toEqual([...prerenderedPaths].sort());
    expect(extra.map((rule) => rule.source)).not.toContain('/');
  });
});

describe('index.html (the parent shell every New Wave IT URL is served)', () => {
  const shell = read('index.html');

  it("states the owner-confirmed hours: office Mon–Fri 8am–6pm, a 24/7 emergency line (fact sheet Q3, 2026-10-26)", () => {
    const block = shell.match(/<script type="application\/ld\+json">\s*(\[[\s\S]*?\])\s*<\/script>/)?.[1] ?? '[]';
    const [business] = JSON.parse(block) as { openingHoursSpecification: { dayOfWeek: string[]; opens: string; closes: string }[]; contactPoint: { contactType: string; hoursAvailable: { dayOfWeek: string[]; opens: string; closes: string } }[] }[];
    expect(business.openingHoursSpecification).toEqual([
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '18:00' },
    ]);
    const emergency = business.contactPoint.find((c) => c.contactType === 'emergency');
    expect(emergency?.hoursAvailable.dayOfWeek).toHaveLength(7);
    expect(emergency?.hoursAvailable.opens).toBe('00:00');
  });

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
  const pages = [DIVISION_GROUNDSWELL_PATH, ...GROUNDSWELL_METRIC_SLUGS.map(groundswellMetricPath), DIVISION_CUSTOMERS_PATH, DIVISION_CONTACT_US_PATH, DIVISION_CONTACT_PATH];
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
      ['DIVISION_GROUNDSWELL_PATH', 'SocialEngineeringGroundswellRoute', 'SocialEngineeringGroundswellPage'],
      ['DIVISION_CUSTOMERS_PATH', 'SocialEngineeringCustomersRoute', 'SocialEngineeringCustomersPage'],
      ['DIVISION_CONTACT_US_PATH', 'SocialEngineeringContactUsRoute', 'SocialEngineeringContactUsPage'],
      ['DIVISION_CONTACT_PATH', 'SocialEngineeringContactRoute', 'SocialEngineeringContactPage'],
    ].forEach(([constant, route, page]) => {
      expect(divisionRoutes).toContain(`<Route path={${constant}} element={<${route} />} />`);
      expect(routes).toContain(`import('./pages/${page}')`);
    });
    // The metric pages: one route per slug, lazily loaded.
    expect(divisionRoutes).toContain('GROUNDSWELL_METRIC_SLUGS.map((slug) => (');
    expect(divisionRoutes).toContain('<Route key={slug} path={groundswellMetricPath(slug)} element={<SocialEngineeringGroundswellMetricRoute slug={slug} />} />');
    expect(routes).toContain("import('./pages/SocialEngineeringGroundswellMetricPage')");
  });

  it('permanently redirects both old product URLs to GroundSwell', () => {
    const config = JSON.parse(read('vercel.json'));
    for (const source of ['/social-engineering/croissance', '/social-engineering/croissance/']) {
      expect(config.redirects).toContainEqual({ source, destination: '/social-engineering/groundswell', permanent: true });
    }
  });

  it('no longer serves the partner portal under Croissance: its old addresses redirect to /groundswell', () => {
    const redirects = (JSON.parse(read('vercel.json')) as { redirects: { source: string; destination: string; permanent: boolean }[] }).redirects;
    for (const [from, to] of [
      [LEGACY_PARTNER_PATH, GROUNDSWELL_PATH],
      [`${LEGACY_PARTNER_PATH}/dashboard`, GROUNDSWELL_CUSTOMERS_PATH],
      [`${LEGACY_PARTNER_PATH}/set-password`, GROUNDSWELL_SET_PASSWORD_PATH],
    ]) {
      expect(divisionPaths).not.toContain(from);
      expect(sitemap).not.toContain(`<loc>${SITE_URL}${from}</loc>`);
      expect(rewrites.map((rule) => rule.source)).not.toContain(from);
      expect(redirects).toContainEqual({ source: from, destination: to, permanent: true });
    }
  });
});
