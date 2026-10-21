import { act, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ key: 'badge', value: 'Saved badge' }, { key: 'phone', value: '+1' }], error: null }),
      }),
    }),
  },
}));

import {
  PREVIEW_PREFIX,
  PREVIEW_SESSION_KEY,
  exitPreview,
  isPreviewMode,
  previewUrl,
  readPreviewOverlay,
  withPreviewOverlay,
  writePreviewOverlay,
} from './preview';
import { useContentWithStatus } from './useContent';
import PreviewBanner from '../components/PreviewBanner';

function Badge() {
  const { content, loaded } = useContentWithStatus('hero');
  return <p data-loaded={loaded}>{content.badge ?? ''}</p>;
}

const setSearch = (search: string) => window.history.replaceState({}, '', `/${search}`);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setSearch('');
});
afterEach(() => setSearch(''));

describe('previewUrl', () => {
  it('adds the preview flag, keeps other parameters, and puts the anchor last', () => {
    expect(previewUrl('/')).toBe('/?preview=1');
    expect(previewUrl('/pricing')).toBe('/pricing?preview=1');
    expect(previewUrl('/#services')).toBe('/?preview=1#services');
    expect(previewUrl('/', 'hero')).toBe('/?preview=1#hero');
    expect(previewUrl('/#footer', 'footer')).toBe('/?preview=1#footer');
    expect(previewUrl('/x?a=b')).toBe('/x?a=b&preview=1');
  });
});

describe('isPreviewMode', () => {
  it('is off for a normal visit, on from the flag, and stays on for the tab until exited', () => {
    expect(isPreviewMode()).toBe(false);
    setSearch('?preview=1');
    expect(isPreviewMode()).toBe(true);
    expect(sessionStorage.getItem(PREVIEW_SESSION_KEY)).toBe('1');
    setSearch('');
    expect(isPreviewMode()).toBe(true);
    exitPreview();
    expect(isPreviewMode()).toBe(false);
  });
});

describe('preview overlays', () => {
  it('stores a section\'s unsaved edits, lays them over content, and clears when empty', () => {
    writePreviewOverlay('hero', { badge: 'Draft badge' });
    expect(readPreviewOverlay('hero')).toEqual({ badge: 'Draft badge' });
    expect(withPreviewOverlay('hero', { badge: 'Saved', phone: '+1' })).toEqual({ badge: 'Draft badge', phone: '+1' });
    writePreviewOverlay('hero', {});
    expect(localStorage.getItem(PREVIEW_PREFIX + 'hero')).toBeNull();
    expect(withPreviewOverlay('hero', { badge: 'Saved' })).toEqual({ badge: 'Saved' });
    localStorage.setItem(PREVIEW_PREFIX + 'hero', 'not json');
    expect(readPreviewOverlay('hero')).toBeNull();
  });
});

describe('useContent in preview mode', () => {
  it('shows the saved content to a normal visitor even when an overlay exists', async () => {
    writePreviewOverlay('hero', { badge: 'Draft badge' });
    render(<Badge />);
    expect(await screen.findByText('Saved badge')).toBeInTheDocument();
  });

  it('lays the overlay over the saved content and follows changes from the admin', async () => {
    setSearch('?preview=1');
    writePreviewOverlay('hero', { badge: 'Draft badge' });
    render(<Badge />);
    expect(await screen.findByText('Draft badge')).toBeInTheDocument();
    expect(screen.getByText('Draft badge')).toHaveAttribute('data-loaded', 'true');
    // The cache keeps the saved value, never the draft.
    expect(JSON.parse(localStorage.getItem('nw_content_v2:hero') ?? '{}')).toEqual({ badge: 'Saved badge', phone: '+1' });

    await act(async () => {
      writePreviewOverlay('hero', { badge: 'Newer draft' });
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByText('Newer draft')).toBeInTheDocument();

    await act(async () => {
      writePreviewOverlay('hero', null);
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(screen.getByText('Saved badge')).toBeInTheDocument();
  });
});

describe('PreviewBanner', () => {
  it('renders nothing for a normal visit', () => {
    render(<PreviewBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says the page is a preview, links to the editor, and exits', () => {
    setSearch('?preview=1');
    const replace = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { ...original, href: 'http://localhost/?preview=1', replace }, writable: true });
    render(<PreviewBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent(/unsaved admin edits/);
    expect(screen.getByRole('link', { name: 'Back to the editor' })).toHaveAttribute('href', '/admin');
    fireEvent.click(screen.getByRole('button', { name: 'Exit preview' }));
    expect(sessionStorage.getItem(PREVIEW_SESSION_KEY)).toBeNull();
    expect(replace).toHaveBeenCalledWith('http://localhost/');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    Object.defineProperty(window, 'location', { value: original, writable: true });
  });
});
