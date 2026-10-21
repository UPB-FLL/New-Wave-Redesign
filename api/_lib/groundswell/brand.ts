import type { SiteScan } from './currents/site.js';

/**
 * The client's brand for the three reports: a main colour from the website's
 * theme-color or its most used non-grey colours, text colours that pass 4.5:1
 * against it, and the logo the Site Current found.
 */

export interface Brand {
  /** Background of the cover band, slide headers and table heads. */
  primary: string;
  /** Text on `primary` (white or near-black, whichever passes 4.5:1). */
  onPrimary: string;
  /** Headings on the white page: `primary` when it passes 4.5:1 on white. */
  heading: string;
  /** A light tint of `primary` for KPI tiles. */
  tint: string;
  logo: string | null;
}

export const FALLBACK_PRIMARY = '#12324a';
const WHITE = '#ffffff';
const INK = '#111827';

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(value: string | null | undefined): string | null {
  const m = value?.trim().match(HEX);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${h.toLowerCase()}`;
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const h = normalizeHex(hex) ?? '#000000';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(hex: string, withHex: string, amount: number): string {
  const a = normalizeHex(hex)!;
  const b = normalizeHex(withHex)!;
  const out = [1, 3, 5].map((i) => {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - amount) + parseInt(b.slice(i, i + 2), 16) * amount);
    return v.toString(16).padStart(2, '0');
  });
  return `#${out.join('')}`;
}

export function brandFrom(site: SiteScan | null | undefined): Brand {
  const candidates = [site?.theme_color, ...(site?.brand_colors ?? [])].map(normalizeHex).filter((h): h is string => Boolean(h));
  // The first colour that carries white or near-black text at 4.5:1.
  const primary = candidates.find((c) => Math.max(contrast(c, WHITE), contrast(c, INK)) >= 4.5) ?? FALLBACK_PRIMARY;
  const onPrimary = contrast(primary, WHITE) >= contrast(primary, INK) ? WHITE : INK;
  const heading = contrast(primary, WHITE) >= 4.5 ? primary : INK;
  const logo = site?.logo && /^https:\/\//.test(site.logo) ? site.logo : null;
  return { primary, onPrimary, heading, tint: mix(primary, WHITE, 0.9), logo };
}
