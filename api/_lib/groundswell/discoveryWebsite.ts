import { normalizeFacebook, normalizeInstagram, normalizeLogoUrl } from '../../../src/lib/groundswellValidation.js';
import type { DiscoveryResult, DiscoverySource } from '../../../src/lib/groundswellDiscoveryTypes.js';
import { parseSite, type SiteScan } from './currents/site.js';
import { categoryFromText } from './currents/serp.js';
import { readPublicText } from './publicFetch.js';

type Business = DiscoveryResult['business'];
type JsonObject = Record<string, unknown>;

export interface WebsiteDiscovery {
  scan: SiteScan;
  business: Business;
  sources: DiscoverySource[];
  warnings: string[];
}

const blankBusiness = (website: string): Business => ({ business_name: null, city: null, website, instagram: null, facebook: null, brand_logo_url: null, brand_color: null, brand_colors: [], category: null });
const object = (value: unknown): JsonObject | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
const decode = (value: string) => value.replace(/&(?:amp|quot|apos|lt|gt|nbsp);|&#(?:x[0-9a-f]+|\d+);/gi, (entity) => {
  const named: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  const code = entity.startsWith('&#x') || entity.startsWith('&#X') ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
});
const text = (value: unknown): string | null => typeof value === 'string' ? decode(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180) || null : null;

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/\s([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return out;
}

function absolute(value: unknown, base: string): string | null {
  const raw = typeof value === 'string' ? decode(value).trim() : '';
  if (!raw || raw.length > 2_000) return null;
  try {
    const url = new URL(raw, base);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function structuredData(html: string) {
  const nodes: JsonObject[] = [];
  const visit = (value: unknown, depth = 0) => {
    if (nodes.length >= 500 || depth > 15) return;
    if (Array.isArray(value)) { for (const item of value) visit(item, depth + 1); return; }
    const node = object(value);
    if (!node) return;
    nodes.push(node);
    for (const child of Object.values(node)) if (child && typeof child === 'object') visit(child, depth + 1);
  };
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/^application\/ld\+json(?:\s*;|$)/i.test(attributes(`<script ${match[1]}>`).type || '')) continue;
    try { visit(JSON.parse(match[2].trim())); } catch { /* A malformed schema block does not hide the rest of the page. */ }
  }
  const byId = new Map<string, JsonObject>();
  for (const node of nodes) if (typeof node['@id'] === 'string') byId.set(node['@id'], { ...byId.get(node['@id']), ...node });
  const resolve = (value: unknown) => {
    const node = object(value);
    return node && typeof node['@id'] === 'string' ? { ...byId.get(node['@id']), ...node } : node;
  };
  return { nodes, resolve };
}

const typesOf = (node: JsonObject): string[] => list(node['@type']).filter((type): type is string => typeof type === 'string').map((type) => type.split(/[/#]/).pop() || type);
const localType = /Business|Store|Restaurant|Fitness|Gym|SportsClub|HealthClub|SportsActivityLocation|ProfessionalService|Medical|Dentist|AutoRepair|BeautySalon|HairSalon|Lodging|Hotel|Cafe|BarOrPub|Organization/i;

function businessNodes(nodes: JsonObject[], base: string) {
  const origin = new URL(base).origin;
  return nodes.map((node) => {
    const types = typesOf(node);
    let score = types.some((type) => localType.test(type)) ? 60 : types.includes('WebSite') ? 10 : -100;
    if (node.address) score += 25;
    if (types.some((type) => type !== 'Organization' && localType.test(type))) score += 20;
    const url = absolute(node.url, base);
    if (url) score += new URL(url).origin === origin ? 20 : -100;
    if (node.logo) score += 5;
    return { node, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ node }) => node);
}

function imageUrl(value: unknown, base: string, resolve: (value: unknown) => JsonObject | null, depth = 0): string | null {
  if (depth > 4) return null;
  if (typeof value === 'string') return absolute(value, base);
  for (const item of list(value)) {
    const node = resolve(item);
    if (!node) continue;
    for (const candidate of [node.contentUrl, node.url, node.image]) {
      const url = imageUrl(candidate, base, resolve, depth + 1);
      if (url) return url;
    }
  }
  return null;
}

function logoFrom(html: string, base: string, entities: JsonObject[], resolve: (value: unknown) => JsonObject | null): { url: string | null; icon: boolean } {
  const candidates: { url: string; score: number; icon: boolean }[] = [];
  const add = (value: string | null, score: number, icon = false) => {
    if (!value) return;
    try {
      const url = normalizeLogoUrl(value);
      if (url) {
        const siteIcon = icon || /(?:^|\/)(?:favicon|apple-touch-icon)(?:[._/-]|$)/i.test(new URL(url).pathname);
        candidates.push({ url, score: siteIcon ? Math.min(score, 20) : score, icon: siteIcon });
      }
    } catch { /* Report overrides accept only public HTTPS image links. */ }
  };
  entities.forEach((entity, i) => add(imageUrl(entity.logo, base, resolve), 300 - i));
  const headers = [...html.matchAll(/<header\b[^>]*>[\s\S]*?<\/header\s*>/gi)].map((match) => ({ start: match.index!, end: match.index! + match[0].length }));
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const labelled = /logo|brand(?:ing)?/i.test(`${attrs.alt || ''} ${attrs.class || ''} ${attrs.id || ''}`);
    const source = attrs['data-src'] || attrs['data-lazy-src'] || attrs.src || attrs.srcset?.split(/[\s,]/)[0];
    const logoFile = /(?:^|[/_-])logo(?:[/_.-]|$)/i.test(source || '');
    if (!labelled && !logoFile) continue;
    const header = headers.some(({ start, end }) => match.index! >= start && match.index! < end);
    add(absolute(source, base), 120 + (labelled ? 30 : 0) + (header ? 80 : 0));
  }
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (/\b(?:apple-touch-icon|icon)\b/i.test(attrs.rel || '')) add(absolute(attrs.href, base), /apple-touch-icon/i.test(attrs.rel) ? 20 : 10, true);
  }
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return { url: best?.url || null, icon: best?.icon || false };
}

function colorHex(value: string): string | null {
  const raw = value.trim().toLowerCase();
  const hex = raw.match(/^#([\da-f]{3}|[\da-f]{6})(?:\b|$)/i);
  if (hex) return `#${hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]}`;
  const rgb = raw.match(/^rgba?\(\s*([\d.]+)(%)?[\s,]+([\d.]+)(%)?[\s,]+([\d.]+)(%)?(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)/);
  if (rgb) {
    if (rgb[7] && Number(rgb[7]) / (rgb[8] ? 100 : 1) < 0.95) return null;
    const channels = [1, 3, 5].map((index) => Math.round(Math.min(255, Number(rgb[index]) * (rgb[index + 1] ? 2.55 : 1))).toString(16).padStart(2, '0'));
    return `#${channels.join('')}`;
  }
  const hsl = raw.match(/^hsla?\(\s*([\d.-]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)/);
  if (!hsl || (hsl[4] && Number(hsl[4]) / (hsl[5] ? 100 : 1) < 0.95)) return null;
  const hue = ((Number(hsl[1]) % 360) + 360) % 360 / 360;
  const saturation = Math.min(100, Number(hsl[2])) / 100;
  const lightness = Math.min(100, Number(hsl[3])) / 100;
  const amplitude = saturation * Math.min(lightness, 1 - lightness);
  const channels = [0, 8, 4].map((offset) => {
    const k = (offset + hue * 12) % 12;
    return Math.round((lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

function paletteFrom(html: string, stylesheets: string[]): string[] {
  const candidates = new Map<string, number>();
  const add = (value: string, score: number, explicit = false) => {
    const color = colorHex(value);
    if (!color) return;
    const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
    const neutral = Math.max(...channels) - Math.min(...channels) < 24;
    if (neutral && !explicit) return;
    const weighted = score - (neutral ? 90 : 0);
    candidates.set(color, Math.max(candidates.get(color) ?? -Infinity, weighted));
  };
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    if (/^(theme-color|msapplication-tilecolor)$/i.test(attrs.name || '')) add(attrs.content || '', 190);
  }
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((match) => match[1]);
  inline.push(...[...html.matchAll(/<[^>]+\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi)].map((match) => match[1] ?? match[2]));
  const css = [...inline, ...stylesheets].join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const declarations = [...css.matchAll(/([\w-]+)\s*:\s*([^;{}]+)/g)].map((match) => ({ name: match[1].toLowerCase(), value: match[2].trim() }));
  const variables = new Map(declarations.filter(({ name }) => name.startsWith('--')).map(({ name, value }) => [name, value]));
  const resolve = (value: string, depth = 0): string => depth > 4 ? value : value.replace(/var\(\s*(--[\w-]+)(?:\s*,\s*([^)]*))?\)/g, (_, name: string, fallback: string) => resolve(variables.get(name) || fallback || '', depth + 1));
  for (const { name, value } of declarations) {
    const primary = name.startsWith('--') && /(?:^|[-_])(?:primary|brand)(?:[-_]|$)/i.test(name);
    const accent = name.startsWith('--') && /(?:^|[-_])(?:accent|secondary)(?:[-_]|$)/i.test(name);
    const score = primary ? 250 : accent ? 220 : name.startsWith('--') && /color|colour/i.test(name) ? 110 : /background|color|fill|stroke/i.test(name) ? 70 : 30;
    const resolved = resolve(value);
    for (const color of resolved.match(/#[\da-f]{6}\b|#[\da-f]{3}\b|(?:rgba?|hsla?)\([^)]*\)/gi) || []) add(color, score, primary || accent);
  }
  return [...candidates].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([color]) => color);
}

function stylesheetUrls(html: string, base: string): string[] {
  const origin = new URL(base).origin;
  return [...new Set([...html.matchAll(/<link\b[^>]*>/gi)].flatMap((match) => {
    const attrs = attributes(match[0]);
    if (!/\bstylesheet\b/i.test(attrs.rel || '')) return [];
    const url = absolute(attrs.href, base);
    return url && new URL(url).origin === origin ? [url] : [];
  }))].sort((a, b) => {
    const rank = (url: string) => /vendor|bootstrap|font|normalize|reset/i.test(url) ? -10 : /brand|theme|main|app|global|custom|style/i.test(url) ? 10 : 0;
    return rank(b) - rank(a);
  }).slice(0, 2);
}

/** Extract observed identity and branding; absent evidence remains absent. */
export async function inspectBusinessWebsite(url: string, options: { timeoutMs?: number } = {}): Promise<WebsiteDiscovery> {
  let page: Awaited<ReturnType<typeof readPublicText>>;
  try {
    page = await readPublicText(url, { timeoutMs: options.timeoutMs ?? 8_000, maxBytes: 1_500_000, contentTypes: ['text/html', 'application/xhtml+xml'] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The website could not be reached.';
    return { scan: { ...parseSite('', url, url, 0), final_url: null, status: null, error: message }, business: blankBusiness(url), sources: [{ name: 'Website', status: 'unavailable', url, detail: message.slice(0, 200) }], warnings: ['The website could not be read. Enter the business details and brand manually, or retry.'] };
  }
  const scan = parseSite(page.text, url, page.url, page.status, page.xRobotsTag ?? null);
  if (page.status < 200 || page.status >= 400) {
    const detail = `The website returned HTTP ${page.status}.`;
    return { scan: { ...scan, error: detail }, business: blankBusiness(page.url), sources: [{ name: 'Website', status: 'unavailable', url: page.url, detail }], warnings: [detail, 'Business details and branding could not be verified from this page.'] };
  }
  const warnings: string[] = [];
  const { nodes, resolve } = structuredData(page.text);
  const entities = businessNodes(nodes, page.url);
  const business = blankBusiness(page.url);
  const metadata = [...page.text.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const siteName = metadata.find((attrs) => /^og:site_name$/i.test(attrs.property || ''))?.content;
  const title = text(scan.title || metadata.find((attrs) => /^og:title$/i.test(attrs.property || ''))?.content);
  const titleName = title?.split(/\s+[|–—]\s+|\s+-\s+/).find((part) => !/^(home|welcome|homepage|just a moment|access denied|page not found|404|attention required)[.!…]*$/i.test(part.trim()));
  business.business_name = entities.map((entity) => text(entity.name || entity.legalName)).find(Boolean) || text(siteName) || text(titleName);
  for (const entity of entities) {
    for (const item of list(entity.address)) {
      const address = resolve(item);
      const locality = text(address?.addressLocality);
      if (!locality) continue;
      const region = text(address?.addressRegion);
      business.city = [locality, region].filter(Boolean).join(', ');
      break;
    }
    if (business.city) break;
  }
  const categoryEntity = entities.find((entity) => entity.category || typesOf(entity).some((type) => localType.test(type) && type !== 'Organization'));
  business.category = text(list(categoryEntity?.category)[0]) || typesOf(categoryEntity || {}).find((type) => !['Organization', 'WebSite', 'Thing'].includes(type))?.replace(/([a-z])([A-Z])/g, '$1 $2') || categoryFromText([title, scan.meta_description, ...entities.map(entity => text(entity.description))].filter(Boolean).join(' '));
  const canonical = absolute(scan.canonical, page.url);
  if (canonical && new URL(canonical).origin === new URL(page.url).origin) business.website = canonical;
  const socialLinks = [...entities.flatMap((entity) => list(entity.sameAs)), ...[...page.text.matchAll(/<a\b[^>]*>/gi)].map((match) => attributes(match[0]).href)];
  for (const raw of socialLinks) {
    const link = absolute(raw, page.url);
    if (!link) continue;
    const social = new URL(link);
    if (!business.instagram && /^(?:www\.)?instagram\.com$/i.test(social.hostname) && !/^\/(?:p|reels?|explore|accounts|stories|tv|share)(?:\/|$)/i.test(social.pathname)) {
      try { business.instagram = normalizeInstagram(link); } catch { /* Not a profile link. */ }
    }
    if (!business.facebook && /^(?:www\.|m\.)?facebook\.com$/i.test(social.hostname)) {
      try { business.facebook = normalizeFacebook(link); } catch { /* Not a business Page. */ }
    }
  }
  const logo = logoFrom(page.text, page.url, entities, resolve);
  business.brand_logo_url = logo.url;
  if (logo.icon) warnings.push('Only a site icon was found. Confirm that it is suitable as the business logo.');
  const sheets = await Promise.all(stylesheetUrls(page.text, page.url).map(async (href) => {
    try {
      const sheet = await readPublicText(href, { timeoutMs: 3_000, maxBytes: 150_000, contentTypes: ['text/css', 'text/plain'] });
      return sheet.status >= 200 && sheet.status < 300 && new URL(sheet.url).origin === new URL(page.url).origin ? sheet.text : null;
    } catch { return null; }
  }));
  if (sheets.some((sheet) => sheet === null)) warnings.push('A linked stylesheet could not be read. Review the detected colours.');
  business.brand_colors = paletteFrom(page.text, sheets.filter((sheet): sheet is string => sheet !== null));
  business.brand_color = business.brand_colors[0] || null;
  if (!business.business_name) warnings.push('The website did not identify a business name. Add it below.');
  if (!business.city) warnings.push('A city could not be verified from the website. Add the business location below.');
  if (!business.brand_logo_url) warnings.push('No business logo was found on the website. You can add a logo link.');
  if (!business.brand_color) warnings.push('No brand colour could be verified from the website. You can add a main colour.');
  const facebook = business.facebook ? new URL(business.facebook) : null;
  const facebookRef = facebook ? `${facebook.pathname.replace(/^\/+/, '')}${facebook.search}` : null;
  return {
    scan: {
      ...scan,
      logo: business.brand_logo_url,
      brand_primary: business.brand_color,
      brand_colors: business.brand_colors,
      social: {
        ...scan.social,
        instagram: [...new Set([business.instagram, ...scan.social.instagram].filter((value): value is string => Boolean(value)))],
        facebook: [...new Set([facebookRef, ...scan.social.facebook].filter((value): value is string => Boolean(value)))],
      },
    },
    business,
    sources: [{ name: 'Website', status: 'ok', url: page.url, detail: `Read the homepage${sheets.length ? ` and ${sheets.filter(Boolean).length} linked stylesheet${sheets.filter(Boolean).length === 1 ? '' : 's'}` : ''}.` }],
    warnings,
  };
}
