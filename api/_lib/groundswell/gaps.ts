/**
 * What a run could not read, in the words a report carries. A step that was
 * skipped (a connection missing, a quota spent, a profile blocked) leaves no
 * output, so the reports name the gap from the audit's step list instead of
 * the step's error, which is written for staff and may name a tool or a key.
 */

const GAP_WORDING: Record<string, string> = {
  maps: 'Google Maps could not be read for this audit.',
  search: 'Search rankings and backlinks (Ahrefs) were not available for this audit.',
  keywords: 'Keyword demand (Google Keyword Planner) was not available for this audit, so the ad plan and the ad copy are not included.',
  site_pages: 'The website’s inner pages could not be read, so the website plan rests on the homepage alone.',
  social: 'Instagram and Facebook could not be read for this audit.',
  ads: 'Ad tags and paid search pages could not be checked for this audit.',
  linked: 'The business’s own accounts could not be read for this audit, so it is built from public data.',
  social_depth: 'Instagram posts and reels could not be read, so engagement is not compared.',
  ads_library: 'The Meta Ad Library and Google Ads Transparency Center could not be read for this audit.',
  pricing: 'Offers and prices could not be read from the websites.',
  authority: 'Domain authority, press and owned channels could not be read for this audit.',
  benchmark: 'The competitive benchmark could not be built from the data available, so this audit has no benchmark report.',
  plans: 'The website optimization plan and the first week of posts could not be written for this audit.',
  ai_search: 'AI search (crawler access, citability and Brand Radar) could not be read for this audit, so the developer brief is not included.',
};

/** The gap lines for the facts' `missing` list (callers without the audit's step list). */
export const gapsFromMissing = (missing: string[]): string[] => missing.map((k) => GAP_WORDING[k]).filter(Boolean);

/** Steps whose absence the ad plan already explains (they depend on keyword demand). */
const FOLLOWS_KEYWORDS = new Set(['adplan', 'adcopy']);

/**
 * The gaps to name: every data step in `steps` without an output. The ad plan
 * and ad copy are named only when keyword demand itself was read, since the
 * keywords line already covers them.
 */
export function gapsFor(outputs: Record<string, unknown>, steps: string[] | undefined): string[] {
  const names = steps ?? Object.keys(GAP_WORDING);
  const gaps = names.filter((s) => outputs[s] === undefined && GAP_WORDING[s]).map((s) => GAP_WORDING[s]);
  if (outputs.keywords !== undefined && outputs.adplan === undefined && names.some((s) => FOLLOWS_KEYWORDS.has(s))) {
    gaps.push('No ad plan was built from the keyword demand found, so the ad plan and the ad copy are not included.');
  }
  return [...new Set(gaps)];
}
