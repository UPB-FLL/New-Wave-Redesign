import type { GroundswellConfig } from '../config.js';

/**
 * What each business sells, at what price, as its own pages publish it.
 *
 * Code finds the offer pages and pulls every dollar amount with its context;
 * a model sorts those into a ladder (free, entry, membership, core,
 * retention), and `checkLadder` holds that ladder to the prices actually
 * found: an offer's price must be one the pages show, on a page that was read,
 * or it is "not published". Page text is data, never instructions; only short
 * context is kept, and no names from testimonials.
 */

export const OFFER_PATH = /work|program|service|pric|package|consult|book|shop|course|membership|bundle|apply|offer|plan|collective|faq/i;
export const NOT_OFFER_PATH = /\/blog|\/journal|\/recipe|\/20\d\d\//i;
/** Link-in-bio and store hosts, where the cheaper products often live. */
export const STORE_HOSTS = /(^|\.)(stan\.store|linktr\.ee|beacons\.ai|calendly\.com|kajabi\.com|mykajabi\.com|teachable\.com|substack\.com|shopify\.com|myshopify\.com)$/i;

const CONTEXT_EACH_SIDE = 60;

/** Offer and price pages to read for one account: the homepage, then its offer links and sitemap pages, then its bio links. */
export function offerPages(home: string, links: string[], sitemap: string[], bioLinks: string[], cap: number): string[] {
  let host: string;
  try {
    host = new URL(home).hostname.replace(/^www\./, '');
  } catch {
    return [];
  }
  const sameSite = (u: URL) => u.hostname.replace(/^www\./, '') === host;
  const pick = (urls: string[], keep: (u: URL) => boolean) =>
    urls
      .map((raw) => {
        try {
          const u = new URL(raw, home);
          u.hash = '';
          return u;
        } catch {
          return null;
        }
      })
      .filter((u): u is URL => u !== null && /^https?:$/.test(u.protocol) && keep(u))
      .map((u) => u.toString().replace(/\/$/, ''));
  const offer = (u: URL) => sameSite(u) && OFFER_PATH.test(u.pathname) && !NOT_OFFER_PATH.test(u.pathname);
  const ordered = [
    home.replace(/\/$/, ''),
    ...pick(links, offer),
    ...pick(sitemap, offer),
    ...pick(bioLinks, (u) => STORE_HOSTS.test(u.hostname)),
  ];
  return [...new Set(ordered)].slice(0, cap);
}

export type PricePer = 'month' | 'week' | 'year' | 'session' | 'hour' | null;

export interface PriceMention {
  /** The price as written, e.g. "$2,800–$3,500" or "$300 per month". */
  text: string;
  amount: number;
  amount_high: number | null;
  per: PricePer;
  /** About 120 characters around the price. */
  context: string;
  url: string;
  payment_plan: boolean;
}

const AMOUNT = String.raw`\$\s?(\d[\d,]*(?:\.\d{2})?)`;
const PRICE = new RegExp(
  `${AMOUNT}(?:\\s?(?:–|—|-|to)\\s?\\$\\s?(\\d[\\d,]*(?:\\.\\d{2})?))?(\\s?(?:\\/|per)\\s?(?:month|mo|week|wk|year|yr|session|visit|hour|hr)\\b)?`,
  'gi'
);
const PAYMENT_PLAN = /payment plan|\d\s*(?:×|x)?\s*payments|per month|\/\s?mo\b|monthly payments|pay in \d/i;

const perOf = (s: string | undefined): PricePer => {
  if (!s) return null;
  if (/mo/i.test(s)) return 'month';
  if (/w/i.test(s)) return 'week';
  if (/y/i.test(s)) return 'year';
  if (/session|visit/i.test(s)) return 'session';
  return 'hour';
};
const num = (s: string) => Number(s.replace(/,/g, ''));

/** Every dollar amount on a page, with a little context and whether a payment plan is mentioned near it. */
export function extractPrices(text: string, url: string): PriceMention[] {
  const flat = text.replace(/\s+/g, ' ');
  const out: PriceMention[] = [];
  for (const m of flat.matchAll(PRICE)) {
    const at = m.index ?? 0;
    const context = flat.slice(Math.max(0, at - CONTEXT_EACH_SIDE), at + m[0].length + CONTEXT_EACH_SIDE).trim();
    out.push({
      text: m[0].trim(),
      amount: num(m[1]),
      amount_high: m[2] ? num(m[2]) : null,
      per: perOf(m[3]),
      context,
      url,
      payment_plan: PAYMENT_PLAN.test(context),
    });
  }
  return out;
}

export interface PolicyFlags {
  refunds: 'none' | 'window' | 'unknown';
  accepts_insurance: boolean | null;
  hsa_fsa_mentioned: boolean;
  free_consult: boolean;
  discovery_call: boolean;
  lead_magnets: string[];
}

const LEAD_MAGNETS = /free guide|free download|quiz|assessment|checklist|newsletter|free training|free course|webinar/gi;

/** Policies and funnel signals stated anywhere on the pages read. */
export function policyFlags(texts: string[]): PolicyFlags {
  const all = texts.join(' \n ').replace(/\s+/g, ' ');
  const refunds = /non-?refundable|no refunds/i.test(all)
    ? 'none'
    : /refund/i.test(all) && /\b\d+[- ]?(?:day|hour)s?\b/i.test(all)
      ? 'window'
      : 'unknown';
  const noInsurance = /(?:do not|don['’]t|does not|doesn['’]t|cannot|can['’]t|not)\s+(?:accept|take|bill|work with)\s+(?:any\s+)?insurance|out[- ]of[- ]network/i.test(all);
  const insurance = /(?:accept|take|bill|in[- ]network with)\s+(?:most\s+|many\s+)?(?:major\s+)?insurance/i.test(all);
  return {
    refunds,
    accepts_insurance: noInsurance ? false : insurance ? true : null,
    hsa_fsa_mentioned: /\bHSA\b|\bFSA\b/.test(all),
    free_consult: /free (?:consult|consultation|discovery)|complimentary (?:consult|call|session)/i.test(all),
    discovery_call: /book a call|exploration call|discovery call|intro call|clarity call/i.test(all),
    lead_magnets: [...new Set((all.match(LEAD_MAGNETS) ?? []).map((s) => s.toLowerCase()))],
  };
}

/** Whether the public contact email is on the business's own domain. */
export function contactEmailDomain(texts: string[], ownDomain: string | null): 'own' | 'gmail' | 'other' | null {
  const emails = texts.join(' ').match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi) ?? [];
  if (!emails.length) return null;
  const domains = emails.map((e) => e.split('@')[1].toLowerCase());
  const own = ownDomain?.replace(/^www\./, '').toLowerCase();
  if (own && domains.some((d) => d === own || d.endsWith(`.${own}`))) return 'own';
  return domains.some((d) => d === 'gmail.com' || d === 'googlemail.com') ? 'gmail' : 'other';
}

export const TIERS = ['free', 'low_ticket', 'membership', 'private_small', 'core', 'retention', 'unknown'] as const;
export type Tier = (typeof TIERS)[number];

export interface Offer {
  tier: Tier;
  name: string;
  price_low: number | null;
  price_high: number | null;
  cadence: 'one_time' | 'monthly' | null;
  includes_testing: boolean | null;
  /** The price as the page writes it, or "not published". */
  context: string;
  url: string;
}

export interface PricingLadder {
  name: string;
  /** False when no offer page carries a dollar amount. */
  prices_published: boolean;
  core_offer_priced: boolean;
  offers: Offer[];
  payment_plans: boolean;
  refunds: PolicyFlags['refunds'];
  accepts_insurance: boolean | null;
  hsa_fsa_mentioned: boolean;
  free_consult: boolean;
  discovery_call: boolean;
  lead_magnets: string[];
  dm_automation: boolean;
  contact_email_domain: 'own' | 'gmail' | 'other' | null;
  pages_read: string[];
  mentions: PriceMention[];
  error: string | null;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const priceOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/**
 * Holds a model's classification to the extracted prices: an offer keeps a
 * price only if that amount appears on the pages read (the cited page first),
 * and only pages that were read may be cited. Everything else stays, unpriced.
 */
export function checkLadder(
  raw: unknown,
  base: Omit<PricingLadder, 'offers' | 'core_offer_priced' | 'prices_published'>
): PricingLadder {
  const r = (raw ?? {}) as Record<string, unknown>;
  const found = new Set(base.mentions.flatMap((m) => [m.amount, m.amount_high ?? m.amount]));
  const matches = (p: number) => (m: PriceMention) => m.amount === p || m.amount_high === p;
  const offers: Offer[] = (Array.isArray(r.offers) ? r.offers : []).slice(0, 20).flatMap((o: Record<string, unknown>) => {
    const name = str(o?.name, 80);
    if (!name) return [];
    const url = typeof o.url === 'string' && base.pages_read.includes(o.url) ? o.url : base.pages_read[0] ?? '';
    const known = (p: number | null) => (p !== null && found.has(p) ? p : null);
    const low = known(priceOrNull(o.price_low));
    const high = known(priceOrNull(o.price_high)) ?? low;
    const tier = (TIERS as readonly string[]).includes(o.tier as string) ? (o.tier as Tier) : 'unknown';
    const cadence = o.cadence === 'monthly' || o.cadence === 'one_time' ? o.cadence : null;
    // The cited page's own mention of the price first, then any page's.
    const mention =
      low === null ? null : (base.mentions.find((m) => m.url === url && matches(low)(m)) ?? base.mentions.find(matches(low)) ?? null);
    return [
      {
        tier,
        name,
        price_low: low,
        price_high: high,
        cadence,
        includes_testing: typeof o.includes_testing === 'boolean' ? o.includes_testing : null,
        context: mention ? mention.text : 'not published',
        url: mention?.url ?? url,
      },
    ];
  });
  return {
    ...base,
    offers,
    prices_published: base.mentions.length > 0,
    core_offer_priced: offers.some((o) => o.tier === 'core' && o.price_low !== null),
  };
}

/** Counts the scorecard reads from a ladder. */
export function ladderCounts(l: PricingLadder, config: GroundswellConfig) {
  return {
    entry_products: l.offers.filter((o) => o.tier !== 'free' && o.price_high !== null && o.price_high < config.benchmark.entry_product_max).length,
    recurring: l.offers.some((o) => o.cadence === 'monthly'),
  };
}
