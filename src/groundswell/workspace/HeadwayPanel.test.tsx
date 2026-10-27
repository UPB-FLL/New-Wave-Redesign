import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hw = vi.hoisted(() => ({
  getHeadway: vi.fn(),
  setHeadwayServices: vi.fn(),
  saveHeadwaySetupItem: vi.fn(),
  revealHeadwaySecret: vi.fn(),
  planHeadway: vi.fn(),
  moveHeadwayActions: vi.fn(),
}));
vi.mock('../../lib/groundswellHeadway', async (orig) => ({ ...(await orig<typeof import('../../lib/groundswellHeadway')>()), ...hw }));

import type { HeadwayData } from '../../lib/groundswellHeadway';
import { PartnerSignedOut } from '../../lib/groundswellPartner';
import { HEADWAY_SERVICES } from '../../lib/headway';
import { HeadwayPanel } from './HeadwayPanel';

/**
 * The Headway panel on a customer's page: the services (staff switch them
 * on), the setup checklist (typed items filled in here, links from the
 * accounts card), and the plan's actions with their approvals.
 */

const item = (over: Partial<HeadwayData['checklist'][number]>): HeadwayData['checklist'][number] => ({
  key: 'facebook_page_id', kind: 'id', label: 'Facebook Page id', hint: 'The numeric id.', required: true, status: 'needed', satisfied: false, for: ['marketing'], value_hint: null, provided_at: null, notes: null, ...over,
});
const action = (over: Partial<HeadwayData['actions'][number]>): HeadwayData['actions'][number] => ({
  id: 'a1', customer_id: 'c1', plan_id: 'p1', service: 'social-media', kind: 'automatic', tool: 'instagram.publish', title: 'Publish Monday’s Instagram post: The taproom', detail: 'Monday · Instagram post\nA caption.', status: 'proposed',
  blocked_by: [], depends_on: null, scheduled_for: '2026-11-02T15:00:00.000Z', result: null, error: null, attempts: 0, approved_by: null, approved_at: null, applied_at: null, created_at: '2026-10-26T00:00:00Z', ...over,
});
const view = (over: Partial<HeadwayData> = {}): HeadwayData => ({
  available: true,
  secrets_available: true,
  can_manage: true,
  services: HEADWAY_SERVICES.map((service) => ({ service, label: service, does: `${service} does this.`, enabled: service === 'social-media' || service === 'marketing', granted_at: null })),
  checklist: [item({ key: 'link:instagram', kind: 'link', label: 'Instagram (linked)', status: 'linked', satisfied: true, for: ['social-media'] }), item({}), item({ key: 'website_access', kind: 'secret', label: 'Website access', status: 'provided', satisfied: true, value_hint: '…ter2', for: ['website-design'] })],
  plans: [{ id: 'p1', customer_id: 'c1', audit_id: 'r2', status: 'open', summary: '3 actions from the competitor plan.', created_at: '2026-10-26T00:00:00Z', counts: { proposed: 2, approved: 0, applying: 0, applied: 0, failed: 1, declined: 0, done: 0 } }],
  actions: [action({}), action({ id: 'a2', service: 'website-design', kind: 'handoff', tool: null, title: 'High · /: Put the booking button above the fold.', scheduled_for: null }), action({ id: 'a3', service: 'marketing', tool: 'metaads.adset', title: 'Build the Meta set “Leads”, paused', status: 'failed', error: 'The Facebook Page id is missing from the setup checklist.', blocked_by: ['facebook_page_id'] })],
  source: { audit_id: 'r2', phase: 'competitors', completed_at: '2026-10-13T00:00:00Z' },
  source_note: 'A plan is built from the competitor plan delivered Oct 13, 2026.',
  ...over,
});

beforeEach(() => {
  for (const fn of Object.values(hw)) fn.mockReset();
  hw.getHeadway.mockResolvedValue(view());
});

describe('HeadwayPanel', () => {
  it('shows the services, the checklist with what is still needed, and the open plan’s actions grouped by service', async () => {
    render(<HeadwayPanel viewer="admin" customerId="c1" poll={100_000} />);
    expect(await screen.findByRole('heading', { name: 'Headway' })).toBeInTheDocument();
    const services = screen.getByRole('list', { name: 'Services' });
    expect(within(services).getAllByRole('listitem')).toHaveLength(6);
    expect(within(services).getByRole('checkbox', { name: 'social-media included' })).toBeChecked();
    expect(within(services).getByRole('checkbox', { name: 'brand-development included' })).not.toBeChecked();
    expect(screen.getByText('1 required item still needed.')).toBeInTheDocument();
    const checklist = screen.getByRole('list', { name: 'Setup checklist' });
    expect(within(checklist).getByText('Instagram (linked)').closest('li')).toHaveAttribute('data-status', 'linked');
    expect(within(checklist).getByText('Signed in from the accounts card.')).toBeInTheDocument();
    expect(within(checklist).getByRole('button', { name: 'Reveal' })).toBeInTheDocument();
    expect(screen.getByText('3 actions from the competitor plan.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Social media actions' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Website design actions' })).toBeInTheDocument();
    expect(screen.getByText('The Facebook Page id is missing from the setup checklist.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plan again' })).toBeEnabled();
  });

  it('switches a service on through the staff call, saves a typed item, and reveals a stored login', async () => {
    hw.setHeadwayServices.mockResolvedValue(view({ services: view().services.map((s) => ({ ...s, enabled: true })) }));
    hw.saveHeadwaySetupItem.mockResolvedValue(view({ checklist: [item({ status: 'provided', satisfied: true, value_hint: '9001' })] }));
    hw.revealHeadwaySecret.mockResolvedValue('admin / hunter2');
    render(<HeadwayPanel viewer="admin" customerId="c1" poll={100_000} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'brand-development included' }));
    await waitFor(() => expect(hw.setHeadwayServices).toHaveBeenCalledWith('c1', { 'brand-development': true }));
    expect(await screen.findByRole('checkbox', { name: 'brand-development included' })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const form = screen.getByRole('form', { name: 'Add Facebook Page id' });
    fireEvent.change(within(form).getByLabelText('Facebook Page id'), { target: { value: '9001' } });
    fireEvent.change(within(form).getByLabelText('Facebook Page id notes'), { target: { value: 'From the Page' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(hw.saveHeadwaySetupItem).toHaveBeenCalledWith('admin', 'c1', { key: 'facebook_page_id', status: 'provided', value: '9001', notes: 'From the Page' }));
    expect(await screen.findByText('Everything required is in place.')).toBeInTheDocument();

    hw.getHeadway.mockResolvedValue(view());
    render(<HeadwayPanel viewer="admin" customerId="c1" poll={100_000} />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Reveal' }))[0]);
    await waitFor(() => expect(hw.revealHeadwaySecret).toHaveBeenCalledWith('c1', 'website_access'));
    expect(await screen.findByText('admin / hunter2')).toBeInTheDocument();
  });

  it('approves, marks done, retries and declines actions, and builds a plan', async () => {
    hw.moveHeadwayActions.mockImplementation(async (_v, _c, what: string, ids: string[]) => view({ can_manage: false, actions: view().actions.map((a) => (ids.includes(a.id) ? { ...a, status: what === 'approve' || what === 'retry' ? 'approved' : what === 'done' ? 'done' : 'declined' } : a)) }));
    hw.planHeadway.mockResolvedValue(view({ can_manage: false, plans: [{ ...view().plans[0], id: 'p2', summary: '4 actions from the competitor plan.' }], actions: view().actions.map((a) => ({ ...a, plan_id: 'p2' })) }));
    hw.getHeadway.mockResolvedValue(view({ can_manage: false }));
    render(<HeadwayPanel viewer="partner" customerId="c1" poll={100_000} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(hw.moveHeadwayActions).toHaveBeenCalledWith('partner', 'c1', 'approve', ['a1']));
    expect(await screen.findByText('Approved. It is carried out within a minute of its time.')).toBeInTheDocument();
    expect(document.querySelector('[data-action="a1"]')).toHaveAttribute('data-status', 'approved');
    fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
    await waitFor(() => expect(hw.moveHeadwayActions).toHaveBeenCalledWith('partner', 'c1', 'done', ['a2']));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(hw.moveHeadwayActions).toHaveBeenCalledWith('partner', 'c1', 'retry', ['a3']));
    fireEvent.click(screen.getByRole('button', { name: 'Decline: Publish Monday’s Instagram post: The taproom' }));
    await waitFor(() => expect(hw.moveHeadwayActions).toHaveBeenCalledWith('partner', 'c1', 'decline', ['a1']));
    // A partner sees no service switches and no Reveal.
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Plan again' }));
    await waitFor(() => expect(hw.planHeadway).toHaveBeenCalledWith('partner', 'c1'));
    expect(await screen.findByText('4 actions from the competitor plan.')).toBeInTheDocument();
  });

  it('says when Headway is not set up yet, and hands a signed-out partner back', async () => {
    hw.getHeadway.mockRejectedValueOnce(new Error('Headway is not set up in the database yet. Try again later.'));
    render(<HeadwayPanel viewer="admin" customerId="c1" poll={100_000} />);
    expect(await screen.findByRole('status')).toHaveTextContent('Headway is not switched on in the database yet.');
    const out = vi.fn();
    hw.getHeadway.mockRejectedValueOnce(new PartnerSignedOut('Sign in again.'));
    render(<HeadwayPanel viewer="partner" customerId="c1" onSignedOut={out} poll={100_000} />);
    await waitFor(() => expect(out).toHaveBeenCalled());
  });
});
