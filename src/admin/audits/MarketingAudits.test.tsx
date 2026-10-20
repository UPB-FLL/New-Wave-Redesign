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
]);

vi.mock('../../lib/marketingAudits', async (orig) => {
  const actual = await orig<typeof import('../../lib/marketingAudits')>();
  return { ...actual, listAudits: vi.fn(async () => audits), queueAudit: vi.fn(), requeueAudit: vi.fn(), deleteAudit: vi.fn(), addCompetitor: vi.fn(async () => {}), startQueuedAudits: vi.fn(async () => 1) };
});

import MarketingAudits from './MarketingAudits';
import { addCompetitor, listAudits, startQueuedAudits } from '../../lib/marketingAudits';

describe('MarketingAudits admin screen', () => {
  it('lists requests and shows only Google Drive links', async () => {
    render(<MarketingAudits />);
    await waitFor(() => expect(screen.getByText('Windy City Auto')).toBeInTheDocument());
    expect(screen.getByText('1 competitor')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Drive folder/ })).toHaveAttribute('href', 'https://drive.google.com/drive/folders/abc');
    expect(screen.getByRole('link', { name: /Summary PDF/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Slide deck/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Full audit/ })).not.toBeInTheDocument();
  });

  it('has a labelled form for the business and its competitors', async () => {
    render(<MarketingAudits />);
    expect(screen.getByLabelText('Business name')).toBeRequired();
    expect(screen.getByLabelText('Website')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('Competitor 1 Instagram')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Windy City Auto')).toBeInTheDocument());
  });

  it('adds a competitor to an existing request and queues it again', async () => {
    render(<MarketingAudits />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add a competitor to Windy City Auto' }));
    fireEvent.change(screen.getByLabelText('New competitor Instagram'), { target: { value: '@rival_shop' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add and queue again' }));
    await waitFor(() => expect(addCompetitor).toHaveBeenCalledWith(audits[0], { name: '', website: '', instagram: '@rival_shop' }));
  });

  it('starts the queued audits on demand and says how many runs started', async () => {
    render(<MarketingAudits />);
    const button = await screen.findByRole('button', { name: /Run queued audits now/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(startQueuedAudits).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Started 1 audit run.');
  });

  it('disables the run button when nothing is queued', async () => {
    vi.mocked(listAudits).mockResolvedValueOnce([audits[0]] as never);
    render(<MarketingAudits />);
    await waitFor(() => expect(screen.getByText('Windy City Auto')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Run queued audits now/ })).toBeDisabled();
  });
});
