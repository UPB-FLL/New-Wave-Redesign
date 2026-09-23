// The line-art scenes on the division pages (motion/, placed by
// components/sections.tsx): which page shows which scene and where, that every
// scene is decorative, that a slot reserves its 3:2 box and loads nothing until
// it nears the viewport, that reduced motion gets the static final frame, and
// that no New Wave IT source can reach the motion code.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: vi.fn(() => false) }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: reducedMotion };
});
vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

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
  vi.stubGlobal('IntersectionObserver', FarAwayObserver);
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: '1.test' }), { status: 200 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
  reducedMotion.mockReturnValue(false);
});

const renderAt = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const classesOf = (element: Element | null) => (element?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const scenesIn = (container: HTMLElement) => [...container.querySelectorAll('[data-page-scene]')];

/** Tailwind's landscape-phone tier (below lg, at most 500px tall), as in DivisionHero. */
const LANDSCAPE_HIDDEN = 'max-lg:[@media(max-height:500px)]:hidden';
const SMALL_PHONE_HIDDEN = 'max-[374.98px]:hidden';
const BELOW_LG_HIDDEN = 'max-lg:hidden';
const BESIDE_H1 = 'lg:[--nwse-type-display-1-size:var(--nwse-type-display-1-beside-size)]';
/** The hero grid's scene column per DivisionHero `sceneSize`. */
const SCENE_COLUMNS = {
  large: ['lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]', 'xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]'],
  compact: ['lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]', 'xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'],
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
    // md: the scene beside the actions (one flex row, capped near the
    // summary's measure). From lg: a two-column grid, text and actions |
    // scene, with the H1 at display-1-beside.
    const row = scene.parentElement!;
    expect(classesOf(row)).toEqual(expect.arrayContaining(['md:flex', 'md:max-w-[44rem]', 'lg:contents']));
    const grid = row.parentElement!;
    expect(classesOf(grid)).toEqual(expect.arrayContaining(['lg:grid', BESIDE_H1]));
    expect(grid.firstElementChild).toContainElement(h1);
    if (cta) expect(row).toContainElement(cta);
    expect(classesOf(scene)).toEqual(expect.arrayContaining(['lg:col-start-2', 'lg:row-span-2', 'lg:self-center', LANDSCAPE_HIDDEN]));
  });

  it('shows the hub hero scene on every phone, a service scene from 375px, and the contact scene from lg', () => {
    const hub = renderAt(<SocialEngineeringHubPage />);
    const hubHero = classesOf(hub.container.querySelector('[data-page-scene="hub"]'));
    expect(hubHero).not.toContain(SMALL_PHONE_HIDDEN);
    expect(hubHero).not.toContain(BELOW_LG_HIDDEN);
    expect(hubHero.filter((name) => name.endsWith(':hidden'))).toEqual([LANDSCAPE_HIDDEN]);
    hub.unmount();

    for (const service of divisionServices) {
      const page = renderAt(<SocialEngineeringServicePage slug={service.slug} />);
      const classes = classesOf(page.container.querySelector(`[data-page-scene="${service.slug}"]`));
      expect(classes).toContain(SMALL_PHONE_HIDDEN);
      expect(classes).not.toContain(BELOW_LG_HIDDEN);
      page.unmount();
    }

    // The contact hero has no actions to sit beside, so its scene is desktop only.
    const contact = renderAt(<SocialEngineeringContactPage />);
    expect(classesOf(contact.container.querySelector('[data-page-scene="contact"]'))).toContain(BELOW_LG_HIDDEN);
  });

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

    reducedMotion.mockReturnValue(true);
    const reduced = render(<SceneSlot page={key} tone={key === 'hubSection' ? 'light' : 'dark'} />);
    await waitFor(() => expect(reduced.container.querySelector('[data-scene]')).not.toBeNull());
    const frame = reduced.container.querySelector('[data-scene]')!;
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame.querySelector('svg')!.innerHTML).toBe(finalFrame);
  });

  it('under reduced motion, a page’s hero shows its scene’s static final frame', async () => {
    vi.stubGlobal('IntersectionObserver', InViewObserver);
    reducedMotion.mockReturnValue(true);
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

  it('no New Wave IT source reaches the motion folder through static imports, at any depth', () => {
    // Every IT module is the root of some chunk's static graph (the entry, or
    // an IT lazy route), so walk from all of them. Lazy import()s are separate
    // chunks (the division routes), so the walk does not follow them.
    const roots = sourceFiles(srcRoot).filter(
      (file) => !isUnder(file, divisionRoot) && !isUnder(file, path.join(srcRoot, 'test')) && !/\.test\.[jt]sx?$/.test(file),
    );
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
    const reached = [...via.keys()];
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
    // And the registry loads every scene with import(), never statically.
    const registry = readFileSync(path.join(motionRoot, 'scenes', 'index.ts'), 'utf8');
    expect(registry).not.toMatch(/^import\s+(?!type\b|\{\s*lazy)[^;]*from\s+'\.\/\w+Scene'/m);
    expect([...registry.matchAll(/lazy\(\(\) => import\('\.\/(\w+)'\)\)/g)]).toHaveLength(Object.keys(PAGE_SCENES).length);
  });
});
