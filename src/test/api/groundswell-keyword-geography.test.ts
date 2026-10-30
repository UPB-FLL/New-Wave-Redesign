import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ executeTool: vi.fn(), isConsumerConfigured: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', () => ({ executeTool: mocks.executeTool }));
vi.mock('../../../api/_lib/groundswell/composioConsumer', () => ({ isConsumerConfigured: mocks.isConsumerConfigured }));

import { parseCounty, resolveKeywordGeography } from '../../../api/_lib/groundswell/keywordsGeography';

const city = (name: string, state: string, id: string, overrides: Record<string, unknown> = {}) => ({
  geoTargetConstant: { resourceName: `geoTargetConstants/${id}`, name, canonicalName: `${name},${state},United States`, countryCode: 'US', targetType: 'City', status: 'ENABLED', ...overrides },
});
const florida = () => city('Jacksonville', 'Florida', '100001');
const illinois = () => city('Jacksonville', 'Illinois', '100002');
const answer = (...results: unknown[]) => ({ data: { results }, successful: true, error: null });

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('GOOGLE_ADS_CUSTOMER_ID', '');
  mocks.executeTool.mockReset().mockResolvedValue(answer(florida(), illinois()));
  mocks.isConsumerConfigured.mockReset().mockReturnValue(false);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('Keyword Planner city geography', () => {
  it.each(['Jacksonville FL', 'Jacksonville, FL', 'Jacksonville, Florida', ' jacksonville, florida '])('resolves an exact US city and state: %s', async input => {
    const out = await resolveKeywordGeography(input, 5000);
    expect(out).toEqual({ constants: ['geoTargetConstants/100001'], label: 'Jacksonville,Florida,United States', error: null });
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
    expect(mocks.executeTool).toHaveBeenCalledWith('GOOGLEADS_SEARCH_STREAM_GAQL', { query: expect.stringMatching(/geo_target_constant\.name LIKE 'Jacksonville'/i) }, expect.any(Number));
    const [, args, timeout] = mocks.executeTool.mock.calls[0];
    expect(args.query).toMatch(/SELECT\s+geo_target_constant\.resource_name,/);
    expect(args.query).toContain("geo_target_constant.country_code = 'US'");
    expect(args.query).toContain("geo_target_constant.target_type = 'City'");
    expect(args.query).toContain("geo_target_constant.status = 'ENABLED'");
    expect(args.query).toMatch(/LIMIT 100$/);
    expect(timeout).toBeGreaterThan(0);
    expect(timeout).toBeLessThanOrEqual(5000);
  });

  it('uses a case-insensitive exact name predicate and case-insensitive state matching', async () => {
    mocks.executeTool.mockImplementation(async (_slug: string, args: { query: string }) => args.query.includes("geo_target_constant.name LIKE 'jacksonville'") ? answer(florida(), illinois()) : answer());
    const out = await resolveKeywordGeography('jacksonville, fl');
    expect(out).toEqual({ constants: ['geoTargetConstants/100001'], label: 'Jacksonville,Florida,United States', error: null });
    expect(mocks.executeTool.mock.calls[0][1].query).not.toMatch(/LIKE '[^']*[%_]/);
  });

  it('supports snake_case rows and multiword city/state names', async () => {
    mocks.executeTool.mockResolvedValue({ results: [{ geo_target_constant: { resource_name: 'geoTargetConstants/100003', name: 'Winston-Salem', canonical_name: 'Winston-Salem,North Carolina,United States', country_code: 'US', target_type: 'City', status: 'ENABLED' } }] });
    expect(await resolveKeywordGeography('Winston-Salem North Carolina')).toEqual({ constants: ['geoTargetConstants/100003'], label: 'Winston-Salem,North Carolina,United States', error: null });
  });

  it('supports the District of Columbia without treating it as a different city', async () => {
    mocks.executeTool.mockResolvedValue(answer(city('Washington', 'District of Columbia', '100004')));
    expect((await resolveKeywordGeography('Washington, DC')).constants).toEqual(['geoTargetConstants/100004']);
  });

  it('does not select a different state when the requested one has no match', async () => {
    mocks.executeTool.mockResolvedValue(answer(illinois()));
    const out = await resolveKeywordGeography('Jacksonville, FL');
    expect(out.constants).toEqual([]);
    expect(out.error).toMatch(/no.*match|not.*resolve/i);
  });

  it('rejects a city name that matches more than one state without a supplied state', async () => {
    const out = await resolveKeywordGeography('Jacksonville');
    expect(out.constants).toEqual([]);
    expect(out.error).toMatch(/ambiguous|state/i);
  });

  it('accepts a state-free city only when the returned enabled US city is unique', async () => {
    mocks.executeTool.mockResolvedValue(answer(florida()));
    expect((await resolveKeywordGeography('Jacksonville')).constants).toEqual(['geoTargetConstants/100001']);
  });

  it('reads every streamed batch before deciding whether a city is ambiguous', async () => {
    mocks.executeTool.mockResolvedValue({ data: [{ results: [florida()] }, { results: [illinois()] }], successful: true });
    expect((await resolveKeywordGeography('Jacksonville')).constants).toEqual([]);
  });

  it('deduplicates repeated stream rows by their exact resource name', async () => {
    mocks.executeTool.mockResolvedValue({ data: [{ results: [florida()] }, { results: [florida()] }], successful: true });
    expect((await resolveKeywordGeography('Jacksonville, FL')).constants).toEqual(['geoTargetConstants/100001']);
  });

  it.each([
    { countryCode: 'CA' }, { targetType: 'State' }, { status: 'REMOVAL_PLANNED' },
    { name: 'Jacksonville Beach' }, { resourceName: 'customers/100001' }, { canonicalName: 'Jacksonville,Illinois,United States' },
  ])('rechecks returned geography fields instead of trusting the query filters: %j', async overrides => {
    mocks.executeTool.mockResolvedValue(answer(city('Jacksonville', 'Florida', '100001', overrides)));
    expect((await resolveKeywordGeography('Jacksonville, FL')).constants).toEqual([]);
  });

  it.each([null, '', '   ', 'Jacksonville, ZZ', 'Jacksonville% FL', 'Jackson_ville, FL', "O\\'Fallon, MO", `${'A'.repeat(161)}, FL`, "Jacksonville' OR 1=1--, FL", 'US', '90210'])('does not issue a broad query for invalid or missing city input: %s', async input => {
    const out = await resolveKeywordGeography(input);
    expect(out.constants).toEqual([]);
    expect(out.error).toBeTruthy();
    expect(mocks.executeTool).not.toHaveBeenCalled();
  });

  it('escapes apostrophes in exact GAQL city literals', async () => {
    mocks.executeTool.mockResolvedValue(answer(city("O'Fallon", 'Missouri', '100005')));
    const out = await resolveKeywordGeography("O'Fallon, MO");
    expect(out.constants).toEqual(['geoTargetConstants/100005']);
    expect(mocks.executeTool.mock.calls[0][1].query).toContain("geo_target_constant.name LIKE 'O\\'Fallon'");
  });

  it('returns an unresolved result instead of a default location when no rows match', async () => {
    mocks.executeTool.mockResolvedValue(answer());
    const out = await resolveKeywordGeography('Jacksonville, FL');
    expect(out.constants).toEqual([]);
    expect(out.error).toBeTruthy();
  });

  it('returns provider failure without inventing a geography', async () => {
    mocks.executeTool.mockRejectedValue(new Error('provider unavailable'));
    const out = await resolveKeywordGeography('Jacksonville, FL');
    expect(out.constants).toEqual([]);
    expect(out.error).toMatch(/provider unavailable/i);
  });

  it('does not accept rows carried inside a failed provider response', async () => {
    mocks.executeTool.mockResolvedValue({ ...answer(florida()), successful: false, error: 'permission denied' });
    const out = await resolveKeywordGeography('Jacksonville, FL');
    expect(out.constants).toEqual([]);
    expect(out.error).toMatch(/permission denied/i);
  });

  it('uses the configured customer and retries once without it for a consumer login', async () => {
    vi.stubEnv('GOOGLE_ADS_CUSTOMER_ID', '1234567890');
    mocks.isConsumerConfigured.mockReturnValue(true);
    mocks.executeTool.mockRejectedValueOnce(new Error('customer not accessible')).mockResolvedValueOnce(answer(florida()));
    expect((await resolveKeywordGeography('Jacksonville, FL', 5000)).constants).toEqual(['geoTargetConstants/100001']);
    expect(mocks.executeTool).toHaveBeenCalledTimes(2);
    expect(mocks.executeTool.mock.calls[0][1]).toHaveProperty('customer_id', '1234567890');
    expect(mocks.executeTool.mock.calls[1][1]).not.toHaveProperty('customer_id');
    expect(mocks.executeTool.mock.calls[1][2]).toBeLessThanOrEqual(mocks.executeTool.mock.calls[0][2]);
  });

  it('does not retry a failed project-account lookup without its customer', async () => {
    vi.stubEnv('GOOGLE_ADS_CUSTOMER_ID', '1234567890');
    mocks.executeTool.mockRejectedValue(new Error('customer not accessible'));
    expect((await resolveKeywordGeography('Jacksonville, FL')).constants).toEqual([]);
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
  });

  it('caps a caller-supplied large timeout and does not read after an expired budget', async () => {
    await resolveKeywordGeography('Jacksonville, FL', 10 ** 9);
    expect(mocks.executeTool.mock.calls[0][2]).toBeLessThanOrEqual(15000);
    mocks.executeTool.mockClear();
    const out = await resolveKeywordGeography('Jacksonville, FL', 0);
    expect(out.constants).toEqual([]);
    expect(out.error).toMatch(/time/i);
    expect(mocks.executeTool).not.toHaveBeenCalled();
  });

  it('settles within the total budget when a provider promise never answers', async () => {
    vi.useFakeTimers();
    mocks.executeTool.mockReturnValue(new Promise(() => {}));
    const pending = resolveKeywordGeography('Jacksonville, FL', 25);
    await vi.advanceTimersByTimeAsync(25);
    const out = await pending;
    expect(out.constants).toEqual([]);
    expect(out.error).toMatch(/time/i);
  });
});

describe('Keyword Planner county geography', () => {
  const county = (name: string, state: string, id: string) => ({
    geoTargetConstant: { resourceName: `geoTargetConstants/${id}`, name, canonicalName: `${name},${state},United States`, countryCode: 'US', targetType: 'County', status: 'ENABLED' },
  });
  const pines = () => city('Pembroke Pines', 'Florida', '1015166');
  const queryOf = (call: number) => String((mocks.executeTool.mock.calls[call][1] as { query: string }).query);

  it('reads a county name as Google lists it, and nothing else', () => {
    expect(parseCounty('Broward County')).toBe('Broward County');
    expect(parseCounty(' Miami-Dade County ')).toBe('Miami-Dade County');
    expect(parseCounty('Orleans Parish')).toBe('Orleans Parish');
    expect(parseCounty('Broward')).toBeNull();
    expect(parseCounty('Broward County, Florida')).toBeNull();
    expect(parseCounty("County LIKE '%'")).toBeNull();
    expect(parseCounty(null)).toBeNull();
  });

  it('takes the county the listing names as the market, labelled as the county around the city', async () => {
    mocks.executeTool.mockResolvedValueOnce(answer(county('Broward County', 'Florida', '21142')));
    const out = await resolveKeywordGeography('Pembroke Pines, FL', 5000, 'Broward County');
    expect(out).toEqual({ constants: ['geoTargetConstants/21142'], label: 'Broward County,Florida,United States (the county around Pembroke Pines)', error: null });
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
    expect(queryOf(0)).toContain("geo_target_constant.name LIKE 'Broward County'");
    expect(queryOf(0)).toContain("geo_target_constant.target_type = 'County'");
  });

  it('never takes a county in another state, and falls back to the city when no county matches', async () => {
    mocks.executeTool.mockResolvedValueOnce(answer(county('Broward County', 'Georgia', '999'))).mockResolvedValueOnce(answer(pines()));
    const out = await resolveKeywordGeography('Pembroke Pines, FL', 5000, 'Broward County');
    expect(out).toEqual({ constants: ['geoTargetConstants/1015166'], label: 'Pembroke Pines,Florida,United States', error: null });
    expect(mocks.executeTool).toHaveBeenCalledTimes(2);
    expect(queryOf(1)).toContain("geo_target_constant.target_type = 'City'");
  });

  it('falls back to the city when the county lookup fails, and ignores a county that is not one', async () => {
    mocks.executeTool.mockRejectedValueOnce(new Error('quota')).mockResolvedValueOnce(answer(pines()));
    expect((await resolveKeywordGeography('Pembroke Pines, FL', 5000, 'Broward County')).constants).toEqual(['geoTargetConstants/1015166']);
    mocks.executeTool.mockReset().mockResolvedValue(answer(pines()));
    expect((await resolveKeywordGeography('Pembroke Pines, FL', 5000, 'Broward')).constants).toEqual(['geoTargetConstants/1015166']);
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
    expect(queryOf(0)).toContain("target_type = 'City'");
  });

  it('asks about the city alone when no county is given, as before', async () => {
    mocks.executeTool.mockResolvedValue(answer(pines()));
    expect((await resolveKeywordGeography('Pembroke Pines, FL', 5000)).constants).toEqual(['geoTargetConstants/1015166']);
    expect(mocks.executeTool).toHaveBeenCalledTimes(1);
  });
});
