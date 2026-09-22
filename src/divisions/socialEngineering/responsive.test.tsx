// The division's phone and tablet layouts: the fixed header's height token
// per breakpoint (and for landscape phones), the endorsement on phones, the
// menu's focus handling, the service rows, and the rule that anything hidden
// below a breakpoint is decorative or shown elsewhere. Desktop (≥1024px) must
// render exactly as before, so every small-screen component rule in
// division.css sits inside a max-width query.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DivisionHeader } from './components/DivisionHeader';
import { divisionServices, hubContent } from './content';
import SocialEngineeringContactPage from './pages/SocialEngineeringContactPage';
import SocialEngineeringHubPage from './pages/SocialEngineeringHubPage';
import SocialEngineeringServicePage from './pages/SocialEngineeringServicePage';
import { DIVISION_DESCRIPTOR, DIVISION_ENDORSEMENT, PARENT_NAME, divisionServicePath } from './site';

vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

const renderAt = (ui: React.ReactElement, path = '/') => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
const classesOf = (element: Element | null) => (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const divisionCss = postcss.parse(readFileSync(path.resolve(__dirname, 'division.css'), 'utf8'));

/** The media query a rule sits in ('' at the top level). */
const mediaOf = (rule: Rule) => (rule.parent?.type === 'atrule' ? (rule.parent as AtRule).params : '');

/** Landscape phones: tablet widths on a short screen (division.css, type.css). */
const LANDSCAPE_PHONE = '(min-width: 640px) and (max-width: 1023.98px) and (max-height: 500px)';
/** Its markup twin in DivisionHeader and DivisionHero (below lg, at most 500px tall). */
const LANDSCAPE = 'max-lg:[@media(max-height:500px)]:';

describe('fixed header height', () => {
  const headerHeights = () => {
    const values = new Map<string, string>();
    divisionCss.walkDecls('--nwse-header-height', (decl: Declaration) => {
      const rule = decl.parent as Rule;
      expect(rule.selector).toBe(':root');
      values.set(mediaOf(rule), decl.value);
    });
    return values;
  };

  // Tailwind's h-* scale (n × 4px), or an arbitrary px height such as h-[56px].
  const heightPx = (classes: string[], prefix: string) => {
    const escaped = prefix.replace(/[[\]()@:.]/g, '\\$&');
    const match = classes.find((name) => new RegExp(`^${escaped}h-(\\d+|\\[\\d+px\\])$`).test(name));
    expect(match, `${prefix}h-*`).toBeDefined();
    const value = match!.slice(`${prefix}h-`.length);
    return value.startsWith('[') ? Number(value.slice(1, -3)) : Number(value) * 4;
  };

  it('sets --nwse-header-height for phones, tablets, desktop, and landscape phones', () => {
    expect(Object.fromEntries(headerHeights())).toEqual({
      '': '57px',
      '(min-width: 640px)': '97px',
      '(min-width: 1024px)': '117px',
      [LANDSCAPE_PHONE]: '57px',
    });
  });

  it('matches the header rows it measures at each breakpoint', () => {
    const { container } = renderAt(<DivisionHeader />);
    const bar = container.querySelector('[data-role="endorsement-bar"]');
    const barRow = bar?.firstElementChild ?? null;
    const navRow = container.querySelector('[data-role="nav-row"]');
    const heights = headerHeights();
    const border = 1; // the nav's bottom border

    // Phones: no endorsement bar in the fixed header, just the nav row.
    expect(classesOf(bar)).toEqual(expect.arrayContaining(['hidden', 'sm:block']));
    expect(`${heightPx(classesOf(navRow), '') + border}px`).toBe(heights.get(''));
    // Tablets: bar + nav.
    expect(`${heightPx(classesOf(barRow), '') + heightPx(classesOf(navRow), 'sm:') + border}px`).toBe(
      heights.get('(min-width: 640px)'),
    );
    // Desktop: the original 36px bar + 80px nav.
    expect(`${heightPx(classesOf(barRow), 'lg:') + heightPx(classesOf(navRow), 'lg:') + border}px`).toBe(
      heights.get('(min-width: 1024px)'),
    );
    expect(heights.get('(min-width: 1024px)')).toBe('117px');
    // Landscape phones: the phone header, bar hidden.
    expect(classesOf(bar)).toContain(`${LANDSCAPE}hidden`);
    expect(`${heightPx(classesOf(navRow), LANDSCAPE) + border}px`).toBe(heights.get(LANDSCAPE_PHONE));
  });

  it('sizes the phone nav row, logo, and menu toggle in px, so enlarged text cannot push the toggle off-screen', () => {
    const { container } = renderAt(<DivisionHeader />);
    expect(classesOf(container.querySelector('[data-role="nav-row"]'))).toContain('h-[56px]');
    const logo = container.querySelector('[data-role="nav-row"] a img, [data-role="nav-row"] a svg');
    const logoClasses = classesOf(logo);
    expect(logoClasses).toContain('max-sm:w-[160px]');
    // No rem-based width on the phone logo (w-40 is 10rem).
    expect(logoClasses.filter((name) => /^max-sm:w-\d+$/.test(name))).toEqual([]);
    expect(classesOf(screen.getByRole('button', { name: 'Open menu' }))).toContain('p-[10px]');
  });

  it('offsets the page, in-page anchors, and focus scrolling by the token, not a fixed number', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    expect(classesOf(container.querySelector('.nwse-root'))).toContain('pt-[var(--nwse-header-height)]');
    // On the scroller, so focus moving backwards stops below the header too.
    const padding: string[] = [];
    divisionCss.walkDecls('scroll-padding-top', (decl: Declaration) => {
      padding.push(`${mediaOf(decl.parent as Rule)}|${(decl.parent as Rule).selector}|${decl.value}`);
    });
    expect(padding).toEqual(['|:root:has(.nwse-root)|calc(var(--nwse-header-height) + 16px)']);
    // Never also a scroll-margin on the targets: the two would add up.
    const margins: string[] = [];
    divisionCss.walkDecls(/^scroll-margin/, (decl: Declaration) => {
      margins.push((decl.parent as Rule).selector);
    });
    expect(margins).toEqual([]);
  });

  it('turns off the site-wide smooth scrolling for readers who prefer reduced motion', () => {
    const rules: string[] = [];
    divisionCss.walkDecls('scroll-behavior', (decl: Declaration) => {
      rules.push(`${mediaOf(decl.parent as Rule)}|${(decl.parent as Rule).selector}|${decl.value}`);
    });
    expect(rules).toEqual(['(prefers-reduced-motion: reduce)|:root:has(.nwse-root)|auto']);
  });
});

describe('mobile menu', () => {
  const openMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    return document.getElementById('nwse-mobile-menu')!;
  };

  it('carries the endorsement on phones, where the header bar is hidden', () => {
    renderAt(<DivisionHeader />);
    const menu = openMenu();
    const endorsement = menu.querySelector('[data-role="menu-endorsement"]');
    expect(endorsement).not.toBeNull();
    expect(endorsement).toHaveTextContent(DIVISION_ENDORSEMENT);
    const parentLink = within(endorsement as HTMLElement).getByRole('link', {
      name: `Managed IT & cybersecurity at ${PARENT_NAME}`,
    });
    expect(parentLink).toHaveAttribute('href', '/');
    expect(classesOf(parentLink)).toContain('min-h-11');

    // Exactly one of the two endorsements shows at any size: the menu's below
    // sm and on landscape phones, the bar's otherwise.
    expect(classesOf(endorsement)).toEqual(expect.arrayContaining(['sm:hidden', `${LANDSCAPE}block`]));
    expect(classesOf(document.querySelector('[data-role="endorsement-bar"]'))).toEqual(
      expect.arrayContaining(['hidden', 'sm:block', `${LANDSCAPE}hidden`]),
    );
    // The parent's name and its arrow wrap as a unit.
    const unit = parentLink.querySelector('.whitespace-nowrap');
    expect(unit).toHaveTextContent(new RegExp(`^${PARENT_NAME}$`));
    expect(unit?.querySelector('svg')).not.toBeNull();
  });

  it('gives every menu link a 44px row and the CTA 48px', () => {
    renderAt(<DivisionHeader />);
    const toggle = screen.getByRole('button', { name: 'Open menu' });
    // 24px icon + 10px padding each side.
    expect(classesOf(toggle)).toContain('p-[10px]');
    const menu = openMenu();
    const links = within(menu).getAllByRole('link');
    expect(links).toHaveLength(1 + divisionServices.length + 1 + 1); // overview, services, CTA, parent
    links.forEach((link) => {
      const classes = classesOf(link);
      expect(classes.includes('min-h-11') || classes.includes('min-h-12'), link.textContent ?? '').toBe(true);
    });
  });

  it('makes the page behind the open menu inert, and restores it when the menu closes', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const main = container.querySelector('main')!;
    const footer = container.querySelector('footer')!;
    const header = container.querySelector('header')!;
    expect(main).not.toHaveAttribute('inert');
    openMenu();
    expect(main).toHaveAttribute('inert');
    expect(footer).toHaveAttribute('inert');
    expect(header).not.toHaveAttribute('inert');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('nwse-mobile-menu')).toBeNull();
    expect(main).not.toHaveAttribute('inert');
    expect(footer).not.toHaveAttribute('inert');
  });

  it('closes when focus leaves the header, but not when it blurs to nothing', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const menu = openMenu();
    const links = within(menu).getAllByRole('link');
    const lastMenuLink = links[links.length - 1];
    act(() => lastMenuLink.focus());
    // A tap on the menu's blank area: focus goes nowhere, the menu stays.
    act(() => lastMenuLink.blur());
    expect(document.getElementById('nwse-mobile-menu')).not.toBeNull();
    // Focus moving on to the page (jsdom does not enforce inert) closes it.
    act(() => lastMenuLink.focus());
    const pageLink = container.querySelector<HTMLAnchorElement>('main a[href]')!;
    act(() => pageLink.focus());
    expect(document.getElementById('nwse-mobile-menu')).toBeNull();
    expect(container.querySelector('main')).not.toHaveAttribute('inert');
  });

  it('lays the services out in two columns on landscape phones, row by row', () => {
    renderAt(<DivisionHeader />);
    const menu = openMenu();
    const list = menu.querySelector('ul')!;
    expect(classesOf(list)).toEqual(expect.arrayContaining(['flex', 'flex-col', `${LANDSCAPE}grid`, `${LANDSCAPE}grid-cols-2`]));
    expect(within(list).getAllByRole('link').map((link) => link.textContent)).toEqual(
      divisionServices.map((service) => service.navLabel),
    );
  });

  it('marks the current page', () => {
    const service = divisionServices[1];
    renderAt(<DivisionHeader />, `${divisionServicePath(service.slug)}/`);
    const menu = openMenu();
    expect(within(menu).getByRole('link', { name: service.navLabel })).toHaveAttribute('aria-current', 'page');
    expect(within(menu).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });
});

describe('service rows', () => {
  it('lists every service on the hub as one whole-row link with its summary', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const list = container.querySelector('#services ul')!;
    expect(classesOf(list)).toEqual(expect.arrayContaining(['nwse-rowlist', 'grid-cols-1']));
    const items = [...list.children];
    expect(items).toHaveLength(divisionServices.length);
    items.forEach((item, index) => {
      const service = divisionServices[index];
      const links = item.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveAttribute('href', divisionServicePath(service.slug));
      expect(links[0]).toHaveTextContent(service.navLabel);
      expect(links[0]).toHaveTextContent(service.cardSummary);
      // The title column can shrink below its longest word (enlarged text).
      expect(classesOf(links[0])).toContain('grid-cols-[2.25rem_minmax(0,1fr)_1.125rem]');
      // Title before summary in the DOM, as on screen.
      const title = within(links[0]).getByRole('heading', { level: 3 });
      expect(title.compareDocumentPosition(within(links[0]).getByText(service.cardSummary))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
  });

  it('lists the other five services on a service page the same way', () => {
    const service = divisionServices[0];
    renderAt(<SocialEngineeringServicePage slug={service.slug} />);
    const section = screen.getByRole('region', { name: 'Works best alongside' });
    const list = section.querySelector('ul')!;
    expect(classesOf(list)).toEqual(expect.arrayContaining(['nwse-rowlist', 'grid-cols-1']));
    const others = divisionServices.filter((other) => other.slug !== service.slug);
    const links = within(list).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(others.map((other) => divisionServicePath(other.slug)));
    links.forEach((link, index) => {
      expect(link).toHaveTextContent(`${others[index].navLabel}${others[index].cardSummary}`);
      expect(classesOf(link)).toContain('grid-cols-[2.25rem_minmax(0,1fr)_1rem]');
    });
  });
});

describe('content hidden below a breakpoint', () => {
  /** Elements in main hidden at the base (phone) width and shown again from sm or lg. */
  const hiddenOnPhones = (container: HTMLElement) =>
    [...container.querySelectorAll('main *')].filter((element) => {
      const classes = classesOf(element);
      return classes.includes('hidden') && classes.some((name) => /^(sm|md|lg):(block|flex|inline-flex|grid)$/.test(name));
    });
  /** Every image has empty alt text and every SVG is hidden from assistive tech. */
  const onlyDecorativeGraphics = (element: Element) =>
    [...element.querySelectorAll('img')].every((img) => img.getAttribute('alt') === '') &&
    [...element.querySelectorAll('svg')].every((svg) => svg.closest('[aria-hidden="true"]') !== null);

  it('on the hub, hides only decorative art and repeats of content shown elsewhere', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const main = container.querySelector('main')!;
    const services = main.querySelector('#services')!;
    const footer = container.querySelector('footer')!;
    const hidden = hiddenOnPhones(container);

    const footnote = hidden.filter((element) => element.closest('section') === main.firstElementChild);
    const learnMore = hidden.filter((element) => element.textContent?.startsWith('Learn more'));
    const art = hidden.filter((element) => element.querySelector('img') && !element.textContent?.trim());
    const lockup = hidden.filter((element) => element.querySelector('[data-role="family-lockup"]'));
    expect(footnote.length + learnMore.length + art.length + lockup.length).toBe(hidden.length);

    // Hero footnote: the descriptor and the service names, all listed again just below.
    expect(footnote).toHaveLength(1);
    expect(footnote[0]).toHaveTextContent(DIVISION_DESCRIPTOR);
    expect(footer).toHaveTextContent(DIVISION_DESCRIPTOR);
    divisionServices.forEach((service) => {
      expect(footnote[0]).toHaveTextContent(service.navLabel);
      expect(within(services as HTMLElement).getByRole('link', { name: new RegExp(`^${service.navLabel}`) })).toBeInTheDocument();
    });
    expect(footnote[0].querySelector('a, button')).toBeNull();

    // "Learn more": the row's own link carries the title and summary.
    expect(learnMore).toHaveLength(divisionServices.length);
    learnMore.forEach((element) => expect(element.closest('a')).not.toBeNull());

    // The intro's brand mark: decorative.
    expect(art).toHaveLength(1);
    expect(onlyDecorativeGraphics(art[0])).toBe(true);

    // The family lockup: decorative logos and labels; the section says the same in words.
    expect(lockup).toHaveLength(1);
    expect(onlyDecorativeGraphics(lockup[0])).toBe(true);
    const family = screen.getByRole('region', { name: hubContent.relationship.heading });
    expect(family).toHaveTextContent(/division of New Wave IT/);
    expect(footer.querySelector('[aria-label="New Wave: Social Engineering home"]')).not.toBeNull();
  });

  it.each(divisionServices.map((service) => [service.slug]))('on %s, hides nothing below a breakpoint', (slug) => {
    const { container } = renderAt(<SocialEngineeringServicePage slug={slug} />);
    expect(hiddenOnPhones(container)).toEqual([]);
  });
});

describe('journey strip', () => {
  /** Lays the strip out as `scrollWidth` wide in a `clientWidth` box. */
  const layOut = (scrollWidth: number, clientWidth: number) => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
  };
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls as one row below lg, in journey order', () => {
    renderAt(<SocialEngineeringHubPage />);
    const strip = screen.getByRole('list', { name: 'Customer journey' });
    expect(classesOf(strip)).toEqual(expect.arrayContaining(['overflow-x-auto', 'lg:flex-wrap', 'lg:overflow-visible']));
    expect(within(strip).getAllByRole('listitem').map((item) => item.textContent?.replace(/^\d+\s*/, ''))).toEqual(
      hubContent.journey,
    );
  });

  it('is a Tab stop while it overflows, so the keyboard can scroll it', () => {
    layOut(819, 390);
    renderAt(<SocialEngineeringHubPage />);
    expect(screen.getByRole('list', { name: 'Customer journey' })).toHaveAttribute('tabindex', '0');
  });

  it('is not a Tab stop when it fits (desktop, where it wraps)', () => {
    layOut(1216, 1216);
    renderAt(<SocialEngineeringHubPage />);
    expect(screen.getByRole('list', { name: 'Customer journey' })).not.toHaveAttribute('tabindex');
  });
});

describe('step timeline markers', () => {
  it('uses the icon tiles on the hub and amber nodes on service pages', () => {
    const { container, unmount } = renderAt(<SocialEngineeringHubPage />);
    expect(container.querySelector('.nwse-timeline')).toHaveAttribute('data-markers', 'icon');
    unmount();
    const service = renderAt(<SocialEngineeringServicePage slug={divisionServices[0].slug} />);
    expect(service.container.querySelector('.nwse-timeline')).toHaveAttribute('data-markers', 'node');
  });
});

describe('shared contact form hooks', () => {
  it('exposes the data-contact-* hooks the division restyles on small screens', () => {
    renderAt(<SocialEngineeringContactPage />);
    const section = document.getElementById('contact')!;
    expect(section).toHaveAttribute('data-contact-section');
    expect(section.querySelector('[data-contact-intro]')).toHaveTextContent('Tell us about the business');
    const methods = section.querySelector('[data-contact-methods]')!;
    const rows = methods.querySelectorAll('[data-contact-method]');
    expect(rows).toHaveLength(3);
    // Call and Email each hold one link, which division.css stretches over the row.
    expect(rows[0].querySelector('a')?.getAttribute('href')).toMatch(/^tel:/);
    expect(rows[1].querySelector('a')?.getAttribute('href')).toMatch(/^mailto:/);
  });
});

describe('desktop guard: division.css', () => {
  // Component classes and hooks added for phones and tablets. Every rule that
  // names one must sit in a max-width query, so none of them can reach ≥1024px.
  const SMALL_SCREEN = /\.nwse-(actions|rowlist|labelrows|hairlines|timeline|roadmap|journey|cardlabel|familycard)\b|\[data-contact-|\.input-light/;

  it('keeps every small-screen component rule inside a max-width query below 1024px', () => {
    const offenders: string[] = [];
    let found = 0;
    divisionCss.walkRules((rule: Rule) => {
      if (!SMALL_SCREEN.test(rule.selector)) return;
      found += 1;
      const media = mediaOf(rule);
      const maxWidth = /^\(max-width: (\d+(?:\.\d+)?)px\)$/.exec(media);
      if (!maxWidth || Number(maxWidth[1]) >= 1024) offenders.push(`${media || '(top level)'} ${rule.selector}`);
    });
    expect(found).toBeGreaterThan(20);
    expect(offenders).toEqual([]);
  });

  it('caps every short-screen (max-height) query below 1024px wide, in division.css and type.css', () => {
    const typeCss = postcss.parse(readFileSync(path.resolve(__dirname, 'type.css'), 'utf8'));
    const heightQueries: string[] = [];
    [divisionCss, typeCss].forEach((sheet) =>
      sheet.walkAtRules('media', (rule: AtRule) => {
        if (rule.params.includes('height')) heightQueries.push(rule.params);
      }),
    );
    expect(heightQueries).toEqual([LANDSCAPE_PHONE, LANDSCAPE_PHONE]);
  });

  it('leaves the shared .nwse-card, .nwse-btn, and .nwse-icon rules unscoped and unchanged in shape', () => {
    const base = new Map<string, string[]>();
    divisionCss.walkRules(/^\.nwse-(card|btn|icon)$/, (rule: Rule) => {
      expect(mediaOf(rule)).toBe('');
      const props: string[] = [];
      rule.walkDecls((decl) => {
        props.push(decl.prop);
      });
      base.set(rule.selector, props);
    });
    expect(Object.fromEntries(base)).toEqual({
      '.nwse-btn': ['align-items', 'border-radius', 'display', 'font-weight', 'gap', 'justify-content', 'padding', 'transition'],
      '.nwse-card': ['background', 'border', 'border-radius'],
      '.nwse-icon': ['align-items', 'background', 'border-radius', 'color', 'display', 'justify-content'],
    });
  });
});
