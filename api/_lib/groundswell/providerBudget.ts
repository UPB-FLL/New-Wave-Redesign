import { PermanentStepError } from './types.js';

/**
 * When a provider runs out of credits, the reads that depend on it are paused
 * for a short while so a run does not spend its retries on the same refusal.
 *
 * The pause is scoped: a refusal that names Composio's own wallet pauses every
 * public read (nothing can run without it), while a provider's own refusal
 * (ScrapeCreators answering 402 "insufficient credits", say) pauses only that
 * toolkit, so Ahrefs, Places, SerpApi and Firecrawl keep reading. The
 * provider's words are kept in the error, so staff can see whose balance it is.
 */

const CREDIT_FAILURE = /wallet.{0,80}(?:credit|empty|paused)|(?:out of|insufficient|not enough) credits?|insufficient balance|credit balance.{0,40}(?:empty|zero|insufficient|depleted)|payment required/i;
const WALLET = /wallet|composio/i;
export const PAUSE_MS = 30_000;

/** The toolkit a tool slug belongs to, in its own naming (`SCRAPECREATORS_…` → `scrapecreators`, `GOOGLE_MAPS_…` → `google_maps`). */
export function toolkitOfSlug(slug: string): string {
  const upper = slug.toUpperCase();
  for (const t of ['google_maps', 'google_analytics', 'google_search_console']) if (upper.startsWith(`${t.toUpperCase()}_`)) return t;
  return slug.split('_')[0].toLowerCase();
}

/** Provider names as the reports and the admin screen print them. */
export const PROVIDER_NAMES: Record<string, string> = {
  scrapecreators: 'ScrapeCreators',
  serpapi: 'SerpApi',
  apify: 'Apify',
  ahrefs: 'Ahrefs',
  firecrawl: 'Firecrawl',
  googleads: 'Google Ads',
  google_maps: 'Google Places',
};
export const providerName = (toolkit: string) => PROVIDER_NAMES[toolkit] ?? toolkit;

/** `all` for Composio's wallet; otherwise the toolkit whose balance the message names. */
export function creditFailureScope(message: string, slug?: string): 'all' | string {
  if (WALLET.test(message) || !slug) return 'all';
  return toolkitOfSlug(slug);
}

const pausedUntil = new Map<string, number>();

export class ProviderCreditError extends PermanentStepError {
  readonly scope: 'all' | string;
  constructor(scope: 'all' | string = 'all', detail?: string) {
    super(
      scope === 'all'
        ? 'Composio public-data reads are paused because the credit balance is empty. Add credits in Composio, then retry the research.'
        : `${providerName(scope)} has run out of credits${detail ? ` (${detail.replace(/\.?$/, '')})` : ''}, so its reads are paused. Add credits at ${providerName(scope)}, then retry the research.`
    );
    this.scope = scope;
  }
}

export function isProviderCreditFailure(value: string): boolean { return CREDIT_FAILURE.test(value); }

/** Pauses the reads the refusal covers and throws the error that names the provider. */
export function pausePublicReadsForCredits(message = '', slug?: string): never {
  const scope = creditFailureScope(message, slug);
  pausedUntil.set(scope, Date.now() + PAUSE_MS);
  // The provider's own words, without the client's "SLUG failed (402):" prefix.
  const detail = message.replace(/^[A-Z0-9_]+ failed(?: \(\d+\))?(?: \(consumer account\))?:\s*/, '').slice(0, 160);
  throw new ProviderCreditError(scope, scope === 'all' ? undefined : detail);
}

/** Throws while the reads for `slug` (or every read) are paused. */
export function assertPublicReadBudget(slug?: string): void {
  const now = Date.now();
  if (now < (pausedUntil.get('all') ?? 0)) throw new ProviderCreditError('all');
  if (slug) {
    const toolkit = toolkitOfSlug(slug);
    if (now < (pausedUntil.get(toolkit) ?? 0)) throw new ProviderCreditError(toolkit);
  }
}

export function resetPublicReadBudget(): void { pausedUntil.clear(); }
