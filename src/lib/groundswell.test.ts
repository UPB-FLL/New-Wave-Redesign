import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAuditInsert, buildCompetitor, isDriveLink, normalizeInstagram, normalizeWebsite, type AuditDraft } from './groundswell';
import { buildCustomerInsert, buildPartnerBranding, normalizeBrandColor, normalizeFacebook, normalizeLogoUrl } from './groundswellValidation';

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

describe('Facebook intake', () => {
  it('normalizes public Page handles and numeric Page links without tracking', () => {
    expect(normalizeFacebook(' @wildlyprimal ')).toBe('https://www.facebook.com/wildlyprimal');
    expect(normalizeFacebook('m.facebook.com/wildlyprimal/?ref=share')).toBe('https://www.facebook.com/wildlyprimal');
    expect(normalizeFacebook('https://www.facebook.com/profile.php?id=123456789&ref=share')).toBe('https://www.facebook.com/profile.php?id=123456789');
    expect(normalizeFacebook('')).toBeNull();
  });

  it.each(['https://facebook.com.evil.example/shop', 'https://u:p@facebook.com/shop', 'https://facebook.com:8080/shop', 'https://facebook.com/groups/shop', 'https://facebook.com/profile.php?id=nope'])('rejects non-Page identities: %s', (value) => {
    expect(() => normalizeFacebook(value)).toThrow();
  });

  it('queues a Facebook-only business and competitor', () => {
    expect(buildAuditInsert(draft({ instagram: '', facebook: 'wildlyprimal', competitors: [{ name: 'Rival', website: '', instagram: '', facebook: 'rivalfitness' }] }))).toMatchObject({
      website: null, instagram: null, facebook: 'https://www.facebook.com/wildlyprimal',
      competitors: [{ name: 'Rival', website: null, instagram: null, facebook: 'https://www.facebook.com/rivalfitness' }],
    });
  });

  it('clears an explicitly emptied saved Page without clearing one omitted by an older client', () => {
    expect(buildCustomerInsert(draft({ facebook: '' }))).toHaveProperty('facebook', null);
    expect(buildCustomerInsert(draft())).not.toHaveProperty('facebook');
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
    expect(() => buildAuditInsert(draft({ instagram: '' }))).toThrow(/website, an Instagram handle, or a Facebook Page/);
    expect(() => buildAuditInsert(draft({ competitors: [{ name: 'Rival', website: '', instagram: '' }] }))).toThrow(/Rival/);
  });
  it('names an unnamed competitor after its website or handle', () => {
    const row = buildAuditInsert(draft({ competitors: [{ name: '', website: '', instagram: 'rival_shop' }] }));
    expect(row.competitors[0].name).toBe('@rival_shop');
  });
});

describe('white-label branding input', () => {
  it('takes an https logo on a public host, and nothing else', () => {
    expect(normalizeLogoUrl('')).toBeNull();
    expect(normalizeLogoUrl(' https://cdn.reef.example/logo.png ')).toBe('https://cdn.reef.example/logo.png');
    expect(() => normalizeLogoUrl('http://reef.example/logo.png')).toThrow(/https:\/\//);
    for (const bad of ['https://localhost/x.png', 'https://10.0.0.1/x.png', 'https://user:pw@reef.example/x.png', 'https://printer.local/x.png', 'logo.png']) {
      expect(() => normalizeLogoUrl(bad), bad).toThrow();
    }
    expect(() => normalizeLogoUrl(`https://reef.example/${'a'.repeat(500)}`)).toThrow(/too long/);
  });

  it('reads a colour code in any common form', () => {
    expect(normalizeBrandColor('')).toBeNull();
    expect(normalizeBrandColor('#ABC')).toBe('#aabbcc');
    expect(normalizeBrandColor('1A2B3C')).toBe('#1a2b3c');
    expect(() => normalizeBrandColor('teal')).toThrow(/colour code/);
  });

  it('checks a partner\'s name and logo together, an empty name meaning the company', () => {
    expect(buildPartnerBranding({ display_name: '  Reef   Growth ', logo_url: '' })).toEqual({ display_name: 'Reef Growth', logo_url: null });
    expect(buildPartnerBranding({})).toEqual({ display_name: null, logo_url: null });
    expect(() => buildPartnerBranding({ display_name: 'R' })).toThrow(/at least two/);
    expect(() => buildPartnerBranding({ display_name: 'x'.repeat(121) })).toThrow(/at most 120/);
  });

  it('sends a business\'s logo and colour only when set', () => {
    expect(buildAuditInsert(draft())).not.toHaveProperty('brand_color');
    expect(buildAuditInsert(draft({ brand_logo_url: 'https://flow.example/l.png', brand_color: '#FA0' }))).toMatchObject({ brand_logo_url: 'https://flow.example/l.png', brand_color: '#ffaa00' });
    expect(() => buildAuditInsert(draft({ brand_color: 'orange' }))).toThrow();
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
