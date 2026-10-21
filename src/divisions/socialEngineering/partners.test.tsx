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
}));

vi.mock('../../lib/groundswellPartner', async (orig) => ({ ...(await orig<typeof import('../../lib/groundswellPartner')>()), ...api }));

import SocialEngineeringPartnerAppPage from './pages/SocialEngineeringPartnerAppPage';
import SocialEngineeringPartnersPage from './pages/SocialEngineeringPartnersPage';
import { partnersPageSeo } from './seo';
import { DIVISION_PARTNER_DASHBOARD_PATH, DIVISION_PARTNERS_PATH, DIVISION_PARTNER_SET_PASSWORD_PATH } from './site';

function renderPortal(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={DIVISION_PARTNERS_PATH} element={<SocialEngineeringPartnersPage />} />
        <Route path={DIVISION_PARTNER_DASHBOARD_PATH} element={<SocialEngineeringPartnerAppPage view="dashboard" />} />
        <Route path={DIVISION_PARTNER_SET_PASSWORD_PATH} element={<SocialEngineeringPartnerAppPage view="set-password" />} />
      </Routes>
    </MemoryRouter>
  );
}

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content');

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.currentPartner.mockResolvedValue(null);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

describe('partner portal sign-in page', () => {
  it('is indexable, sits under Croissance, and carries the privacy notice', () => {
    renderPortal(DIVISION_PARTNERS_PATH);
    expect(screen.getByRole('heading', { level: 1, name: 'Croissance partner portal' })).toBeInTheDocument();
    expect(robots()).toBe('index, follow');
    expect(partnersPageSeo().breadcrumbs.map((c) => c.name)).toEqual(['NW Social Engineering', 'Croissance', 'Partner portal']);
    expect(screen.getByTestId('form-privacy-notice')).toHaveTextContent(/Signing in sends/);
    expect(screen.getByRole('link', { name: /Ask about partnering/ })).toHaveAttribute('href', '/social-engineering/contact-us');
  });

  it('signs in and opens the dashboard', async () => {
    api.partnerSignIn.mockResolvedValue({ company: 'Reef Agency', contact_name: null, email: 'sam@reef.example' });
    api.currentPartner.mockResolvedValueOnce(null).mockResolvedValue({ company: 'Reef Agency', contact_name: null, email: 'sam@reef.example' });
    api.listPartnerAudits.mockResolvedValue([]);
    renderPortal(DIVISION_PARTNERS_PATH);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@reef.example' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(api.partnerSignIn).toHaveBeenCalledWith('sam@reef.example', 'correct horse battery'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Reef Agency' })).toBeInTheDocument();
  });

  it('shows the sign-in error and offers a reset link', async () => {
    api.partnerSignIn.mockRejectedValue(new Error('That email and password do not match an active partner account.'));
    api.requestPartnerReset.mockResolvedValue('If that email belongs to a partner account, a reset link is on its way.');
    renderPortal(DIVISION_PARTNERS_PATH);
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

describe('partner dashboard', () => {
  it('sends a signed-out visitor to sign in', async () => {
    renderPortal(DIVISION_PARTNER_DASHBOARD_PATH);
    expect(await screen.findByRole('heading', { level: 1, name: 'Croissance partner portal' })).toBeInTheDocument();
  });

  it('is noindex and lists the partner’s audits with Drive links only', async () => {
    api.currentPartner.mockResolvedValue({ company: 'Reef Agency', contact_name: null, email: 'sam@reef.example' });
    api.listPartnerAudits.mockResolvedValue([
      {
        id: 'a1', business_name: 'Harbor Auto', city: 'Miami', website: 'https://harbor.example', instagram: null, competitors: [], status: 'done',
        drive_folder_url: 'https://drive.google.com/drive/folders/F', summary_pdf_url: 'https://drive.google.com/file/d/S/view',
        deck_pdf_url: 'https://example.com/not-drive', audit_pdf_url: null, created_at: '2026-10-21T00:00:00Z', completed_at: '2026-10-21T01:00:00Z',
      },
    ]);
    renderPortal(DIVISION_PARTNER_DASHBOARD_PATH);
    const list = await screen.findByRole('list', { name: 'Your audits' });
    expect(robots()).toBe('noindex, nofollow');
    expect(within(list).getByText('Reports ready')).toBeInTheDocument();
    expect(within(list).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual([
      'https://drive.google.com/file/d/S/view',
      'https://drive.google.com/drive/folders/F',
    ]);
  });

  it('checks a submission before sending it, then queues it', async () => {
    api.currentPartner.mockResolvedValue({ company: 'Reef Agency', contact_name: null, email: 'sam@reef.example' });
    api.listPartnerAudits.mockResolvedValue([]);
    api.submitPartnerAudit.mockResolvedValue({ business_name: 'Harbor Auto' });
    renderPortal(DIVISION_PARTNER_DASHBOARD_PATH);
    fireEvent.change(await screen.findByLabelText('Business name'), { target: { value: 'Harbor Auto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Queue the audit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a website or an Instagram handle.');
    expect(api.submitPartnerAudit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Website'), { target: { value: 'harbor.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Queue the audit' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Harbor Auto is queued');
  });
});

describe('set-password page', () => {
  it('saves a matching password from the link’s token', async () => {
    api.setPartnerPassword.mockResolvedValue(undefined);
    renderPortal(`${DIVISION_PARTNER_SET_PASSWORD_PATH}?token=abc123`);
    expect(robots()).toBe('noindex, nofollow');
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'a long passphrase' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'a different one!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('don’t match');
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'a long passphrase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
    await waitFor(() => expect(api.setPartnerPassword).toHaveBeenCalledWith('abc123', 'a long passphrase'));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', DIVISION_PARTNERS_PATH);
  });

  it('explains when the link is missing its token', () => {
    renderPortal(DIVISION_PARTNER_SET_PASSWORD_PATH);
    expect(screen.getByRole('alert')).toHaveTextContent('needs the link from your invite or reset email');
  });
});
