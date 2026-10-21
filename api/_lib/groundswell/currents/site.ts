import { PermanentStepError, type StepContext } from '../types.js';

/**
 * Site Current: fetches a website's homepage (plain HTTP, no browser) and reads
 * what an audit needs from it. Runs for the business and for each competitor
 * with a website.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';

export interface SiteScan {
  url: string;
  final_url: string | null;
  status: number | null;
  https: boolean;
  fetched_at: string;
  error: string | null;
  title: string | null;
  meta_description: string | null;
  h1: string[];
  canonical: string | null;
  has_viewport: boolean;
  word_count: number;
  theme_color: string | null;
  brand_colors: string[];
  logo: string | null;
  og_image: string | null;
  schema_types: string[];
  tracking: {
    google_analytics: string[];
    google_tag_manager: string[];
    google_ads: string[];
    meta_pixel: boolean;
    tiktok_pixel: boolean;
  };
  booking: string[];
  phones: string[];
  social: { instagram: string[]; facebook: string[]; tiktok: string[]; youtube: string[] };
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const unique = <T>(xs: T[]) => [...new Set(xs)];

function metaContent(html: string, attr: 'name' | 'property', value: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const a = tag.match(new RegExp(`${attr}\\s*=\\s*["']${value}["']`, 'i'));
    if (!a) continue;
    const c = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (c) return decode(c[1]);
  }
  return null;
}

function linkHref(html: string, rel: RegExp): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const r = tag.match(/rel\s*=\s*["']([^"']*)["']/i);
    if (r && rel.test(r[1])) {
      const h = tag.match(/href\s*=\s*["']([^"']*)["']/i);
      if (h) return decode(h[1]);
    }
  }
  return null;
}

function absolute(href: string | null, base: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Handles from profile links, skipping share/intent links and platform pages. */
function handles(html: string, host: RegExp, skip: RegExp): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(new RegExp(`https?://(?:www\\.)?${host.source}/([A-Za-z0-9._-]{2,60})`, 'gi'))) {
    const h = m[1].replace(/\.$/, '');
    if (!skip.test(h)) out.push(h.toLowerCase());
  }
  return unique(out);
}

const BOOKING = [
  ['Square', /squareup\.com\/appointments|square\.site|book\.squareup/i],
  ['Calendly', /calendly\.com/i],
  ['Booksy', /booksy\.com/i],
  ['Vagaro', /vagaro\.com/i],
  ['Acuity', /acuityscheduling\.com/i],
  ['Housecall Pro', /housecallpro\.com/i],
  ['Jobber', /getjobber\.com|clienthub\.getjobber/i],
  ['Mindbody', /mindbodyonline\.com/i],
  ['Fresha', /fresha\.com/i],
  ['Tekmetric', /tekmetric\.com/i],
] as const;

export function parseSite(html: string, url: string, finalUrl: string, status: number): SiteScan {
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  const text = decode(body.replace(/<[^>]+>/g, ' '));
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1 = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, ' '))).filter(Boolean);

  const schemaTypes: string[] = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const t of m[1].matchAll(/"@type"\s*:\s*(\[[^\]]*\]|"[^"]+")/g)) {
      try {
        const v = JSON.parse(t[1]);
        schemaTypes.push(...(Array.isArray(v) ? v : [v]).map(String));
      } catch {
        /* malformed JSON-LD is itself a finding, but not one we parse further */
      }
    }
  }

  const hexes = (html.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((h) => h.toLowerCase());
  const counts = new Map<string, number>();
  for (const h of hexes) {
    // Near-greys and pure black/white say nothing about the brand.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    if (Math.max(r, g, b) - Math.min(r, g, b) < 24) continue;
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  const brandColors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([h]) => h);

  const ga = unique(([] as string[]).concat(html.match(/\bG-[A-Z0-9]{6,12}\b/g) ?? [], html.match(/\bUA-\d{4,10}-\d{1,4}\b/g) ?? []));
  const gtm = unique(html.match(/\bGTM-[A-Z0-9]{4,10}\b/g) ?? []);
  const ads = unique(html.match(/\bAW-\d{6,12}\b/g) ?? []);
  const phones = unique(
    [...html.matchAll(/href\s*=\s*["']tel:([^"']+)["']/gi)].map((m) => m[1].replace(/[^\d+]/g, '')).filter((p) => p.length >= 10)
  );
  const logo =
    absolute(
      html.match(/<img\b[^>]*(?:class|id|alt)\s*=\s*["'][^"']*logo[^"']*["'][^>]*>/i)?.[0].match(/src\s*=\s*["']([^"']+)["']/i)?.[1] ??
        linkHref(html, /apple-touch-icon/i) ??
        linkHref(html, /\bicon\b/i),
      finalUrl
    ) ?? null;

  return {
    url,
    final_url: finalUrl,
    status,
    https: finalUrl.startsWith('https://'),
    fetched_at: new Date().toISOString(),
    error: null,
    title: title ? decode(title[1]) : null,
    meta_description: metaContent(html, 'name', 'description'),
    h1,
    canonical: linkHref(html, /\bcanonical\b/i),
    has_viewport: /<meta[^>]+name\s*=\s*["']viewport["']/i.test(html),
    word_count: text ? text.split(' ').length : 0,
    theme_color: metaContent(html, 'name', 'theme-color'),
    brand_colors: brandColors,
    logo,
    og_image: absolute(metaContent(html, 'property', 'og:image'), finalUrl),
    schema_types: unique(schemaTypes),
    tracking: {
      google_analytics: ga,
      google_tag_manager: gtm,
      google_ads: ads,
      meta_pixel: /connect\.facebook\.net\/[^"']*fbevents|fbq\(\s*['"]init/i.test(html),
      tiktok_pixel: /analytics\.tiktok\.com|ttq\.load\(/i.test(html),
    },
    booking: BOOKING.filter(([, re]) => re.test(html)).map(([name]) => name),
    phones,
    social: {
      instagram: handles(html, /instagram\.com/, /^(p|reel|reels|explore|accounts|stories|tv|share)$/i),
      facebook: handles(html, /facebook\.com/, /^(sharer|share|dialog|plugins|tr|events|groups)$/i),
      tiktok: handles(html, /tiktok\.com/, /^(embed|share|tag|music)$/i).map((h) => h.replace(/^@/, '')),
      youtube: handles(html, /youtube\.com/, /^(watch|embed|results|shorts)$/i),
    },
  };
}

export async function scanSite(url: string, timeoutMs = 20_000): Promise<SiteScan> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const html = (await response.text()).slice(0, 3_000_000);
    return parseSite(html, url, response.url || url, response.status);
  } catch (err) {
    return {
      ...parseSite('', url, url, 0),
      final_url: null,
      status: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runSite(ctx: StepContext) {
  const { audit } = ctx;
  const business = audit.website ? await scanSite(audit.website) : null;
  if (business && business.status === null && !audit.instagram) {
    throw new Error(`The website ${audit.website} could not be reached: ${business.error}`);
  }
  if (!audit.website && !audit.instagram) throw new PermanentStepError('The audit has neither a website nor an Instagram handle.');
  const competitors = await Promise.all(
    audit.competitors.slice(0, 6).map(async (c) => ({ name: c.name, site: c.website ? await scanSite(c.website, 15_000) : null }))
  );
  return { business, competitors };
}
