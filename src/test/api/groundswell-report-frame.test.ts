import { describe, expect, it } from 'vitest';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml, NEW_WAVE_PREPARER } from '../../../api/_lib/groundswell/reports';
import { footLine, HOUSE, HOUSE_SHORT, houseCss, numberPages, pageFoot, pageHead, siteLabel, type Frame } from '../../../api/_lib/groundswell/reportFrame';
import { sampleReportDataWithPlan } from './fixtures/groundswell-report';

const PORTAL = 'https://www.newwaveitfl.com/groundswell';
const reef = { name: 'Reef Growth Co', logo: 'https://reef.example/logo.png', whiteLabel: true };

const frame = (who = NEW_WAVE_PREPARER): Frame => ({
  who,
  client: { name: 'Harbor Auto Care', brand: { primary: '#0e5a8a', onPrimary: '#ffffff', heading: '#0e5a8a', tint: '#e7eef3', logo: null } },
  report: 'Marketing audit',
  site: siteLabel('https://www.harbor-auto.example/'),
  date: 'October 21, 2026',
});

describe('the house frame', () => {
  it('names the site without its scheme or www, and nothing for an address that is not one', () => {
    expect(siteLabel('https://www.harbor-auto.example/about')).toBe('harbor-auto.example');
    expect(siteLabel('harbor-auto.example')).toBe('harbor-auto.example');
    expect(siteLabel('')).toBeNull();
    expect(siteLabel(null)).toBeNull();
  });

  it('puts the division’s logo and "Prepared for" the client in the band, and NWSE in the footer', () => {
    const head = pageHead(frame());
    expect(head).toContain('class="house-logo"');
    expect(head).toContain('Prepared for');
    expect(head).toContain('Harbor Auto Care');
    expect(head).not.toContain('class="preparer"');
    expect(footLine(frame())).toBe(`${HOUSE_SHORT} · Marketing audit · harbor-auto.example · October 21, 2026`);
  });

  it('a partner’s report carries the partner’s logo in the band and its name in the footer, never the division’s', () => {
    const head = pageHead(frame(reef));
    expect(head).toContain('<img class="preparer" src="https://reef.example/logo.png" alt="Reef Growth Co"');
    expect(head).not.toContain('house-logo');
    expect(footLine(frame(reef))).toBe('Reef Growth Co · Marketing audit · harbor-auto.example · October 21, 2026');
    expect(footLine(frame(reef))).not.toContain(HOUSE_SHORT);
  });

  it('numbers the pages once the document is whole', () => {
    const f = frame();
    const html = numberPages(`<a>${pageFoot(f)}</a><b>${pageFoot(f)}</b><c>${pageFoot(f)}</c>`);
    expect(html).toContain('1 / 3');
    expect(html).toContain('2 / 3');
    expect(html).toContain('3 / 3');
    expect(html).not.toContain('@@');
  });

  it('uses the house palette, with the client’s colour only on its chip', () => {
    const css = houseCss(frame().client.brand);
    expect(css).toContain(`.page-head{background:${HOUSE.navy}`);
    expect(css).toContain(`.page-foot{background:${HOUSE.navy}`);
    expect(css).toContain('.chip{display:inline-flex;align-items:center;gap:8px;background:#09131D;border-bottom:2px solid #0e5a8a');
    expect(css).not.toContain('th{background:#0e5a8a');
  });
});

describe('every report in the frame', () => {
  const data = sampleReportDataWithPlan();
  const docs = () => ({
    audit: buildAuditHtml(data),
    deck: buildDeckHtml(data, { audit: PORTAL }),
    summary: buildSummaryHtml(data, { deck: PORTAL, audit: PORTAL, folder: PORTAL }),
  });

  it('opens every page on the band and closes it on the footer bar, numbered n / N', () => {
    for (const [name, html] of Object.entries(docs())) {
      const heads = html.split('class="page-head"').length - 1;
      const feet = html.split('class="page-foot"').length - 1;
      expect(heads, name).toBe(feet);
      expect(heads, name).toBeGreaterThan(0);
      expect(html, name).toContain(`1 / ${feet}`);
      expect(html, name).toContain(`${feet} / ${feet}`);
      expect(html, name).not.toContain('@@PAGE');
      expect(html, name).toContain('class="house-logo"');
      expect(html, name).toContain('Prepared for');
    }
  });

  it('keeps the "Prepared by" line and the client logo on every format', () => {
    const d = { ...data, brand: { ...data.brand, logo: 'https://harbor-auto.example/img/logo.png' } };
    for (const html of [buildAuditHtml(d), buildDeckHtml(d, { audit: PORTAL }), buildSummaryHtml(d, { deck: PORTAL, audit: PORTAL, folder: PORTAL })]) {
      expect(html).toContain('Prepared by New Wave: Social Engineering');
      expect(html).toContain('class="logo mini" src="https://harbor-auto.example/img/logo.png"');
    }
  });
});
