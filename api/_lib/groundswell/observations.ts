import type { AreaKey, Facts } from './model.js';

/**
 * What the data itself shows for each area, in plain sentences: what is
 * working in the business's favour and what is holding it back. The write-up
 * model's lists often come back empty (its guards drop any sentence whose
 * numbers are not in the data, and it is told fewer findings beat invented
 * ones), which left "Observed strengths" and "Constraints" printing a
 * fallback line. These sentences are built from the gathered facts, so every
 * figure in them is in the data; the reports put the model's items first and
 * fill the rest from here (`fillAreas`).
 */

export interface AreaObservations {
  strengths: string[];
  constraints: string[];
}

const n = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const fmt = (x: number, digits = 0) => x.toLocaleString('en-US', { maximumFractionDigits: digits });
const plural = (count: number, one: string, many = `${one}s`) => `${fmt(count)} ${count === 1 ? one : many}`;
const list = (items: string[], max = 3) => (items.length <= max ? items : [...items.slice(0, max), `and ${items.length - max} more`]).join(', ');

const LIMIT = 4;

function google(f: Facts): AreaObservations {
  const s: string[] = [];
  const c: string[] = [];
  const p = f.maps?.business;
  if (!p) return { strengths: s, constraints: c };
  if (n(p.rating) && n(p.reviews)) {
    if (p.rating >= 4.5 && p.reviews >= 20) s.push(`A ${p.rating} rating from ${plural(p.reviews, 'Google review')}, the kind of listing a searcher trusts.`);
    else if (p.rating >= 4.5) s.push(`A ${p.rating} Google rating, from ${plural(p.reviews, 'review')} so far.`);
    else if (p.rating < 4) c.push(`The Google rating is ${p.rating} from ${plural(p.reviews, 'review')}; below 4 stars a listing loses the "4.0+" filter many searchers apply.`);
    if (p.reviews < 20) c.push(`Only ${plural(p.reviews, 'Google review')}: rivals with more reviews rank above a listing like this in the map pack.`);
  }
  const rivals = (f.maps?.nearby ?? []).filter((r) => n(r.reviews) && r.name);
  if (rivals.length && n(p.reviews)) {
    const ahead = rivals.filter((r) => (r.reviews as number) > (p.reviews as number));
    if (!ahead.length) s.push(`The listing has more Google reviews than each of the ${plural(rivals.length, 'nearby rival')} read (${list(rivals.map((r) => `${r.name} ${fmt(r.reviews as number)}`))}).`);
    else c.push(`${plural(ahead.length, 'nearby rival')} ${ahead.length === 1 ? 'has' : 'have'} more Google reviews (${list(ahead.map((r) => `${r.name} ${fmt(r.reviews as number)}`))}) than the business's ${fmt(p.reviews)}.`);
  }
  if (!p.category) c.push('The Google listing shows no category, so Google cannot match it to searches for the kind of business it is.');
  if (!p.hours.length) c.push('The Google listing shows no opening hours; a listing with hours is shown for "open now" searches.');
  if (!p.website) c.push('The Google listing shows no website link, so a searcher who finds the listing has no page to go to.');
  if (p.website && p.hours.length && p.category) s.push(`The listing is complete: a category (${p.category}), hours and a website link.`);
  return { strengths: s, constraints: c };
}

function social(f: Facts): AreaObservations {
  const s: string[] = [];
  const c: string[] = [];
  const ig = f.social?.business;
  if (!ig?.exists) return { strengths: s, constraints: c };
  const rivals = (f.social?.competitors ?? []).filter((r) => r.exists && n(r.followers));
  if (n(ig.followers)) {
    const ahead = rivals.filter((r) => (r.followers as number) > (ig.followers as number));
    if (rivals.length && !ahead.length) s.push(`${fmt(ig.followers)} Instagram followers, more than each of the ${plural(rivals.length, 'competitor')} read.`);
    else if (ahead.length) c.push(`${plural(ahead.length, 'competitor')} ${ahead.length === 1 ? 'has' : 'have'} more Instagram followers (${list(ahead.map((r) => `${r.name} ${fmt(r.followers as number)}`))}) than the business's ${fmt(ig.followers)}.`);
    else if (ig.followers >= 1000) s.push(`${fmt(ig.followers)} Instagram followers to reach with each post.`);
  }
  if (n(ig.posts_last_30_days)) {
    if (ig.posts_last_30_days === 0) c.push('No Instagram post in the last 30 days: the account is not in front of its followers.');
    else if (ig.posts_last_30_days >= 8) s.push(`${plural(ig.posts_last_30_days, 'Instagram post')} in the last 30 days, a steady presence.`);
    else c.push(`${plural(ig.posts_last_30_days, 'Instagram post')} in the last 30 days; accounts that post two or three times a week stay in the feed.`);
  }
  if (n(ig.avg_likes_recent) && n(ig.followers) && ig.followers > 0) {
    const rate = (ig.avg_likes_recent / ig.followers) * 100;
    const rivalRates = rivals.filter((r) => n(r.avg_likes_recent) && (r.followers as number) > 0).map((r) => ({ name: r.name, rate: ((r.avg_likes_recent as number) / (r.followers as number)) * 100 }));
    if (rate >= 3) s.push(`Recent posts average ${fmt(ig.avg_likes_recent)} likes on ${fmt(ig.followers)} followers: an audience that reacts.`);
    else if (rate < 1 && rivalRates.some((r) => r.rate > rate)) c.push(`Recent posts average ${fmt(ig.avg_likes_recent)} likes on ${fmt(ig.followers)} followers, a lower share than ${list(rivalRates.filter((r) => r.rate > rate).map((r) => r.name))} earn.`);
  }
  if (n(ig.avg_comments_recent) && ig.avg_comments_recent >= 5) s.push(`Recent posts draw ${fmt(ig.avg_comments_recent)} comments on average: people talk back.`);
  if (ig.bio_links?.length) s.push('The Instagram bio links out, so a profile visit can become a booking or a visit.');
  else if (ig.biography !== null) c.push('The Instagram bio has no link, so a profile visit ends there.');
  if (ig.restricted) c.push('Instagram shows the profile only to signed-in adults, so a logged-out visitor, and some search previews, see nothing.');
  const fb = f.social?.facebook;
  if (fb?.exists && n(fb.followers) && fb.followers > 0) s.push(`A Facebook Page with ${fmt(fb.followers)} followers as a second channel.`);
  return { strengths: s, constraints: c };
}

function website(f: Facts): AreaObservations {
  const s: string[] = [];
  const c: string[] = [];
  const site = f.site?.business;
  if (!site || site.error || (site.status !== null && (site.status < 200 || site.status >= 400))) return { strengths: s, constraints: c };
  const linkPage = /(^|\.)(?:linktr\.ee|beacons\.ai|linkin\.bio|bio\.site|lnk\.bio|taplink\.cc|solo\.to|stan\.store)$/i.test((() => { try { return new URL(site.final_url ?? site.url).hostname; } catch { return ''; } })());
  if (linkPage) {
    c.push('The address given is a link-in-bio page, not a website of its own: nothing on it can rank in Google for what the business does.');
    return { strengths: s, constraints: c };
  }
  if (site.https) s.push('The site is served over HTTPS.');
  else c.push('The site is not served over HTTPS; browsers mark it "not secure" and Google ranks the secure version of a rival above it.');
  if (site.has_viewport) s.push('The pages are set up for phones (a viewport is declared).');
  else c.push('No viewport is declared, so the site is not laid out for phones, where most local searches happen.');
  const t = site.tracking;
  if (t.google_analytics.length || t.google_tag_manager.length) s.push('Google Analytics or Tag Manager is installed, so visits and conversions can be measured.');
  else c.push('No Google Analytics or Tag Manager tag was found, so nothing on the site is measured.');
  if (!t.meta_pixel && !t.google_ads.length) c.push('No Meta pixel or Google Ads tag was found, so an ad campaign could not count what it brings.');
  if (site.booking.length) s.push('A booking or inquiry path is on the page.');
  else c.push('No booking or inquiry link was found on the homepage; a visitor has to find another way to act.');
  if (site.schema_types.length) s.push(`Structured data is in place (${list(site.schema_types.filter((x) => !/^(?:ListItem|BreadcrumbList|WebPage|WebSite|ImageObject|Thing)$/i.test(x)), 3) || list(site.schema_types, 3)}), which helps Google and the AI assistants read the business.`);
  else c.push('No structured data (schema.org) was found, so Google and the AI assistants have to guess what the business is.');
  const seo = site.technical_seo;
  if (seo) {
    for (const finding of seo.findings.filter((x) => x.severity === 'high').slice(0, 2)) c.push(`${finding.title}: ${finding.evidence}`);
    if (seo.images.total > 0 && seo.images.missing_alt + seo.images.empty_alt > 0) c.push(`${fmt(seo.images.missing_alt + seo.images.empty_alt)} of ${plural(seo.images.total, 'image')} on the homepage ${seo.images.missing_alt + seo.images.empty_alt === 1 ? 'has' : 'have'} no alt text.`);
  }
  if (site.word_count > 0 && site.word_count < 150) c.push(`The homepage carries about ${fmt(site.word_count)} words of text, too little for Google to match it to many searches.`);
  const pages = (f.site_pages?.pages ?? []).filter((p) => !p.error && p.word_count > 0);
  if (pages.length >= 5) s.push(`${plural(pages.length, 'page')} of the site were read as real content (${list(pages.map((p) => p.path || p.url), 3)}).`);
  const prices = pages.flatMap((p) => p.prices);
  if (prices.length) s.push(`Prices are published on the site (${list([...new Set(prices)], 3)}), which answers the first question a buyer has.`);
  const ctas = pages.flatMap((p) => p.ctas.map((x) => x.text));
  if (ctas.length >= 3) s.push(`The pages ask the reader to act (${list([...new Set(ctas)], 3)}).`);
  return { strengths: s, constraints: c };
}

function ads(f: Facts): AreaObservations {
  const s: string[] = [];
  const c: string[] = [];
  const a = f.ads?.business;
  const lib = f.ad_library?.business;
  if (a?.website_checked) {
    if (a.google_ads_tag) s.push('A Google Ads tag is on the site, so search ads can count what they bring.');
    if (a.meta_pixel) s.push('The Meta pixel is on the site, so Meta can optimise ads for people who act.');
    if (!a.google_ads_tag && !a.meta_pixel) c.push('Neither a Google Ads tag nor a Meta pixel is on the site: nothing could attribute a sale to an ad.');
    if (a.paid_pages.length) s.push(`Ahrefs lists ${plural(a.paid_pages.length, 'page')} of the site in paid search results.`);
  }
  if (lib) {
    if (lib.google_ads_status === 'ads_found' && n(lib.google_ads_count)) s.push(`${plural(lib.google_ads_count, 'Google ad')} on record in the Ads Transparency Center for the business's domain.`);
    if (lib.google_ads_status === 'none') c.push('The Ads Transparency Center lists no Google ads for the business’s domain.');
    if (lib.meta_ad_status === 'running') s.push(`The Meta Ad Library shows ${plural(lib.meta_ads.length, 'ad')} running for the business's Page.`);
    if (lib.meta_ad_status === 'not_running') c.push(`The Meta Ad Library shows the Page is not running ads${lib.meta_ads_inactive_n > 0 ? ` (${plural(lib.meta_ads_inactive_n, 'earlier ad')} on record)` : ''}.`);
    const rivalsRunning = (f.ad_library?.competitors ?? []).filter((r) => r.meta_ad_status === 'running' || (r.google_ads_status === 'ads_found' && n(r.google_ads_count) && r.google_ads_count > 0));
    if (rivalsRunning.length) c.push(`${plural(rivalsRunning.length, 'competitor')} ${rivalsRunning.length === 1 ? 'is' : 'are'} advertising on record (${list(rivalsRunning.map((r) => r.name))}).`);
  }
  return { strengths: s, constraints: c };
}

function competitors(f: Facts): AreaObservations {
  const s: string[] = [];
  const c: string[] = [];
  const own = f.search?.business;
  const rivals = (f.search?.competitors ?? []).filter((r) => !r.error);
  if (own && !own.error && rivals.length) {
    if (n(own.organic_traffic)) {
      const ahead = rivals.filter((r) => n(r.organic_traffic) && r.organic_traffic > (own.organic_traffic as number));
      if (!ahead.length && rivals.some((r) => n(r.organic_traffic))) s.push(`Ahrefs estimates more monthly organic visits for the business (${fmt(own.organic_traffic)}) than for each competitor read (${list(rivals.filter((r) => n(r.organic_traffic)).map((r) => `${r.name} ${fmt(r.organic_traffic as number)}`))}).`);
      else if (ahead.length) c.push(`Ahrefs estimates more monthly organic visits for ${list(ahead.map((r) => `${r.name} (${fmt(r.organic_traffic as number)})`))} than for the business (${fmt(own.organic_traffic)}).`);
    }
    if (n(own.domain_rating)) {
      const ahead = rivals.filter((r) => n(r.domain_rating) && r.domain_rating > (own.domain_rating as number));
      if (ahead.length) c.push(`${list(ahead.map((r) => `${r.name} (DR ${fmt(r.domain_rating as number)})`))} ${ahead.length === 1 ? 'has' : 'have'} a higher Ahrefs domain rating than the business (DR ${fmt(own.domain_rating)}).`);
      else if (rivals.some((r) => n(r.domain_rating))) s.push(`The business's Ahrefs domain rating (DR ${fmt(own.domain_rating)}) is at least as high as each competitor's read.`);
    }
  }
  const picks = f.competitor_picks?.picks ?? [];
  if (picks.length) s.push(`${plural(picks.length, 'competitor')} ${picks.length === 1 ? 'was' : 'were'} verified as the same kind of business in the same area (${list(picks.map((p) => p.name), 3)}).`);
  const left = f.competitor_picks?.dropped ?? [];
  if (left.length) s.push(`${plural(left.length, 'candidate')} ${left.length === 1 ? 'was' : 'were'} left out as not competing, so the comparison is like for like.`);
  const place = f.maps?.business;
  const nearby = (f.maps?.nearby ?? []).filter((r) => n(r.rating));
  if (place && n(place.rating) && nearby.length) {
    const better = nearby.filter((r) => (r.rating as number) > (place.rating as number));
    if (better.length) c.push(`${list(better.map((r) => `${r.name} (${r.rating})`))} ${better.length === 1 ? 'is' : 'are'} rated above the business (${place.rating}) on Google.`);
  }
  return { strengths: s, constraints: c };
}

function keywords(f: Facts): AreaObservations {
  const s: string[] = [];
  const c: string[] = [];
  const ideas = (f.keywords?.ideas ?? []).filter((k) => n(k.monthly_searches) && (k.monthly_searches as number) > 0).sort((a, b) => (b.monthly_searches as number) - (a.monthly_searches as number));
  if (f.keywords?.demand_status !== 'unavailable' && ideas.length) {
    s.push(`Keyword Planner measures searches in the area for ${plural(ideas.length, 'term')}; the largest: ${list(ideas.slice(0, 3).map((k) => `"${k.keyword}" (${fmt(k.monthly_searches as number)} a month)`), 3)}.`);
    const priced = ideas.filter((k) => n(k.high_bid_usd));
    if (priced.length) {
      const cheapest = [...priced].sort((a, b) => (a.high_bid_usd as number) - (b.high_bid_usd as number))[0];
      s.push(`Bids run from about $${fmt(cheapest.high_bid_usd as number, 2)} a click on "${cheapest.keyword}".`);
    }
  }
  const own = f.search?.business;
  if (own && !own.error) {
    const top = own.top_keywords.filter((k) => n(k.position) && (k.position as number) <= 10);
    if (top.length) s.push(`The site ranks in Google's top 10 for ${plural(top.length, 'term')} Ahrefs tracks (${list(top.slice(0, 3).map((k) => `"${k.keyword}" at ${fmt(k.position as number)}`), 3)}).`);
    const ranked = own.top_keywords.filter((k) => n(k.position));
    if (ideas.length && ranked.length) {
      const terms = new Set(ranked.map((k) => k.keyword.toLowerCase()));
      const missing = ideas.filter((k) => !terms.has(k.keyword.toLowerCase())).slice(0, 3);
      if (missing.length) c.push(`The site does not rank for ${list(missing.map((k) => `"${k.keyword}" (${fmt(k.monthly_searches as number)} a month)`), 3)} among the terms Ahrefs tracks.`);
    }
    if (n(own.organic_keywords) && own.organic_keywords < 50) c.push(`Ahrefs finds the site ranking for ${plural(own.organic_keywords, 'keyword')} in all, a small footprint.`);
    else if (n(own.organic_keywords) && own.organic_keywords >= 200) s.push(`Ahrefs finds the site ranking for ${plural(own.organic_keywords, 'keyword')}.`);
  }
  for (const q of (f.search?.serp?.queries ?? []).filter((x) => !x.error).slice(0, 3)) {
    const host = (() => { try { return new URL(f.site?.business?.final_url ?? f.business.website ?? 'https://x.invalid').hostname.replace(/^www\./, ''); } catch { return null; } })();
    const hit = host ? q.organic.find((r) => (r.domain ?? '').replace(/^www\./, '') === host) : undefined;
    const local = q.local.find((l) => l.title.toLowerCase() === f.business.name.toLowerCase());
    if (local) s.push(`The business appears in the local pack for "${q.query}"${n(local.position) ? ` (position ${fmt(local.position)})` : ''}.`);
    else if (hit && n(hit.position)) s.push(`The site appears at position ${fmt(hit.position)} for "${q.query}".`);
    else if (q.organic.length || q.local.length) c.push(`The business does not appear on the first page for "${q.query}"${q.local.length ? ` (${list(q.local.slice(0, 3).map((l) => l.title), 3)} fill the local pack)` : ''}.`);
  }
  if (f.keywords?.demand_status === 'unavailable') c.push('Keyword demand could not be measured this time, so no term can be sized or priced yet.');
  return { strengths: s, constraints: c };
}

/** What the data shows for every area; each list capped. */
export function areaObservations(f: Facts): Record<AreaKey, AreaObservations> {
  const cap = (o: AreaObservations): AreaObservations => ({ strengths: o.strengths.slice(0, LIMIT), constraints: o.constraints.slice(0, LIMIT) });
  return { google: cap(google(f)), social: cap(social(f)), website: cap(website(f)), ads: cap(ads(f)), competitors: cap(competitors(f)), keywords: cap(keywords(f)) };
}

const gist = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3).slice(0, 4).join(' ');

/** The model's items first, then the data's, with near-repeats left out; at most `limit` each. */
export function fillList(model: string[], data: string[], limit = LIMIT): string[] {
  const out = model.filter(Boolean).slice(0, limit);
  const seen = new Set(out.map(gist));
  for (const item of data) {
    if (out.length >= limit) break;
    const g = gist(item);
    if (seen.has(g)) continue;
    seen.add(g);
    out.push(item);
  }
  return out;
}

/** The write-up's area lists, filled from the data where the model left room. */
export function fillAreas<T extends { working: string[]; costing: string[] }>(areas: Record<AreaKey, T>, f: Facts): Record<AreaKey, T> {
  const obs = areaObservations(f);
  return Object.fromEntries(
    (Object.keys(areas) as AreaKey[]).map((k) => [k, { ...areas[k], working: fillList(areas[k].working, obs[k]?.strengths ?? []), costing: fillList(areas[k].costing, obs[k]?.constraints ?? []) }])
  ) as Record<AreaKey, T>;
}
