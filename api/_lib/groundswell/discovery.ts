import { normalizeFacebook, normalizeInstagram, normalizeWebsite } from '../../../src/lib/groundswellValidation.js';
import type { DiscoveryResult, DiscoverySeed, DiscoverySource } from '../../../src/lib/groundswellDiscoveryTypes.js';
import { executeTool, findKey } from './composio.js';
import { findCompetitors } from './currents/competitors.js';
import { inspectBusinessWebsite } from './discoveryWebsite.js';
import { publicWebsiteUrl } from './publicFetch.js';

const string = (value: unknown, max = 180): string | null => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) || null : null;

export function discoverySeed(body: Record<string, unknown>): DiscoverySeed {
  const input = (key: string) => {
    if (body[key] !== undefined && typeof body[key] !== 'string') throw new Error('Business lookup details must be text.');
    const value = String(body[key] ?? '').trim();
    if (value.length > 500) throw new Error('One of the business details is too long.');
    return value;
  };
  const website = normalizeWebsite(input('website')) ?? '';
  if (website) publicWebsiteUrl(website);
  const instagram = normalizeInstagram(input('instagram')) ?? '';
  const facebook = normalizeFacebook(input('facebook')) ?? '';
  if (!website && !instagram && !facebook) throw new Error('Add a website, Instagram handle, or Facebook Page to look up the business.');
  return { website, instagram, facebook, business_name: input('business_name').slice(0, 160), city: input('city').slice(0, 160) };
}

const emptyBusiness = (seed: DiscoverySeed): DiscoveryResult['business'] => ({
  business_name: seed.business_name || null, city: seed.city || null, website: seed.website || null,
  instagram: seed.instagram || null, facebook: seed.facebook || null,
  brand_logo_url: null, brand_color: null, brand_colors: [], category: null,
});

function externalWebsite(profile: unknown): string | null {
  const urls = ['external_url', 'website', 'website_url', 'url'].map(key => findKey<unknown>(profile, key));
  const bios = findKey<unknown>(profile, 'bio_links');
  if (Array.isArray(bios)) urls.unshift(...bios.map(row => typeof row === 'object' && row !== null ? (row as { url?: unknown }).url : null));
  for (const candidate of urls) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    try {
      const normalized = normalizeWebsite(candidate);
      if (!normalized) continue;
      const url = publicWebsiteUrl(normalized);
      // Platform profiles and link redirectors are not the business's own website.
      if (/(^|\.)(instagram|facebook|fb|tiktok|youtube|l\.instagram)\.com$/i.test(url.hostname) || /^l\./i.test(url.hostname)) continue;
      return url.href;
    } catch { /* A malformed or non-public link never becomes an intake website. */ }
  }
  return null;
}

/** Read-only discovery: suggestions are reviewed in intake before any audit is queued. */
export async function discoverPublicBusiness(seed: DiscoverySeed): Promise<DiscoveryResult> {
  const deadline = Date.now() + 32_000;
  let business = emptyBusiness(seed);
  const sources: DiscoverySource[] = [];
  const warnings: string[] = [];
  const inspect = async (website: string) => {
    const found = await inspectBusinessWebsite(website);
    // Explicitly supplied social accounts and location remain the user's choices.
    business = { ...business, ...found.business, instagram: seed.instagram || found.business.instagram || business.instagram, facebook: seed.facebook || found.business.facebook || business.facebook, city: seed.city || found.business.city || business.city, business_name: seed.business_name || found.business.business_name || business.business_name };
    sources.push(...found.sources);
    warnings.push(...found.warnings);
  };
  if (business.website) await inspect(business.website);
  if (!business.website || !business.business_name) {
    const profiles = [
      ...(seed.instagram ? [{ name: 'Instagram', slug: 'SCRAPECREATORS_GET_INSTAGRAM_PROFILE', args: { handle: seed.instagram, trim: true, cache_max_age: '1d' }, url: `https://www.instagram.com/${seed.instagram}/` }] : []),
      ...(seed.facebook ? [{ name: 'Facebook', slug: 'SCRAPECREATORS_GET_FACEBOOK_PROFILE', args: { url: seed.facebook, include_gated_profile: true, cache_max_age: '1d' }, url: seed.facebook }] : []),
    ];
    for (const profile of profiles) {
      const remaining = Math.min(9_000, deadline - Date.now());
      if (remaining <= 0) { warnings.push(`${profile.name} lookup reached the time limit. You can enter its details manually.`); break; }
      try {
        const data = await executeTool(profile.slug, profile.args, remaining);
        const name = string(findKey(data, 'full_name')) ?? string(findKey(data, 'name'));
        const profileWebsite = externalWebsite(data);
        if (!business.business_name && name) business.business_name = name;
        if (!business.website) business.website = profileWebsite;
        sources.push({ name: profile.name, status: name || profileWebsite ? 'ok' : 'not_found', url: profile.url, detail: 'Read publicly available profile identity and links.' });
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'The public profile could not be read.';
        sources.push({ name: profile.name, status: 'unavailable', url: profile.url, detail });
        warnings.push(`${profile.name}: ${detail}`);
      }
    }
    if (business.website && business.website !== seed.website && Date.now() < deadline) await inspect(business.website);
  }
  const competitors: DiscoveryResult['competitors'] = [];
  if (business.business_name && Date.now() < deadline) {
    try {
      const found = await findCompetitors({ business_name: business.business_name, city: business.city, website: business.website, instagram: business.instagram, facebook: business.facebook, category: business.category, deadline }, 6);
      if (!business.category && found.business?.category) business.category = found.business.category;
      for (const candidate of found.competitors) {
        const pick = found.picks.find(item => item.website === candidate.website);
        competitors.push({ ...candidate, source_url: pick?.url ?? found.sources.find(source => source.url)?.url ?? null, reason: pick?.reason ?? (pick?.market === 'local' ? 'Suggested from public results for the business’s market and category.' : 'Suggested from public category research; confirm that the businesses compete.') });
      }
      sources.push({ name: 'Competitor research', status: competitors.length ? 'ok' : found.gaps.length ? 'unavailable' : 'not_found', url: found.sources.find(source => source.url)?.url ?? null, detail: found.gaps.join(' ') || `${competitors.length} business suggestions from public category research. These are suggestions, not search ranking claims.` });
      warnings.push(...found.gaps);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Competitor research could not be completed.';
      sources.push({ name: 'Competitor research', status: 'unavailable', detail });
      warnings.push(detail);
    }
  } else {
    sources.push({ name: 'Competitor research', status: 'not_found', detail: 'Confirm the business name before researching competitors.' });
  }
  if (!business.business_name) warnings.push('The public sources did not verify a business name. Enter it before queuing the audit.');
  return { business, competitors, sources, warnings: [...new Set(warnings)], discovered_at: new Date().toISOString() };
}
