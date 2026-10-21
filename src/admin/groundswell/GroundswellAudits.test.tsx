import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const audits = vi.hoisted(() => [
  {
    id: '1', business_name: 'Windy City Auto', city: 'Hialeah Gardens, FL', website: 'https://windycity-auto.com', instagram: '_windycityauto',
    competitors: [{ name: 'Westland Auto Center', website: 'https://westlandautocenter.com', instagram: 'westlandautocenter' }],
    notes: null, status: 'done', error: null,
    drive_folder_url: 'https://drive.google.com/drive/folders/abc',
    summary_pdf_url: 'https://drive.google.com/file/d/sum/view',
    deck_pdf_url: 'https://claude.ai/artifact/not-drive',
    audit_pdf_url: null,
    created_at: '2026-10-20T00:00:00Z', completed_at: '2026-10-20T01:00:00Z',
  },
  {
    id: '2', business_name: 'Flow and Mills', city: null, website: null, instagram: 'flowandmills',
    competitors: [], notes: null, status: 'queued', error: null,
    drive_folder_url: null, summary_pdf_url: null, deck_pdf_url: null, audit_pdf_url: null,
    created_at: '2026-10-20T02:00:00Z', completed_at: null,
  },
  {
    id: '3', business_name: 'Harbor Auto Care', city: null, website: 'https://harbor-auto.example', instagram: null,
    competitors: [], notes: null, status: 'running', error: null,
    drive_folder_url: null, summary_pdf_url: null, deck_pdf_url: null, audit_pdf_url: null,
    created_at: '2026-10-21T02:00:00Z', completed_at: null,
  },
]);

const steps = vi.hoisted(() => ({
  '3': [
    { audit_id: '3', step: 'site', position: 1, status: 'done', error: null },
    { audit_id: '3', step: 'maps', position: 2, status: 'skipped', error: 'Google Maps showed a consent page.' },
    { audit_id: '3', step: 'search', position: 3, status: 'running', error: null },
    { audit_id: '3', step: 'deliver_finish', position: 12, status: 'pending', error: null },
  ],
}));

vi.mock('../../lib/groundswell', async (orig) => {
  const actual = await orig<typeof import('../../lib/groundswell')>();
  return { ...actual, listAudits: vi.fn(async () => audits), queueAudit: vi.fn(), requeueAudit: vi.fn(), deleteAudit: vi.fn(), addCompetitor: vi.fn(async () => {}), startQueuedAudits: vi.fn(async () => 1), listAuditSteps: vi.fn(async () => steps) };
});

import GroundswellAudits from './GroundswellAudits';
import { addCompetitor, listAudits, startQueuedAudits } from '../../lib/groundswell';

describe('GroundswellAudits admin screen', () => {
  it('lists requests and shows only Google Drive links', async () => {
    render(<GroundswellAudits />);
    await waitFor(() => expect(screen.getByText('Windy City Auto')).toBeInTheDocument());
    expect(screen.getByText('1 competitor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Drive folder/ })).toHaveAttribute('href', 'https://drive.google.com/drive/folders/abc');
    expect(screen.getByRole('link', { name: /Summary PDF/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Slide deck/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Full audit/ })).not.toBeInTheDocument();
  });

  it('shows Groundswell progress for a running audit', async () => {
    render(<GroundswellAudits />);
    const progress = await screen.findByRole('list', { name: 'Audit progress' });
    expect(progress).toHaveTextContent('Website: done');
    expect(progress).toHaveTextContent('Google Maps: skipped');
    expect(progress).toHaveTextContent('Search rankings: running');
    expect(progress).toHaveTextContent('Share and save links: waiting');
    expect(screen.getByText('Google Maps: skipped')).toHaveAttribute('title', 'Google Maps showed a consent page.');
  });

  it('has a labelled form for the business and its competitors', async () => {
    render(<GroundswellAudits />);
    expect(screen.getByLabelText('Business name')).toBeRequired();
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('Competitor 1 Instagram')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Windy City Auto')).toBeInTheDocument());
  });

  it('adds a competitor to an existing request and queues it again', async () => {
    render(<GroundswellAudits />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add a competitor to Windy City Auto' }));
    fireEvent.change(screen.getByLabelText('New competitor Instagram'), { target: { value: '@rival_shop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add and queue again' }));
    await waitFor(() => expect(addCompetitor).toHaveBeenCalledWith(audits[0], { name: '', website: '', instagram: '@rival_shop' }));
  });

  it('starts the queued audits on demand and says how many runs started', async () => {
    render(<GroundswellAudits />);
    const button = await screen.findByRole('button', { name: /Run queued audits now/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(startQueuedAudits).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Started 1 audit.');
  });

  it('disables the run button when nothing is queued', async () => {
    vi.mocked(listAudits).mockResolvedValueOnce([audits[0]] as never);
    render(<GroundswellAudits />);
    await waitFor(() => expect(screen.getByText('Windy City Auto')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Run queued audits now/ })).toBeDisabled();
  });
});
