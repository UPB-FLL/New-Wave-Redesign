// The line-art scenes on the division pages (motion/, placed by
// components/sections.tsx): which page shows which scene and where, that every
// scene is decorative, that a slot reserves its 3:2 box and loads nothing until
// it nears the viewport, that reduced motion gets the static final frame, and
// that no New Wave IT source can reach the motion code.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AtRule } from 'postcss';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { divisionServices, hubContent } from './content';
import { PAGE_SCENES, SCENE_PAGE_KEYS, type ScenePageKey } from './motion/scenes';
import { SceneSlot } from './motion/scenes/SceneSlot';
import SocialEngineeringContactPage from './pages/SocialEngineeringContactPage';
import SocialEngineeringContactUsPage from './pages/SocialEngineeringContactUsPage';
import SocialEngineeringCustomersPage from './pages/SocialEngineeringCustomersPage';
import SocialEngineeringHubPage from './pages/SocialEngineeringHubPage';
import SocialEngineeringServicePage from './pages/SocialEngineeringServicePage';
import { DIVISION_PRIMARY_CTA } from './site';
import { stubReducedMotion } from '../../test/reducedMotion';

vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

let reducedMotion: ReturnType<typeof stubReducedMotion>;

/** An IntersectionObserver that never reports anything (the slot stays far from the viewport). */
class FarAwayObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** An IntersectionObserver that reports every observed element fully in view, straight away. */
class InViewObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    const entry = {
      target,
      isIntersecting: true,
      intersectionRatio: 1,
      rootBounds: { height: 800 },
      intersectionRect: { height: 320 },
    } as unknown as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  reducedMotion = stubReducedMotion(false);
  vi.stubGlobal('IntersectionObserver', FarAwayObserver);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderAt = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const classesOf = (element: Element | null) => (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
/**
 * True for a class with a variant (md, an arbitrary width, an arbitrary media
 * query): a colon outside brackets. Arbitrary values and properties keep their
 * colons inside the brackets.
 */
const hasVariant = (name: string) => name.replace(/\[[^\]]*\]/g, '[]').includes(':');
const scenesIn = (container: HTMLElement) => [...container.querySelectorAll('[data-page-scene]')];

/** Tailwind's landscape-phone tier (below lg, at most 500px tall), as in DivisionHero. */
const LANDSCAPE_HIDDEN = 'max-lg:[@media(max-height:500px)]:hidden';
const SMALL_PHONE_HIDDEN = 'max-[374.98px]:hidden';
/**
 * The hero's scene layout switches at em widths (md, lg, and xl at the default
 * text size), like the header's menu, so it scales with enlarged text.
 */
const ROW = '[@media(min-width:48em)]:';
const GRID = '[@media(min-width:64em)]:';
const WIDE = '[@media(min-width:80em)]:';
const BELOW_GRID_HIDDEN = '[@media_not_all_and_(min-width:64em)]:hidden';
const BESIDE_H1 = `${GRID}[--nwse-type-display-1-size:var(--nwse-type-display-1-beside-size)]`;
/** The hero grid's scene column per DivisionHero `sceneSize`. */
const SCENE_COLUMNS = {
  large: [`${GRID}grid-cols-[minmax(0,1fr)_minmax(0,20rem)]`, `${WIDE}grid-cols-[minmax(0,1fr)_minmax(0,30rem)]`],
  compact: [`${GRID}grid-cols-[minmax(0,1fr)_minmax(0,16rem)]`, `${WIDE}grid-cols-[minmax(0,1fr)_minmax(0,22rem)]`],
};

const PAGES_WITH_SCENES: [string, () => React.ReactElement, ScenePageKey[]][] = [
  ['hub', () => <SocialEngineeringHubPage />, ['hub', 'hubSection']],
  ...divisionServices.map((service): [string, () => React.ReactElement, ScenePageKey[]] => [
    service.slug,
    () => <SocialEngineeringServicePage slug={service.slug} />,
    [service.slug as ScenePageKey],
  ]),
  ['contact', () => <SocialEngineeringContactPage />, ['contact']],
];

describe('scene placement', () => {
  it.each(PAGES_WITH_SCENES)('%s renders its scenes, decoratively', (_name, page, keys) => {
    const { container } = renderAt(page());
    const scenes = scenesIn(container);
    expect(scenes.map((element) => element.getAttribute('data-page-scene'))).toEqual(keys);
    scenes.forEach((element) => {
      expect(element).toHaveAttribute('aria-hidden', 'true');
      expect(element.querySelector('a, button, input, select, textarea, [tabindex]')).toBeNull();
      expect(element.textContent?.trim()).toBe('');
      // The slot holds the scene's 3:2 box before anything loads.
      const slot = element.querySelector('[data-scene-slot]') as HTMLElement;
      expect(slot).toHaveAttribute('aria-hidden', 'true');
      expect(slot.style.aspectRatio).toBe('3 / 2');
    });
  });

  it.each(PAGES_WITH_SCENES)('%s puts its hero scene after the hero text and actions, beside them from lg', (_name, page, [heroKey]) => {
    const { container } = renderAt(page());
    const hero = container.querySelector('main > section')!;
    const scene = hero.querySelector(`[data-page-scene="${heroKey}"]`)!;
    expect(scene).not.toBeNull();
    // DOM order: H1 and summary, then the actions, then the scene (the phone order).
    const h1 = within(hero as HTMLElement).getByRole('heading', { level: 1 });
    expect(h1.compareDocumentPosition(scene) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const cta = within(hero as HTMLElement).queryByRole('link', { name: new RegExp(DIVISION_PRIMARY_CTA) });
    if (cta) expect(cta.compareDocumentPosition(scene) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // From 48em (md): the scene beside the actions (one flex row, capped near
    // the summary's measure). From 64em (lg): a two-column grid, text and
    // actions | scene, with the H1 at display-1-beside.
    const row = scene.parentElement!;
    expect(classesOf(row)).toEqual(expect.arrayContaining([`${ROW}flex`, `${ROW}max-w-[44rem]`, `${GRID}contents`]));
    const grid = row.parentElement!;
    expect(classesOf(grid)).toEqual(expect.arrayContaining([`${GRID}grid`, BESIDE_H1]));
    expect(grid.firstElementChild).toContainElement(h1);
    if (cta) expect(row).toContainElement(cta);
    expect(classesOf(scene)).toEqual(expect.arrayContaining([`${GRID}col-start-2`, `${GRID}row-span-2`, `${GRID}self-center`, LANDSCAPE_HIDDEN]));
  });

  it('shows the hub hero scene on every phone, a service scene from 375px, and the contact scene only beside the text', () => {
    const hub = renderAt(<SocialEngineeringHubPage />);
    const hubHero = classesOf(hub.container.querySelector('[data-page-scene="hub"]'));
    expect(hubHero).not.toContain(SMALL_PHONE_HIDDEN);
    expect(hubHero).not.toContain(BELOW_GRID_HIDDEN);
    expect(hubHero.filter((name) => name.endsWith(':hidden'))).toEqual([LANDSCAPE_HIDDEN]);
    hub.unmount();

    for (const service of divisionServices) {
      const page = renderAt(<SocialEngineeringServicePage slug={service.slug} />);
      const classes = classesOf(page.container.querySelector(`[data-page-scene="${service.slug}"]`));
      expect(classes).toContain(SMALL_PHONE_HIDDEN);
      expect(classes).not.toContain(BELOW_GRID_HIDDEN);
      page.unmount();
    }

    // The contact hero has no actions to sit beside, so its scene shows only
    // where the grid puts it beside the text (from 64em).
    const contact = renderAt(<SocialEngineeringContactPage />);
    expect(classesOf(contact.container.querySelector('[data-page-scene="contact"]'))).toContain(BELOW_GRID_HIDDEN);
  });

  it('the division doc gives the landscape no-scene tier as the markup applies it: below 1024px wide, at most 500px tall', () => {
    // LANDSCAPE_HIDDEN is max-lg + max-height:500px, with no lower width bound:
    // a 568 × 320 phone hides the scene too, not only 640–1023px.
    const doc = readFileSync(path.resolve(__dirname, '../../../docs/social-engineering-division.md'), 'utf8');
    const motion = doc.slice(doc.indexOf('## Motion'));
    const bullet = motion.slice(motion.indexOf('- **Landscape phones**'), motion.indexOf('\n- **', motion.indexOf('- **Landscape phones**') + 1));
    expect(bullet).toMatch(/below 1024px wide and at most 500px tall/);
    expect(bullet).not.toMatch(/\(640–1023px wide/);
    expect(LANDSCAPE_HIDDEN).toBe('max-lg:[@media(max-height:500px)]:hidden');
  });

  it('the division doc gives the enlarged-text layout as the em switches apply it, and the Phones section points at that bullet', () => {
    const doc = readFileSync(path.resolve(__dirname, '../../../docs/social-engineering-division.md'), 'utf8');
    const motion = doc.slice(doc.indexOf('## Motion'));
    const bulletAt = (text: string, title: string) => {
      const start = text.indexOf(`- **${title}.**`);
      expect(start, title).toBeGreaterThanOrEqual(0);
      return text.slice(start, text.indexOf('\n- **', start + 1)).replace(/\s+/g, ' ');
    };
    const enlarged = bulletAt(motion, 'Enlarged text');
    // ROW, GRID, and WIDE are 48, 64, and 80em: under 200% text (32px) and 150% (24px) these widths.
    expect([ROW, GRID, WIDE]).toEqual(['[@media(min-width:48em)]:', '[@media(min-width:64em)]:', '[@media(min-width:80em)]:']);
    const at = (em: number, textPx: number) => em * textPx;
    expect(enlarged).toContain(`Under 200% text they are ${at(48, 32)}, ${at(64, 32)}, and ${at(80, 32)}px`);
    // The row is on from 48em, so the scene sits beside the actions well before the grid: it stacks only below 48em.
    expect(enlarged).toContain(`below ${at(48, 32)}px the scene stacks under the actions, from ${at(48, 32)}px it sits right of them`);
    expect(enlarged).toContain(`from ${at(64, 32)}px the grid puts it beside the text`);
    expect(enlarged).toContain(`under 150% text the same happens at ${at(48, 24)}, ${at(64, 24)}, and ${at(80, 24)}px`);
    expect(enlarged).not.toMatch(/until the grid has room/);

    // The Phones section's own "Enlarged text" bullet sends the reader to the one that describes the switches.
    const phones = doc.slice(doc.indexOf('## Phones and tablets'), doc.indexOf('\n## ', doc.indexOf('## Phones and tablets') + 1));
    const [, target] = bulletAt(phones, 'Enlarged text').match(/\(see "([^"]+)" under Motion\)/) ?? [];
    expect(target).toBe('Enlarged text');
    expect(bulletAt(motion, target)).toContain('[@media(min-width:48em)]:');
  });

  it('counts a class as responsive when it has a variant outside brackets, arbitrary widths included', () => {
    // Tailwind's content scan reads test files too, so every class written out
    // here is one the site already has; the min-[…] one is built from parts,
    // so it generates no CSS.
    const arbitraryMinWidth = ['min', '[768px]:flex'].join('-');
    const responsive = ['sm:mt-10', 'md:flex', arbitraryMinWidth, SMALL_PHONE_HIDDEN, `${GRID}grid`, SCENE_COLUMNS.large[0], BESIDE_H1, LANDSCAPE_HIDDEN, BELOW_GRID_HIDDEN];
    const plain = ['mt-4', 'max-w-[18rem]', 'grid-cols-[minmax(0,1fr)_minmax(0,20rem)]', '[--nwse-type-display-1-size:var(--nwse-type-display-1-beside-size)]'];
    expect(responsive.filter((name) => !hasVariant(name))).toEqual([]);
    expect(plain.filter(hasVariant)).toEqual([]);
  });

  it.each(PAGES_WITH_SCENES)(
    '%s switches its hero scene layout at em widths, like the header, so enlarged text keeps the text column’s measure',
    (_name, page, [heroKey]) => {
      // Tailwind's md/lg/xl are px, but the scene's row and column are rem: at
      // 200% text a px switch let a 30rem column take a 1280px row (a 64px
      // text column). Every class that places the scene, the grid, or the
      // row must switch at 48/64/80em instead, and an arbitrary px width
      // (`min-[768px]:`, `max-[1023.98px]:`) is a px switch too. The only px
      // variants left are the phone tiers (sm, below 375px, landscape phones)
      // and the footnote's lg:block, which the hero shows from 1024px with or
      // without a scene.
      const { container } = renderAt(page());
      const scene = container.querySelector(`main > section [data-page-scene="${heroKey}"]`)!;
      const row = scene.parentElement!;
      const grid = row.parentElement!;
      const placed = [grid, grid.firstElementChild!, row, ...row.children, ...[...grid.children].filter((child) => child !== row && child !== grid.firstElementChild)];
      const responsive = placed.flatMap((element) => classesOf(element)).filter(hasVariant);
      expect(responsive.length).toBeGreaterThan(10);
      const pxPhoneTiers = /^(sm:|max-\[374\.98px\]:|max-lg:\[@media\(max-height:500px\)\]:)/;
      const emSwitch = /^\[@media(\(min-width:(48|64|80)em\)|_not_all_and_\(min-width:64em\))\]:/;
      const offenders = responsive.filter((name) => !pxPhoneTiers.test(name) && !emSwitch.test(name) && name !== 'lg:block');
      expect(offenders).toEqual([]);
      // In particular, no px md/lg/xl class, and no arbitrary px width, places the scene or the grid.
      expect(
        responsive.filter((name) => /^(md|lg|xl|max-md|max-lg|max-xl|min-\[|max-\[)/.test(name) && !pxPhoneTiers.test(name) && name !== 'lg:block'),
      ).toEqual([]);
    },
  );

  it('gives the contact hero and digital oversight’s long headline the compact scene column, the rest the large one', () => {
    const gridOf = (container: HTMLElement, key: string) => container.querySelector(`[data-page-scene="${key}"]`)!.parentElement!.parentElement!;
    const cases: [string, () => React.ReactElement, keyof typeof SCENE_COLUMNS][] = [
      ['hub', () => <SocialEngineeringHubPage />, 'large'],
      ...divisionServices.map((service): [string, () => React.ReactElement, keyof typeof SCENE_COLUMNS] => [
        service.slug,
        () => <SocialEngineeringServicePage slug={service.slug} />,
        service.slug === 'digital-oversight' ? 'compact' : 'large',
      ]),
      ['contact', () => <SocialEngineeringContactPage />, 'compact'],
    ];
    for (const [key, page, size] of cases) {
      const { container, unmount } = renderAt(page());
      const other = size === 'large' ? 'compact' : 'large';
      const classes = classesOf(gridOf(container, key));
      expect(classes, key).toEqual(expect.arrayContaining(SCENE_COLUMNS[size]));
      SCENE_COLUMNS[other].forEach((name) => expect(classes, key).not.toContain(name));
      unmount();
    }
  });

  it('knocks the hero currents out behind each hero scene, and only there', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const hero = container.querySelector('[data-page-scene="hub"]') as HTMLElement;
    expect(hero.style.background).toContain('radial-gradient');
    expect(hero.style.background).toContain('var(--nw-deep-current)');
    expect((container.querySelector('[data-page-scene="hubSection"]') as HTMLElement).style.background).toBe('');
  });

  it('fills the empty sixth cell of the hub’s "What we gather" grid from lg, and only there', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const band = screen.getByRole('region', { name: 'Every touchpoint, mapped to the customer journey' });
    const scene = band.querySelector('[data-page-scene="hubSection"]')!;
    expect(scene).not.toBeNull();
    expect(classesOf(scene)).toEqual(expect.arrayContaining(['hidden', 'lg:block', 'lg:col-start-3', 'lg:row-start-2']));
    // The cards keep their list; the scene is outside it, on the list's subgrid.
    const list = band.querySelector('ul.nwse-hairlines')!;
    expect(list.children).toHaveLength(hubContent.dataWeGather.length);
    expect(hubContent.dataWeGather).toHaveLength(5);
    expect(list).not.toContainElement(scene as HTMLElement);
    // Placed explicitly at the first row, so the scene's cell can overlap its empty corner.
    expect(classesOf(list)).toEqual(
      expect.arrayContaining(['lg:grid-cols-subgrid', 'lg:grid-rows-subgrid', 'lg:col-start-1', 'lg:col-span-3', 'lg:row-start-1', 'lg:row-span-2']),
    );
    expect(scenesIn(container)).toHaveLength(2);
  });

  it.each([
    ['customers', () => <SocialEngineeringCustomersPage />],
    ['contact-us', () => <SocialEngineeringContactUsPage />],
  ])('%s has no scene, and its hero keeps the full-size H1', (_name, page) => {
    const { container } = renderAt(page());
    expect(container.querySelector('[data-page-scene], [data-scene-slot], [data-scene]')).toBeNull();
    expect(container.innerHTML).not.toContain('display-1-beside');
  });
});

describe('the hero scene layout’s CSS', () => {
  it('switches at 48em, 64em, and 80em: md, lg, and xl at the default text size, in the same cascade order', async () => {
    // At the default 16px text the em switches fall exactly on the project's
    // md/lg/xl screens, and each one must come after the px screens and after
    // the narrower em switch (a later rule wins), so the default layout is the
    // one the px classes gave. Compiles sections.tsx's classes with the
    // project's Tailwind config, and reads its resolved screens, so a changed
    // md, lg, or xl fails here. Tailwind sorts arbitrary variants by their
    // text, not their width: 48em, 64em, and 80em happen to sort by width, and
    // the order checks below hold them to it.
    const { default: postcssRunner } = await import('postcss');
    const { default: tailwind } = await import('tailwindcss');
    const { default: resolveConfig } = await import('tailwindcss/resolveConfig.js');
    // The project's config (plain JS, no types: imported by path).
    const configPath = path.resolve(__dirname, '../../../tailwind.config.js');
    const { default: config } = (await import(/* @vite-ignore */ configPath)) as { default: import('tailwindcss').Config };
    const source = readFileSync(path.join(__dirname, 'components', 'sections.tsx'), 'utf8');
    const { root } = await postcssRunner([
      tailwind({ ...config, content: [{ raw: source, extension: 'tsx' }], corePlugins: { preflight: false } }),
    ]).process('@tailwind utilities;', { from: undefined });
    // Tailwind emits `[@media(min-width:48em)]` as an at-rule named
    // "media(min-width:48em)" (no space), so read name and params together.
    const mediaQuery = (rule: AtRule) => (rule.name.startsWith('media') ? `${rule.name.slice('media'.length)} ${rule.params}`.replace(/\s+/g, '') : null);
    const queries: string[] = [];
    root.walkAtRules((rule) => {
      const query = mediaQuery(rule);
      if (query !== null) queries.push(query);
    });
    const at = (query: string) => {
      const index = queries.indexOf(query);
      expect(index, query).toBeGreaterThanOrEqual(0);
      return index;
    };
    const screens = resolveConfig(config).theme.screens as Record<string, string>;
    expect([screens.md, screens.lg, screens.xl]).toEqual([`${48 * 16}px`, `${64 * 16}px`, `${80 * 16}px`]);
    expect(at('(min-width:48em)')).toBeGreaterThan(at(`(min-width:${screens.xl})`));
    expect(at('(min-width:64em)')).toBeGreaterThan(at('(min-width:48em)'));
    expect(at('(min-width:80em)')).toBeGreaterThan(at('(min-width:64em)'));
    // The row turns into the grid's contents at 64em, after it became a flex row at 48em.
    const displayAt = (query: string, selector: string) => {
      let value: string | undefined;
      root.walkAtRules((rule) => {
        if (mediaQuery(rule) !== query) return;
        rule.walkRules((r) => {
          if (r.selector.includes(selector)) r.walkDecls('display', (decl) => void (value = decl.value));
        });
      });
      return value;
    };
    expect(displayAt('(min-width:48em)', '\\:flex')).toBe('flex');
    expect(displayAt('(min-width:64em)', '\\:contents')).toBe('contents');
    expect(displayAt('(min-width:64em)', '\\:grid')).toBe('grid');
    expect(displayAt('notalland(min-width:64em)', '\\:hidden')).toBe('none');
  });
});

describe('scene loading', () => {
  it('reserves the 3:2 box and loads nothing while the slot is far from the viewport (or hidden)', async () => {
    const { container } = render(<SceneSlot page="hub" tone="dark" />);
    const waiting = container.querySelector('[data-scene-slot="waiting"]') as HTMLElement;
    expect(waiting).toHaveAttribute('aria-hidden', 'true');
    expect(waiting.style.aspectRatio).toBe('3 / 2');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(container.querySelector('[data-scene]')).toBeNull();
    expect(container.querySelector('[data-scene-slot="waiting"]')).not.toBeNull();
  });

  it('loads the scene once the slot nears the viewport', async () => {
    vi.stubGlobal('IntersectionObserver', InViewObserver);
    const { container } = render(<SceneSlot page="contact" tone="dark" />);
    await waitFor(() => expect(container.querySelector('[data-scene]')).not.toBeNull());
    expect(container.querySelector('[data-scene-slot]')).toBeNull();
    expect(container.querySelector('[data-scene] svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(SCENE_PAGE_KEYS)('%s: reduced motion renders the static final frame, identical to forceStatic', async (key) => {
    vi.stubGlobal('IntersectionObserver', InViewObserver);
    const forced = render(<SceneSlot page={key} tone={key === 'hubSection' ? 'light' : 'dark'} forceStatic />);
    await waitFor(() => expect(forced.container.querySelector('[data-scene-state="static"]')).not.toBeNull());
    const finalFrame = forced.container.querySelector('[data-scene] svg')!.innerHTML;
    forced.unmount();

    reducedMotion.set(true);
    const reduced = render(<SceneSlot page={key} tone={key === 'hubSection' ? 'light' : 'dark'} />);
    await waitFor(() => expect(reduced.container.querySelector('[data-scene]')).not.toBeNull());
    const frame = reduced.container.querySelector('[data-scene]')!;
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame.querySelector('svg')!.innerHTML).toBe(finalFrame);
  });

  it('under reduced motion, a page’s hero shows its scene’s static final frame', async () => {
    vi.stubGlobal('IntersectionObserver', InViewObserver);
    reducedMotion.set(true);
    const { container } = renderAt(<SocialEngineeringHubPage />);
    await waitFor(() => expect(container.querySelector('[data-page-scene="hub"] [data-scene]')).not.toBeNull());
    expect(container.querySelector('[data-page-scene="hub"] [data-scene]')).toHaveAttribute('data-scene-state', 'static');
    await waitFor(() => expect(container.querySelector('[data-page-scene="hubSection"] [data-scene]')).not.toBeNull());
    const section = container.querySelector('[data-page-scene="hubSection"] [data-scene]')!;
    expect(section).toHaveAttribute('data-scene-state', 'static');
    expect(section).toHaveAttribute('data-scene-tone', 'light');
  });
});

describe('motion code boundaries', () => {
  const srcRoot = path.resolve(__dirname, '../..');
  const divisionRoot = __dirname;
  const motionRoot = path.join(divisionRoot, 'motion');

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return /\.(ts|tsx|js|jsx)$/.test(entry) ? [full] : [];
    });
  }

  /** Every module specifier a file imports: static, dynamic, re-exports, and require(). */
  const specifiers = (file: string) =>
    [
      ...readFileSync(file, 'utf8').matchAll(
        /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"]+)['"]/g,
      ),
    ].map((match) => match[1]);

  /** The absolute path a relative specifier points at ('' for packages). */
  const resolved = (file: string, specifier: string) =>
    specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : '';

  const isUnder = (target: string, dir: string) => target === dir || target.startsWith(`${dir}${path.sep}`);

  it('no New Wave IT source imports the motion folder', () => {
    const itFiles = sourceFiles(srcRoot).filter((file) => !isUnder(file, divisionRoot));
    expect(itFiles.length).toBeGreaterThan(100);
    const offenders = itFiles.flatMap((file) =>
      specifiers(file)
        .filter((specifier) => isUnder(resolved(file, specifier), motionRoot) || /socialEngineering\/motion/.test(specifier))
        .map((specifier) => `${path.relative(srcRoot, file)} -> ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });

  /** A relative specifier resolved to a source file, or null (packages, CSS, assets). */
  const sourceFileFor = (file: string, specifier: string) => {
    if (!specifier.startsWith('.')) return null;
    const base = path.resolve(path.dirname(file), specifier);
    const candidates = [base, ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'].map((suffix) => base + suffix)];
    return candidates.find((candidate) => /\.(ts|tsx|js|jsx)$/.test(candidate) && statSync(candidate, { throwIfNoEntry: false })?.isFile()) ?? null;
  };

  /**
   * The modules a file pulls in statically, as the bundler sees them: imports,
   * side-effect imports, and re-exports, but not `import type` / `export type`
   * (erased) and not `import()` (a separate lazy chunk).
   */
  const staticImports = (file: string) => {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, false, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const found: string[] = [];
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause;
        const bindings = clause?.namedBindings;
        const typeOnly =
          clause?.isTypeOnly ||
          (clause && !clause.name && bindings && ts.isNamedImports(bindings) && bindings.elements.length > 0 && bindings.elements.every((element) => element.isTypeOnly));
        if (!typeOnly && ts.isStringLiteral(statement.moduleSpecifier)) found.push(statement.moduleSpecifier.text);
      } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && !statement.isTypeOnly && ts.isStringLiteral(statement.moduleSpecifier)) {
        found.push(statement.moduleSpecifier.text);
      }
    }
    return found.map((specifier) => sourceFileFor(file, specifier)).filter((target): target is string => target !== null);
  };

  /**
   * Every module the roots pull into their chunks: the static import graph
   * (staticImports), walked to any depth. `chain(file)` names the path that
   * reached a file, for failure messages.
   */
  const walkStatic = (roots: string[]) => {
    const via = new Map<string, string | null>(roots.map((file) => [file, null]));
    const queue = [...roots];
    while (queue.length > 0) {
      const file = queue.shift()!;
      for (const target of staticImports(file)) {
        if (via.has(target)) continue;
        via.set(target, file);
        queue.push(target);
      }
    }
    const chain = (file: string) => {
      const links: string[] = [];
      for (let at: string | null | undefined = file; at; at = via.get(at)) links.unshift(path.relative(srcRoot, at));
      return links.join(' -> ');
    };
    return { reached: [...via.keys()], chain };
  };

  it('no New Wave IT source reaches the motion folder through static imports, at any depth', () => {
    // Every IT module is the root of some chunk's static graph (the entry, or
    // an IT lazy route), so walk from all of them. Lazy import()s are separate
    // chunks (the division routes), so the walk does not follow them.
    const roots = sourceFiles(srcRoot).filter(
      (file) => !isUnder(file, divisionRoot) && !isUnder(file, path.join(srcRoot, 'test')) && !/\.test\.[jt]sx?$/.test(file),
    );
    const { reached, chain } = walkStatic(roots);
    expect(reached.filter((file) => isUnder(file, motionRoot)).map(chain)).toEqual([]);
    // The walk does cross into the division (App.tsx imports its routes and
    // site constants statically), so a leak through those files would show.
    expect(reached.map((file) => path.relative(divisionRoot, file))).toEqual(expect.arrayContaining(['routes.tsx', 'site.ts']));
  });

  it('scenes author no class names, so Tailwind can skip the motion folder', () => {
    // tailwind.config.js leaves motion/ out of its content scan; a class
    // written there would silently get no CSS. Scenes take className from
    // components/sections.tsx instead.
    const literals = sourceFiles(motionRoot)
      .filter((file) => !/\.test\.tsx?$/.test(file))
      .flatMap((file) =>
        [...readFileSync(file, 'utf8').matchAll(/\bclassName\s*=\s*(?:["'`]|\{\s*["'`])/g)].map(() => path.relative(divisionRoot, file)),
      );
    expect(literals).toEqual([]);
    const config = readFileSync(path.resolve(srcRoot, '..', 'tailwind.config.js'), 'utf8');
    expect(config).toContain("'!./src/divisions/socialEngineering/motion/**'");
  });

  it('division pages reach the motion code only through the lazy scene registry', () => {
    // The engine and the scenes stay in their own lazy chunks: outside motion/,
    // only the registry (motion/scenes) and SceneSlot may be imported, and only
    // by the page sections and the pages themselves. Modules New Wave IT loads
    // (site.ts, routes.tsx, preload.ts, ...) must not.
    const allowed = new Set([path.join(motionRoot, 'scenes'), path.join(motionRoot, 'scenes', 'SceneSlot')]);
    const importers = (file: string) => file === path.join(divisionRoot, 'components', 'sections.tsx') || path.dirname(file) === path.join(divisionRoot, 'pages');
    const outside = sourceFiles(divisionRoot).filter((file) => !isUnder(file, motionRoot) && !/\.test\.tsx?$/.test(file));
    const imports = outside.flatMap((file) =>
      specifiers(file)
        .map((specifier) => resolved(file, specifier))
        .filter((target) => isUnder(target, motionRoot))
        .map((target) => [file, target] as const),
    );
    expect(imports.length).toBeGreaterThan(0);
    imports.forEach(([file, target]) => {
      const edge = `${path.relative(divisionRoot, file)} -> ${path.relative(divisionRoot, target)}`;
      expect(allowed.has(target), edge).toBe(true);
      expect(importers(file), edge).toBe(true);
    });
  });

  it('the registry and SceneSlot reach no other motion module statically: scenes, engine, and barrel stay lazy', () => {
    // The page sections load motion/scenes/index.ts and SceneSlot.tsx
    // statically, so whatever those two reach through imports, side-effect
    // imports, or re-exports (export … from, export * from) lands in the
    // chunk every division page loads (Customers and Contact us included).
    // The scenes, and through them the engine (SceneFrame, primitives, the
    // shared parts, the motion/index.ts barrel), must come only through
    // import(), so a page downloads only its own scene.
    const entries = [path.join(motionRoot, 'scenes', 'index.ts'), path.join(motionRoot, 'scenes', 'SceneSlot.tsx')];
    const { reached, chain } = walkStatic(entries);
    const motionReached = reached.filter((file) => isUnder(file, motionRoot));
    expect(motionReached.filter((file) => !entries.includes(file)).map(chain)).toEqual([]);
    expect(motionReached.sort()).toEqual([...entries].sort());
  });

  it('the registry loads every scene with import(), each through loadDecorativeChunk', () => {
    // Each PAGE_SCENES entry is scene(() => import('./<Name>Scene')), and
    // scene() hands the import to loadDecorativeChunk, so a scene chunk that
    // fails never triggers main.tsx's stale-chunk reload.
    const file = path.join(motionRoot, 'scenes', 'index.ts');
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const dynamicImports: ts.CallExpression[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) dynamicImports.push(node);
      ts.forEachChild(node, visit);
    };
    visit(source);
    const targets = dynamicImports.map((call) => (call.arguments[0] as ts.StringLiteral).text);
    expect(targets).toHaveLength(Object.keys(PAGE_SCENES).length);
    targets.forEach((target) => expect(target).toMatch(/^\.\/\w+Scene$/));
    // Each import() is the whole body of an arrow passed to scene(...).
    dynamicImports.forEach((call) => {
      const arrow = call.parent;
      expect(ts.isArrowFunction(arrow) && arrow.body === call).toBe(true);
      const wrapper = arrow.parent;
      expect(ts.isCallExpression(wrapper) && ts.isIdentifier(wrapper.expression) && wrapper.expression.text === 'scene').toBe(true);
    });
    // And scene() is lazy(() => loadDecorativeChunk(load)), imported from lib/chunkReload.
    const sceneHelper = source.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => statement.declarationList.declarations)
      .find((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'scene');
    expect(sceneHelper?.initializer?.getText(source).replace(/\s+/g, ' ')).toMatch(/=> lazy\(\(\) => loadDecorativeChunk\(load\)\)$/);
    expect(staticImports(file)).toContain(path.join(srcRoot, 'lib', 'chunkReload.ts'));
  });
});
