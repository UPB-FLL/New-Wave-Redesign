import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ws = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  startPhase: vi.fn(),
  runFiles: vi.fn(),
  reportUrl: vi.fn(),
  listStaffCustomers: vi.fn(),
  setStaffCustomerStage: vi.fn(),
  staffAccountsApi: { list: vi.fn(), link: vi.fn(), unlink: vi.fn() },
}));

vi.mock('../../lib/groundswellWorkspace', async (orig) => ({ ...(await orig<typeof import('../../lib/groundswellWorkspace')>()), ...ws }));

import { PartnerSignedOut } from '../../lib/groundswellPartner';
import GroundswellCustomer from '../admin/GroundswellCustomer';
import GroundswellCustomers from '../admin/GroundswellCustomers';
import { GROUNDSWELL_ADMIN_CUSTOMERS_PATH, groundswellAdminCustomerPath } from '../site';
import { CustomerWorkspace } from './CustomerWorkspace';

type Runs = Partial<Record<'audit' | 'competitors' | 'integrated', unknown[]>>;
const workspace = (runs: Runs = {}, start: Partial<Record<string, { allowed: boolean; reason: string }>> = {}) => ({
  customer: { id: 'c1', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: 'harborauto', partner_id: 'p1' },
  phases_available: true,
  phases: (
    [
      ['audit', 1, 'The audit'],
      ['competitors', 2, 'The plan against competitors'],
      ['integrated', 3, 'The integrated plan'],
    ] as const
  ).map(([phase, number, title]) => ({
    phase, number, title, source: 'Public data', brings: `${title} brings this.`, runs: runs[phase] ?? [],
    start: start[phase] ?? { allowed: false, reason: 'Waiting on the phase before it.', builds_on: null },
  })),
});

const run = (over: Record<string, unknown> = {}) => ({
  id: 'r2', status: 'done', kind: 'audit', created_at: '2026-10-22T00:00:00Z', started_at: '2026-10-22T00:00:00Z', completed_at: '2026-10-22T01:00:00Z',
  steps: [
    { step: 'social', status: 'done' },
    { step: 'creatives', status: 'done' },
    { step: 'deliver_adsets', status: 'done' },
  ],
  reports: [{ kind: 'adsets', name: 'Ad Sets.pdf', pages: 6 }],
  files: [{ kind: 'export', name: 'x', path: 'p', content_type: 'x', bytes: 1 }],
  ...over,
});

const FILES = [
  { kind: 'export', name: 'Harbor Auto - Meta Bulk Import.xlsx', path: 'r2/export/meta.xlsx', content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: 9, url: 'https://s.example/meta' },
  { kind: 'export', name: 'Harbor Auto - Google Ads Editor.csv', path: 'r2/export/google.csv', content_type: 'text/csv', bytes: 9, url: 'https://s.example/google' },
  { kind: 'creative', name: 'ad-1.jpg', path: 'r2/creative/ad-1.jpg', content_type: 'image/jpeg', bytes: 9, url: 'https://s.example/ad-1' },
  { kind: 'carousel', name: 'slide-1.png', path: 'r2/carousel/slide-1.png', content_type: 'image/png', bytes: 9, url: 'https://s.example/slide-1' },
  { kind: 'carousel', name: 'caption.txt', path: 'r2/carousel/caption.txt', content_type: 'text/plain', bytes: 9, url: 'https://s.example/caption' },
  { kind: 'image', name: 'ig-1.jpg', path: 'r2/image/ig-1.jpg', content_type: 'image/jpeg', bytes: 9, url: 'https://s.example/ig-1' },
];

beforeEach(() => {
  for (const fn of Object.values(ws)) if (typeof fn === 'function') fn.mockReset();
  for (const fn of Object.values(ws.staffAccountsApi)) fn.mockReset();
  ws.runFiles.mockResolvedValue(FILES);
});

describe('customer workspace', () => {
  it('opens the furthest phase with a run: its reports, downloads, ad images, carousel, photos and data', async () => {
    ws.getWorkspace.mockResolvedValue(
      workspace({
        audit: [run({ id: 'r1', reports: [{ kind: 'audit', name: 'a.pdf', pages: 20 }], files: [] })],
        competitors: [
          run({
            panels: [
              { key: 'adsets', title: 'Ad sets', source: 'Groundswell', table: { head: ['Set', 'Medium'], rows: [['Leads · Meta', '$900']] } },
              { key: 'social', title: 'Instagram', source: 'ScrapeCreators', rows: [{ label: 'Followers', value: '1,240' }], note: 'Read Oct 22.' },
            ],
          }),
        ],
      }),
    );
    ws.reportUrl.mockResolvedValue('https://s.example/adsets.pdf');
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<CustomerWorkspace viewer="admin" customerId="c1" />);
    expect(await screen.findByRole('heading', { level: 3, name: 'Phase 2 · The plan against competitors' })).toBeInTheDocument();
    expect(ws.getWorkspace).toHaveBeenCalledWith('admin', 'c1');
    const cards = within(screen.getByRole('list', { name: 'Phases' })).getAllByRole('button');
    expect(cards.map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    expect(within(cards[1]).getByText('Reports ready')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Not started')).toBeInTheDocument();
    // Reports open through a short-lived link.
    fireEvent.click(screen.getByRole('button', { name: /Ad sets \(PDF\)/ }));
    await waitFor(() => expect(opened).toHaveBeenCalledWith('https://s.example/adsets.pdf', '_blank', 'noopener'));
    expect(ws.reportUrl).toHaveBeenCalledWith('admin', 'r2', 'adsets');
    opened.mockRestore();
    // Files, each with its own link.
    expect(await screen.findByRole('link', { name: /Meta bulk import \(Excel\)/ })).toHaveAttribute('href', 'https://s.example/meta');
    expect(screen.getByRole('link', { name: /Google Ads Editor import \(CSV\)/ })).toHaveAttribute('href', 'https://s.example/google');
    expect(within(screen.getByRole('list', { name: 'Ad images' })).getByRole('img')).toHaveAttribute('src', 'https://s.example/ad-1');
    expect(within(screen.getByRole('list', { name: 'Carousel slides' })).getAllByRole('img')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Caption' })).toHaveAttribute('href', 'https://s.example/caption');
    expect(within(screen.getByRole('list', { name: 'Photos from the business’s Instagram' })).getByRole('img')).toHaveAttribute('src', 'https://s.example/ig-1');
    expect(ws.runFiles).toHaveBeenCalledWith('admin', 'r2');
    // The data it gathered.
    expect(screen.getByText('Leads · Meta')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument();
    // Another phase is one click away.
    fireEvent.click(cards[0]);
    expect(screen.getByRole('heading', { level: 3, name: 'Phase 1 · The audit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Full audit \(PDF\)/ })).toBeInTheDocument();
  });

  it('shows staff each failed step’s error, and a partner only a plain sentence', async () => {
    const failed = run({ status: 'failed', error: 'Step model failed: OpenAI 429', steps: [{ step: 'model', status: 'failed', error: 'OpenAI 429' }], reports: [], files: [] });
    ws.getWorkspace.mockResolvedValue(workspace({ audit: [failed] }));
    const { unmount } = render(<CustomerWorkspace viewer="admin" customerId="c1" />);
    expect(await screen.findByText('Step model failed: OpenAI 429')).toBeInTheDocument();
    expect(screen.getByText('OpenAI 429')).toBeInTheDocument();
    unmount();
    // The server leaves error text out for a partner; the screen adds a plain sentence.
    ws.getWorkspace.mockResolvedValue(workspace({ audit: [{ ...failed, error: undefined, steps: [{ step: 'model', status: 'failed' }] }] }));
    render(<CustomerWorkspace viewer="partner" customerId="c1" />);
    expect(await screen.findByText(/This run didn’t finish\. We’ve been notified/)).toBeInTheDocument();
    expect(screen.queryByText(/OpenAI/)).not.toBeInTheDocument();
  });

  it('asks again while a run waits or runs, and stops once it is delivered', async () => {
    const running = run({ status: 'running', reports: [], files: [], steps: [{ step: 'site', status: 'done' }, { step: 'maps', status: 'running' }, { step: 'model', status: 'pending' }] });
    ws.getWorkspace.mockResolvedValueOnce(workspace({ audit: [running] })).mockResolvedValue(workspace({ audit: [run({ files: [] })] }));
    render(<CustomerWorkspace viewer="partner" customerId="c1" poll={20} />);
    const bar = await screen.findByRole('progressbar', { name: 'Steps finished' });
    expect(bar).toHaveAttribute('aria-valuenow', '1');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
    expect(within(screen.getByRole('list', { name: 'Phases' })).getByText('1 of 3')).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Phases' })).getByText('Reports ready')).toBeInTheDocument());
    const calls = ws.getWorkspace.mock.calls.length;
    await new Promise((r) => setTimeout(r, 80));
    expect(ws.getWorkspace.mock.calls.length).toBe(calls);
  });

  it('runs a delivered phase again, and lists the earlier runs under it', async () => {
    ws.getWorkspace.mockResolvedValue(workspace({ audit: [run({ id: 'r3', files: [] }), run({ id: 'r1', files: [] })] }, { audit: { allowed: true, reason: 'Reads public data again.' } }));
    ws.startPhase.mockResolvedValue({ queued: 'r4', reason: 'Phase 1 is queued.' });
    render(<CustomerWorkspace viewer="admin" customerId="c1" />);
    expect(await screen.findByText('Earlier runs (1)')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-run]')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Run again/ }));
    await waitFor(() => expect(ws.startPhase).toHaveBeenCalledWith('admin', 'c1', 'audit'));
    expect(await screen.findByRole('status')).toHaveTextContent('Phase 1 is queued. It starts on its own within a minute');
  });

  it('says why a phase cannot start, and shows the server’s refusal', async () => {
    ws.getWorkspace.mockResolvedValue(workspace({}, { audit: { allowed: true, reason: 'Reads public data.' } }));
    ws.startPhase.mockRejectedValue(new Error('Too many runs started; try again in a few minutes.'));
    render(<CustomerWorkspace viewer="partner" customerId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Start phase 1/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many runs started');
    fireEvent.click(within(screen.getByRole('list', { name: 'Phases' })).getAllByRole('button')[2]);
    expect(screen.queryByRole('button', { name: /Start phase 3/ })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting on the phase before it.')).toBeInTheDocument();
  });

  it('hands a signed-out partner back to the sign-in', async () => {
    ws.getWorkspace.mockRejectedValue(new PartnerSignedOut('Sign in again.'));
    const onSignedOut = vi.fn();
    render(<CustomerWorkspace viewer="partner" customerId="c1" onSignedOut={onSignedOut} />);
    await waitFor(() => expect(onSignedOut).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

const staff = [
  { id: 'c1', business_name: 'Harbor Auto', city: 'Miami', stage: 'client', partner: { id: 'p1', company: 'Reef Agency' }, updated_at: '2026-10-22T00:00:00Z', phases: { audit: { status: 'done', at: '2026-10-21T00:00:00Z' }, competitors: { status: 'running', at: '2026-10-22T00:00:00Z' }, integrated: null } },
  { id: 'c2', business_name: 'Tide Bakery', city: 'Tampa', stage: 'prospect', partner: null, updated_at: '2026-10-20T00:00:00Z', phases: { audit: { status: 'failed', at: '2026-10-20T00:00:00Z' }, competitors: null, integrated: null } },
  { id: 'c3', business_name: 'Coral Dental', city: 'Naples', stage: 'prospect', partner: { id: 'p2', company: 'Tide Co' }, updated_at: '2026-10-19T00:00:00Z', phases: { audit: null, competitors: null, integrated: null } },
];

describe('staff customers', () => {
  it('lists every customer with its partner, stage and phases, filtered by search, partner and stage', async () => {
    ws.listStaffCustomers.mockResolvedValue(staff);
    render(
      <MemoryRouter>
        <GroundswellCustomers />
      </MemoryRouter>,
    );
    const table = await screen.findByRole('table', { name: 'Customers' });
    const rows = () => within(table).getAllByRole('row').slice(1);
    expect(rows()).toHaveLength(3);
    const harbor = rows()[0];
    expect(within(harbor).getByRole('link', { name: 'Harbor Auto' })).toHaveAttribute('href', groundswellAdminCustomerPath('c1'));
    expect(within(harbor).getByText('Reef Agency')).toBeInTheDocument();
    expect(within(harbor).getByRole('list', { name: 'Phases for Harbor Auto' })).toHaveTextContent('Phase 1: Audit · Reports ready');
    expect(within(harbor).getByRole('list', { name: 'Phases for Harbor Auto' })).toHaveTextContent('Phase 2: Plan against competitors · Running');
    expect(within(harbor).getByRole('list', { name: 'Phases for Harbor Auto' })).toHaveTextContent('Phase 3: Integrated plan · Not started');
    expect(within(rows()[1]).getByText('New Wave')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Partner'), { target: { value: 'new-wave' } });
    expect(rows().map((r) => within(r).getAllByRole('link')[0].textContent)).toEqual(['Tide Bakery']);
    fireEvent.change(screen.getByLabelText('Partner'), { target: { value: 'p2' } });
    expect(rows().map((r) => within(r).getAllByRole('link')[0].textContent)).toEqual(['Coral Dental']);
    fireEvent.change(screen.getByLabelText('Partner'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Stage'), { target: { value: 'client' } });
    expect(rows().map((r) => within(r).getAllByRole('link')[0].textContent)).toEqual(['Harbor Auto']);
    fireEvent.change(screen.getByLabelText('Stage'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'tide' } });
    // "Tide" matches a business and a partner's name.
    expect(rows().map((r) => within(r).getAllByRole('link')[0].textContent)).toEqual(['Tide Bakery', 'Coral Dental']);
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'nothing like it' } });
    expect(screen.getByText('No customers match.')).toBeInTheDocument();
  });

  it('says when the list cannot be read', async () => {
    ws.listStaffCustomers.mockRejectedValue(new Error('Only report admins can see every customer.'));
    render(
      <MemoryRouter>
        <GroundswellCustomers />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Only report admins');
  });

  it('opens one customer: its partner, stage, and the staff workspace', async () => {
    ws.listStaffCustomers.mockResolvedValue(staff);
    ws.getWorkspace.mockResolvedValue(workspace());
    render(
      <MemoryRouter initialEntries={[groundswellAdminCustomerPath('c1')]}>
        <Routes>
          <Route path={`${GROUNDSWELL_ADMIN_CUSTOMERS_PATH}/:id`} element={<GroundswellCustomer />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(screen.getByText('Partner: Reef Agency')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All customers/ })).toHaveAttribute('href', GROUNDSWELL_ADMIN_CUSTOMERS_PATH);
    await waitFor(() => expect(ws.getWorkspace).toHaveBeenCalledWith('admin', 'c1'));
    expect(await screen.findByRole('list', { name: 'Phases' })).toBeInTheDocument();
  });

  it('lets staff link a client’s accounts through the staff route, and move it back to the prospects', async () => {
    ws.listStaffCustomers.mockResolvedValue(staff);
    ws.getWorkspace.mockResolvedValue(workspace());
    ws.staffAccountsApi.list.mockResolvedValue({ available: true, accounts: [{ service: 'instagram', label: 'Instagram', brings: 'Followers.', status: 'none', linked_at: null, reason: null }] });
    ws.staffAccountsApi.link.mockResolvedValue({ redirect_url: 'https://connect.composio.example/ig', accounts: [] });
    ws.setStaffCustomerStage.mockResolvedValue({ id: 'c1', stage: 'prospect' });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    render(
      <MemoryRouter initialEntries={[groundswellAdminCustomerPath('c1')]}>
        <Routes>
          <Route path={`${GROUNDSWELL_ADMIN_CUSTOMERS_PATH}/:id`} element={<GroundswellCustomer />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Linked accounts' })).toBeInTheDocument();
    await waitFor(() => expect(ws.staffAccountsApi.list).toHaveBeenCalledWith('c1'));
    fireEvent.click(await screen.findByRole('button', { name: 'Link Instagram' }));
    await waitFor(() => expect(ws.staffAccountsApi.link).toHaveBeenCalledWith('c1', 'instagram'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://connect.composio.example/ig'));
    fireEvent.click(screen.getByRole('button', { name: 'Move back to prospects' }));
    await waitFor(() => expect(ws.setStaffCustomerStage).toHaveBeenCalledWith('c1', 'prospect'));
    expect(await screen.findByRole('button', { name: 'Became a client' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Linked accounts' })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('a prospect of New Wave’s own gets "Became a client" and no accounts card until it is one', async () => {
    ws.listStaffCustomers.mockResolvedValue(staff);
    ws.getWorkspace.mockResolvedValue(workspace());
    ws.setStaffCustomerStage.mockResolvedValue({ id: 'c2', stage: 'client' });
    render(
      <MemoryRouter initialEntries={[groundswellAdminCustomerPath('c2')]}>
        <Routes>
          <Route path={`${GROUNDSWELL_ADMIN_CUSTOMERS_PATH}/:id`} element={<GroundswellCustomer />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('New Wave’s own')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Linked accounts' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Became a client' }));
    await waitFor(() => expect(ws.setStaffCustomerStage).toHaveBeenCalledWith('c2', 'client'));
    expect(await screen.findByRole('heading', { name: 'Linked accounts' })).toBeInTheDocument();
  });
});
