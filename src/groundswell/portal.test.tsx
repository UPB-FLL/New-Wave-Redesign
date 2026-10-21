import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  currentPartner: vi.fn(),
  partnerSignIn: vi.fn(),
  requestPartnerReset: vi.fn(),
  listPartnerAudits: vi.fn(),
  submitPartnerAudit: vi.fn(),
  partnerSignOut: vi.fn(),
  setPartnerPassword: vi.fn(),
  getPartnerBranding: vi.fn(),
  savePartnerBranding: vi.fn(),
}));

vi.mock('../lib/groundswellPartner', async (orig) => ({ ...(await orig<typeof import('../lib/groundswellPartner')>()), ...api }));

import GroundswellCustomersPage from './pages/GroundswellCustomersPage';
import GroundswellSetPasswordPage from './pages/GroundswellSetPasswordPage';
import GroundswellSignInPage from './pages/GroundswellSignInPage';
import { LegacyAdminRedirect, LegacyPartnerRedirect } from './routes';
import {
  GROUNDSWELL_ADMIN_PATH,
  GROUNDSWELL_CUSTOMERS_PATH,
  GROUNDSWELL_PATH,
  GROUNDSWELL_SET_PASSWORD_PATH,
  LEGACY_ADMIN_PATH,
  LEGACY_PARTNER_PATH,
} from './site';

function renderPortal(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={GROUNDSWELL_PATH} element={<GroundswellSignInPage />} />
        <Route path={GROUNDSWELL_CUSTOMERS_PATH} element={<GroundswellCustomersPage />} />
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
    api.listPartnerAudits.mockResolvedValue([]);
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

  it('is noindex and lists the partner’s customers with Drive links only', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerAudits.mockResolvedValue([
      {
        id: 'a1', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], status: 'done',
        drive_folder_url: 'https://drive.google.com/drive/folders/F', summary_pdf_url: 'https://drive.google.com/file/d/S/view',
        deck_pdf_url: 'https://example.com/not-drive', audit_pdf_url: null, created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z',
      },
    ]);
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    const list = await screen.findByRole('list', { name: 'Your customers' });
    expect(robots()).toBe('noindex, nofollow');
    expect(within(list).getByText('Reports ready')).toBeInTheDocument();
    expect(within(list).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      'https://drive.google.com/file/d/S/view',
      'https://drive.google.com/drive/folders/F',
    ]);
    // With customers listed, the form waits behind the one primary action.
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add a customer/ }));
    expect(screen.getByLabelText('Business name')).toBeInTheDocument();
  });

  it('opens the form for a first customer, checks it before sending, then queues it', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerAudits.mockResolvedValue([]);
    api.submitPartnerAudit.mockResolvedValue({ business_name: 'Harbor Auto' });
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    fireEvent.change(await screen.findByLabelText('Business name'), { target: { value: 'Harbor Auto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Queue the audit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a website or an Instagram handle.');
    expect(api.submitPartnerAudit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'harbor.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Queue the audit' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Harbor Auto is queued');
  });

  it('sets the name and logo the reports carry, checking the logo link first', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerAudits.mockResolvedValue([]);
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
    api.listPartnerAudits.mockResolvedValue([]);
    api.getPartnerBranding.mockResolvedValue({ company: 'Reef Agency', branding: { display_name: null, logo_url: null }, available: false });
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    expect(await screen.findByText(/Branding isn’t switched on yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save branding' })).toBeDisabled();
  });

  it('signs out from the shell', async () => {
    api.currentPartner.mockResolvedValue(partner);
    api.listPartnerAudits.mockResolvedValue([]);
    api.partnerSignOut.mockResolvedValue(undefined);
    renderPortal(GROUNDSWELL_CUSTOMERS_PATH);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(api.partnerSignOut).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { level: 1, name: 'Groundswell' })).toBeInTheDocument();
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
