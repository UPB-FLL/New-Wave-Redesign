import { readFileSync } from 'node:fs';
import path from 'node:path';
import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DivisionCurrents } from './components/DivisionCurrents';
import { divisionServices } from './content';
import SocialEngineeringContactPage from './pages/SocialEngineeringContactPage';
import SocialEngineeringContactUsPage from './pages/SocialEngineeringContactUsPage';
import SocialEngineeringCustomersPage from './pages/SocialEngineeringCustomersPage';
import SocialEngineeringHubPage from './pages/SocialEngineeringHubPage';
import SocialEngineeringServicePage from './pages/SocialEngineeringServicePage';

vi.mock('../../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

const renderAt = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

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

const read = (file: string) => readFileSync(path.resolve(__dirname, file), 'utf8');
const divisionCss = postcss.parse(read('division.css'));
const brandCss = read('../../styles/brand.css');
const mediaOf = (rule: Rule) => (rule.parent?.type === 'atrule' ? (rule.parent as AtRule).params : '');

/** A colour token's value, from the stylesheet that defines it. */
const token = (css: string, name: string) => {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match) throw new Error(`${name} not found`);
  return match[1];
};

/** The section-ground currents: the SVG division.css paints behind light bands. */
const groundSvg = new DOMParser().parseFromString(read('components/bandCurrents.svg'), 'image/svg+xml');
const groundPaths = [...groundSvg.querySelectorAll('path')];

/** The rule a selector heads, and its declarations. */
const declsOf = (selector: string) => {
  const found: Record<string, string>[] = [];
  divisionCss.walkRules((rule: Rule) => {
    if (!rule.selectors.map((part) => part.trim()).includes(selector)) return;
    const decls: Record<string, string> = { '@media': mediaOf(rule) };
    rule.walkDecls((decl: Declaration) => {
      decls[decl.prop] = decl.value;
    });
    found.push(decls);
  });
  return found;
};

// WCAG 2 contrast, compositing a current over the ground as a browser does
// (in sRGB, to 8 bits).
const rgb = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const luminance = (channels: number[]) => {
  const [r, g, b] = channels.map((value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const over = (ground: number[], line: number[], alpha: number) => ground.map((value, index) => Math.round((1 - alpha) * value + alpha * line[index]));
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAGES: [string, () => React.ReactElement][] = [
  ['hub', () => <SocialEngineeringHubPage />],
  ...divisionServices.map((service): [string, () => React.ReactElement] => [service.slug, () => <SocialEngineeringServicePage slug={service.slug} />]),
  ['customers', () => <SocialEngineeringCustomersPage />],
  ['contact-us', () => <SocialEngineeringContactUsPage />],
  ['contact', () => <SocialEngineeringContactPage />],
];

describe('section grounds', () => {
  it('draws the division’s own currents, at a fixed line width', () => {
    const { container } = render(<DivisionCurrents />);
    const currents = [...container.querySelectorAll('path')];
    expect(groundSvg.documentElement.getAttribute('viewBox')).toBe(container.querySelector('svg')!.getAttribute('viewBox'));
    expect(groundPaths.map((line) => [line.getAttribute('d'), line.getAttribute('stroke')])).toEqual(
      currents.map((current) => [current.getAttribute('d'), current.getAttribute('stroke')]),
    );
    // Tall phone bands scale the image up to four times; the lines keep their width.
    groundPaths.forEach((line) => expect(line.getAttribute('vector-effect')).toBe('non-scaling-stroke'));
  });

  it.each(PAGES)('on %s, sets every light section on a ground division.css draws the currents on', (_name, page) => {
    const { container } = renderAt(page());
    const sections = [...container.querySelectorAll('main > section')];
    const light = sections.filter((section) => !section.classList.contains('nwse-dark'));
    expect(light.length).toBeGreaterThan(0);
    light.forEach((section) => {
      if (section.hasAttribute('data-contact-section')) return;
      expect(section).toHaveClass('nwse-band', 'relative');
      const tone = section.getAttribute('data-tone');
      // data-tone keys the mirrored, fainter currents to the Cloud White ground.
      expect((section as HTMLElement).style.background).toBe(tone === 'white' ? 'var(--nw-pure-white)' : 'var(--nw-cloud-white)');
    });
    // And every dark section carries the currents in its markup.
    sections
      .filter((section) => section.classList.contains('nwse-dark'))
      .forEach((section) => expect(section.querySelector(':scope > svg[data-role="division-currents"]')).not.toBeNull());
  });

  it('paints the currents behind the content, at every width, on light bands and the contact form’s section', () => {
    const [paint] = declsOf('.nwse-band::before');
    expect(paint).toMatchObject({
      '@media': '',
      background: "url('./components/bandCurrents.svg') center / cover no-repeat",
      content: "''",
      inset: '0',
      'pointer-events': 'none',
      position: 'absolute',
      'z-index': '-1',
    });
    expect(declsOf('.nwse-root [data-contact-section]::before')[0]).toEqual(paint);
    // A stacking context per section, so z-index -1 stays above its ground.
    expect(declsOf('.nwse-band')[0]).toMatchObject({ '@media': '', isolation: 'isolate' });
    expect(declsOf('.nwse-root [data-contact-section]')[0]).toMatchObject({ '@media': '', isolation: 'isolate' });
    // Cloud White grounds (light bands and the contact section): mirrored, fainter.
    const cloud = declsOf(".nwse-band[data-tone='light']::before")[0];
    expect(cloud).toMatchObject({ '@media': '', transform: 'scaleX(-1)' });
    expect(declsOf('.nwse-root [data-contact-section]::before')[1]).toEqual(cloud);
  });

  it('caps the currents so every text colour set on these grounds keeps 4.5:1 wherever one passes behind it', () => {
    const cloudOpacity = Number(declsOf(".nwse-band[data-tone='light']::before")[0].opacity);
    expect(cloudOpacity).toBeGreaterThan(0);
    expect(cloudOpacity).toBeLessThan(1);
    const grounds = [
      { name: 'Pure White', color: token(brandCss, '--nw-pure-white'), strength: 1 },
      { name: 'Cloud White', color: token(brandCss, '--nw-cloud-white'), strength: cloudOpacity },
    ];
    const texts = {
      'Current Navy (headings, body)': token(brandCss, '--nw-current-navy'),
      'Slate (body)': token(brandCss, '--nw-slate'),
      'Lure Amber Deep (kickers, links, required marks)': token(read('division.css'), '--nwse-lure-amber-deep'),
      'Contact form errors': '#b42318',
    };
    const failures: string[] = [];
    let checked = 0;
    for (const ground of grounds) {
      for (const line of groundPaths) {
        const alpha = Number(line.getAttribute('stroke-opacity')) * ground.strength;
        const behind = over(rgb(ground.color), rgb(line.getAttribute('stroke')!), alpha);
        for (const [text, color] of Object.entries(texts)) {
          checked += 1;
          const ratio = contrast(rgb(color), behind);
          if (ratio < 4.5) failures.push(`${text} over ${line.getAttribute('stroke')} on ${ground.name}: ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(checked).toBe(24);
    expect(failures).toEqual([]);
  });

  it('keeps the step timeline’s band plain on phones, where its Tide Blue labels sit on the ground with no contrast to spare', () => {
    const tide = rgb(token(brandCss, '--nw-tide-blue'));
    const cloudOpacity = Number(declsOf(".nwse-band[data-tone='light']::before")[0].opacity);
    // 4.80:1 on Pure White and 4.57:1 on Cloud White: any of the currents
    // behind a label would take it below 4.5:1 on either ground.
    [
      { ground: rgb(token(brandCss, '--nw-pure-white')), strength: 1 },
      { ground: rgb(token(brandCss, '--nw-cloud-white')), strength: cloudOpacity },
    ].forEach(({ ground, strength }) => {
      expect(contrast(tide, ground)).toBeGreaterThanOrEqual(4.5);
      groundPaths.forEach((line) => {
        const alpha = Number(line.getAttribute('stroke-opacity')) * strength;
        expect(contrast(tide, over(ground, rgb(line.getAttribute('stroke')!), alpha))).toBeLessThan(4.5);
      });
    });

    // The labels sit on the ground exactly where the timeline layout applies,
    // below 768px, and the band drops the currents at exactly those widths.
    const timelineMedia = new Set<string>();
    divisionCss.walkRules(/\.nwse-timeline/, (rule: Rule) => {
      if (!rule.selector.startsWith('.nwse-band')) timelineMedia.add(mediaOf(rule));
    });
    expect([...timelineMedia]).toEqual(['(max-width: 767.98px)']);
    expect(declsOf('.nwse-band:has(.nwse-timeline)::before')).toEqual([{ '@media': '(max-width: 767.98px)', content: 'none' }]);

    // Every timeline is a band's direct content, so the :has() rule reaches it.
    [<SocialEngineeringHubPage />, <SocialEngineeringServicePage slug={divisionServices[0].slug} />].forEach((page) => {
      const { container, unmount } = renderAt(page);
      const timelines = [...container.querySelectorAll('.nwse-timeline')];
      expect(timelines).toHaveLength(1);
      expect(timelines[0].closest('section')).toHaveClass('nwse-band');
      unmount();
    });
  });

  it('leaves the currents out in forced colours, with the grounds they belong to', () => {
    const forced = declsOf('.nwse-band::before').filter((decls) => decls['@media'] === '(forced-colors: active)');
    expect(forced).toEqual([{ '@media': '(forced-colors: active)', content: 'none' }]);
    expect(declsOf('.nwse-root [data-contact-section]::before').filter((decls) => decls['@media'] === '(forced-colors: active)')).toEqual(forced);
  });

  it('gives the hub’s metrics band the hero’s currents', () => {
    const { container } = renderAt(<SocialEngineeringHubPage />);
    const dark = [...container.querySelectorAll('main > section.nwse-dark')];
    // Hero, metrics, and the closing call to action.
    expect(dark).toHaveLength(3);
    const [hero, metrics] = dark.map((section) => section.querySelector(':scope > svg[data-role="division-currents"]')!);
    expect(metrics.outerHTML).toBe(hero.outerHTML);
    expect(dark[1]).toHaveClass('relative');
    // The content sits above the currents.
    expect(dark[1].querySelector(':scope > div')).toHaveClass('relative');
  });
});
