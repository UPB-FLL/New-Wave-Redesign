import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useContent } from '../../lib/useContent';
import CybersecurityServices from './CybersecurityServices';
import ThreatProtection from './ThreatProtection';

vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

afterEach(() => vi.mocked(useContent).mockImplementation(() => ({})));

const detailHrefs = (prefix: string) =>
  [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '').filter((href) => href.startsWith(prefix));

const cms = (section: string, key: string, slugs: string[]) =>
  vi.mocked(useContent).mockImplementation((s: string) => (s === section ? { [key]: JSON.stringify(slugs.map((slug) => ({ slug, name: slug }))) } : {}));

describe('/cybersecurity cards link only to detail pages the CMS has', () => {
  it.each([
    ['service', <CybersecurityServices />, '/service/', 'services-detail', 'services_list', 'endpoint-protection', 'Endpoint Protection', 6],
    ['threat', <ThreatProtection />, '/threat/', 'threats-detail', 'threats_list', 'ransomware', 'Ransomware', 8],
  ] as const)('%s cards: none while the CMS has no entries, then exactly the ones it lists', (_kind, ui, prefix, section, key, slug, name, cards) => {
    // Production today: no entries, so no card may link to a "not found" page.
    const empty = render(<MemoryRouter>{ui}</MemoryRouter>);
    expect(detailHrefs(prefix)).toEqual([]);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(cards);
    empty.unmount();

    cms(section, key, [slug]);
    render(<MemoryRouter>{ui}</MemoryRouter>);
    expect(detailHrefs(prefix)).toEqual([`${prefix}${slug}`]);
    expect(screen.getByRole('link', { name: new RegExp(name) })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(cards);
  });
});
