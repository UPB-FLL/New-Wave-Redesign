import { describe, expect, it } from 'vitest';
import { REPORT_KINDS, reportPath, reportsFor, safeName, signedReportUrl, storeReport } from '../../../api/_lib/groundswell/reportStore';
import { fakeSupabase } from './fixtures/fakeSupabase';

/** The reports bucket and table: one object and one row per (audit, kind), signed links only. */

const bytes = new TextEncoder().encode('%PDF-1.4 sample');

describe('report store', () => {
  it('names objects by audit, kind and an ASCII file name', () => {
    expect(reportPath('a1', 'summary', 'Café Harbor - Summary (2026-10-22).pdf')).toBe('a1/summary/Caf Harbor - Summary (2026-10-22).pdf');
    expect(reportPath('a1', 'deck', '#?%')).toBe('a1/deck/deck.pdf');
    expect(safeName('Joe\'s / Shop: "A"')).toBe("Joe's Shop A");
  });

  it('stores a report, records it, and replaces a second delivery of the same kind', async () => {
    const { client, tables, objects } = fakeSupabase();
    const row = await storeReport(client as never, { audit_id: 'a1', kind: 'audit', name: 'Shop - Full Marketing Audit (2026-10-22).pdf', pages: 12, bytes: bytes.length }, bytes);
    expect(row.path).toBe('a1/audit/Shop - Full Marketing Audit (2026-10-22).pdf');
    expect(objects['groundswell-reports'].get(row.path)).toBe(bytes);
    await storeReport(client as never, { audit_id: 'a1', kind: 'audit', name: 'Shop - Full Marketing Audit (2026-10-22).pdf', pages: 13, bytes: 5 }, bytes);
    expect(tables.groundswell_reports).toHaveLength(1);
    expect(tables.groundswell_reports[0]).toMatchObject({ audit_id: 'a1', kind: 'audit', pages: 13 });
  });

  it('lists an audit\'s reports in delivery order, and signs a link only for a stored object', async () => {
    const { client } = fakeSupabase();
    for (const kind of ['deck', 'summary', 'audit'] as const) await storeReport(client as never, { audit_id: 'a1', kind, name: `${kind}.pdf`, pages: 1, bytes: 1 }, bytes);
    const byAudit = await reportsFor(client as never, ['a1', 'a2']);
    expect(byAudit.get('a1')?.map((r) => r.kind)).toEqual(['summary', 'deck', 'audit']);
    expect(byAudit.get('a2')).toBeUndefined();
    expect(REPORT_KINDS).toEqual(['summary', 'deck', 'audit', 'benchmark']);
    await expect(signedReportUrl(client as never, 'a1/deck/deck.pdf')).resolves.toMatch(/\/sign\/groundswell-reports\/a1\/deck\/deck\.pdf\?expires=120$/);
    await expect(signedReportUrl(client as never, 'a1/deck/missing.pdf')).rejects.toThrow(/Could not sign/);
  });

  it('reads no reports, not an error, before the table exists', async () => {
    const { client } = fakeSupabase({}, { groundswell_reports: ['*'] });
    expect((await reportsFor(client as never, ['a1'])).size).toBe(0);
  });
});
