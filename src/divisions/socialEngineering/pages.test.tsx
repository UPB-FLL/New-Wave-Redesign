import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContent } from '../../lib/useContent';
import { FOOTER_EMAIL_FALLBACK, PLACEHOLDER_PHONE } from './contactDetails';
import { contactContent, contactUsContent, customersContent, divisionCustomers, divisionServices, hubContent } from './content';
import SocialEngineeringContactPage from './pages/SocialEngineeringContactPage';
import SocialEngineeringContactUsPage from './pages/SocialEngineeringContactUsPage';
import SocialEngineeringCustomersPage from './pages/SocialEngineeringCustomersPage';
import SocialEngineeringHubPage from './pages/SocialEngineeringHubPage';
import SocialEngineeringServicePage from './pages/SocialEngineeringServicePage';
import { DIVISION_ICONS } from './icons/iconData';
import { DIVISION_JSONLD_ELEMENT_ID } from './prerender';
import { DivisionFooter } from './components/DivisionFooter';
import { DivisionHeader } from './components/DivisionHeader';
import {
  DIVISION_ASSETS,
  DIVISION_CONTACT_PATH,
  DIVISION_CONTACT_US_PATH,
  DIVISION_CUSTOMERS_PATH,
  DIVISION_NAME,
  DIVISION_PRIMARY_CTA,
  SITE_URL,
  divisionServicePath,
} from './site';

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
  vi.mocked(useContent).mockImplementation(() => ({}));
});

const stubTokenFetch = () =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));

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
    ['customers', <SocialEngineeringCustomersPage />],
    ['contact-us', <SocialEngineeringContactUsPage />],
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
    ['customers', <SocialEngineeringCustomersPage />],
    ['contact-us', <SocialEngineeringContactUsPage />],
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

describe('SocialEngineeringCustomersPage', () => {
  const customerList = () => screen.getByRole('region', { name: customersContent.listHeading });

  it('renders its own head, one H1, and its breadcrumb', () => {
    renderAt(<SocialEngineeringCustomersPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(customersContent.headline);
    expect(document.title).toBe(customersContent.metaTitle);
    expect(canonical()).toBe(`${SITE_URL}${DIVISION_CUSTOMERS_PATH}`);
    expect(jsonLdBlocks()).toHaveLength(1);
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Customers')).toHaveAttribute('aria-current', 'page');
    // The first reference in the page copy is the full name.
    expect(screen.getByText(customersContent.summary)).toHaveTextContent(DIVISION_NAME);
  });

  it('lists the four customers in order, each with what it is, where, and its site', () => {
    renderAt(<SocialEngineeringCustomersPage />);
    const list = customerList();
    expect(within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(
      divisionCustomers.map((customer) => customer.name),
    );
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(divisionCustomers.length);
    rows.forEach((row, index) => {
      const customer = divisionCustomers[index];
      [customer.category, customer.location, customer.description].forEach((text) => expect(row).toHaveTextContent(text));
      // One link per row: the business's own site.
      expect(within(row).getAllByRole('link')).toHaveLength(1);
    });
  });

  it('opens other businesses’ sites in a new tab and says so; New Wave IT stays in the app', () => {
    renderAt(<SocialEngineeringCustomersPage />);
    const list = customerList();
    divisionCustomers.forEach((customer) => {
      if (customer.href === '/') {
        const link = within(list).getByRole('link', { name: customer.linkLabel });
        expect(link).toHaveAttribute('href', '/');
        expect(link).not.toHaveAttribute('target');
        return;
      }
      const link = within(list).getByRole('link', { name: `${customer.linkLabel}${customersContent.externalLinkNote}` });
      expect(link).toHaveAttribute('href', customer.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')?.split(/\s+/)).toContain('noopener');
      expect(link.querySelector('svg[data-icon="arrow-up-right"]')).not.toBeNull();
    });
  });

  it('shows no customer logos or screenshots, and ends with the discovery-call CTA', () => {
    renderAt(<SocialEngineeringCustomersPage />);
    const main = screen.getByRole('main');
    expect(main.querySelectorAll('img, picture, video, iframe')).toHaveLength(0);
    const cta = screen.getByRole('heading', { level: 2, name: customersContent.cta.heading }).closest('section')!;
    expect(within(cta).getByRole('link', { name: DIVISION_PRIMARY_CTA })).toHaveAttribute('href', DIVISION_CONTACT_PATH);
  });
});

describe('SocialEngineeringContactUsPage', () => {
  const contactSection = () => document.getElementById('contact')!;

  it('renders its own head and H1 and points new projects to the discovery call', () => {
    stubTokenFetch();
    renderAt(<SocialEngineeringContactUsPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(contactUsContent.headline);
    expect(document.title).toBe(contactUsContent.metaTitle);
    expect(canonical()).toBe(`${SITE_URL}${DIVISION_CONTACT_US_PATH}`);
    expect(screen.getByText(contactUsContent.summary)).toHaveTextContent(DIVISION_NAME);

    // Visible at every width: in the hero's actions, which nothing hides.
    const hero = screen.getByRole('heading', { level: 1 }).closest('section')!;
    expect(hero).toHaveTextContent(contactUsContent.newProjectPrompt);
    const discovery = within(hero).getByRole('link', { name: DIVISION_PRIMARY_CTA });
    expect(discovery).toHaveAttribute('href', DIVISION_CONTACT_PATH);
    expect(discovery.closest('.hidden')).toBeNull();
  });

  it('reuses the shared form with general-inquiry copy', () => {
    stubTokenFetch();
    renderAt(<SocialEngineeringContactUsPage />);
    const section = contactSection();
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent(contactUsContent.form.headline);
    expect(section).toHaveTextContent(contactUsContent.form.label);
    expect(within(section).getByLabelText(/How can we help/)).toHaveAttribute('placeholder', contactUsContent.form.messagePlaceholder);
  });

  it('never shows the placeholder phone number, and leaves out the Call row without a real one', () => {
    stubTokenFetch();
    renderAt(<SocialEngineeringContactUsPage />);
    const section = contactSection();
    // textContent misses attributes, so check the placeholders too.
    expect(section.textContent).not.toContain(PLACEHOLDER_PHONE);
    expect(section.innerHTML).not.toMatch(/555-0100/);
    expect(within(section).getByLabelText('Phone number')).toHaveAttribute('placeholder', 'Optional');
    expect(section.querySelector('a[href^="tel:"]')).toBeNull();
    expect(within(section).queryByRole('heading', { name: 'Call us' })).toBeNull();
    // Email and address fall back exactly as the footer's do.
    expect(section.querySelector(`a[href="mailto:${FOOTER_EMAIL_FALLBACK}"]`)).not.toBeNull();
    expect(screen.getByRole('contentinfo').querySelector(`a[href="mailto:${FOOTER_EMAIL_FALLBACK}"]`)).not.toBeNull();
  });

  it('shows the same phone, email, and address as the footer when the CMS has them', () => {
    stubTokenFetch();
    vi.mocked(useContent).mockImplementation((section: string): Record<string, string> =>
      section === 'footer'
        ? { phone: '(954) 321-7788', email: 'hello@example.com', address: '1 Las Olas Blvd, Suite 2, Fort Lauderdale, FL 33301' }
        : { phone: '(305) 999-0000', email: 'it@example.com', address: 'Elsewhere', address_city: 'Nowhere' },
    );
    renderAt(<SocialEngineeringContactUsPage />);
    const section = contactSection();
    const footer = screen.getByRole('contentinfo');
    expect(section.querySelector('a[href="tel:9543217788"]')).toHaveTextContent('(954) 321-7788');
    expect(footer.querySelector('a[href="tel:9543217788"]')).not.toBeNull();
    expect(section.querySelector('a[href="mailto:hello@example.com"]')).not.toBeNull();
    expect(section).toHaveTextContent('1 Las Olas Blvd, Suite 2');
    expect(section).toHaveTextContent('Fort Lauderdale, FL 33301');
    // Nothing from the IT 'contact' section's details.
    expect(section.textContent).not.toMatch(/305|it@example.com|Elsewhere|Nowhere/);
  });

  it('tags submissions as division leads', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify(init?.method === 'POST' ? { success: true } : { token: '1.test' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderAt(<SocialEngineeringContactUsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    now += 60_000;
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText(/How can we help/), { target: { value: 'A question about our monthly report.' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ name: 'Jane Doe', inquiry: 'social-engineering' });
    expect(await screen.findByText(contactUsContent.form.successBody)).toBeInTheDocument();
  });
});

describe('the two contact pages', () => {
  it('leaves the discovery-call page’s URL, title, description, H1, and form as they were', () => {
    stubTokenFetch();
    expect(DIVISION_CONTACT_PATH).toBe('/social-engineering/contact');
    expect(contactContent.metaTitle).toBe('Book a discovery call | New Wave: Social Engineering');
    expect(contactContent.metaDescription).toBe(
      'Book a discovery call with New Wave: Social Engineering, the social media, brand, web, and marketing division of New Wave IT in Fort Lauderdale.',
    );
    expect(contactContent.headline).toBe('Book a discovery call');
    renderAt(<SocialEngineeringContactPage />);
    const section = document.getElementById('contact')!;
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('Tell us about the business');
    expect(section).toHaveTextContent('New Wave: Social Engineering');
    expect(within(section).getByLabelText('Phone number')).toHaveAttribute('placeholder', PLACEHOLDER_PHONE);
    // Its crumb is unchanged too (renaming it is the owner's call).
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Contact')).toHaveAttribute('aria-current', 'page');
  });

  it('gives each page its own title, description, kicker, H1, form, and keywords', () => {
    const discovery = contactContent;
    const general = contactUsContent;
    (['metaTitle', 'metaDescription', 'kicker', 'headline', 'summary'] as const).forEach((key) => {
      expect(general[key], key).not.toBe(discovery[key]);
    });
    expect(general.metaDescription).not.toContain(DIVISION_PRIMARY_CTA);
    expect(general.form.headline).not.toBe('Tell us about the business');
    const terms = (keywords: string) => keywords.split(/,\s*/);
    expect(terms(general.keywords).filter((term) => terms(discovery.keywords).includes(term))).toEqual(['new wave it']);
  });
});

describe('header and footer links', () => {
  it('lists Overview, Services, Customers, and Contact us before the discovery-call button on desktop', () => {
    renderAt(<DivisionHeader />);
    const nav = screen.getByRole('navigation', { name: DIVISION_NAME });
    const row = nav.querySelector('[data-role="nav-row"] > [data-role="desktop-links"]')!;
    expect([...row.querySelectorAll(':scope > a, :scope > div > button')].map((item) => item.textContent?.trim())).toEqual([
      'Overview',
      'Services',
      'Customers',
      'Contact us',
      DIVISION_PRIMARY_CTA,
    ]);
    expect(within(row as HTMLElement).getByRole('link', { name: 'Customers' })).toHaveAttribute('href', DIVISION_CUSTOMERS_PATH);
    expect(within(row as HTMLElement).getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', DIVISION_CONTACT_US_PATH);
    expect(within(row as HTMLElement).getByRole('link', { name: DIVISION_PRIMARY_CTA })).toHaveClass('nwse-btn-amber-deep');
  });

  it('marks the current page in the desktop navigation', () => {
    render(
      <MemoryRouter initialEntries={[`${DIVISION_CUSTOMERS_PATH}/`]}>
        <DivisionHeader />
      </MemoryRouter>,
    );
    const row = document.querySelector('[data-role="nav-row"] > [data-role="desktop-links"]') as HTMLElement;
    expect(within(row).getByRole('link', { name: 'Customers' })).toHaveAttribute('aria-current', 'page');
    expect(within(row).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('adds Customers and Contact us to the footer’s division column', () => {
    renderAt(<DivisionFooter />);
    const column = screen.getByRole('heading', { level: 2, name: 'NW Social Engineering' }).parentElement!;
    expect(within(column).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Division overview', '/social-engineering'],
      ['Customers', DIVISION_CUSTOMERS_PATH],
      ['Contact us', DIVISION_CONTACT_US_PATH],
      [DIVISION_PRIMARY_CTA, DIVISION_CONTACT_PATH],
    ]);
  });
});
