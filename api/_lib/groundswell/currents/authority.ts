import { GROUNDSWELL_CONFIG } from '../../../../packages/groundswell/groundswell.config.js';
import {
  contentDepth,
  credentialsFrom,
  ownedChannels,
  pressDomains,
  TESTIMONIALS_PATH,
  type AuthorityProfile,
} from '../../../../packages/groundswell/src/benchmark/index.js';
import type { IndustryProfile } from '../../../../packages/groundswell/src/config.js';
import { benchAccounts, fetchHtml, pageLinks, sitemapEntries, type BenchAccount } from '../benchmarkAccounts.js';
import { executeTool, findKey } from '../composio.js';
import { PermanentStepError, type StepContext } from '../types.js';
import type { AhrefsSnapshot } from './search.js';

/**
 * Search Current, authority (benchmarks only): live referring domains and the
 * press among them, top pages and keywords (Ahrefs through Composio), how
 * much the site publishes (sitemap), owned channels (site links, markup and
 * Instagram bio), and the credentials its About page states. Reuses the Search
 * Current's domain rating and organic traffic instead of calling again.
 */

type SearchOut = { business: AhrefsSnapshot | null; competitors: (AhrefsSnapshot & { name: string })[] };
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const today = () => new Date().toISOString().slice(0, 10);
const textOf = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

async function ahrefs(domain: string, snap: AhrefsSnapshot | null) {
  const base = { target: domain, mode: 'subdomains' as const };
  const [stats, refs, pages, keywords] = await Promise.all([
    executeTool('AHREFS_BACKLINKS_STATS_RETRIEVAL', { ...base, date: today() }),
    executeTool('AHREFS_FETCH_SITE_EXPLORER_REFERRING_DOMAINS', {
      ...base,
      select: 'domain,domain_rating,links_to_target,first_seen',
      order_by: 'domain_rating:desc',
      limit: 25,
      history: 'live',
    }),
    executeTool('AHREFS_RETRIEVE_TOP_PAGES_FROM_SITE_EXPLORER', {
      ...base,
      date: today(),
      country: 'us',
      select: 'url,sum_traffic,keywords,top_keyword,top_keyword_volume,top_keyword_best_position',
      order_by: 'sum_traffic:desc',
      limit: 10,
    }),
    snap?.top_keywords.length
      ? Promise.resolve(null)
      : executeTool('AHREFS_RETRIEVE_ORGANIC_KEYWORDS', {
          ...base,
          date: today(),
          country: 'us',
          select: 'keyword,volume,best_position,sum_traffic,best_position_url',
          order_by: 'sum_traffic:desc',
          limit: 10,
        }),
  ]);
  const refRows = findKey<Record<string, unknown>[]>(refs, 'refdomains') ?? findKey<Record<string, unknown>[]>(refs, 'referring_domains') ?? [];
  const pageRows = findKey<Record<string, unknown>[]>(pages, 'pages') ?? [];
  const kwRows = keywords ? (findKey<Record<string, unknown>[]>(keywords, 'keywords') ?? []) : [];
  return {
    referring_domains_live: n(findKey(stats, 'live_refdomains')) ?? n(findKey(stats, 'refdomains')),
    refs: refRows.map((r) => ({ domain: String(r.domain ?? ''), domain_rating: n(r.domain_rating), first_seen: typeof r.first_seen === 'string' ? r.first_seen.slice(0, 10) : null })),
    top_pages: pageRows.slice(0, 10).map((r) => ({
      url: String(r.url ?? ''),
      traffic: n(r.sum_traffic),
      top_keyword: typeof r.top_keyword === 'string' ? r.top_keyword : null,
      volume: n(r.top_keyword_volume),
      position: n(r.top_keyword_best_position),
    })),
    top_keywords: snap?.top_keywords.length
      ? snap.top_keywords.slice(0, 10).map((k) => ({ keyword: k.keyword, volume: k.volume, position: k.position, url: k.url }))
      : kwRows.map((r) => ({ keyword: String(r.keyword ?? ''), volume: n(r.volume), position: n(r.best_position), url: typeof r.best_position_url === 'string' ? r.best_position_url : null })),
  };
}

async function profileFor(a: BenchAccount, snap: AhrefsSnapshot | null, industry: IndustryProfile): Promise<AuthorityProfile> {
  const out: AuthorityProfile = {
    name: a.name, domain: a.domain, domain_rating: snap?.domain_rating ?? null, referring_domains_live: null, press_domains: [], top_pages: [],
    top_keywords: [], organic_traffic: snap?.organic_traffic ?? null, content_pages_n: null, newest_content_date: null, owned_channels: [],
    credentials_text: null, credentials: null, testimonials_page: false, error: null,
  };
  const errors: string[] = [];
  if (a.domain) {
    try {
      const got = await ahrefs(a.domain, snap);
      Object.assign(out, { referring_domains_live: got.referring_domains_live, top_pages: got.top_pages, top_keywords: got.top_keywords });
      out.press_domains = pressDomains(got.refs, GROUNDSWELL_CONFIG);
    } catch (err) {
      if (err instanceof PermanentStepError) throw err;
      errors.push(`Ahrefs: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (a.website) {
    const home = await fetchHtml(a.website);
    const links = home ? pageLinks(home.html, home.url) : [];
    out.owned_channels = ownedChannels([...links, ...(a.ig?.bio_links ?? [])], home?.html ?? '');
    out.testimonials_page = links.some((l) => TESTIMONIALS_PATH.test(new URL(l).pathname));
    const about = links.find((l) => /\/about|\/meet|\/team|\/our-story/i.test(new URL(l).pathname));
    const aboutPage = about ? await fetchHtml(about) : null;
    const credentials = credentialsFrom(aboutPage ? textOf(aboutPage.html) : null, industry);
    out.credentials = credentials.level;
    out.credentials_text = credentials.excerpt;
    const depth = contentDepth(await sitemapEntries(a.website).catch(() => []));
    out.content_pages_n = depth.pages;
    out.newest_content_date = depth.newest;
    if (!home) errors.push('The homepage could not be read.');
  }
  out.error = errors.join(' ') || null;
  return out;
}

/**
 * The industry profile for the benchmark: the one the ad plan chose; else the
 * first profile whose hint words start a word in the write-up's category or
 * the Google Maps category; else general.
 */
export function benchmarkIndustry(outputs: Record<string, unknown>): IndustryProfile {
  const all = GROUNDSWELL_CONFIG.industries;
  const chosen = (outputs.adplan as { industry?: { id?: string } } | undefined)?.industry?.id;
  const byId = all.find((i) => i.id === chosen);
  if (byId) return byId;
  const category = [
    (outputs.model as { estimates?: { category?: string } } | undefined)?.estimates?.category,
    (outputs.maps as { business?: { category?: string | null } | null } | undefined)?.business?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  // Short hints (bar, gym, spa) match whole words, so a barber is not a bar; longer ones match a word's start (plumb, landscap).
  const hint = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${w.length <= 3 ? '\\b' : ''}`);
  const hinted = all.find((i) => i.match.some((w) => hint(w).test(category)));
  return hinted ?? all.find((i) => i.id === 'general')!;
}

export async function runAuthority(ctx: StepContext) {
  const accounts = benchAccounts(ctx);
  const search = ctx.outputs.search as SearchOut | undefined;
  const industry = benchmarkIndustry(ctx.outputs);
  const snaps = [search?.business ?? null, ...accounts.slice(1).map((a) => search?.competitors.find((c) => c.name === a.name) ?? null)];
  const profiles = await Promise.all(accounts.map((a, i) => profileFor(a, snaps[i], industry)));
  const [business, ...competitors] = profiles;
  return { source: 'Ahrefs Site Explorer (US) via Composio, the accounts’ sitemaps, About pages and links', fetched_at: new Date().toISOString(), industry: industry.id, business, competitors };
}
