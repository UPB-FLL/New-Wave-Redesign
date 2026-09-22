import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contactContent, divisionServices, hubContent } from './content';
import SocialEngineeringContactPage from './pages/SocialEngineeringContactPage';
import SocialEngineeringHubPage from './pages/SocialEngineeringHubPage';
import SocialEngineeringServicePage from './pages/SocialEngineeringServicePage';
import { DIVISION_JSONLD_ELEMENT_ID } from './prerender';
import { DivisionHeader } from './components/DivisionHeader';
import { DIVISION_ASSETS, DIVISION_NAME, SITE_URL, divisionServicePath } from './site';

vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

const renderAt = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
const jsonLdBlocks = () => document.head.querySelectorAll(`script#${DIVISION_JSONLD_ELEMENT_ID}`);
const favicon = () => document.head.querySelector('link[rel="icon"][type="image/svg+xml"]')?.getAttribute('href');

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  // Mirror the parent shell's head so icon swapping has something to swap.
  document.head.innerHTML = `
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />`;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SocialEngineeringHubPage', () => {
  it('renders the division with its own head, one H1, and links into every service', () => {
    renderAt(<SocialEngineeringHubPage />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // The H1 carries the topic (kicker) as well as the brand line.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(`${hubContent.kicker}: ${hubContent.headline}`);
    expect(document.title).toBe(hubContent.metaTitle);
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'New Wave IT' })).toHaveAttribute('href', '/');
    expect(canonical()).toBe(`${SITE_URL}/social-engineering`);
    expect(document.head.querySelector('meta[property="og:site_name"]')).toHaveAttribute('content', DIVISION_NAME);
    expect(jsonLdBlocks()).toHaveLength(1);
    expect(favicon()).toBe(DIVISION_ASSETS.faviconSvg);

    const main = screen.getByRole('main');
    divisionServices.forEach((service) => {
      expect(
        within(main).getAllByRole('link').some((link) => link.getAttribute('href') === divisionServicePath(service.slug)),
        service.slug,
      ).toBe(true);
    });
  });

  it('links back to the parent and follows the naming rules on the rendered page', () => {
    renderAt(<SocialEngineeringHubPage />);

    expect(screen.getAllByRole('link').some((link) => link.getAttribute('href') === '/')).toBe(true);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\bNWSE\b/);
    expect(text).toContain('A New Wave IT division');
    expect(screen.getAllByAltText('').length).toBeGreaterThan(0); // decorative logos inside labelled links
    const homeLinks = screen.getAllByRole('link', { name: 'New Wave: Social Engineering home' });
    expect(homeLinks).toHaveLength(2); // header + footer family lockup
    homeLinks.forEach((link) => expect(link).toHaveAttribute('href', '/social-engineering'));
  });

  it('cleans up after itself so parent pages never inherit division metadata', () => {
    const { unmount } = renderAt(<SocialEngineeringHubPage />);
    unmount();

    expect(jsonLdBlocks()).toHaveLength(0);
    expect(favicon()).toBe('/favicon.svg');
    expect(document.head.querySelector('link[rel="manifest"]')).toHaveAttribute('href', '/site.webmanifest');
  });

  it('hides the parent LocalBusiness graph while mounted and restores it after', () => {
    const parent = document.createElement('script');
    parent.type = 'application/ld+json';
    parent.textContent = '{"@type":"LocalBusiness"}';
    document.head.appendChild(parent);

    const { unmount } = renderAt(<SocialEngineeringHubPage />);
    const blocks = () => [...document.head.querySelectorAll('script[type="application/ld+json"]')];
    expect(blocks().map((block) => block.id)).toEqual([DIVISION_JSONLD_ELEMENT_ID]);

    unmount();
    expect(blocks()).toEqual([parent]);
  });

  it('reuses a prerendered JSON-LD block instead of duplicating it', () => {
    const prerendered = document.createElement('script');
    prerendered.type = 'application/ld+json';
    prerendered.id = DIVISION_JSONLD_ELEMENT_ID;
    prerendered.textContent = '{}';
    document.head.appendChild(prerendered);

    renderAt(<SocialEngineeringHubPage />);
    expect(jsonLdBlocks()).toHaveLength(1);
    expect(JSON.parse(jsonLdBlocks()[0].textContent ?? '')['@graph']).toBeDefined();
  });
});

describe('SocialEngineeringServicePage', () => {
  it.each(divisionServices.map((service) => [service.slug, service] as const))('renders %s', (_slug, service) => {
    renderAt(<SocialEngineeringServicePage slug={service.slug} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(service.headline);
    expect(document.title).toBe(service.metaTitle);
    expect(canonical()).toBe(`${SITE_URL}${divisionServicePath(service.slug)}`);

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'NW Social Engineering' })).toHaveAttribute('href', '/social-engineering');
    expect(within(breadcrumb).getByText(service.navLabel)).toHaveAttribute('aria-current', 'page');

    service.faqs.forEach((faq) => expect(screen.getByText(faq.question)).toBeInTheDocument());
    divisionServices
      .filter((other) => other.slug !== service.slug)
      .forEach((other) => {
        expect(
          within(screen.getByRole('main'))
            .getAllByRole('link')
            .some((link) => link.getAttribute('href') === divisionServicePath(other.slug)),
        ).toBe(true);
      });
  });
});

describe('SocialEngineeringContactPage', () => {
  it('tags submissions as division leads', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method !== 'POST') {
        return new Response(JSON.stringify({ token: '1.test' }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAt(<SocialEngineeringContactPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(contactContent.headline);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    now += 60_000; // the token is comfortably past its minimum age
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/How can we help/), { target: { value: 'We want a phishing baseline.' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      name: 'Jane Doe',
      inquiry: 'social-engineering',
      token: '1.test',
    });
  });
});

describe('DivisionHeader menus', () => {
  const openMenu = () => screen.queryByRole('link', { name: 'Phishing simulation' });

  it('toggles Services on click/tap and ignores emulated (non-mouse) hover', () => {
    renderAt(<DivisionHeader />);
    const services = screen.getByRole('button', { name: /Services/ });
    const container = services.parentElement!;

    fireEvent.pointerEnter(container, { pointerType: 'touch' });
    expect(openMenu()).toBeNull();

    fireEvent.click(services);
    expect(services).toHaveAttribute('aria-expanded', 'true');
    expect(openMenu()).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the Services button', () => {
    renderAt(<DivisionHeader />);
    const services = screen.getByRole('button', { name: /Services/ });
    fireEvent.click(services);
    expect(openMenu()).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(openMenu()).toBeNull();
    expect(services).toHaveFocus();
  });

  it('closes when focus leaves the dropdown', () => {
    renderAt(<DivisionHeader />);
    const services = screen.getByRole('button', { name: /Services/ });
    fireEvent.click(services);
    fireEvent.blur(services, { relatedTarget: screen.getByRole('link', { name: 'Scope an assessment' }) });
    expect(openMenu()).toBeNull();
  });

  it('closes the mobile menu on Escape', () => {
    renderAt(<DivisionHeader />);
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(document.getElementById('nwse-mobile-menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('nwse-mobile-menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });
});
