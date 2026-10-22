import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({
  getSetupStatus: vi.fn(),
  listAudits: vi.fn(),
  listPartners: vi.fn(),
  invitePartner: vi.fn(),
  updatePartner: vi.fn(),
}));

vi.mock('../../lib/groundswell', async (orig) => ({ ...(await orig<typeof import('../../lib/groundswell')>()), ...lib }));

import GroundswellOverview from './GroundswellOverview';
import GroundswellPartners from './GroundswellPartners';

const partner = (over = {}) => ({
  id: 'p1', company: 'Reef Agency', contact_name: 'Sam', email: 'sam@reef.example', status: 'active' as const, notes: null,
  created_at: '2026-10-21T00:00:00Z', last_sign_in_at: null, audit_count: 2, ...over,
});

beforeEach(() => {
  Object.values(lib).forEach((fn) => fn.mockReset());
  lib.listAudits.mockResolvedValue([
    { id: 'a', status: 'queued', partner_id: 'p1' },
    { id: 'b', status: 'done', partner_id: null },
    { id: 'c', status: 'done', partner_id: 'p1' },
    { id: 'd', status: 'review', partner_id: null },
  ]);
  lib.listPartners.mockResolvedValue([partner(), partner({ id: 'p2', company: 'Tide Co', status: 'invited', audit_count: 0 })]);
  lib.getSetupStatus.mockResolvedValue({
    ready: false,
    report_admins: ['josh@newwaveitfl.com'],
    checks: [
      { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role', ok: true, required: true },
      { key: 'COMPOSIO_API_KEY', label: 'Composio', ok: false, required: true },
      { key: 'RESEND_API_KEY', label: 'Resend', ok: false, required: false },
    ],
  });
});

describe('Groundswell overview', () => {
  it('counts audits by status, lists the setup checks, and summarizes partners', async () => {
    render(<MemoryRouter><GroundswellOverview /></MemoryRouter>);
    const counts = screen.getByRole('region', { name: 'Audits by status' });
    await waitFor(() => expect(within(counts).getByText('Done').previousSibling).toHaveTextContent('2'));
    expect(within(counts).getByText('Queued').previousSibling).toHaveTextContent('1');
    expect(within(counts).getByText('Needs review').previousSibling).toHaveTextContent('1');
    expect(await screen.findByText(/Not ready/)).toBeInTheDocument();
    const checks = screen.getByRole('list', { name: 'Setup checks' });
    expect(within(checks).getAllByRole('listitem')).toHaveLength(3);
    expect(within(checks).getByText('COMPOSIO_API_KEY')).toBeInTheDocument();
    expect(await screen.findByText(/1 active, 1 invited, 0 turned off\. 2 audits came from partners\./)).toBeInTheDocument();
  });

  it('"Check connections" asks every service to answer and shows each one’s detail and the verdict', async () => {
    lib.getSetupStatus.mockImplementation(async (live?: boolean) =>
      live
        ? {
            ready: true,
            complete: false,
            live: true,
            summary: 'Audits run, with 1 data source missing: Google Ads (Keyword Planner).',
            report_admins: ['josh@newwaveitfl.com'],
            checks: [
              { key: 'OPENAI_API_KEY', label: 'OpenAI (the write-up)', ok: true, required: true, detail: 'OpenAI accepted the key.' },
              { key: 'composio:googleads', label: 'Google Ads (Keyword Planner)', ok: false, required: false, detail: 'No active connection in the project; keyword demand, the ad plan and the ad copy are left out of the reports. Connect it under Auth Configs.' },
            ],
          }
        : { ready: true, report_admins: ['josh@newwaveitfl.com'], checks: [{ key: 'OPENAI_API_KEY', label: 'OpenAI', ok: true, required: true }] }
    );
    render(<MemoryRouter><GroundswellOverview /></MemoryRouter>);
    expect(await screen.findByText(/Variables set\. Check the connections/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Check connections/ }));
    expect(await screen.findByText(/Audits run, with 1 data source missing: Google Ads/)).toBeInTheDocument();
    expect(lib.getSetupStatus).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('OpenAI accepted the key.')).toBeInTheDocument();
    expect(screen.getByText(/Connect it under Auth Configs/)).toBeInTheDocument();
    expect(screen.getByText(/A missing data source never stops an audit/)).toBeInTheDocument();
  });
});

describe('Groundswell partners', () => {
  it('lists partners and invites a new one, showing the link once', async () => {
    lib.invitePartner.mockResolvedValue({ partner: partner({ id: 'p3', company: 'New Co' }), invite_url: 'https://www.newwaveitfl.com/social-engineering/croissance/partners/set-password?token=t', emailed: true });
    render(<GroundswellPartners />);
    expect(await screen.findByText('Reef Agency')).toBeInTheDocument();
    expect(screen.getByText('Tide Co')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resend invite/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'New Co' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'hi@newco.example' } });
    fireEvent.click(screen.getByRole('button', { name: /Send invite/ }));
    await waitFor(() => expect(lib.invitePartner).toHaveBeenCalledWith({ company: 'New Co', contact_name: '', email: 'hi@newco.example', notes: '' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Emailed New Co a link to choose a password.');
    expect(screen.getByText(/set-password\?token=t/)).toBeInTheDocument();
  });

  it('asks before turning an account off', async () => {
    lib.updatePartner.mockResolvedValue({ partner: partner({ status: 'disabled' }) });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<GroundswellPartners />);
    const off = (await screen.findAllByRole('button', { name: /Turn off/ }))[0];
    fireEvent.click(off);
    expect(lib.updatePartner).not.toHaveBeenCalled();
    fireEvent.click(off);
    await waitFor(() => expect(lib.updatePartner).toHaveBeenCalledWith('p1', 'disable'));
    confirm.mockRestore();
  });
});
