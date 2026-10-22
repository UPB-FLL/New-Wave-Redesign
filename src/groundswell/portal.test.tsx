import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  currentPartner: vi.fn(),
  partnerSignIn: vi.fn(),
  requestPartnerReset: vi.fn(),
  listPartnerCustomers: vi.fn(),
  getPartnerCustomer: vi.fn(),
  createPartnerCustomer: vi.fn(),
  updatePartnerCustomer: vi.fn(),
  setPartnerCustomerStage: vi.fn(),
  listClientAccounts: vi.fn(),
  linkClientAccount: vi.fn(),
  unlinkClientAccount: vi.fn(),
  partnerSignOut: vi.fn(),
  setPartnerPassword: vi.fn(),
  getPartnerBranding: vi.fn(),
  savePartnerBranding: vi.fn(),
  partnerReportUrl: vi.fn(),
}));

const ws = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  startPhase: vi.fn(),
  runFiles: vi.fn(),
  reportUrl: vi.fn(),
  listStaffCustomers: vi.fn(),
}));

vi.mock('../lib/groundswellPartner', async (orig) => ({ ...(await orig<typeof import('../lib/groundswellPartner')>()), ...api }));
vi.mock('../lib/groundswellWorkspace', async (orig) => ({ ...(await orig<typeof import('../lib/groundswellWorkspace')>()), ...ws }));

import GroundswellCustomerPage, { AccountsCard } from './pages/GroundswellCustomerPage';
import { GroundswellClientsPage, GroundswellProspectsPage } from './pages/GroundswellCustomersPage';
import GroundswellSetPasswordPage from './pages/GroundswellSetPasswordPage';
import GroundswellSignInPage from './pages/GroundswellSignInPage';
import { LegacyAdminRedirect, LegacyPartnerRedirect } from './routes';
import {
  GROUNDSWELL_ADMIN_PATH,
  GROUNDSWELL_CLIENTS_PATH,
  GROUNDSWELL_CUSTOMERS_PATH,
  GROUNDSWELL_PATH,
  GROUNDSWELL_PROSPECTS_PATH,
  GROUNDSWELL_SET_PASSWORD_PATH,
  groundswellCustomerPath,
  LEGACY_ADMIN_PATH,
  LEGACY_PARTNER_PATH,
} from './site';

function renderPortal(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={GROUNDSWELL_PATH} element={<GroundswellSignInPage />} />
        <Route path={GROUNDSWELL_PROSPECTS_PATH} element={<GroundswellProspectsPage />} />
        <Route path={GROUNDSWELL_CLIENTS_PATH} element={<GroundswellClientsPage />} />
        <Route path={GROUNDSWELL_CUSTOMERS_PATH} element={<p>customers redirect</p>} />
        <Route path={`${GROUNDSWELL_CUSTOMERS_PATH}/:id`} element={<GroundswellCustomerPage />} />
        <Route path={GROUNDSWELL_SET_PASSWORD_PATH} element={<GroundswellSetPasswordPage />} />
        <Route path={GROUNDSWELL_ADMIN_PATH} element={<p>staff sign-in</p>} />
        <Route path={`${GROUNDSWELL_ADMIN_PATH}/audits`} element={<p>staff audits</p>} />
        <Route path={LEGACY_PARTNER_PATH} element={<LegacyPartnerRedirect to="sign-in" />} />
        <Route path={`${LEGACY_PARTNER_PATH}/dashboard`} element={<LegacyPartnerRedirect to="customers" />} />
        <Route path={`${LEGACY_PARTNER_PATH}/set-password`} element={<LegacyPartnerRedirect to="set-password" />} />
        <Route path={`${LEGACY_ADMIN_PATH}/*`} element={<LegacyAdminRedirect />} />
      </Routes>
    </MemoryRouter>
  );
}

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');
const partner = { company: 'Reef Agency', contact_name: null, email: 'sam@reef.example' };
const harbor = {
  id: 'c1', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], notes: null,
  created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z', stage: 'prospect' as const, became_client_at: null,
};

const phasesOf = (runs: Partial<Record<'audit' | 'competitors' | 'integrated', unknown[]>> = {}, start: Partial<Record<string, { allowed: boolean; reason: string }>> = {}) => ({
  customer: { id: 'c1', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, partner_id: 'p1' },
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

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(ws).forEach((fn) => fn.mockReset());
  ws.getWorkspace.mockResolvedValue(phasesOf());
  ws.runFiles.mockResolvedValue([]);
  api.currentPartner.mockResolvedValue(null);
  api.getPartnerBranding.mockResolvedValue({ company: 'Reef Agency', branding: { display_name: null, logo_url: null }, available: true });
  api.listClientAccounts.mockResolvedValue({ accounts: accountsOf(), available: true });
});

const SERVICES = [
  ['google_analytics', 'Google Analytics 4'],
  ['google_search_console', 'Google Search Console'],
  ['googleads', 'Google Ads'],
  ['instagram', 'Instagram'],
  ['metaads', 'Meta Ads'],
] as const;
const accountsOf = (over: Record<string, Partial<{ status: string; reason: string | null; linked_at: string | null }>> = {}) =>
  SERVICES.map(([service, label]) => ({ service, label, brings: `${label} data.`, status: 'none', linked_at: null, reason: null, ...over[service] }));

describe('Groundswell sign-in page', () => {
  it('signs partners in, links staff to their own sign-in, and carries the privacy notice', () => {
    renderPortal(GROUNDSWELL_PATH);
    expect(screen.getByRole('heading', { level: 1, name: 'Built to move people.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Partner sign-in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New Wave staff sign-in' })).toHaveAttribute('href', GROUNDSWELL_ADMIN_PATH);
    expect(screen.getByTestId('form-privacy-notice')).toHaveTextContent(/Signing in sends/);
    expect(screen.getByRole('link', { name: /Ask about partnering/ })).toHaveAttribute('href', '/social-engineering/contact-us');
    // No marketing chrome: the page is the product's front door, not a division page.
    expect(screen.queryByRole('link', { name: /Book a discovery call/ })).not.toBeInTheDocument();
  });

  it('signs in and opens the partner’s prospects in the shell, with Prospects and Clients in the navigation', async () => {
    api.partnerSignIn.mockResolvedValue(partner);
    api.currentPartner.mockResolvedValueOnce(null).mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    renderPortal(GROUNDSWELL_PATH);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@reef.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(api.partnerSignIn).toHaveBeenCalledWith('sam@reef.example', 'correct horse battery'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Prospects' })).toBeInTheDocument();
    expect(screen.getByText('Reef Agency')).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Partner pages' })[0];
    expect(within(nav).getByRole('link', { name: 'Prospects' })).toHaveAttribute('href', GROUNDSWELL_PROSPECTS_PATH);
    expect(within(nav).getByRole('link', { name: 'Clients' })).toHaveAttribute('href', GROUNDSWELL_CLIENTS_PATH);
    expect(api.listPartnerCustomers).toHaveBeenCalledWith('prospect');
  });

  it('shows the sign-in error and offers a reset link', async () => {
    api.partnerSignIn.mockRejectedValue(new Error('That email and password do not match an active partner account.'));
    api.requestPartnerReset.mockResolvedValue('If that email belongs to a partner account, a reset link is on its way.');
    renderPortal(GROUNDSWELL_PATH);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@reef.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong one here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match');
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Email me a reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('reset link is on its way');
  });
});

describe('partner prospects page', () => {
  it('sends a signed-out visitor to sign in', async () => {
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    expect(await screen.findByRole('heading', { level: 1, name: 'Built to move people.' })).toBeInTheDocument();
  });

  it('is noindex and lists the partner’s prospects, most recent first, with status and last reports', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([
      { ...harbor, latest: { id: 'a1', status: 'done', kind: 'audit', created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z' }, last_reports_at: '2026-10-21T01:00:00Z', audit_count: 1 },
      { ...harbor, id: 'c2', business_name: 'Bay Bikes', city: null, latest: null, last_reports_at: null, audit_count: 0 },
      { ...harbor, id: 'c3', business_name: 'Reef Diner', latest: { id: 'a3', status: 'review', kind: 'audit', created_at: '2026-10-21T00:00:00Z', completed_at: null }, last_reports_at: null, audit_count: 1 },
    ]);
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    const table = await screen.findByRole('table', { name: 'Your prospects' });
    expect(robots()).toBe('noindex, nofollow');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('link').getAttribute('href'))).toEqual([groundswellCustomerPath('c1'), groundswellCustomerPath('c2'), groundswellCustomerPath('c3')]);
    expect(within(rows[0]).getByText('Reports ready')).toBeInTheDocument();
    expect(within(rows[0]).getByText('10/21/2026')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Not started')).toBeInTheDocument();
    // Held before delivery while a person checks the figures; no reason is shown to a partner.
    expect(within(rows[2]).getByText('In review')).toBeInTheDocument();
    // With customers listed, the form waits behind the one primary action.
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add a prospect/ }));
    expect(screen.getByLabelText('Business name')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Add a prospect' })).toBeInTheDocument();
  });

  it('recovers a failed directory read without leaving a loading state or showing empty counts', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockRejectedValueOnce(new Error('The directory is unavailable.')).mockResolvedValue([{ ...harbor, latest: null, last_reports_at: null, audit_count: 0 }]);
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    expect(await screen.findByRole('alert')).toHaveTextContent('The directory is unavailable.');
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Your prospects' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('searches a short directory and can clear a search with no matches', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([{ ...harbor, latest: null, last_reports_at: null, audit_count: 0 }]);
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    const search = await screen.findByRole('searchbox', { name: 'Search prospects' });
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.getByText('Nothing matches “missing”.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('table', { name: 'Your prospects' })).toBeInTheDocument();
    expect(search).toHaveValue('');
  });

  it('opens the form for a first prospect, checks it before sending, then adds it and opens its page', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    api.createPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: null, last_reports_at: null, audit_count: 1 }, audit: {} });
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: { id: 'a1', status: 'queued', kind: 'audit', created_at: '2026-10-21T00:00:00Z', completed_at: null }, last_reports_at: null, audit_count: 1 }, audits: [] });
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    expect(await screen.findByText('No prospects yet. Add your first one above.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Harbor Auto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a website or an Instagram handle.');
    expect(api.createPartnerCustomer).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'harbor.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' }));
    await waitFor(() => expect(api.createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Harbor Auto', website: 'harbor.example', stage: 'prospect' })));
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Queued');
    expect(screen.getByText('Waiting to start')).toBeInTheDocument();
  });

  it('sets the name and logo the reports carry, checking the logo link first', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    api.savePartnerBranding.mockImplementation(async (b: { display_name: string; logo_url: string }) => ({ company: 'Reef Agency', branding: b, available: true }));
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    const panel = within((await screen.findByRole('heading', { name: 'Your branding' })).closest('form')!);
    expect(panel.getByText(/Preview: Prepared by Reef Agency/)).toBeInTheDocument();
    fireEvent.change(panel.getByLabelText('Name on your reports'), { target: { value: 'Reef Growth Co' } });
    fireEvent.change(panel.getByLabelText('Logo link'), { target: { value: 'http://reef.example/logo.png' } });
    fireEvent.click(panel.getByRole('button', { name: 'Save branding' }));
    expect(await panel.findByRole('alert')).toHaveTextContent('must start with https://');
    expect(api.savePartnerBranding).not.toHaveBeenCalled();
    fireEvent.change(panel.getByLabelText('Logo link'), { target: { value: 'https://reef.example/logo.png' } });
    fireEvent.click(panel.getByRole('button', { name: 'Save branding' }));
    await waitFor(() => expect(api.savePartnerBranding).toHaveBeenCalledWith({ display_name: 'Reef Growth Co', logo_url: 'https://reef.example/logo.png' }));
    expect(await panel.findByRole('status')).toHaveTextContent('Saved');
    expect(panel.getByText(/Preview: Prepared by Reef Growth Co/)).toBeInTheDocument();
  });

  it('says branding is not on yet before the database supports it', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    api.getPartnerBranding.mockResolvedValue({ company: 'Reef Agency', branding: { display_name: null, logo_url: null }, available: false });
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    expect(await screen.findByText(/Branding isn’t switched on yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save branding' })).toBeDisabled();
  });

  it('signs out from the shell', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    api.partnerSignOut.mockResolvedValue(undefined);
    renderPortal(GROUNDSWELL_PROSPECTS_PATH);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(api.partnerSignOut).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { level: 1, name: 'Built to move people.' })).toBeInTheDocument();
  });
});

describe('partner customer page', () => {
  it('shows the customer’s details, its three phases with their reports, and only Drive-era audits below', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.getPartnerCustomer.mockResolvedValue({
      customer: { ...harbor, latest: { id: 'a1', status: 'done', kind: 'benchmark', created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z' }, last_reports_at: '2026-10-21T01:00:00Z', audit_count: 2 },
      audits: [
        {
          id: 'a1', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], status: 'done', kind: 'benchmark',
          drive_folder_url: 'https://drive.google.com/drive/folders/F', summary_pdf_url: 'https://drive.google.com/file/d/S/view', benchmark_pdf_url: 'https://drive.google.com/file/d/B/view',
          deck_pdf_url: 'https://example.com/not-drive', audit_pdf_url: null, created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z',
        },
        { id: 'a0', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], status: 'failed', drive_folder_url: null, summary_pdf_url: null, deck_pdf_url: null, audit_pdf_url: null, created_at: '2026-10-01T00:00:00Z', completed_at: null },
        {
          id: 'a2', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], status: 'done', kind: 'audit',
          drive_folder_url: null, summary_pdf_url: null, deck_pdf_url: null, audit_pdf_url: null, created_at: '2026-10-22T00:00:00Z', completed_at: '2026-10-22T01:00:00Z',
          reports: [{ kind: 'summary', name: 's.pdf', pages: 1 }, { kind: 'deck', name: 'd.pdf', pages: 12 }, { kind: 'audit', name: 'a.pdf', pages: 20 }],
        },
      ],
    });
    const delivered = {
      id: 'a2', status: 'done', kind: 'audit', created_at: '2026-10-22T00:00:00Z', started_at: '2026-10-22T00:00:00Z', completed_at: '2026-10-22T01:00:00Z',
      steps: [{ step: 'site', status: 'done' }, { step: 'deliver_finish', status: 'done' }],
      reports: [{ kind: 'summary', name: 's.pdf', pages: 1 }, { kind: 'deck', name: 'd.pdf', pages: 12 }, { kind: 'audit', name: 'a.pdf', pages: 20 }],
      files: [],
    };
    ws.getWorkspace.mockResolvedValue(phasesOf({ audit: [delivered] }, { competitors: { allowed: true, reason: 'Builds on the audit of Oct 22.' } }));
    ws.reportUrl.mockResolvedValue('https://storage.example/signed/a2/deck');
    const opened = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderPortal(groundswellCustomerPath('c1'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(robots()).toBe('noindex, nofollow');
    expect(screen.getByText('Miami')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'harbor.example' })).toHaveAttribute('href', 'https://harbor.example');
    expect(screen.getByRole('heading', { level: 2, name: 'Phases' })).toBeInTheDocument();
    const cards = within(await screen.findByRole('list', { name: 'Phases' })).getAllByRole('button');
    expect(cards.map((b) => b.getAttribute('data-phase'))).toEqual(['audit', 'competitors', 'integrated']);
    expect(ws.getWorkspace).toHaveBeenCalledWith('partner', 'c1');
    // The furthest phase with a run is open: phase 1, delivered, with its reports.
    expect(cards[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 3, name: 'Phase 1 · The audit' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Slides \(PDF\)/ }));
    await waitFor(() => expect(opened).toHaveBeenCalledWith('https://storage.example/signed/a2/deck', '_blank', 'noopener'));
    expect(ws.reportUrl).toHaveBeenCalledWith('partner', 'a2', 'deck');
    opened.mockRestore();
    // Phase 2 can start; phase 3 says why it cannot.
    fireEvent.click(cards[1]);
    expect(screen.getByRole('button', { name: /Start phase 2/ })).toBeInTheDocument();
    fireEvent.click(cards[2]);
    expect(screen.queryByRole('button', { name: /Start phase 3/ })).not.toBeInTheDocument();
    expect(screen.getByText('Waiting on the phase before it.')).toBeInTheDocument();
    // Only the audit delivered to Drive is listed below, with its Drive links only.
    expect(screen.getByRole('heading', { level: 2, name: 'Earlier audits (Google Drive)' })).toBeInTheDocument();
    const legacy = within(screen.getByRole('list', { name: 'Earlier audits of this customer' })).getAllByRole('listitem');
    expect(legacy).toHaveLength(1);
    expect(within(legacy[0]).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      'https://drive.google.com/file/d/S/view',
      'https://drive.google.com/file/d/B/view',
      'https://drive.google.com/drive/folders/F',
    ]);
    expect(screen.getByRole('link', { name: /All prospects/ })).toHaveAttribute('href', GROUNDSWELL_PROSPECTS_PATH);
    expect(screen.getByText('Prospect')).toBeInTheDocument();
  });

  it('starts a phase from its card and says it starts on its own', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: null, last_reports_at: null, audit_count: 0 }, audits: [] });
    ws.getWorkspace.mockResolvedValue(phasesOf({}, { audit: { allowed: true, reason: 'Reads the business’s public data.' } }));
    ws.startPhase.mockResolvedValue({ queued: 'a9', reason: 'Phase 1 is queued.' });
    renderPortal(groundswellCustomerPath('c1'));
    fireEvent.click(await screen.findByRole('button', { name: /Start phase 1/ }));
    await waitFor(() => expect(ws.startPhase).toHaveBeenCalledWith('partner', 'c1', 'audit'));
    expect(await screen.findByRole('status')).toHaveTextContent('Phase 1 is queued. It starts on its own within a minute');
    expect(ws.getWorkspace).toHaveBeenCalledTimes(2);
  });

  it('"Became a client" moves the record over, keeping its phases, and the way back is one click', async () => {
    api.currentPartner.mockResolvedValue(partner);
    const audits = [{ id: 'a1', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], status: 'done', kind: 'audit', drive_folder_url: null, summary_pdf_url: null, deck_pdf_url: null, audit_pdf_url: null, created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z', reports: [{ kind: 'audit', name: 'a.pdf', pages: 20 }] }];
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: null, last_reports_at: null, audit_count: 1 }, audits, stages_available: true });
    const run = { id: 'a1', status: 'done', kind: 'audit', created_at: '2026-10-21T00:00:00Z', started_at: null, completed_at: '2026-10-21T01:00:00Z', steps: [], reports: [{ kind: 'audit', name: 'a.pdf', pages: 20 }], files: [] };
    ws.getWorkspace.mockResolvedValue(phasesOf({ audit: [run] }));
    api.setPartnerCustomerStage.mockImplementation(async (_id: string, stage: 'prospect' | 'client') => ({ ...harbor, stage, became_client_at: stage === 'client' ? '2026-10-22T00:00:00Z' : null, latest: null, last_reports_at: null, audit_count: 1 }));
    renderPortal(groundswellCustomerPath('c1'));
    fireEvent.click(await screen.findByRole('button', { name: 'Became a client' }));
    await waitFor(() => expect(api.setPartnerCustomerStage).toHaveBeenCalledWith('c1', 'client'));
    expect(await screen.findByRole('status')).toHaveTextContent('Now a client. Everything gathered as a prospect stays here.');
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All clients/ })).toHaveAttribute('href', GROUNDSWELL_CLIENTS_PATH);
    // The scraped audit is still on the page, as phase 1.
    expect(await screen.findByRole('heading', { level: 3, name: 'Phase 1 · The audit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Full audit \(PDF\)/ })).toBeInTheDocument();
    // No Drive-era audits, so no list of them.
    expect(screen.queryByRole('list', { name: 'Earlier audits of this customer' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move back to prospects' }));
    await waitFor(() => expect(api.setPartnerCustomerStage).toHaveBeenLastCalledWith('c1', 'prospect'));
    expect(await screen.findByRole('button', { name: 'Became a client' })).toBeInTheDocument();
  });

  it('offers no move before the database has stages', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: null, last_reports_at: null, audit_count: 0 }, audits: [], stages_available: false });
    renderPortal(groundswellCustomerPath('c1'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Became a client/ })).not.toBeInTheDocument();
  });

  it('edits the details in place', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: null, last_reports_at: null, audit_count: 0 }, audits: [] });
    api.updatePartnerCustomer.mockImplementation(async (_id: string, draft: { city: string }) => ({ ...harbor, city: draft.city, latest: null, last_reports_at: null, audit_count: 0 }));
    renderPortal(groundswellCustomerPath('c1'));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.queryByLabelText('Logo link')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Fort Lauderdale' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save details' }));
    await waitFor(() => expect(api.updatePartnerCustomer).toHaveBeenCalledWith('c1', expect.objectContaining({ city: 'Fort Lauderdale' })));
    expect(await screen.findByRole('status')).toHaveTextContent('Details saved.');
    expect(screen.getByText('Fort Lauderdale')).toBeInTheDocument();
  });

  it('says when a customer is not in the account', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.getPartnerCustomer.mockRejectedValue(new Error('That customer is not in your account.'));
    renderPortal(groundswellCustomerPath('nope'));
    expect(await screen.findByRole('alert')).toHaveTextContent('not in your account');
  });
});

describe('a client’s linked accounts', () => {
  const client = { ...harbor, stage: 'client' as const, became_client_at: '2026-10-22T00:00:00Z', latest: null, last_reports_at: null, audit_count: 0 };

  it('shows every service with its state on a client’s page only, and starts the sign-in from a Link button', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.getPartnerCustomer.mockResolvedValue({ customer: client, audits: [], stages_available: true });
    api.listClientAccounts.mockResolvedValue({ accounts: accountsOf({ googleads: { status: 'active', linked_at: '2026-10-22T00:00:00Z' }, instagram: { status: 'failed', reason: 'The sign-in did not finish. Try linking the account again.' } }), available: true });
    api.linkClientAccount.mockResolvedValue({ redirect_url: 'https://connect.composio.example/go', accounts: accountsOf() });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } });
    renderPortal(groundswellCustomerPath('c1'));
    const list = await screen.findByRole('list', { name: 'Accounts' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    expect(within(rows[2]).getByText('Linked')).toBeInTheDocument();
    expect(within(rows[2]).getByRole('button', { name: 'Unlink Google Ads' })).toBeInTheDocument();
    expect(within(rows[3]).getByText('Sign-in failed')).toBeInTheDocument();
    expect(within(rows[3]).getByText(/did not finish/)).toBeInTheDocument();
    expect(within(rows[3]).getByRole('button', { name: 'Link again Instagram' })).toBeInTheDocument();
    fireEvent.click(within(rows[0]).getByRole('button', { name: 'Link Google Analytics 4' }));
    await waitFor(() => expect(api.linkClientAccount).toHaveBeenCalledWith('c1', 'google_analytics'));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://connect.composio.example/go'));
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('keeps the accounts off a prospect’s page', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: null, last_reports_at: null, audit_count: 0 }, audits: [], stages_available: true });
    renderPortal(groundswellCustomerPath('c1'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Linked accounts' })).not.toBeInTheDocument();
    expect(api.listClientAccounts).not.toHaveBeenCalled();
  });

  it('back from the sign-in, keeps asking until the account is linked, then unlinks on request', async () => {
    api.listClientAccounts
      .mockResolvedValueOnce({ accounts: accountsOf({ googleads: { status: 'pending' } }), available: true })
      .mockResolvedValueOnce({ accounts: accountsOf({ googleads: { status: 'pending' } }), available: true })
      .mockResolvedValue({ accounts: accountsOf({ googleads: { status: 'active', linked_at: '2026-10-22T00:00:00Z' } }), available: true });
    api.unlinkClientAccount.mockResolvedValue(accountsOf());
    render(
      <MemoryRouter initialEntries={[`${groundswellCustomerPath('c1')}?linked=googleads`]}>
        <Routes>
          <Route path={`${GROUNDSWELL_CUSTOMERS_PATH}/:id`} element={<AccountsCard customerId="c1" poll={10} />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText(/Back from the sign-in/)).toBeInTheDocument();
    expect(await screen.findByText('Waiting for sign-in')).toBeInTheDocument();
    expect(await screen.findByText('Linked')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Linked.');
    fireEvent.click(screen.getByRole('button', { name: 'Unlink Google Ads' }));
    await waitFor(() => expect(api.unlinkClientAccount).toHaveBeenCalledWith('c1', 'googleads'));
    expect(await screen.findByText('Unlinked.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link Google Ads' })).toBeInTheDocument();
  });

  it('says when linking is not switched on', async () => {
    api.listClientAccounts.mockResolvedValue({ accounts: accountsOf(), available: false });
    render(
      <MemoryRouter initialEntries={[groundswellCustomerPath('c1')]}>
        <Routes>
          <Route path={`${GROUNDSWELL_CUSTOMERS_PATH}/:id`} element={<AccountsCard customerId="c1" />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText(/isn’t switched on yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link Google Ads' })).toBeDisabled();
  });
});

describe('partner clients page', () => {
  it('lists only the clients, and points at the prospects when there are none', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    renderPortal(GROUNDSWELL_CLIENTS_PATH);
    expect(await screen.findByRole('heading', { level: 1, name: 'Clients' })).toBeInTheDocument();
    expect(api.listPartnerCustomers).toHaveBeenCalledWith('client');
    expect(screen.getByText(/No clients yet\. Open a prospect and choose/)).toBeInTheDocument();
    // No form until asked, and no branding panel (it lives with the prospects).
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your branding' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add a client/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Add a client' })).toBeInTheDocument();
    api.createPartnerCustomer.mockResolvedValue({ customer: { ...harbor, stage: 'client', latest: null, last_reports_at: null, audit_count: 1 }, audit: {} });
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, stage: 'client', latest: null, last_reports_at: null, audit_count: 1 }, audits: [], stages_available: true });
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Harbor Auto' } });
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'harbor.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' }));
    await waitFor(() => expect(api.createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ stage: 'client' })));
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
  });

  it('shows the clients with their status', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([{ ...harbor, stage: 'client', became_client_at: '2026-10-22T00:00:00Z', latest: { id: 'a1', status: 'done', kind: 'audit', created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z' }, last_reports_at: '2026-10-21T01:00:00Z', audit_count: 1 }]);
    renderPortal(GROUNDSWELL_CLIENTS_PATH);
    const table = await screen.findByRole('table', { name: 'Your clients' });
    expect(within(table).getByRole('link', { name: 'Harbor Auto' })).toHaveAttribute('href', groundswellCustomerPath('c1'));
    expect(within(table).getByText('Reports ready')).toBeInTheDocument();
  });
});

describe('set-password page', () => {
  it('saves a matching password from the link’s token', async () => {
    api.setPartnerPassword.mockResolvedValue(undefined);
    renderPortal(`${GROUNDSWELL_SET_PASSWORD_PATH}?token=abc123`);
    expect(robots()).toBe('noindex, nofollow');
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'a long passphrase' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'a different one!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('don’t match');
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'a long passphrase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await waitFor(() => expect(api.setPartnerPassword).toHaveBeenCalledWith('abc123', 'a long passphrase'));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', GROUNDSWELL_PATH);
  });

  it('explains when the link is missing its token', () => {
    renderPortal(GROUNDSWELL_SET_PASSWORD_PATH);
    expect(screen.getByRole('alert')).toHaveTextContent('needs the link from your invite or reset email');
  });
});

describe('old addresses', () => {
  it('sends the GroundSwell partner URLs to Groundswell, keeping an invite link’s token', async () => {
    renderPortal(LEGACY_PARTNER_PATH);
    expect(await screen.findByRole('heading', { level: 1, name: 'Built to move people.' })).toBeInTheDocument();
    renderPortal(`${LEGACY_PARTNER_PATH}/set-password?token=abc123`);
    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
  });

  it('sends the content admin’s Groundswell pages to the staff section', async () => {
    renderPortal(`${LEGACY_ADMIN_PATH}/audits`);
    expect(await screen.findByText('staff audits')).toBeInTheDocument();
  });
});
