import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DiscoveryResult } from '../lib/groundswellDiscoveryTypes';

vi.mock('../lib/groundswellDiscovery', () => ({ discoverBusiness: vi.fn() }));
vi.mock('../lib/groundswell', async (original) => ({
  ...await original<typeof import('../lib/groundswell')>(),
  listAudits: vi.fn(async () => []),
  listAuditSteps: vi.fn(async () => ({})),
  listHeldChecks: vi.fn(async () => ({})),
  listPartners: vi.fn(async () => []),
  queueAudit: vi.fn(async () => ({})),
}));
vi.mock('../lib/groundswellPartner', async (original) => ({
  ...await original<typeof import('../lib/groundswellPartner')>(),
  createPartnerCustomer: vi.fn(async () => ({ customer: {}, audit: {} })),
}));

import { discoverBusiness } from '../lib/groundswellDiscovery';
import { queueAudit } from '../lib/groundswell';
import { createPartnerCustomer, type PartnerCustomer } from '../lib/groundswellPartner';
import GroundswellAudits from './admin/GroundswellAudits';
import { CustomerForm } from './pages/CustomerForm';

const found = (name = 'Wildly Primal'): DiscoveryResult => ({
  business: { business_name: name, city: 'Delray Beach, FL', website: 'https://wildlyprimal.com', instagram: 'wildlyprimal', facebook: 'https://www.facebook.com/wildlyprimal', brand_logo_url: 'https://wildlyprimal.com/logo.png', brand_color: '#112233', brand_colors: ['#112233', '#aabbcc'], category: 'Fitness studio' },
  competitors: [{ name: 'Local Fitness', website: 'https://localfit.example', instagram: 'localfit', source_url: 'https://maps.google.com/localfit', reason: 'Nearby fitness studio' }],
  sources: [{ name: 'Website', status: 'ok', url: 'https://wildlyprimal.com' }],
  warnings: [],
  discovered_at: '2026-10-23T12:00:00Z',
});

const flushLookup = () => act(async () => { await vi.advanceTimersByTimeAsync(900); });
const lookup = vi.mocked(discoverBusiness);

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  lookup.mockReset().mockResolvedValue(found());
});
afterEach(() => vi.useRealTimers());

describe('business discovery intake', () => {
  it.each(['admin', 'partner'] as const)('fills %s intake from a website, previews the brand, and queues only after review', async (viewer) => {
    render(viewer === 'admin' ? <MemoryRouter><GroundswellAudits /></MemoryRouter> : <CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    const website = screen.getByLabelText('Website');
    fireEvent.change(website, { target: { value: 'wildlyprimal.com' } });
    expect(screen.getByText(/lookup starts when you finish typing/)).toBeInTheDocument();
    await flushLookup();
    expect(lookup).toHaveBeenCalledWith(viewer, expect.objectContaining({ website: 'https://wildlyprimal.com' }), expect.any(AbortSignal));
    expect(screen.getByLabelText('Business name')).toHaveValue('Wildly Primal');
    expect(screen.getByLabelText('City')).toHaveValue('Delray Beach, FL');
    expect(screen.getByLabelText('Instagram')).toHaveValue('wildlyprimal');
    expect(screen.getByLabelText('Facebook')).toHaveValue('https://www.facebook.com/wildlyprimal');
    expect(screen.getByRole('img', { name: 'Wildly Primal logo preview' })).toHaveAttribute('src', 'https://wildlyprimal.com/logo.png');
    expect(screen.getByLabelText('Competitor 1 name')).toHaveValue('Local Fitness');
    expect(screen.getByRole('link', { name: 'View source for Local Fitness' })).toHaveAttribute('href', 'https://maps.google.com/localfit');
    expect(queueAudit).not.toHaveBeenCalled();
    expect(createPartnerCustomer).not.toHaveBeenCalled();
    // Discovered social links must not start another lookup.
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(lookup).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Use #aabbcc as the main colour' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: viewer === 'admin' ? 'Queue audit' : 'Add and queue the audit' })); });
    const queue = viewer === 'admin' ? queueAudit : createPartnerCustomer;
    expect(queue).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Wildly Primal', city: 'Delray Beach, FL', brand_logo_url: 'https://wildlyprimal.com/logo.png', brand_color: '#aabbcc', competitors: [{ name: 'Local Fitness', website: 'https://localfit.example', instagram: 'localfit' }] }));
  });

  it('debounces edits, cancels old responses and preserves manual values entered while loading', async () => {
    let completeOld!: (result: DiscoveryResult) => void;
    let completeNew!: (result: DiscoveryResult) => void;
    lookup.mockImplementationOnce(() => new Promise((resolve) => { completeOld = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { completeNew = resolve; }));
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'old.example' } });
    await flushLookup();
    const firstSignal = lookup.mock.calls[0][2];
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'new.example' } });
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'newest.example' } });
    expect(firstSignal?.aborted).toBe(true);
    await flushLookup();
    expect(lookup).toHaveBeenCalledTimes(2);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'My chosen name' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Miami, FL' } });
    fireEvent.change(screen.getByLabelText('Main colour'), { target: { value: '#abcdef' } });
    fireEvent.change(screen.getByLabelText('Competitor 1 name'), { target: { value: 'My competitor' } });
    await act(async () => { completeNew(found('New result')); });
    await act(async () => { completeOld(found('Stale result')); });
    expect(screen.getByLabelText('Business name')).toHaveValue('My chosen name');
    expect(screen.getByLabelText('City')).toHaveValue('Miami, FL');
    expect(screen.getByLabelText('Main colour')).toHaveValue('#abcdef');
    expect(screen.getByLabelText('Competitor 1 name')).toHaveValue('My competitor');
    expect(screen.getByLabelText('Website')).toHaveValue('newest.example');
  });

  it('shows a lookup failure, retries explicitly, and supports a Facebook-only seed', async () => {
    lookup.mockRejectedValueOnce(new Error('The public profile could not be read.'));
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Facebook'), { target: { value: 'https://facebook.com/wildlyprimal' } });
    await flushLookup();
    expect(screen.getByRole('alert')).toHaveTextContent('The public profile could not be read.');
    expect(lookup).toHaveBeenCalledWith('partner', expect.objectContaining({ facebook: 'https://www.facebook.com/wildlyprimal' }), expect.any(AbortSignal));
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(lookup).toHaveBeenCalledTimes(1);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry lookup' })); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Business name')).toHaveValue('Wildly Primal');
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('starts from Instagram and clears old discovered details when the business changes', async () => {
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Instagram'), { target: { value: '@wildlyprimal' } });
    await flushLookup();
    expect(lookup).toHaveBeenCalledWith('partner', expect.objectContaining({ instagram: 'wildlyprimal', website: undefined }), expect.any(AbortSignal));
    expect(screen.getByLabelText('Business name')).toHaveValue('Wildly Primal');
    fireEvent.change(screen.getByLabelText('Instagram'), { target: { value: '@differentbusiness' } });
    expect(screen.getByLabelText('Business name')).toHaveValue('');
    expect(screen.getByLabelText('City')).toHaveValue('');
    expect(screen.getByLabelText('Website')).toHaveValue('');
    expect(screen.getByLabelText('Facebook')).toHaveValue('');
    expect(screen.getByLabelText('Logo link')).toHaveValue('');
    expect(screen.getByLabelText('Main colour')).toHaveValue('');
    expect(screen.getByLabelText('Competitor 1 name')).toHaveValue('');
    await flushLookup();
    expect(lookup.mock.calls[1][1]).toEqual(expect.objectContaining({ instagram: 'differentbusiness', website: undefined, facebook: undefined }));
  });

  it('keeps discovered fields for an equivalent website edit and cancels the lookup on unmount', async () => {
    const view = render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'wildlyprimal.com' } });
    await flushLookup();
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'https://wildlyprimal.com/' } });
    await flushLookup();
    expect(screen.getByLabelText('Business name')).toHaveValue('Wildly Primal');
    expect(lookup).toHaveBeenCalledTimes(1);
    lookup.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'next.example' } });
    await flushLookup();
    const signal = lookup.mock.calls[1][2];
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('resolves a pending website lookup before validating and queuing the required business name', async () => {
    let complete!: (result: DiscoveryResult) => void;
    lookup.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'wildlyprimal.com' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' })); });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(createPartnerCustomer).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Finding business details…' })).toBeDisabled();
    await act(async () => { complete(found()); });
    expect(createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Wildly Primal' }));
  });

  it('allows manual entry after a lookup failure without automatically retrying on submit', async () => {
    lookup.mockRejectedValue(new Error('Lookup is unavailable.'));
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Entered manually' } });
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'wildlyprimal.com' } });
    await flushLookup();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' })); });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Entered manually' }));
  });

  it('keeps a Facebook-only competitor suggestion editable and carries it into the audit', async () => {
    const result = found();
    result.competitors = [{ name: 'Facebook Fitness', website: null, instagram: null, facebook: 'https://www.facebook.com/facebookfitness', reason: 'Nearby fitness studio' }];
    lookup.mockResolvedValueOnce(result);
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'wildlyprimal.com' } });
    await flushLookup();
    expect(screen.getByLabelText('Competitor 1 Facebook')).toHaveValue('https://www.facebook.com/facebookfitness');
    fireEvent.change(screen.getByLabelText('Competitor 1 Facebook'), { target: { value: 'https://www.facebook.com/reviewedfitness' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' })); });
    expect(createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ competitors: [expect.objectContaining({ name: 'Facebook Fitness', facebook: 'https://www.facebook.com/reviewedfitness' })] }));
  });

  it.each(['admin', 'partner'] as const)('refreshes %s competitor suggestions for a user-edited city without looping on discovered fields', async (viewer) => {
    const miami = found();
    miami.competitors = [{ name: 'Miami Fitness', website: 'https://miamifit.example', instagram: null }];
    lookup.mockResolvedValueOnce(found()).mockResolvedValueOnce(miami);
    render(viewer === 'admin' ? <MemoryRouter><GroundswellAudits /></MemoryRouter> : <CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'wildlyprimal.com' } });
    await flushLookup();
    expect(screen.getByLabelText('Competitor 1 name')).toHaveValue('Local Fitness');
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Miami' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Miami, FL' } });
    expect(screen.getByLabelText('Competitor 1 name')).toHaveValue('');
    expect(screen.getByText(/lookup starts when you finish typing/)).toBeInTheDocument();
    await flushLookup();
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup.mock.calls[1][1]).toEqual(expect.objectContaining({ business_name: 'Wildly Primal', city: 'Miami, FL' }));
    expect(screen.getByLabelText('City')).toHaveValue('Miami, FL');
    expect(screen.getByLabelText('Competitor 1 name')).toHaveValue('Miami Fitness');
    expect(screen.getByRole('img', { name: 'Wildly Primal logo preview' })).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('researches changed name and city before submit while preserving manually reviewed brand and competitors', async () => {
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'wildlyprimal.com' } });
    await flushLookup();
    fireEvent.change(screen.getByLabelText('Competitor 1 name'), { target: { value: 'Reviewed competitor' } });
    fireEvent.change(screen.getByLabelText('Logo link'), { target: { value: 'https://wildlyprimal.com/reviewed-logo.png' } });
    fireEvent.change(screen.getByLabelText('Main colour'), { target: { value: '#abcdef' } });
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Wildly Primal Miami' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Miami, FL' } });
    expect(screen.getByLabelText('Competitor 1 name')).toHaveValue('Reviewed competitor');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' })); });
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup.mock.calls[1][1]).toEqual(expect.objectContaining({ business_name: 'Wildly Primal Miami', city: 'Miami, FL' }));
    expect(createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Wildly Primal Miami', city: 'Miami, FL', brand_color: '#abcdef', brand_logo_url: 'https://wildlyprimal.com/reviewed-logo.png', competitors: [expect.objectContaining({ name: 'Reviewed competitor' })] }));
  });

  it('awaits the latest city if the user corrects it while a submitted lookup is in flight', async () => {
    let completeOld!: (result: DiscoveryResult) => void;
    let completeCurrent!: (result: DiscoveryResult) => void;
    lookup.mockImplementationOnce(() => new Promise((resolve) => { completeOld = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { completeCurrent = resolve; }));
    render(<CustomerForm mode="add" stage="prospect" onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'wildlyprimal.com' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' })); });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Miami, FL' } });
    expect(lookup.mock.calls[0][2]?.aborted).toBe(true);
    await act(async () => { completeOld(found('Old location result')); });
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(lookup.mock.calls[1][1]).toEqual(expect.objectContaining({ city: 'Miami, FL' }));
    expect(createPartnerCustomer).not.toHaveBeenCalled();
    const current = found();
    current.competitors = [{ name: 'Miami Fitness', website: 'https://miamifit.example', instagram: null }];
    await act(async () => { completeCurrent(current); });
    expect(createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ city: 'Miami, FL', competitors: [expect.objectContaining({ name: 'Miami Fitness' })] }));
  });

  it('leaves an existing customer intact and performs no automatic discovery in edit mode', async () => {
    const customer = { id: 'c1', business_name: 'Existing business', city: 'Miami', website: 'https://existing.example', instagram: 'existing', facebook: 'https://facebook.com/existing', notes: null, competitors: [], stage: 'prospect' } as unknown as PartnerCustomer;
    render(<CustomerForm mode="edit" customer={customer} onSaved={vi.fn()} onCancel={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(lookup).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Business name')).toHaveValue('Existing business');
    expect(screen.getByLabelText('City')).toHaveValue('Miami');
    expect(screen.queryByRole('button', { name: 'Refresh business details' })).not.toBeInTheDocument();
  });
});
