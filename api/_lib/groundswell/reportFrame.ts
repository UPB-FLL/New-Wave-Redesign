import { readFileSync } from 'node:fs';
import path from 'node:path';
import { escapeHtml as esc } from '../http.js';
import { logoBackground } from '../../../src/lib/groundswellBrandAssets.js';
import type { AuditBranding } from './branding.js';
import type { Brand } from './brand.js';

/**
 * The house frame every Groundswell PDF is printed in (the New Wave: Social
 * Engineering report layout): a Current Navy header band with the division's
 * logo on the left and "Prepared for" with the client's name and logo on the
 * right; an amber mono-caps kicker over a Plus Jakarta display headline;
 * stat tiles under a coloured rule; tables with mono-caps column heads and
 * hairline rows; dark and left-rule callouts; and a navy footer bar carrying
 * "NWSE · <report> · <site> · <date>" and the page number.
 *
 * A partner's white-label report keeps the frame with the partner's logo (or
 * name) where the division's sits and the partner's name in the footer.
 * The client's own colour marks its chip in the header; everything else is
 * the house palette, so every report reads as one set.
 */

export const HOUSE = {
  navy: '#101E2D',
  deep: '#09131D',
  cyan: '#31C6CF',
  green: '#62BE68',
  tide: '#317B92',
  amber: '#F2A33A',
  amberDeep: '#A65B0B',
  cloud: '#F7FAFB',
  mist: '#E8EFF1',
  slate: '#526271',
  white: '#FFFFFF',
} as const;

export const PREPARED_BY = 'New Wave: Social Engineering';
/** The short name the footer bar carries on New Wave's own reports. */
export const HOUSE_SHORT = 'NWSE';

/** Who the reports are from. A partner's are white-labelled: its name and logo, and no New Wave name anywhere. */
export interface Preparer {
  name: string;
  logo: string | null;
  whiteLabel: boolean;
}

export const NEW_WAVE_PREPARER: Preparer = { name: PREPARED_BY, logo: null, whiteLabel: false };

export function preparerFor(branding: AuditBranding | null | undefined): Preparer {
  const p = branding?.partner;
  return p ? { name: p.name, logo: p.logo, whiteLabel: true } : NEW_WAVE_PREPARER;
}

export const preparedBy = (p: Preparer) => `Prepared by ${esc(p.name)}`;
/** The partner's logo (white-label) where the division's logo sits; New Wave's reports have none. */
export const preparerLogo = (p: Preparer) => (p.logo ? `<img class="preparer" src="${esc(p.logo)}" alt="${esc(p.name)}" style="background:${logoBackground(p.logo)}" onerror="this.remove()">` : '');

export const logoImg = (b: Brand, cls: string) =>
  b.logo ? `<img class="logo ${cls}" src="${esc(b.logo)}" alt="" style="background:${logoBackground(b.logo)}" onerror="this.remove()">` : '';

// ---------------------------------------------------------------------------
// Assets, inlined so the PDFs look the same on any machine

const ASSETS = 'public/brand/social-engineering';
const cache = new Map<string, string | null>();

function asset(file: string): string | null {
  if (!cache.has(file)) {
    try {
      cache.set(file, readFileSync(path.join(process.cwd(), ASSETS, file)).toString('base64'));
    } catch {
      cache.set(file, null);
    }
  }
  return cache.get(file) ?? null;
}

const face = (family: string, file: string, weight: string) => {
  const data = asset(`fonts/${file}`);
  return data ? `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${data}) format('woff2');font-weight:${weight};font-display:block}` : '';
};

/** Inter (text), Plus Jakarta Sans (display) and IBM Plex Mono (labels): the division's self-hosted copies. */
export function fontFaces(): string {
  return [
    face('Report', 'inter-latin-var.woff2', '100 900'),
    face('Report Display', 'plus-jakarta-sans-latin-var.woff2', '200 800'),
    face('Report Mono', 'ibm-plex-mono-latin-400.woff2', '400'),
    face('Report Mono', 'ibm-plex-mono-latin-500.woff2', '500'),
    face('Report Mono', 'ibm-plex-mono-latin-600.woff2', '600'),
  ].join('\n');
}

/** The division's inline logo for the navy band (the light-on-dark master), or its name when the file is not there. */
export function houseLogo(): string {
  const svg = asset('logos/nwse-logo-inline_fullcolor-dark.svg');
  return svg ? `<img class="house-logo" src="data:image/svg+xml;base64,${svg}" alt="${esc(PREPARED_BY)}">` : `<span class="house-name">${esc(PREPARED_BY)}</span>`;
}

// ---------------------------------------------------------------------------
// The frame

export interface Frame {
  who: Preparer;
  /** The client's name and brand, for the "Prepared for" chip. */
  client: { name: string; brand: Brand };
  /** The report's name, as the footer bar carries it ("Marketing audit"). */
  report: string;
  /** The client's website or city, for the footer; absent means the client's name. */
  site?: string | null;
  date: string;
}

/** A domain for the footer bar ("uncommonpathbrewing.com"), or null when the address is not one. */
export function siteLabel(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./i, '');
    return host || null;
  } catch {
    return null;
  }
}

/** The navy band at the top of every page: the preparer's logo, and the client under "Prepared for". */
export function pageHead(f: Frame): string {
  const left = f.who.whiteLabel ? preparerLogo(f.who) || `<span class="house-name">${esc(f.who.name)}</span>` : houseLogo();
  return `<header class="page-head"><div class="who">${left}</div><div class="client"><span class="label">Prepared for</span><span class="chip">${logoImg(f.client.brand, 'mini')}<span class="name">${esc(f.client.name)}</span></span></div></header>`;
}

/** The footer bar's words: "NWSE · Marketing audit · site · date" (a partner's name in place of NWSE). */
export function footLine(f: Frame): string {
  return [f.who.whiteLabel ? f.who.name : HOUSE_SHORT, f.report, f.site || f.client.name, f.date].filter(Boolean).map(esc).join(' · ');
}

const PAGE = '@@PAGE@@';
const PAGES = '@@PAGES@@';

/** The navy bar at the foot of every page, numbered once the document is whole (`numberPages`). */
export function pageFoot(f: Frame, extra = ''): string {
  return `<footer class="page-foot"><span class="line">${footLine(f)}</span>${extra}<span class="pn">${PAGE} / ${PAGES}</span></footer>`;
}

/** Fills in "n / N" on every page of a finished document. */
export function numberPages(html: string): string {
  const total = html.split(PAGE).length - 1;
  let n = 0;
  return html.replace(new RegExp(PAGE, 'g'), () => String(++n)).split(PAGES).join(String(total));
}

/** One Letter page in the frame: the band, the kicker and the title, the body, the footer bar. */
export function framePage(f: Frame, kicker: string, title: string, body: string, cls = ''): string {
  return `<section class="page${cls ? ` ${cls}` : ''}">${pageHead(f)}<div class="body"><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2>${body}</div>${pageFoot(f)}</section>`;
}

/** A pill label ("Decision", "Recommended") as the next-steps list carries them. */
export const pill = (text: string, tone: 'amber' | 'cyan' | 'slate' = 'amber') => `<span class="pill pill-${tone}">${esc(text)}</span>`;

/** The resets and the house frame for Letter pages; `baseCss` (reports.ts) stays for the ad images. */
export function houseCss(b: Brand): string {
  const h = HOUSE;
  return `${fontFaces()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:'Report',Inter,Arial,Helvetica,sans-serif;color:${h.navy};background:${h.white};-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1,h2,h3{font-family:'Report Display','Report',Inter,Arial,sans-serif;color:${h.navy};line-height:1.15;font-weight:700;letter-spacing:-.01em}
.mono,.kicker,.label,.pill,th,.page-foot,.kpi .l{font-family:'Report Mono','Courier New',monospace;letter-spacing:.08em;text-transform:uppercase}
.muted{color:${h.slate}}
.lede{color:${h.slate};font-size:1.12em;line-height:1.45}
a{color:${h.tide}}
ul{padding-left:1.1em}ol{padding-left:1.3em}
.logo{object-fit:contain;display:block}
@page{size:Letter;margin:0}
.page{width:8.5in;min-height:11in;position:relative;page-break-after:always;display:flex;flex-direction:column;font-size:10pt;line-height:1.45}
.page:last-child{page-break-after:auto}
.page-head{background:${h.navy};color:${h.cloud};height:0.95in;padding:0 0.6in;display:flex;align-items:center;justify-content:space-between;gap:24px;flex:0 0 auto}
.page-head .who{display:flex;align-items:center;min-width:0}
.house-logo{height:0.36in;max-width:3.6in;display:block}
.house-name{font-family:'Report Display',sans-serif;font-weight:700;font-size:14pt;color:${h.cloud}}
.preparer{height:0.42in;max-width:2.6in;object-fit:contain;display:block;background:${h.white};border-radius:4px;padding:3px 6px}
.client{display:flex;flex-direction:column;align-items:flex-end;gap:5px;min-width:0}
.client .label{font-size:7.5pt;color:${h.amber}}
.chip{display:inline-flex;align-items:center;gap:8px;background:${h.deep};border-bottom:2px solid ${b.primary};padding:6px 12px;max-width:3.4in}
.chip .name{font-family:'Report Display',sans-serif;font-weight:700;font-size:10pt;letter-spacing:.04em;text-transform:uppercase;color:${h.cloud};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip .logo.mini{height:0.26in;max-width:1.2in;border-radius:3px;padding:2px 4px}
.body{padding:0.3in 0.6in 0.35in;flex:1 1 auto}
.kicker{font-size:8pt;font-weight:500;color:${h.amberDeep};margin-bottom:6px}
h1{font-size:24pt;margin:0 0 8px}
h2{font-size:19pt;margin:0 0 10px}
h3{font-size:11.5pt;margin:14px 0 4px}
p{margin:4px 0}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:9pt}
th{font-size:7.5pt;font-weight:500;color:${h.slate};text-align:left;padding:5px 7px;border-bottom:1.5px solid ${h.navy};background:${h.white}}
td{padding:5px 7px;border-bottom:1px solid ${h.mist};vertical-align:top;overflow-wrap:anywhere}
tr.total td,tr.base td{font-weight:700}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
.kpi{background:${h.white};border:1px solid ${h.mist};border-top:3px solid ${h.cyan};border-radius:4px;padding:11px 12px}
.kpi:nth-child(2n){border-top-color:${h.tide}}
.kpi:last-child{border-top-color:${h.amber}}
.kpi .l{font-size:7.5pt;color:${h.slate};margin-bottom:4px;letter-spacing:.06em}
.kpi .v{font-family:'Report Display',sans-serif;font-weight:700;font-size:17pt;color:${h.navy};line-height:1.1}
.kpi .s{font-size:8pt;color:${h.slate};margin-top:4px}
.callout{border-left:3px solid ${h.cyan};padding:8px 12px;margin:10px 0;background:${h.cloud}}
.callout.amber{border-left-color:${h.amber}}
.callout h3{margin-top:0}
.callout-dark{background:${h.navy};color:${h.cloud};border-radius:4px;padding:11px 14px;margin:12px 0}
.callout-dark h3,.callout-dark .kicker{color:${h.amber}}
.callout-dark a{color:${h.cyan}}
.callout-dark strong{color:${h.amber}}
.pill{display:inline-block;font-size:6.8pt;font-weight:500;padding:2px 6px;border:1px solid currentColor;border-radius:2px;margin-left:6px;vertical-align:middle}
.pill-amber{color:${h.amberDeep}}.pill-cyan{color:${h.tide}}.pill-slate{color:${h.slate}}
.note{font-size:7.8pt;color:${h.slate};margin-top:2px}
.page-foot{background:${h.navy};color:${h.cloud};height:0.5in;padding:0 0.6in;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:7.3pt;font-weight:500;flex:0 0 auto}
.page-foot .line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.page-foot a{color:${h.cloud};text-decoration:none;margin-right:14px}
.page-foot .pn{white-space:nowrap}
.cover .body{padding-top:0.45in}
.cover h1{font-size:26pt;margin:0 0 10px}
.cover .lede{margin-bottom:6px}
.finding{margin-bottom:16px;break-inside:avoid;border-left:3px solid ${h.cyan};padding-left:12px}.finding p{margin:4px 0}.finding h3{margin-top:0}
.post{margin-bottom:14px;break-inside:avoid;padding:9px 12px;border-left:3px solid ${h.amber};background:${h.cloud}}.post p{margin:4px 0}.post h3{margin-top:0}.post .caption{white-space:pre-wrap}
.evidence-limit{font-size:8.8pt;color:${h.slate};margin:10px 0;padding:8px 11px;border-left:3px solid ${h.amber};background:${h.cloud}}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}`;
}
