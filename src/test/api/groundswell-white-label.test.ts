import { existsSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('../../../api/_lib/supabaseAdmin', () => ({ getSupabaseAdmin: () => store.client, isSupabaseConfigured: () => true }));

import { brandFrom } from '../../../api/_lib/groundswell/brand';
import { loadBranding, type AuditBranding } from '../../../api/_lib/groundswell/branding';
import { runDeliverPrepare } from '../../../api/_lib/groundswell/delivery';
import { buildAuditHtml, buildDeckHtml, buildSummaryHtml, NEW_WAVE_PREPARER, ownWording, preparerFor, type ReportData } from '../../../api/_lib/groundswell/reports';
import { fakeSupabase } from './fixtures/fakeSupabase';
import { sampleAudit, sampleOutputs, sampleReportDataWithPlan } from './fixtures/groundswell-report';

const AUDIT = 'https://www.newwaveitfl.com/groundswell';
const DECK = 'https://www.newwaveitfl.com/groundswell';
const FOLDER = 'https://www.newwaveitfl.com/groundswell';
const LOGO = 'https://reef.example/logo.png';

const partnerBranding: AuditBranding = { partner: { id: 'p1', company: 'Reef Agency LLC', name: 'Reef Growth Co', logo: LOGO }, logo: null, color: null };
const reef = preparerFor(partnerBranding);
/** Anything that would tell a partner's client who is behind the reports. */
const ENGINE = /New Wave|NW Social Engineering|NWSE|newwaveitfl|Groundswell|Croissance/i;

describe('who the reports are from', () => {
  it('is New Wave unless a partner submitted the audit', () => {
    expect(preparerFor(null)).toBe(NEW_WAVE_PREPARER);
    expect(preparerFor({ partner: null, logo: null, color: null })).toBe(NEW_WAVE_PREPARER);
    expect(reef).toEqual({ name: 'Reef Growth Co', logo: LOGO, whiteLabel: true });
  });

  it('puts a partner\'s report in its own words, and leaves New Wave\'s alone', () => {
    const html = [
      '<li>New Wave’s working bands for small accounts</li>',
      '<p>Team time is costed at New Wave’s hourly cost for the work.</p>',
      '<p>Positions (New Wave\'s rule, not a published figure).</p>',
      '<p>Groundswell estimate for the category. New Wave’s estimate of where one page reaches.</p>',
      '<footer>Prepared by New Wave: Social Engineering</footer>',
      '<p>NW Social Engineering and New Wave IT will set it up.</p>',
    ].join('');
    expect(ownWording(html, NEW_WAVE_PREPARER)).toBe(html);
    expect(ownWording(html, reef)).toBe(
      [
        '<li>Our working bands for small accounts</li>',
        '<p>Team time is costed at our hourly cost for the work.</p>',
        '<p>Positions (our rule, not a published figure).</p>',
        '<p>Our estimate for the category. Our estimate of where one page reaches.</p>',
        '<footer>Prepared by Reef Growth Co</footer>',
        '<p>Reef Growth Co and Reef Growth Co will set it up.</p>',
      ].join('')
    );
    // A name with replacement patterns in it is inserted as written, and escaped.
    expect(ownWording('<p>New Wave</p>', { name: 'A$&B <Co>', logo: null, whiteLabel: true })).toBe('<p>A$&amp;B &lt;Co&gt;</p>');
  });
});

describe('a partner\'s reports', () => {
  const base = sampleReportDataWithPlan();
  // A write-up that names New Wave, as a model might; and an existing client.
  const model = {
    ...base.model,
    estimates: { ...base.model.estimates, is_nwse_client: true },
    writeup: { ...base.model.writeup, verdict: `${base.model.writeup.verdict} New Wave can set up the first campaign this month.` },
  };
  const partner: ReportData = { ...base, model, preparer: reef };
  const html = {
    audit: buildAuditHtml(partner),
    deck: buildDeckHtml(partner, { audit: AUDIT }),
    summary: buildSummaryHtml(partner, { deck: DECK, audit: AUDIT, folder: FOLDER }),
  };

  it('never name New Wave, Groundswell or Croissance', () => {
    for (const [name, doc] of Object.entries(html)) expect(doc.match(ENGINE)?.[0], name).toBeUndefined();
  });

  it('say "Prepared by" the partner, with its logo on the cover', () => {
    for (const doc of Object.values(html)) {
      expect(doc).toContain('Prepared by Reef Growth Co');
      expect(doc).toContain(`<img class="preparer" src="${LOGO}" alt="Reef Growth Co"`);
    }
    expect(html.audit).toContain('Reef Growth Co can set up the first campaign this month.');
    expect(html.audit).toContain('You are already a client of Reef Growth Co');
    expect(html.audit).toContain('our hourly cost');
  });

  const chromium = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  it.skipIf(!existsSync(chromium))('print with the partner\'s logo and no links; the slides are still twelve and the summary one page', async () => {
    process.env.CHROMIUM_PATH = chromium;
    const { withBrowser } = await import('../../../api/_lib/groundswell/browser');
    const { renderPdf } = await import('../../../api/_lib/groundswell/render');
    const [audit, deck, summary] = await withBrowser(async (browser) => [
      await renderPdf(browser, html.audit),
      await renderPdf(browser, html.deck),
      await renderPdf(browser, html.summary),
    ]);
    expect(audit.links).toEqual([]);
    expect(deck.pages).toBe(12);
    expect(summary.pages).toBe(1);
  }, 120_000);

  it('leave New Wave\'s own reports as they were', () => {
    const own = buildAuditHtml(base);
    expect(own).toContain('Prepared by New Wave: Social Engineering');
    expect(own).not.toContain('class="preparer"');
  });
});

describe('the business\'s own look', () => {
  const site = { theme_color: '#0b5394', brand_colors: [], logo: 'https://harbor.example/site-logo.png' } as unknown as Parameters<typeof brandFrom>[0];

  it('takes a colour and logo set when queued over the website\'s', () => {
    expect(brandFrom(site)).toMatchObject({ primary: '#0b5394', logo: 'https://harbor.example/site-logo.png' });
    expect(brandFrom(site, { color: '#7a1f1f', logo: 'https://harbor.example/better.png' })).toMatchObject({ primary: '#7a1f1f', logo: 'https://harbor.example/better.png' });
  });

  it('still needs the colour to carry text at 4.5:1, and the logo to be https', () => {
    // Mid grey passes neither white nor near-black text, so the website's colour stays.
    expect(brandFrom(site, { color: '#777777', logo: 'http://harbor.example/plain.png' })).toMatchObject({ primary: '#0b5394', logo: 'https://harbor.example/site-logo.png' });
  });
});

describe('loading an audit\'s branding', () => {
  const seed = () => ({
    marketing_audits: [
      { id: 'a-admin', partner_id: null, brand_logo_url: null, brand_color: '#7a1f1f' },
      { id: 'a-reef', partner_id: 'p1', brand_logo_url: 'https://harbor.example/l.png', brand_color: null },
      { id: 'a-tide', partner_id: 'p2', brand_logo_url: null, brand_color: null },
    ],
    groundswell_partners: [
      { id: 'p1', company: 'Reef Agency LLC', display_name: 'Reef Growth Co', logo_url: LOGO },
      { id: 'p2', company: 'Tide Co', display_name: null, logo_url: null },
    ],
  });
  const client = (missing: Record<string, string[]> = {}) => fakeSupabase(seed(), missing).client as unknown as SupabaseClient;

  it('reads the partner\'s name and logo, the company when no name is set, and the business\'s overrides', async () => {
    expect(await loadBranding(client(), 'a-admin')).toEqual({ partner: null, logo: null, color: '#7a1f1f' });
    expect(await loadBranding(client(), 'a-reef')).toEqual({
      partner: { id: 'p1', company: 'Reef Agency LLC', name: 'Reef Growth Co', logo: LOGO },
      logo: 'https://harbor.example/l.png',
      color: null,
    });
    expect((await loadBranding(client(), 'a-tide')).partner).toMatchObject({ name: 'Tide Co', logo: null });
  });

  it('still white-labels a partner\'s audit before the migration, on the company name', async () => {
    const before = client({ marketing_audits: ['brand_logo_url', 'brand_color'], groundswell_partners: ['display_name', 'logo_url'] });
    expect(await loadBranding(before, 'a-reef')).toEqual({ partner: { id: 'p1', company: 'Reef Agency LLC', name: 'Reef Agency LLC', logo: null }, logo: null, color: null });
  });

  it('throws on a failed read rather than print a partner\'s report as New Wave\'s', async () => {
    await expect(loadBranding(client(), 'no-such-audit')).rejects.toThrow(/Could not read the branding/);
  });
});

describe('where the reports go', () => {
  const ctx = (branding?: AuditBranding) => ({ audit: { ...sampleAudit, branding }, outputs: sampleOutputs(), deadline: Date.now() + 60_000, attempt: 1 });

  it('the private reports bucket, under the audit\'s own id, partner or not', async () => {
    store.client = fakeSupabase().client;
    expect(await runDeliverPrepare(ctx(partnerBranding))).toEqual({ bucket: 'groundswell-reports', prefix: sampleAudit.id });
    expect(await runDeliverPrepare(ctx())).toEqual({ bucket: 'groundswell-reports', prefix: sampleAudit.id });
  });

  it('fails before printing anything when the bucket is not there', async () => {
    store.client = fakeSupabase({}, { storage: ['groundswell-reports'] }).client;
    await expect(runDeliverPrepare(ctx())).rejects.toThrow(/reports bucket/);
  });
});
