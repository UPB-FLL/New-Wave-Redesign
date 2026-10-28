import type { Confidence, LearningRow } from './types.js';

/**
 * Who published a research learning's page, read from its link (owner's ask,
 * 2026-10-28: the checks looked at a link's format and date, not at who
 * published it, so a third party's page about a Google launch came back at
 * the advisor's "high"). Three kinds:
 *
 * - `company`: the company's own newsroom, blog or business pages
 *   (`COMPANY_SITES`), and only when the learning names that company. Never
 *   the open part of a platform anyone posts on: a YouTube video or a post on
 *   X, LinkedIn, Facebook or Reddit is someone else's word.
 * - `publication`: an established news, trade or research publication
 *   (`PUBLICATIONS`), outside its sponsored pages.
 * - `unconfirmed`: anyone else (an aggregator, a repost of a press release, a
 *   marketing tool's blog). Kept and reported, labelled "unconfirmed source"
 *   and capped at low confidence (owner's call, 2026-10-28).
 *
 * Both lists are kept short on purpose: a site missing from them reads as
 * unconfirmed, which costs a label, never a learning. Add one when it earns it.
 */

export type SourceKind = 'company' | 'publication' | 'unconfirmed';

export interface CompanySite {
  company: string;
  /** How a learning names the company: its own news names it. */
  names: RegExp;
  /** Where it publishes: a host and every host under it ("google" is the whole .google domain), or a host and a path ("facebook.com/business"). */
  sites: readonly string[];
  /** Places under `sites` where anyone posts (forums, app listings), in the same form. */
  except?: readonly string[];
}

export const COMPANY_SITES: readonly CompanySite[] = [
  { company: 'Google', names: /\b(google|gemini|youtube|android|chrome|deepmind)\b/i, sites: ['google', 'youtube', 'googleblog.com', 'thinkwithgoogle.com', 'ads.google.com', 'business.google.com', 'developers.google.com', 'workspace.google.com', 'cloud.google.com', 'deepmind.com'] },
  {
    company: 'Meta',
    names: /\b(meta|facebook|instagram|threads|whatsapp|messenger|reels)\b/i,
    sites: ['about.fb.com', 'engineering.fb.com', 'transparency.fb.com', 'about.meta.com', 'ai.meta.com', 'developers.meta.com', 'transparency.meta.com', 'investor.atmeta.com', 'developers.facebook.com', 'facebook.com/business', 'business.instagram.com', 'about.instagram.com', 'creators.instagram.com', 'business.whatsapp.com', 'blog.whatsapp.com'],
    except: ['developers.facebook.com/community'],
  },
  { company: 'TikTok', names: /\b(tiktok|bytedance)\b/i, sites: ['newsroom.tiktok.com', 'ads.tiktok.com', 'developers.tiktok.com', 'support.tiktok.com', 'tiktok.com/business', 'bytedance.com'] },
  { company: 'LinkedIn', names: /\blinkedin\b/i, sites: ['news.linkedin.com', 'business.linkedin.com', 'engineering.linkedin.com', 'linkedin.com/blog'] },
  { company: 'X', names: /\b(x|twitter|xai|grok)\b/i, sites: ['blog.x.com', 'business.x.com', 'help.x.com', 'developer.x.com', 'blog.twitter.com', 'business.twitter.com', 'x.ai'] },
  { company: 'Pinterest', names: /\bpinterest\b/i, sites: ['newsroom.pinterest.com', 'business.pinterest.com', 'help.pinterest.com', 'developers.pinterest.com', 'investor.pinterestinc.com'] },
  { company: 'Snap', names: /\b(snap|snapchat)\b/i, sites: ['newsroom.snap.com', 'investor.snap.com', 'forbusiness.snapchat.com', 'businesshelp.snapchat.com'] },
  { company: 'Reddit', names: /\breddit\b/i, sites: ['redditinc.com', 'business.reddit.com'] },
  { company: 'Microsoft', names: /\b(microsoft|bing|copilot|azure)\b/i, sites: ['blogs.microsoft.com', 'news.microsoft.com', 'about.ads.microsoft.com', 'blogs.bing.com', 'learn.microsoft.com', 'support.microsoft.com'], except: ['learn.microsoft.com/answers'] },
  { company: 'Amazon', names: /\b(amazon|aws|alexa|twitch)\b/i, sites: ['aboutamazon.com', 'advertising.amazon.com', 'aws.amazon.com', 'sell.amazon.com', 'amazon.science'] },
  { company: 'OpenAI', names: /\b(openai|chatgpt|gpt-?\d\w*|sora|codex)\b/i, sites: ['openai.com'], except: ['community.openai.com'] },
  { company: 'Anthropic', names: /\b(anthropic|claude)\b/i, sites: ['anthropic.com', 'claude.com'] },
  { company: 'HubSpot', names: /\bhubspot\b/i, sites: ['hubspot.com'], except: ['community.hubspot.com', 'ecosystem.hubspot.com'] },
  { company: 'Shopify', names: /\bshopify\b/i, sites: ['shopify.com'], except: ['community.shopify.com', 'apps.shopify.com', 'themes.shopify.com'] },
  { company: 'Salesforce', names: /\b(salesforce|agentforce|slack)\b/i, sites: ['salesforce.com'], except: ['trailhead.salesforce.com', 'appexchange.salesforce.com'] },
  { company: 'Adobe', names: /\badobe\b/i, sites: ['adobe.com'], except: ['community.adobe.com', 'stock.adobe.com'] },
  { company: 'Perplexity', names: /\bperplexity\b/i, sites: ['perplexity.ai/hub'] },
  { company: 'Yelp', names: /\byelp\b/i, sites: ['blog.yelp.com'] },
];

/** Established news, trade and research publications, each with every host under it. */
export const PUBLICATIONS: readonly string[] = [
  // News and business
  'reuters.com', 'apnews.com', 'bloomberg.com', 'wsj.com', 'nytimes.com', 'washingtonpost.com', 'ft.com', 'economist.com', 'theguardian.com', 'bbc.com', 'bbc.co.uk', 'cnbc.com', 'cnn.com', 'npr.org', 'axios.com', 'politico.com', 'semafor.com', 'fortune.com', 'businessinsider.com', 'fastcompany.com', 'usatoday.com', 'hbr.org',
  // Technology
  'techcrunch.com', 'theverge.com', 'wired.com', 'arstechnica.com', 'engadget.com', 'theinformation.com', 'zdnet.com', 'cnet.com', 'venturebeat.com', 'techradar.com', 'tomsguide.com', 'tomshardware.com', 'pcmag.com', 'pcworld.com', 'androidcentral.com', 'androidpolice.com', '9to5google.com', '9to5mac.com', 'macrumors.com', 'gizmodo.com', 'mashable.com', 'itpro.com', 'computerworld.com', 'theregister.com', 'siliconangle.com', 'geekwire.com', 'platformer.news', '404media.co', 'digitaltrends.com',
  // Marketing and advertising
  'adweek.com', 'adage.com', 'digiday.com', 'marketingdive.com', 'socialmediatoday.com', 'searchengineland.com', 'searchenginejournal.com', 'seroundtable.com', 'martech.org', 'thedrum.com', 'campaignlive.com', 'campaignlive.co.uk', 'mediapost.com', 'adexchanger.com', 'ppc.land', 'marketingweek.com', 'emarketer.com', 'retaildive.com', 'modernretail.co', 'tubefilter.com',
  // Research
  'arxiv.org', 'pewresearch.org', 'nber.org', 'ssrn.com', 'nature.com', 'science.org', 'gartner.com', 'forrester.com', 'nielsen.com',
];

/** A publication's paid pages are the advertiser's word, not the publication's. */
const SPONSORED_PATH = /\/(sponsored|sponsor-content|partner-content|paid-post|brandvoice|advertorial)\b/i;

export const SOURCE_LABELS: Record<SourceKind, string> = {
  company: 'the company’s own site',
  publication: 'a known publication',
  unconfirmed: 'unconfirmed source',
};

/** A link's host (lower case, without "www.") and path (no trailing slash), or null when it is not a link. */
function hostAndPath(url: string): { host: string; path: string } | null {
  try {
    const u = new URL(url);
    return { host: u.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, ''), path: u.pathname.toLowerCase().replace(/\/+$/, '') || '/' };
  } catch {
    return null;
  }
}

/** Whether a link sits at a site written "host" (the host or any host under it) or "host/path" (also under that path). */
function at(site: string, host: string, path: string): boolean {
  const slash = site.indexOf('/');
  const siteHost = slash < 0 ? site : site.slice(0, slash);
  const sitePath = slash < 0 ? '' : site.slice(slash);
  if (host !== siteHost && !host.endsWith(`.${siteHost}`)) return false;
  return !sitePath || path === sitePath || path.startsWith(`${sitePath}/`);
}

export function sourceKind(learning: Pick<LearningRow, 'url' | 'title'> & { summary?: string | null }): SourceKind {
  const link = hostAndPath(learning.url);
  if (!link || SPONSORED_PATH.test(link.path)) return 'unconfirmed';
  const { host, path } = link;
  const text = `${learning.title} ${learning.summary ?? ''}`;
  const company = COMPANY_SITES.some((c) => c.sites.some((s) => at(s, host, path)) && !(c.except ?? []).some((s) => at(s, host, path)) && c.names.test(text));
  if (company) return 'company';
  return PUBLICATIONS.some((s) => at(s, host, path)) ? 'publication' : 'unconfirmed';
}

/** The confidence a learning may carry: the advisor's own for the company's site or a known publication, low for anyone else. */
export const sourcedConfidence = (kind: SourceKind, claimed: Confidence): Confidence => (kind === 'unconfirmed' ? 'low' : claimed);

/** The label beside a learning's link: an unconfirmed one names its host, since the advisor's "source" may name the outlet a repost credits. */
export function sourceNote(kind: SourceKind, url: string): string {
  return kind === 'unconfirmed' ? `${SOURCE_LABELS.unconfirmed} (${hostAndPath(url)?.host || 'no link'})` : SOURCE_LABELS[kind];
}

export type WithSource<T> = T & { source_kind: SourceKind; source_note: string };

/** A learning as the report and the staff screen show it: its source's kind and label, and the confidence that allows (rows stored before the check keep the advisor's word in the table). */
export function withSource<T extends Pick<LearningRow, 'url' | 'title' | 'summary' | 'confidence'>>(learning: T): WithSource<T> {
  const kind = sourceKind(learning);
  return { ...learning, confidence: sourcedConfidence(kind, learning.confidence), source_kind: kind, source_note: sourceNote(kind, learning.url) };
}
