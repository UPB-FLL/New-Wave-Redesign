import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ inspect: vi.fn(), tool: vi.fn(), competitors: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/discoveryWebsite', () => ({ inspectBusinessWebsite: mocks.inspect }));
vi.mock('../../../api/_lib/groundswell/currents/competitors', () => ({ findCompetitors: mocks.competitors }));
vi.mock('../../../api/_lib/groundswell/composio', async original => ({ ...await original<typeof import('../../../api/_lib/groundswell/composio')>(), executeTool: mocks.tool }));
import { discoverPublicBusiness } from '../../../api/_lib/groundswell/discovery';

const business = { business_name: 'Harbor Repair', city: 'Miami, FL', website: 'https://harbor.example', instagram: 'harbor', facebook: 'https://www.facebook.com/harbor', brand_logo_url: 'https://harbor.example/logo.svg', brand_color: '#123456', brand_colors: ['#123456'], category: 'Auto repair' };
beforeEach(() => {
  mocks.inspect.mockReset().mockResolvedValue({ scan: {}, business, sources: [{ name: 'Website', status: 'ok' }], warnings: [] });
  mocks.tool.mockReset();
  mocks.competitors.mockReset().mockResolvedValue({ competitors: [{ name: 'Dock Repair', website: 'https://dock.example', instagram: null }], picks: [], sources: [{ label: 'Google public search', url: 'https://www.google.com/search?q=auto+repair+Miami' }], gaps: [], business: { category: 'Auto repair' } });
});

describe('public business discovery service', () => {
  it('returns real website identity, branding and sourced competitor suggestions while retaining supplied account/location choices', async () => {
    const found = await discoverPublicBusiness({ website: 'https://harbor.example', instagram: 'confirmed_handle', city: 'Orlando, FL' });
    expect(found.business).toMatchObject({ business_name: 'Harbor Repair', city: 'Orlando, FL', instagram: 'confirmed_handle', brand_logo_url: business.brand_logo_url, brand_color: '#123456' });
    // The Instagram bio is read for what the business does, in its own words; the name and site stay the website's.
    expect(mocks.tool).toHaveBeenCalledWith('SCRAPECREATORS_GET_INSTAGRAM_PROFILE', expect.objectContaining({ handle: 'confirmed_handle' }), expect.any(Number));
    expect(mocks.tool).toHaveBeenCalledTimes(1);
    expect(mocks.competitors).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Harbor Repair', city: 'Orlando, FL', deadline: expect.any(Number) }), 6);
    expect(found.competitors[0]).toMatchObject({ name: 'Dock Repair', source_url: expect.stringContaining('google.com') });
  });
  it('follows a public Instagram website link to discover business branding', async () => {
    mocks.tool.mockResolvedValue({ user: { full_name: 'Harbor Repair', external_url: 'https://harbor.example' } });
    const found = await discoverPublicBusiness({ instagram: 'harbor' });
    expect(mocks.tool).toHaveBeenCalledWith('SCRAPECREATORS_GET_INSTAGRAM_PROFILE', expect.objectContaining({ handle: 'harbor' }), expect.any(Number));
    expect(mocks.inspect).toHaveBeenCalledWith('https://harbor.example/');
    expect(found.business.brand_color).toBe('#123456');
  });
  it('uses a manually corrected name and city for fresh competitor matching', async () => {
    const found = await discoverPublicBusiness({ website: 'https://harbor.example', business_name: 'Harbor Marine Repair', city: 'Tampa, FL' });
    expect(found.business).toMatchObject({ business_name: 'Harbor Marine Repair', city: 'Tampa, FL' });
    expect(mocks.competitors).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Harbor Marine Repair', city: 'Tampa, FL' }), 6);
  });
  it('accepts a Facebook-only business seed', async () => {
    mocks.tool.mockResolvedValue({ name: 'Harbor Repair', website: 'https://harbor.example' });
    const found = await discoverPublicBusiness({ facebook: 'https://www.facebook.com/harbor' });
    expect(mocks.tool).toHaveBeenCalledWith('SCRAPECREATORS_GET_FACEBOOK_PROFILE', expect.objectContaining({ url: 'https://www.facebook.com/harbor' }), expect.any(Number));
    expect(found.business.facebook).toBe('https://www.facebook.com/harbor');
  });
  it('never follows private or platform-redirect links returned by a profile', async () => {
    mocks.tool.mockResolvedValue({ user: { full_name: 'Harbor Repair', external_url: 'http://127.0.0.1/private' } });
    const found = await discoverPublicBusiness({ instagram: 'harbor' });
    expect(mocks.inspect).not.toHaveBeenCalled();
    expect(found.business.website).toBeNull();
  });
  it('retains website and branding when paid public-data reads cannot run', async () => {
    mocks.competitors.mockRejectedValue(new Error('Composio public-data reads need credits.'));
    const found = await discoverPublicBusiness({ website: 'https://harbor.example' });
    expect(found.business.brand_logo_url).toBe(business.brand_logo_url);
    expect(found.competitors).toEqual([]);
    expect(found.sources).toContainEqual(expect.objectContaining({ name: 'Competitor research', status: 'unavailable' }));
    expect(found.warnings).toContain('Composio public-data reads need credits.');
  });
  it('never calls an empty social response a verified profile just because the seed already had a website', async () => {
    mocks.inspect.mockResolvedValue({ scan: {}, business: { ...business, business_name: null }, sources: [], warnings: [] });
    mocks.tool.mockResolvedValue({});
    const found = await discoverPublicBusiness({ website: 'https://harbor.example', instagram: 'harbor' });
    expect(found.sources).toContainEqual(expect.objectContaining({ name: 'Instagram', status: 'not_found' }));
    expect(found.business.business_name).toBeNull();
  });
});
