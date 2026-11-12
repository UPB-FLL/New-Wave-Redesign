// /pricing in a browser: the price list arrives after the first render, so the
// page shows no prices and no "not configured" line until it does, then the
// answer, the table and the quote builder from one read, with the same Offer
// nodes the raw HTML carried.

import { act, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import PricingPage from './PricingPage';
import { PAGE_JSONLD_ELEMENT_ID } from '../lib/pageMeta';
import { renderItPage } from '../lib/prerenderBody';
import { renderRouteHtml } from '../lib/prerenderHead';
import type { PricingUnit } from '../lib/pricingUnits';
import { IT_PAGE_META } from '../lib/routeMeta';

const db = vi.hoisted(() => ({ order: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ order: db.order }) }) }) },
}));
vi.mock('../lib/useContent', () => ({
  useContent: () => ({}),
  useContentWithStatus: () => ({ content: {}, loaded: true }),
}));
vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));

const unit = (id: string, name: string, description: string, cents: number): PricingUnit => ({
  id,
  name,
  description,
  cost_per_unit: cents,
  min_quantity: 1,
  max_quantity: 1000,
});
// As stored on 2026-11-12: "Employees " keeps its stray space.
const PRICE_LIST = [
  unit('u1', 'Employees ', 'Cost per employee/user account', 500),
  unit('u2', 'Server', 'Managed Server', 17500),
  unit('u3', 'Computers', 'Cost per computer/device', 10500),
  unit('u4', 'Location Network Monitoring', 'Cost per physical location', 5000),
  unit('u5', 'Office 365 - Licensing Only', 'Cost per email address account', 3200),
  unit('u6', 'Office 365 - Licensing and Email', '', 3800),
];

const NOT_CONFIGURED = 'Pricing units are not configured yet.';
const RUNTIME_BLOCK = 'script[data-page-jsonld]';

type ReadResult = { data: PricingUnit[] | null; error: unknown };
type JsonNode = Record<string, unknown>;

const tree = (
  <MemoryRouter initialEntries={['/pricing']}>
    <PricingPage />
  </MemoryRouter>
);

/** Mounts the page with its read still under way; the returned function finishes it. */
function renderLoading() {
  let finish!: (result: ReadResult) => void;
  db.order.mockReturnValueOnce(new Promise<ReadResult>((resolve) => (finish = resolve)));
  const view = render(tree);
  return { ...view, finish: (result: ReadResult) => act(async () => finish(result)) };
}

const runtimeNodes = () => JSON.parse(document.head.querySelector(RUNTIME_BLOCK)?.textContent ?? 'null') as JsonNode[] | null;

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  db.order.mockReset();
  document.head.innerHTML = '';
});
afterEach(() => {
  document.head.innerHTML = '';
});

describe('PricingPage', () => {
  it('shows no prices and no "not configured" line while the price list loads', async () => {
    const { container, finish } = renderLoading();
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('table')).toBeNull();
    expect(screen.queryByText(NOT_CONFIGURED)).toBeNull();
    expect(screen.queryByText('Select your options')).toBeNull();
    expect(document.head.querySelector(RUNTIME_BLOCK)).toBeNull();
    await finish({ data: [], error: null });
  });

  it('shows the answer, the table and the builder from one read once the list arrives', async () => {
    const { container, finish } = renderLoading();
    await finish({ data: PRICE_LIST, error: null });

    expect(db.order).toHaveBeenCalledTimes(1);
    const main = container.querySelector('main') as HTMLElement;
    const question = main.querySelector('h2');
    expect(question?.textContent).toBe('How much do managed IT services cost?');
    expect(question?.nextElementSibling?.tagName).toBe('P');
    expect(question?.nextElementSibling?.textContent).toMatch(/\$105 per computer or device, \$5 per employee or user account/);
    expect([...main.querySelectorAll('tbody tr')].map((tr) => [tr.children[0].textContent, tr.children[2].textContent])).toEqual([
      ['Employees', '$5'],
      ['Server', '$175'],
      ['Computers', '$105'],
      ['Location Network Monitoring', '$50'],
      ['Office 365 - Licensing Only', '$32'],
      ['Office 365 - Licensing and Email', '$38'],
    ]);
    // The builder follows the table, with the same units.
    const builder = screen.getByRole('heading', { name: 'Select your options' });
    expect(main.querySelector('table')!.compareDocumentPosition(builder) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Increase Employees quantity' })).toBeInTheDocument();
    expect(screen.queryByText(NOT_CONFIGURED)).toBeNull();
  });

  it('keeps the page layout rules with the price list on it', async () => {
    const { container, finish } = renderLoading();
    await finish({ data: PRICE_LIST, error: null });

    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].closest('header')).not.toBeNull();
    expect(container.querySelector('main h1')).toBeNull();
    const headings = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    headings.forEach((heading, index) => {
      if (index) expect(Number(heading.tagName[1]), heading.textContent ?? '').toBeLessThanOrEqual(Number(headings[index - 1].tagName[1]) + 1);
    });
    expect(container.querySelectorAll('.nw-kicker')).toHaveLength(0);
    const chips = [...container.querySelectorAll('.rounded-full')].filter((element) => /[A-Za-z]/.test(element.textContent ?? ''));
    expect(chips.map((chip) => chip.textContent)).toEqual([]);
  });

  it('writes one Offer per unit into the head, once', async () => {
    const { finish, rerender } = renderLoading();
    await finish({ data: PRICE_LIST, error: null });

    const [catalog] = runtimeNodes() ?? [];
    expect(catalog['@type']).toBe('OfferCatalog');
    expect((catalog.itemListElement as JsonNode[]).map((offer) => [offer.name, offer.price])).toEqual([
      ['Employees', 5],
      ['Server', 175],
      ['Computers', 105],
      ['Location Network Monitoring', 50],
      ['Office 365 - Licensing Only', 32],
      ['Office 365 - Licensing and Email', 38],
    ]);
    // A re-render with the same price list leaves the block alone.
    const block = document.head.querySelector(RUNTIME_BLOCK);
    rerender(tree);
    expect(document.head.querySelector(RUNTIME_BLOCK)).toBe(block);
    expect(document.head.querySelectorAll(RUNTIME_BLOCK)).toHaveLength(1);
  });

  it('takes over the raw HTML’s price-list block with the same nodes', async () => {
    // The head a visitor's browser starts from: what the build wrote for these rows.
    const shell = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    const built = renderItPage('/pricing', null, PRICE_LIST);
    const raw = new DOMParser().parseFromString(renderRouteHtml(shell, '/pricing', IT_PAGE_META['/pricing'], built), 'text/html');
    document.head.innerHTML = [...raw.head.querySelectorAll('script[type="application/ld+json"]')].map((script) => script.outerHTML).join('');
    expect(document.getElementById(PAGE_JSONLD_ELEMENT_ID)).not.toBeNull();

    const { finish, unmount } = renderLoading();
    // Until the list is read the build's block stands: the page has nothing newer to say.
    expect(document.getElementById(PAGE_JSONLD_ELEMENT_ID)).not.toBeNull();
    expect(document.head.querySelector(RUNTIME_BLOCK)).toBeNull();

    await finish({ data: PRICE_LIST, error: null });
    expect(document.getElementById(PAGE_JSONLD_ELEMENT_ID)).toBeNull();
    expect(runtimeNodes()).toEqual(built.jsonLd);
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(3);

    unmount();
    expect(document.head.querySelector(`${RUNTIME_BLOCK}, #${PAGE_JSONLD_ELEMENT_ID}`)).toBeNull();
  });

  it('says the list is not configured only after a read comes back empty, and writes no offers', async () => {
    const { container, finish } = renderLoading();
    await finish({ data: [], error: null });
    expect(screen.getByText(NOT_CONFIGURED)).toBeInTheDocument();
    expect(container.querySelector('table')).toBeNull();
    expect(container.textContent).not.toContain('How much do managed IT services cost?');
    expect(document.head.querySelector(RUNTIME_BLOCK)).toBeNull();
  });

  it('shows the table without the prose sentence when a price differs from the published rates', async () => {
    const { container, finish } = renderLoading();
    await finish({ data: PRICE_LIST.map((row) => (row.id === 'u3' ? { ...row, cost_per_unit: 11500 } : row)), error: null });
    const question = container.querySelector('main h2');
    expect(question?.textContent).toBe('How much do managed IT services cost?');
    expect(question?.nextElementSibling).toBeNull();
    expect(container.querySelector('main table')?.textContent).toContain('$115');
    expect(container.querySelector('main')?.textContent).not.toContain('$105 per computer');
  });
});
