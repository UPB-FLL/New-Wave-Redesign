import type { GroundswellConfig, IndustryProfile } from '../config.js';

/**
 * Authority: who links to the business (press, from the setup file's list of
 * media domains, never a hosting platform), what it owns (podcast, newsletter,
 * community, store), how much it publishes, and the credentials it states.
 * Credentials are read against the industry profile's licence words, so a
 * nutrition practice is checked for RD or MD and a contractor for licensed and
 * insured.
 */

export const OWNED_CHANNELS = ['podcast', 'substack', 'youtube', 'app', 'newsletter', 'community', 'store'] as const;
export type OwnedChannel = (typeof OWNED_CHANNELS)[number];

const CHANNEL_PATTERNS: Record<OwnedChannel, RegExp> = {
  podcast: /podcasts\.apple\.com|open\.spotify\.com\/show|buzzsprout\.com|anchor\.fm|podbean\.com|simplecast\.com|transistor\.fm/i,
  substack: /substack\.com/i,
  youtube: /youtube\.com\/(?:@|c\/|channel\/|user\/)/i,
  app: /apps\.apple\.com|play\.google\.com\/store\/apps/i,
  newsletter: /mailchimp|list-manage\.com|convertkit|kit\.com|klaviyo|activecampaign|app-us1\.com|flodesk|beehiiv|mailerlite/i,
  community: /circle\.so|skool\.com|mighty(?:networks)?\.com|discord\.gg|facebook\.com\/groups\//i,
  store: /stan\.store|myshopify\.com|shopify\.com|etsy\.com\/shop|gumroad\.com/i,
};

export interface ReferringDomain {
  domain: string;
  domain_rating: number | null;
  first_seen: string | null;
}

export interface AuthorityProfile {
  name: string;
  domain: string | null;
  domain_rating: number | null;
  referring_domains_live: number | null;
  press_domains: { domain: string; dr: number | null; first_seen: string | null }[];
  top_pages: { url: string; traffic: number | null; top_keyword: string | null; volume: number | null; position: number | null }[];
  top_keywords: { keyword: string; volume: number | null; position: number | null; url: string | null }[];
  organic_traffic: number | null;
  content_pages_n: number | null;
  newest_content_date: string | null;
  owned_channels: OwnedChannel[];
  /** About 300 characters from the About page around the credentials it states. */
  credentials_text: string | null;
  credentials: 'licensed' | 'certified' | 'none' | null;
  testimonials_page: boolean;
  error: string | null;
}

const bare = (d: string) => d.toLowerCase().replace(/^www\./, '');
const under = (domain: string, list: string[]) => list.some((l) => domain === l || domain.endsWith(`.${l}`));

/** Referring domains that are press: on the setup file's media list and not a hosting platform. */
export function pressDomains(refs: ReferringDomain[], config: GroundswellConfig): AuthorityProfile['press_domains'] {
  const { press_domains, platform_hosts } = config.benchmark;
  return refs
    .map((r) => ({ ...r, domain: bare(r.domain) }))
    .filter((r) => under(r.domain, press_domains) && !under(r.domain, platform_hosts))
    .map((r) => ({ domain: r.domain, dr: r.domain_rating, first_seen: r.first_seen }));
}

/** Owned channels from the links and script sources on the site and in the Instagram bio. */
export function ownedChannels(urls: string[], html = ''): OwnedChannel[] {
  const haystack = `${urls.join(' ')} ${html}`;
  const found = OWNED_CHANNELS.filter((c) => CHANNEL_PATTERNS[c].test(haystack));
  // A newsletter form counts as a newsletter even without a known provider's script.
  if (!found.includes('newsletter') && /<form[^>]*>(?:(?!<\/form>)[\s\S])*?(?:newsletter|subscribe)/i.test(html)) found.push('newsletter');
  return OWNED_CHANNELS.filter((c) => found.includes(c));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The credentials an About page states: a licence word from the industry profile, a certification, or neither. */
export function credentialsFrom(text: string | null, industry: IndustryProfile): { level: AuthorityProfile['credentials']; excerpt: string | null } {
  if (!text) return { level: null, excerpt: null };
  const flat = text.replace(/\s+/g, ' ');
  const licences = industry.licences ?? [];
  // Abbreviations (RD, DO, PT) count only where credentials are written: after a comma, slash or bracket, or
  // before one, so "WHAT WE DO" is not a licence. Words (licensed, insured) count anywhere.
  const abbrevs = licences.filter((l) => l === l.toUpperCase());
  const words = licences.filter((l) => l !== l.toUpperCase());
  const abbrev = abbrevs.map(escapeRe).join('|');
  const licence =
    (abbrevs.length ? flat.match(new RegExp(`(?<=[,(/]\\s*)(?:${abbrev})(?![A-Za-z])|(?<![A-Za-z])(?:${abbrev})(?=\\s*[,)/])`)) : null) ??
    (words.length ? flat.match(new RegExp(`\\b(?:${words.map(escapeRe).join('|')})\\b`, 'i')) : null);
  const certified = flat.match(/\bcertified\b|\bcertification\b|\bcertificate\b/i);
  const hit = licence ?? certified;
  const excerpt = hit ? flat.slice(Math.max(0, (hit.index ?? 0) - 150), (hit.index ?? 0) + 150).trim() : null;
  return { level: licence ? 'licensed' : certified ? 'certified' : 'none', excerpt };
}

const CONTENT_PATH = /\/(?:blog|journal|recipes?|articles?|news|resources|podcast)\//i;

/** How much the site publishes, from its sitemap entries. */
export function contentDepth(entries: { loc: string; lastmod: string | null }[]): { pages: number; newest: string | null } {
  const content = entries.filter((e) => CONTENT_PATH.test(e.loc));
  const dates = content.map((e) => e.lastmod).filter((d): d is string => Boolean(d && !Number.isNaN(Date.parse(d))));
  dates.sort((a, b) => Date.parse(b) - Date.parse(a));
  return { pages: content.length, newest: dates[0] ? new Date(dates[0]).toISOString().slice(0, 10) : null };
}

/** Whether the site links a page of testimonials or client stories. */
export const TESTIMONIALS_PATH = /testimonial|reviews|success-stor|client-stor|case-stud|results/i;
