import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contactContent, divisionServices, hubContent } from './content';
import SocialEngineeringContactPage from './pages/SocialEngineeringContactPage';
import SocialEngineeringHubPage from './pages/SocialEngineeringHubPage';
import SocialEngineeringServicePage from './pages/SocialEngineeringServicePage';
import { DIVISION_ICONS } from './icons/iconData';
import { DIVISION_JSONLD_ELEMENT_ID } from './prerender';
import { DivisionHeader } from './components/DivisionHeader';
import { DIVISION_ASSETS, DIVISION_NAME, DIVISION_PRIMARY_CTA, SITE_URL, divisionServicePath } from './site';

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

describe('division positioning', () => {
  // The division's first launch described security testing; it is a social
  // media, brand, web, and marketing division. Keep that copy from creeping back.
  const SECURITY_WORDING = /phishing|vishing|pretext|penetration|red team|security awareness|human risk|human-risk/i;

  const pages: [string, React.ReactElement][] = [
    ['hub', <SocialEngineeringHubPage />],
    ...divisionServices.map((service): [string, React.ReactElement] => [service.slug, <SocialEngineeringServicePage slug={service.slug} />]),
    ['contact', <SocialEngineeringContactPage />],
  ];

  it.each(pages)('%s never describes security testing', (_name, page) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
    renderAt(page);
    expect(document.body.textContent ?? '').not.toMatch(SECURITY_WORDING);
    expect(document.title).not.toMatch(SECURITY_WORDING);
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? '').not.toMatch(SECURITY_WORDING);
    // Keywords, Open Graph/Twitter tags, and JSON-LD are what crawlers read first.
    expect(document.head.innerHTML).not.toMatch(SECURITY_WORDING);
  });

  it('keeps the web app manifest on-message', () => {
    expect(readFileSync(path.resolve(__dirname, '../../../public/brand/social-engineering/site.webmanifest'), 'utf8')).not.toMatch(SECURITY_WORDING);
  });
});

describe('division icons', () => {
  const pages: [string, React.ReactElement][] = [
    ['hub', <SocialEngineeringHubPage />],
    ['integration', <SocialEngineeringServicePage slug="integration" />],
    ['contact', <SocialEngineeringContactPage />],
  ];

  it.each(pages)('%s draws every icon from the division set, decoratively', (_name, page) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
    const { container } = renderAt(page);
    expect(container.querySelectorAll('svg.lucide')).toHaveLength(0);
    const icons = [...container.querySelectorAll('svg[data-icon]')];
    expect(icons.length).toBeGreaterThan(5);
    icons.forEach((svg) => {
      expect(DIVISION_ICONS).toHaveProperty([svg.getAttribute('data-icon')!]);
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('shows the method, roadmap, and metric icons on the hub', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const drawn = new Set([...container.querySelectorAll('svg[data-icon]')].map((svg) => svg.getAttribute('data-icon')));
    [...hubContent.method, ...hubContent.roadmap, ...hubContent.metrics].forEach(({ icon }) => {
      expect(drawn.has(icon!), icon).toBe(true);
    });
    // Service cards use the service-* set.
    divisionServices.forEach((service) => expect(drawn.has(`service-${service.icon}`), service.icon).toBe(true));
  });

  it('uses the division set in the shared contact form', () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
    renderAt(<SocialEngineeringContactPage />);
    const form = document.getElementById('contact')!;
    ['phone', 'mail', 'map-pin', 'send'].forEach((name) => {
      expect(form.querySelector(`svg[data-icon="${name}"]`), name).not.toBeNull();
    });
  });

  it('labels the header menu toggle on the button, not the icon', () => {
    renderAt(<DivisionHeader />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    expect(toggle.querySelector('svg[data-icon="menu"]')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Close menu' }).querySelector('svg[data-icon="close"]')).not.toBeNull();
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
    fireEvent.change(screen.getByLabelText(/How can we help/), { target: { value: 'We need a new website and a social media plan.' } });
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
  const openMenu = () => screen.queryByRole('link', { name: divisionServices[0].navLabel });

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
    fireEvent.blur(services, { relatedTarget: screen.getByRole('link', { name: DIVISION_PRIMARY_CTA }) });
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
