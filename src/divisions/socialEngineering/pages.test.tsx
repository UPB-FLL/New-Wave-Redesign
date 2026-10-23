import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContent } from '../../lib/useContent';
import { FOOTER_EMAIL_FALLBACK, PLACEHOLDER_PHONE } from './contactDetails';
import { appsContent, auditConnectors, auditContent, auditReports, auditSample, contactContent, contactUsContent, customersContent, divisionApps, divisionCustomers, divisionServices, hubContent } from './content';
import SocialEngineeringContactPage from './pages/SocialEngineeringContactPage';
import SocialEngineeringContactUsPage from './pages/SocialEngineeringContactUsPage';
import SocialEngineeringCustomersPage from './pages/SocialEngineeringCustomersPage';
import SocialEngineeringHubPage from './pages/SocialEngineeringHubPage';
import SocialEngineeringGroundswellPage from './pages/SocialEngineeringGroundswellPage';
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
  DIVISION_GROUNDSWELL_PATH,
  DIVISION_NAME,
  DIVISION_PRIMARY_CTA,
  SITE_URL,
  divisionServicePath,
} from './site';
import { GROUNDSWELL_PATH } from '../../groundswell/site';

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

describe('descriptive public stage labels', () => {
  const pages: [string, React.ReactElement][] = [
    ['hub', <SocialEngineeringHubPage />],
    ...divisionServices.map((service): [string, React.ReactElement] => [service.slug, <SocialEngineeringServicePage slug={service.slug} />]),
  ];

  it.each(pages)('%s uses descriptive labels and decorative markers without step numbers', (_name, page) => {
    renderAt(page);
    const main = screen.getByRole('main');
    expect(main).not.toHaveTextContent(/\b(?:Step|Phase)\s+0?\d\b/);
    const labelledLists = main.querySelectorAll('.nwse-timeline, .nwse-journey, [data-role="growth-system"] figcaption, [data-role="pillars"], [data-role="outcomes"]');
    labelledLists.forEach((list) => {
      const leaves = [...list.querySelectorAll('*')].filter((element) => element.children.length === 0);
      leaves.forEach((element) => expect(element.textContent?.trim(), list.className).not.toMatch(/^0\d$/));
    });
    main.querySelectorAll('.nwse-timeline > li').forEach((stage) => {
      const heading = within(stage as HTMLElement).getByRole('heading', { level: 3 });
      expect(within(stage as HTMLElement).getAllByText(heading.textContent ?? '', { exact: true })).toHaveLength(1);
      expect(stage.querySelector('.nwse-cardlabel')?.textContent).toBe('');
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
    ['groundswell', <SocialEngineeringGroundswellPage />],
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

  // The division is a national, remote-first growth team for small businesses
  // (2026-10-21). No page, title, description, or keyword set may position it
  // as a home-market agency again. The Customers page's facts (where each
  // business is) and the GroundSwell example's audit data are facts about
  // other businesses, so they are checked for the positioning copy only.
  const LOCAL_POSITIONING = /Fort Lauderdale|South Florida|Broward|Palm Beach|Miami|Boca Raton|South FL\b/i;
  const positioningPages: [string, React.ReactElement][] = [
    ['hub', <SocialEngineeringHubPage />],
    ...divisionServices.map((service): [string, React.ReactElement] => [service.slug, <SocialEngineeringServicePage slug={service.slug} />]),
    ['contact-us', <SocialEngineeringContactUsPage />],
    ['contact', <SocialEngineeringContactPage />],
  ];

  it.each(positioningPages)('%s positions the division nationally, never as a local agency', (_name, page) => {
    stubTokenFetch();
    renderAt(page);
    const main = screen.getByRole('main');
    // The footer and the shared contact form carry the company's postal
    // address, which is a fact, so only the page's own copy is checked.
    const copy = [...main.querySelectorAll(':scope > *:not([data-contact-section])')].map((element) => element.textContent ?? '').join(' ');
    expect(copy.length).toBeGreaterThan(200);
    expect(copy).not.toMatch(LOCAL_POSITIONING);
    expect(document.title).not.toMatch(LOCAL_POSITIONING);
    expect(document.head.innerHTML).not.toMatch(LOCAL_POSITIONING);
  });

  it('describes the division as national in its copy, metadata, and structured data', () => {
    // The GroundSwell page's worked example (the sample board and the ad plan's
    // footnote) names the real places its data came from, so only the audit
    // page's own positioning fields are checked here.
    const auditPositioning = [auditContent.metaTitle, auditContent.metaDescription, auditContent.keywords, auditContent.headline, auditContent.summary];
    const copy = JSON.stringify([hubContent, divisionServices, contactContent, contactUsContent, customersContent, auditPositioning]);
    expect(copy).not.toMatch(LOCAL_POSITIONING);
    expect(hubContent.summary).toMatch(/across the United States/);
    expect(hubContent.industries.note).toMatch(/Remote-first/);
    renderAt(<SocialEngineeringHubPage />);
    const graph = JSON.parse(jsonLdBlocks()[0].textContent ?? '')['@graph'];
    const organization = graph.find((node: { '@type': string }) => node['@type'] === 'Organization');
    expect(organization.areaServed).toEqual([{ '@type': 'Country', name: 'United States' }]);
    expect(organization.description).toMatch(/small businesses across the United States/);
  });
});

describe('the growth system', () => {
  it('names the three pillars on the hub, in order, with their icons, the loop, and the 90-day plan', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const pillars = screen.getByRole('region', { name: 'Data, integrations, and smart advertising, working as one system' });
    expect(pillars).toHaveAttribute('id', 'pillars');
    const cards = within(pillars).getAllByRole('heading', { level: 3 });
    expect(cards.map((card) => card.textContent)).toEqual(['Data', 'Integrations', 'Smart advertising']);
    hubContent.pillars.forEach((pillar) => {
      expect(pillars.querySelector(`svg[data-icon="${pillar.icon}"]`), pillar.icon).not.toBeNull();
      pillar.items.forEach((item) => expect(pillars).toHaveTextContent(item));
    });
    // The hero's ghost button opens on the pillars, and its facts line is a line, not a list.
    const hero = screen.getByRole('heading', { level: 1 }).closest('section')!;
    expect(within(hero).getByRole('link', { name: 'Meet the engine' })).toHaveAttribute('href', '#groundswell-engine');
    expect(hero.querySelector('[data-role="hero-facts"]')?.tagName).toBe('P');
    // The growth loop is decorative, drawn from the icon set, and explained beside it.
    const loop = container.querySelector('svg[data-role="growth-loop"]')!;
    expect(loop).toHaveAttribute('aria-hidden', 'true');
    expect(loop.querySelectorAll('[data-loop-node]')).toHaveLength(4);
    expect(loop.querySelector('text')).toBeNull();
    expect(loop.closest('figure')).toHaveTextContent('The growth loop');
    const loopStages = [...loop.closest('figure')!.querySelectorAll('figcaption li')];
    expect(loopStages.map((stage) => stage.querySelector('svg')?.getAttribute('data-icon'))).toEqual([
      'pillar-data', 'pillar-integrations', 'pillar-advertising', 'metric-bookings',
    ]);
    expect(loopStages.map((stage) => stage.querySelector('.font-semibold')?.textContent)).toEqual([
      'Data. ', 'Integrations. ', 'Smart advertising. ', 'Sales. ',
    ]);
    // The 90-day plan and the rhythm after it.
    expect(hubContent.roadmap.map((phase) => phase.phase)).toEqual(['Days 1–30', 'Days 31–60', 'Days 61–90 and on']);
    hubContent.roadmap.forEach((phase) => expect(screen.getByText(phase.phase)).toBeInTheDocument());
    expect(container.querySelector('[data-role="cadence"]')).toHaveTextContent('Weekly');
  });

  it.each(divisionServices.map((service) => [service.slug, service] as const))('%s shows its facts at a glance, its outcomes, and where it fits', (_slug, service) => {
    const { container } = renderAt(<SocialEngineeringServicePage slug={service.slug} />);
    const glance = container.querySelector('[data-role="glance"]')!;
    expect(glance.tagName).toBe('DL');
    expect(within(glance as HTMLElement).getAllByRole('term').map((term) => term.textContent)).toEqual(['Best for', 'Engagement', 'Measured by', 'Works with']);
    service.glance.forEach((item) => expect(glance).toHaveTextContent(item.value));
    // Directly under the hero, before anything else.
    expect(container.querySelector('main > section:nth-of-type(2) [data-role="glance"]')).not.toBeNull();
    const outcomes = container.querySelector('[data-role="outcomes"]')!;
    expect(within(outcomes as HTMLElement).getAllByRole('listitem')).toHaveLength(3);
    expect(within(outcomes as HTMLElement).getAllByRole('listitem').map((outcome) => outcome.textContent)).toEqual(service.outcomes);
    expect(outcomes.querySelectorAll('svg[data-icon="check-circle"]')).toHaveLength(service.outcomes.length);
    const strip = container.querySelector('[data-role="pillar-strip"]')!;
    expect(strip).toHaveAttribute('data-active', service.pillar);
    const current = strip.querySelector('[aria-current="true"]')!;
    expect(current).toHaveTextContent(hubContent.pillars.find((pillar) => pillar.key === service.pillar)!.title);
    expect(strip.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it('gives every service a pillar, four glance facts, and three outcomes, with no invented numbers', () => {
    divisionServices.forEach((service) => {
      expect(['data', 'integrations', 'advertising']).toContain(service.pillar);
      expect(service.glance).toHaveLength(4);
      expect(service.outcomes).toHaveLength(3);
      [...service.glance.map((item) => item.value), ...service.outcomes].forEach((text) => expect(text).not.toMatch(/\d/));
    });
    expect(new Set(divisionServices.map((service) => service.pillar)).size).toBe(3);
  });
});

describe('division icons', () => {
  const pages: [string, React.ReactElement][] = [
    ['hub', <SocialEngineeringHubPage />],
    ['integration', <SocialEngineeringServicePage slug="integration" />],
    ['groundswell', <SocialEngineeringGroundswellPage />],
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

describe('SocialEngineeringGroundswellPage', () => {
  it('renders its own head, one H1, its breadcrumb, and its FAQs', () => {
    renderAt(<SocialEngineeringGroundswellPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(auditContent.headline);
    expect(document.title).toBe(auditContent.metaTitle);
    expect(canonical()).toBe(`${SITE_URL}${DIVISION_GROUNDSWELL_PATH}`);
    expect(jsonLdBlocks()).toHaveLength(1);
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText(auditContent.navLabel)).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText(auditContent.summary)).toHaveTextContent('GroundSwell');
    auditContent.faqs.forEach((faq) => expect(screen.getByText(faq.question)).toBeInTheDocument());
  });

  it('opens on the audit’s ground rules, a second button to the example, and in-page links to every part', () => {
    renderAt(<SocialEngineeringGroundswellPage />);
    const hero = screen.getByRole('heading', { level: 1 }).closest('section')!;
    expect(within(hero).getByText(auditContent.facts[0]).closest('[data-role="hero-facts"]')).not.toBeNull();
    expect(within(hero).getByRole('link', { name: DIVISION_PRIMARY_CTA })).toHaveAttribute('href', DIVISION_CONTACT_PATH);
    expect(within(hero).getByRole('link', { name: auditContent.secondaryCta })).toHaveAttribute('href', '#sample');
    const jump = screen.getByRole('navigation', { name: auditContent.jump.label });
    const links = within(jump).getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual(auditContent.jump.items.map((item) => [item.label, item.href]));
    // Every link lands on a section of the page.
    links.forEach((link) => expect(document.getElementById(link.getAttribute('href')!.slice(1)), link.textContent ?? '').not.toBeNull());
  });

  it('steps through the process one step at a time, Next naming the next step and the last step ending on the discovery call', () => {
    renderAt(<SocialEngineeringGroundswellPage />);
    const band = screen.getByRole('region', { name: auditContent.process.heading });
    const tabs = within(band).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(auditContent.process.steps.map((step) => step.title));
    const panel = () => within(band).getByRole('tabpanel');
    expect(band).not.toHaveTextContent(/Step \d|\b0[1-5]\b/);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(panel()).toHaveTextContent(auditContent.process.steps[0].detail);
    expect(within(band).queryByRole('link', { name: DIVISION_PRIMARY_CTA })).toBeNull();
    expect(within(band).getByRole('button', { name: /Back/ })).toBeDisabled();
    const next = () => within(band).getByRole('button', { name: /^Next/ });
    expect(next()).toHaveTextContent(`Next: ${auditContent.process.steps[1].title}`);
    for (let step = 1; step < auditContent.process.steps.length; step += 1) {
      fireEvent.click(next());
      expect(tabs[step]).toHaveAttribute('aria-selected', 'true');
      expect(panel()).toHaveTextContent(auditContent.process.steps[step].caption);
    }
    expect(panel()).toHaveTextContent(auditContent.process.steps[4].detail);
    expect(within(band).queryByRole('button', { name: /^Next/ })).toBeNull();
    expect(within(band).getByRole('link', { name: DIVISION_PRIMARY_CTA })).toHaveAttribute('href', DIVISION_CONTACT_PATH);
  });

  it('names the engine, every connector in its explorer, and all three reports', () => {
    renderAt(<SocialEngineeringGroundswellPage />);
    const engine = screen.getByRole('region', { name: auditContent.engine.heading });
    const tabs = within(engine).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(auditConnectors.map((c) => c.name));
    auditConnectors.forEach((connector, index) => {
      fireEvent.click(tabs[index]);
      const panel = within(engine).getByRole('tabpanel');
      expect(within(panel).getByRole('heading', { level: 3 })).toHaveTextContent(connector.name);
      expect(panel).toHaveTextContent(connector.source);
      expect(panel).toHaveTextContent(connector.gathers);
      if (connector.example) {
        expect(panel).toHaveTextContent(auditContent.engine.exampleLabel);
        expect(panel).toHaveTextContent(connector.example);
      } else {
        expect(panel).not.toHaveTextContent(auditContent.engine.exampleLabel);
      }
    });
    auditContent.rules.forEach((rule) => expect(within(engine).getByText(rule)).toBeInTheDocument());
    const reports = screen.getByRole('region', { name: auditContent.reports.heading });
    auditReports.forEach((report) => expect(within(reports).getByText(report.format)).toBeInTheDocument());
  });

  it('shows Uncommon Path Brewing’s dated audit, with permission and sources, as the example, one part at a time', () => {
    renderAt(<SocialEngineeringGroundswellPage />);
    const sample = screen.getByRole('region', { name: auditContent.sample.heading });
    const viewer = sample.querySelector('[data-role="sample-viewer"]')!;
    expect(viewer).toHaveTextContent('Uncommon Path Brewing');
    expect(viewer).toHaveTextContent('October 21, 2026');
    expect(viewer).toHaveTextContent(auditSample.demand.value);
    const tabs = within(viewer as HTMLElement).getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(Object.values(auditContent.sample.tabs));
    // Findings first: the permission note and the four figures.
    const panel = () => within(viewer as HTMLElement).getByRole('tabpanel');
    expect(panel()).toHaveTextContent(/shown with its permission/i);
    expect(within(panel()).getAllByRole('listitem')).toHaveLength(auditSample.findings.length);
    // The return board: three scenarios, the base case highlighted, then its stop-loss and sources.
    fireEvent.click(tabs[1]);
    expect(within(panel()).getAllByRole('listitem')).toHaveLength(auditSample.scenarios.length);
    expect(auditSample.scenarios.filter((s) => 'highlighted' in s && s.highlighted).map((s) => s.name)).toEqual(['Base case']);
    expect(panel()).toHaveTextContent(auditSample.stopLoss);
    expect(panel()).toHaveTextContent(auditSample.footnote);
    // The call to action follows the viewer.
    const strip = sample.querySelector('[data-role="cta-strip"]')!;
    expect(strip).toHaveTextContent(auditContent.sample.cta.heading);
    expect(within(strip as HTMLElement).getByRole('link', { name: DIVISION_PRIMARY_CTA })).toHaveAttribute('href', DIVISION_CONTACT_PATH);
  });
});

/** The sample audit's viewer with one of its parts open. */
const openSamplePart = (title: string) => {
  renderAt(<SocialEngineeringGroundswellPage />);
  const viewer = screen.getByRole('region', { name: auditContent.sample.heading }).querySelector('[data-role="sample-viewer"]') as HTMLElement;
  fireEvent.click(within(viewer).getByRole('tab', { name: title }));
  return within(viewer).getByRole('tabpanel');
};

describe('GroundSwell ad plan', () => {
  it('shows the brewery’s plan from the model, funded rows first, with Reddit listed as not modeled', () => {
    const panel = openSamplePart(auditContent.sample.tabs.adPlan);
    expect(within(panel).getByRole('heading', { name: auditContent.adPlan.heading })).toBeInTheDocument();
    const rows = within(panel).getAllByRole('row').slice(1); // the header row first
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('Private events');
    expect(rows[0]).toHaveTextContent('Fund');
    expect(panel).toHaveTextContent(/Not modeled: No credible published Reddit cost per click/);
    // Alcohol rules surface as reasons, not silently dropped rows.
    expect(panel).toHaveTextContent(/TikTok alcohol ads must be shown only to people 25 and older/);
    expect(panel.textContent).not.toMatch(/%/);
  });

  it('previews ready-to-run ads for Google, Meta, Reddit and TikTok', () => {
    const panel = openSamplePart(auditContent.sample.tabs.ads);
    for (const label of ['Google Search · Responsive search ad', 'Meta (Facebook and Instagram) · Feed image ad', 'Reddit · Promoted post', 'TikTok · In-feed ad']) {
      expect(within(panel).getByText(label)).toBeInTheDocument();
    }
  });
});

describe('GroundSwell change ranking', () => {
  it('ranks every change with its area, hours and return, and compares today with the plan', () => {
    const panel = openSamplePart(auditContent.sample.tabs.changes);
    expect(within(panel).getByRole('heading', { name: auditContent.changes.heading })).toBeInTheDocument();
    const rows = within(panel).getAllByRole('row').slice(1);
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(within(rows[0]).getByRole('rowheader')).toHaveTextContent('Private events: Meta (Facebook and Instagram) ads');
    // Unmodeled changes say why instead of showing a number.
    expect(panel).toHaveTextContent(/No published study measures the lift/);
    expect(within(panel).getByRole('heading', { name: auditContent.changes.todayHeading })).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: auditContent.changes.planHeading })).toBeInTheDocument();
    expect(panel).toHaveTextContent('Not public');
    expect(panel.textContent).not.toMatch(/%/);
  });
});

describe('five-item grids', () => {
  const classesOf = (element: Element) => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

  it('centre their second row under the first on the hub and the service pages', () => {
    const hub = renderAt(<SocialEngineeringHubPage />);
    const gather = hub.container.querySelector('[aria-labelledby="nwse-data"] ul.nwse-hairlines')!;
    const metrics = hub.container.querySelector('[data-role="metric-tiles"]')!;
    expect(gather.children).toHaveLength(5);
    expect(metrics.children).toHaveLength(5);
    [gather, metrics].forEach((grid) => {
      expect(grid).toHaveAttribute('data-centred', 'true');
      const child = grid === gather ? 'li' : 'div';
      // Six tracks from lg, each card two wide, the fourth starting at the
      // second track; four tracks on tablets with the fifth in the middle.
      // (Assembled, not written as class names, so Tailwind's scanner does
      // not pick the template up as a candidate.)
      const rule = (prefix: string, selector: string, utility: string) => [prefix, ':[&>', child, selector, ']:', utility].join('');
      expect(classesOf(grid)).toEqual(
        expect.arrayContaining([
          'lg:grid-cols-6',
          rule('md', '', 'col-span-2'),
          rule('lg', ':nth-child(4)', 'col-start-2'),
          rule('lg', ':nth-child(5)', 'col-start-auto'),
          'md:grid-cols-4',
          rule('md', ':nth-child(5)', 'col-start-2'),
        ]),
      );
      expect(classesOf(grid).some((name) => /grid-cols-3|col-span-2$/.test(name) && !name.includes('[&>'))).toBe(false);
    });
    hub.unmount();
    divisionServices.forEach((service) => {
      const { container, unmount } = renderAt(<SocialEngineeringServicePage slug={service.slug} />);
      const scope = container.querySelector('[aria-labelledby="nwse-scope"] ul.nwse-hairlines')!;
      expect(scope.children, service.slug).toHaveLength(5);
      expect(scope, service.slug).toHaveAttribute('data-centred', 'true');
      unmount();
    });
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

  it('lists the customers in order, each with what it is, where, and its site', () => {
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
    expect([...main.querySelectorAll('img, picture, video, iframe')].filter((element) => !element.closest('[aria-hidden="true"]'))).toHaveLength(0);
    const cta = screen.getByRole('heading', { level: 2, name: customersContent.cta.heading }).closest('section')!;
    expect(within(cta).getByRole('link', { name: DIVISION_PRIMARY_CTA })).toHaveAttribute('href', DIVISION_CONTACT_PATH);
  });
  it('follows the customers with "Apps we’ve developed": each app, where it runs, and its site in a new tab', () => {
    renderAt(<SocialEngineeringCustomersPage />);
    const section = screen.getByRole('region', { name: appsContent.heading });
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent(appsContent.heading);
    const rows = within(section).getAllByRole('listitem');
    expect(rows).toHaveLength(divisionApps.length);
    rows.forEach((row, index) => {
      const app = divisionApps[index];
      expect(within(row).getByRole('heading', { level: 3 })).toHaveTextContent(app.name);
      [app.category, app.platforms, app.description].forEach((text) => expect(row).toHaveTextContent(text));
      const link = within(row).getByRole('link', { name: `${app.linkLabel}${customersContent.externalLinkNote}` });
      expect(link).toHaveAttribute('href', app.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')?.split(/\s+/)).toContain('noopener');
    });
    const customers = screen.getByRole('region', { name: customersContent.listHeading });
    expect(customers.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
      'Book a discovery call with New Wave: Social Engineering, the growth division of New Wave IT, about growing your sales with data, integrations, and ads.',
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
  it('lists Overview, Services, GroundSwell, Customers, and Contact us before the discovery-call button on desktop', () => {
    renderAt(<DivisionHeader />);
    const nav = screen.getByRole('navigation', { name: DIVISION_NAME });
    const row = nav.querySelector('[data-role="nav-row"] > [data-role="desktop-links"]')!;
    expect([...row.querySelectorAll(':scope > a, :scope > div > button')].map((item) => item.textContent?.trim())).toEqual([
      'Overview',
      'Services',
      'GroundSwell',
      'Customers',
      'Contact us',
      DIVISION_PRIMARY_CTA,
    ]);
    expect(within(row as HTMLElement).getByRole('link', { name: 'GroundSwell' })).toHaveAttribute('href', DIVISION_GROUNDSWELL_PATH);
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

  it('gives the engine and partner workspace a dedicated handoff beside the division links', () => {
    renderAt(<DivisionFooter />);
    const column = screen.getByRole('heading', { level: 2, name: 'NW Social Engineering' }).parentElement!;
    expect(within(column).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Division overview', '/social-engineering'],
      ['Customers', DIVISION_CUSTOMERS_PATH],
      ['Contact us', DIVISION_CONTACT_US_PATH],
      [DIVISION_PRIMARY_CTA, DIVISION_CONTACT_PATH],
    ]);
    expect(screen.getByRole('link', { name: /Explore GroundSwell/ })).toHaveAttribute('href', DIVISION_GROUNDSWELL_PATH);
    expect(screen.getByRole('link', { name: /Already a partner\? Open partner workspace/ })).toHaveAttribute('href', GROUNDSWELL_PATH);
  });
});
