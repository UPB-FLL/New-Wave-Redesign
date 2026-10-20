import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAuditInsert, buildCompetitor, isDriveLink, normalizeInstagram, normalizeWebsite, type AuditDraft } from './marketingAudits';

const draft = (over: Partial<AuditDraft> = {}): AuditDraft => ({
  business_name: 'Flow and Mills',
  city: ' Delray Beach, FL ',
  website: '',
  instagram: '@flowandmills',
  notes: '',
  competitors: [{ name: '', website: '', instagram: '' }],
  ...over,
});

describe('normalizeWebsite', () => {
  it('adds https and drops trailing slashes', () => {
    expect(normalizeWebsite('www.Example.com/')).toBe('https://www.example.com');
    expect(normalizeWebsite('http://example.com/services/')).toBe('http://example.com/services');
  });
  it('returns null for blank and rejects non-addresses', () => {
    expect(normalizeWebsite('  ')).toBeNull();
    expect(() => normalizeWebsite('not a site')).toThrow(/website address/);
    expect(() => normalizeWebsite('localhost')).toThrow(/website address/);
  });
});

describe('normalizeInstagram', () => {
  it('accepts handles and profile links', () => {
    expect(normalizeInstagram('@_windycityauto')).toBe('_windycityauto');
    expect(normalizeInstagram('https://www.instagram.com/transmissionsunlimitedfl/')).toBe('transmissionsunlimitedfl');
    expect(normalizeInstagram('instagram.com/flowandmills?igsh=abc')).toBe('flowandmills');
  });
  it('rejects invalid handles', () => {
    expect(() => normalizeInstagram('two words')).toThrow(/Instagram handle/);
  });
});

describe('buildAuditInsert', () => {
  it('keeps filled competitors and drops empty rows', () => {
    const row = buildAuditInsert(draft({ competitors: [
      { name: 'Ceramic Bros', website: 'ceramicbros.com', instagram: '@ceramic.bros' },
      { name: '', website: '', instagram: '' },
    ] }));
    expect(row.city).toBe('Delray Beach, FL');
    expect(row.instagram).toBe('flowandmills');
    expect(row.competitors).toEqual([{ name: 'Ceramic Bros', website: 'https://ceramicbros.com', instagram: 'ceramic.bros' }]);
  });
  it('needs a name and a website or Instagram', () => {
    expect(() => buildAuditInsert(draft({ business_name: ' ' }))).toThrow(/business name/);
    expect(() => buildAuditInsert(draft({ instagram: '' }))).toThrow(/website or an Instagram/);
    expect(() => buildAuditInsert(draft({ competitors: [{ name: 'Rival', website: '', instagram: '' }] }))).toThrow(/Rival/);
  });
  it('names an unnamed competitor after its website or handle', () => {
    const row = buildAuditInsert(draft({ competitors: [{ name: '', website: '', instagram: 'rival_shop' }] }));
    expect(row.competitors[0].name).toBe('@rival_shop');
  });
});

describe('buildCompetitor', () => {
  it('normalizes a competitor added to an existing request', () => {
    expect(buildCompetitor({ name: ' Rival ', website: 'rival.com/', instagram: '' })).toEqual({ name: 'Rival', website: 'https://rival.com', instagram: null });
    expect(() => buildCompetitor({ name: 'Rival', website: '', instagram: '' })).toThrow(/Rival/);
  });
});

describe('Drive-only report links', () => {
  it('accepts only drive.google.com links', () => {
    expect(isDriveLink('https://drive.google.com/file/d/abc/view')).toBe(true);
    expect(isDriveLink('https://claude.ai/artifact/abc')).toBe(false);
    expect(isDriveLink('http://drive.google.com/file/d/abc')).toBe(false);
    expect(isDriveLink(null)).toBe(false);
  });

  it('the migration enforces the same rule on every link column', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../supabase/migrations/20261020120000_create_marketing_audits.sql'), 'utf8');
    for (const col of ['drive_folder_url', 'summary_pdf_url', 'deck_pdf_url', 'audit_pdf_url']) {
      expect(sql).toMatch(new RegExp(`${col} text CHECK \\(${col} IS NULL OR ${col} ~ '\\^https://drive\\\\\\.google\\\\\\.com/'\\)`));
    }
    // Admins can queue but never write links; only the service role updates rows.
    expect(sql).not.toMatch(/FOR UPDATE TO authenticated/);
    // Re-queueing a running audit must fail loudly, not drop the new competitor.
    expect(sql).toMatch(/IF NOT FOUND THEN\s+RAISE EXCEPTION/);
  });
});
