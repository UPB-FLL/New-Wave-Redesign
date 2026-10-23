import { GROUNDSWELL_CONFIG } from '../../../packages/groundswell/groundswell.config.js';
import { domainOf } from './currents/search.js';
import { UA, type SiteScan } from './currents/site.js';
import { facebookPageUrl, type InstagramSnapshot } from './currents/social.js';
import type { StepContext } from './types.js';

/**
 * The accounts a competitor benchmark covers: the business, then its top
 * competitors in the order the admin entered them (the setup file's
 * `benchmark.accounts` caps the total), with what the audit's Currents
 * already found for each. Plus the plain page and sitemap reads the benchmark
 * steps share.
 */

export interface BenchAccount {
  name: string;
  website: string | null;
  domain: string | null;
  instagram: string | null;
  facebook: string | null;
  site: SiteScan | null;
  ig: InstagramSnapshot | null;
}

type SiteOut = { business: SiteScan | null; competitors: { name: string; site: SiteScan | null }[] };
type SocialOut = { business: InstagramSnapshot | null; competitors: (InstagramSnapshot & { name: string })[] };

const facebookUrl = (site: SiteScan | null) => {
  const page = site?.social.facebook[0];
  return page ? `https://www.facebook.com/${page.replace(/^\/+/, '')}` : null;
};

export function benchAccounts(ctx: StepContext): BenchAccount[] {
  const site = ctx.outputs.site as SiteOut | undefined;
  const social = ctx.outputs.social as SocialOut | undefined;
  const own = site?.business ?? null;
  const business: BenchAccount = {
    name: ctx.audit.business_name,
    website: own?.final_url ?? ctx.audit.website,
    domain: domainOf(own?.final_url ?? ctx.audit.website),
    instagram: social?.business?.handle ?? ctx.audit.instagram ?? own?.social.instagram[0] ?? null,
    facebook: facebookPageUrl(ctx.audit.facebook) ?? facebookUrl(own),
    site: own,
    ig: social?.business ?? null,
  };
  const rivals = ctx.audit.competitors.slice(0, GROUNDSWELL_CONFIG.benchmark.accounts - 1).map((c, i): BenchAccount => {
    const scan = site?.competitors.find((s) => s.name === c.name)?.site ?? site?.competitors[i]?.site ?? null;
    const ig = social?.competitors.find((s) => s.name === c.name) ?? null;
    return {
      name: c.name,
      website: scan?.final_url ?? c.website,
      domain: domainOf(scan?.final_url ?? c.website),
      instagram: ig?.handle ?? c.instagram ?? scan?.social.instagram[0] ?? null,
      facebook: facebookPageUrl(c.facebook) ?? facebookUrl(scan),
      site: scan,
      ig,
    };
  });
  return [business, ...rivals];
}

/** A page's HTML over plain HTTP (no browser), or null. */
export async function fetchHtml(url: string, timeoutMs = 15_000): Promise<{ html: string; url: string } | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xml' }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    return { html: (await r.text()).slice(0, 2_000_000), url: r.url || url };
  } catch {
    return null;
  }
}

/** Every link on a page, made absolute. */
export function pageLinks(html: string, base: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      out.push(new URL(m[1].replace(/&amp;/g, '&'), base).toString());
    } catch {
      // Not a URL.
    }
  }
  return [...new Set(out)];
}

export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

/** The site's sitemap entries (following an index one level, at most 6 child sitemaps). */
export async function sitemapEntries(site: string): Promise<SitemapEntry[]> {
  const root = new URL('/', site).toString();
  const read = (xml: string): SitemapEntry[] =>
    [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((m) => ({
      loc: (m[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1] ?? '').trim(),
      lastmod: m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/i)?.[1] ?? null,
    })).filter((e) => e.loc);
  for (const name of ['sitemap.xml', 'sitemap_index.xml', 'page-sitemap.xml']) {
    const got = await fetchHtml(new URL(name, root).toString(), 10_000);
    if (!got || !/<(?:urlset|sitemapindex)/i.test(got.html)) continue;
    const children = [...got.html.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]).slice(0, 6);
    if (!children.length) return read(got.html);
    const all = await Promise.all(children.map((c) => fetchHtml(c, 10_000)));
    return all.flatMap((x) => (x ? read(x.html) : []));
  }
  return [];
}
