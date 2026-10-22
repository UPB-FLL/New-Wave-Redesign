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
  partnerSignOut: vi.fn(),
  setPartnerPassword: vi.fn(),
  getPartnerBranding: vi.fn(),
  savePartnerBranding: vi.fn(),
}));

vi.mock('../lib/groundswellPartner', async (orig) => ({ ...(await orig<typeof import('../lib/groundswellPartner')>()), ...api }));

import GroundswellCustomerPage from './pages/GroundswellCustomerPage';
import GroundswellCustomersPage from './pages/GroundswellCustomersPage';
import GroundswellSetPasswordPage from './pages/GroundswellSetPasswordPage';
import GroundswellSignInPage from './pages/GroundswellSignInPage';
import { LegacyAdminRedirect, LegacyPartnerRedirect } from './routes';
import {
  GROUNDSWELL_ADMIN_PATH,
  GROUNDSWELL_CUSTOMERS_PATH,
  GROUNDSWELL_PATH,
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
        <Route path={GROUNDSWELL_CUSTOMERS_PATH} element={<GroundswellCustomersPage />} />
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
  created_at: '2026-10-20T00:00:00Z', updated_at: '2026-10-20T00:00:00Z',
};

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.currentPartner.mockResolvedValue(null);
  api.getPartnerBranding.mockResolvedValue({ company: 'Reef Agency', branding: { display_name: null, logo_url: null }, available: true });
});

describe('Groundswell sign-in page', () => {
  it('signs partners in, links staff to their own sign-in, and carries the privacy notice', () => {
    renderPortal(GROUNDSWELL_PATH);
    expect(screen.getByRole('heading', { level: 1, name: 'Groundswell' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Partner sign-in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New Wave staff sign-in' })).toHaveAttribute('href', GROUNDSWELL_ADMIN_PATH);
    expect(screen.getByTestId('form-privacy-notice')).toHaveTextContent(/Signing in sends/);
    expect(screen.getByRole('link', { name: /Ask about partnering/ })).toHaveAttribute('href', '/social-engineering/contact-us');
    // No marketing chrome: the page is the product's front door, not a division page.
    expect(screen.queryByRole('link', { name: /Book a discovery call/ })).not.toBeInTheDocument();
  });

  it('signs in and opens the partner’s customers in the shell', async () => {
    api.partnerSignIn.mockResolvedValue(partner);
    api.currentPartner.mockResolvedValueOnce(null).mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    renderPortal(GROUNDSWELL_PATH);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@reef.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(api.partnerSignIn).toHaveBeenCalledWith('sam@reef.example', 'correct horse battery'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument();
    expect(screen.getByText('Reef Agency')).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Partner pages' })[0];
    expect(within(nav).getByRole('link', { name: 'Customers' })).toHaveAttribute('href', GROUNDSWELL_CUSTOMERS_PATH);
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

describe('partner customers page', () => {
  it('sends a signed-out visitor to sign in', async () => {
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    expect(await screen.findByRole('heading', { level: 1, name: 'Groundswell' })).toBeInTheDocument();
  });

  it('is noindex and lists the partner’s customers, most recent first, with status and last reports', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([
      { ...harbor, latest: { id: 'a1', status: 'done', kind: 'audit', created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z' }, last_reports_at: '2026-10-21T01:00:00Z', audit_count: 1 },
      { ...harbor, id: 'c2', business_name: 'Bay Bikes', city: null, latest: null, last_reports_at: null, audit_count: 0 },
      { ...harbor, id: 'c3', business_name: 'Reef Diner', latest: { id: 'a3', status: 'review', kind: 'audit', created_at: '2026-10-21T00:00:00Z', completed_at: null }, last_reports_at: null, audit_count: 1 },
    ]);
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    const table = await screen.findByRole('table', { name: 'Your customers' });
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
    fireEvent.click(screen.getByRole('button', { name: /Add a customer/ }));
    expect(screen.getByLabelText('Business name')).toBeInTheDocument();
  });

  it('opens the form for a first customer, checks it before sending, then adds it and opens its page', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    api.createPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: null, last_reports_at: null, audit_count: 1 }, audit: {} });
    api.getPartnerCustomer.mockResolvedValue({ customer: { ...harbor, latest: { id: 'a1', status: 'queued', kind: 'audit', created_at: '2026-10-21T00:00:00Z', completed_at: null }, last_reports_at: null, audit_count: 1 }, audits: [] });
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    expect(await screen.findByText('No customers yet. Add your first one above.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Harbor Auto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a website or an Instagram handle.');
    expect(api.createPartnerCustomer).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'harbor.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add and queue the audit' }));
    await waitFor(() => expect(api.createPartnerCustomer).toHaveBeenCalledWith(expect.objectContaining({ business_name: 'Harbor Auto', website: 'harbor.example' })));
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Queued');
    expect(screen.getByText('Waiting to start')).toBeInTheDocument();
  });

  it('sets the name and logo the reports carry, checking the logo link first', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    api.savePartnerBranding.mockImplementation(async (b: { display_name: string; logo_url: string }) => ({ company: 'Reef Agency', branding: b, available: true }));
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
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
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    expect(await screen.findByText(/Branding isn’t switched on yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save branding' })).toBeDisabled();
  });

  it('signs out from the shell', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerCustomers.mockResolvedValue([]);
    api.partnerSignOut.mockResolvedValue(undefined);
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(api.partnerSignOut).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { level: 1, name: 'Groundswell' })).toBeInTheDocument();
  });
});

describe('partner customer page', () => {
  it('shows the customer’s details and each audit with Drive links only', async () => {
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
      ],
    });
    renderPortal(groundswellCustomerPath('c1'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Harbor Auto' })).toBeInTheDocument();
    expect(robots()).toBe('noindex, nofollow');
    expect(screen.getByText('Miami')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'harbor.example' })).toHaveAttribute('href', 'https://harbor.example');
    const audits = within(screen.getByRole('list', { name: 'Audits of this customer' })).getAllByRole('listitem');
    expect(audits).toHaveLength(2);
    expect(within(audits[0]).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      'https://drive.google.com/file/d/S/view',
      'https://drive.google.com/file/d/B/view',
      'https://drive.google.com/drive/folders/F',
    ]);
    expect(within(audits[1]).getByText(/didn’t finish/)).toBeInTheDocument();
    expect(within(audits[1]).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All customers/ })).toHaveAttribute('href', GROUNDSWELL_CUSTOMERS_PATH);
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
  it('sends the Croissance partner URLs to Groundswell, keeping an invite link’s token', async () => {
    renderPortal(LEGACY_PARTNER_PATH);
    expect(await screen.findByRole('heading', { level: 1, name: 'Groundswell' })).toBeInTheDocument();
    renderPortal(`${LEGACY_PARTNER_PATH}/set-password?token=abc123`);
    expect(await screen.findByLabelText('New password')).toBeInTheDocument();
  });

  it('sends the content admin’s Groundswell pages to the staff section', async () => {
    renderPortal(`${LEGACY_ADMIN_PATH}/audits`);
    expect(await screen.findByText('staff audits')).toBeInTheDocument();
  });
});
