// The "Areas we serve" band: the home page's and /services' links to the local
// landing pages, which the footer alone linked before.

import { render } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { IT_PAGE_META } from '../lib/routeMeta';
import AreasWeServe from './AreasWeServe';

const SRC = path.resolve(__dirname, '..');
const read = (file: string) => readFileSync(path.join(SRC, file), 'utf8');
const links = (container: HTMLElement, selector: string) =>
  [...container.querySelectorAll(selector)].map((link) => [link.getAttribute('href'), link.textContent]);

/** The local pages and the hub, with the text each is linked by. */
const AREA_LINKS = [
  ['/it-support-fort-lauderdale', 'IT support in Fort Lauderdale'],
  ['/managed-it-services-fort-lauderdale', 'Managed IT services in Fort Lauderdale'],
  ['/managed-it-services-miami', 'Managed IT services in Miami'],
  ['/it-support-boca-raton', 'IT support in Boca Raton'],
  ['/managed-it-services-west-palm-beach', 'Managed IT services in West Palm Beach'],
  ['/managed-it-services-south-florida', 'South Florida service areas'],
];

function renderBand(currentPath?: string) {
  return render(
    <MemoryRouter>
      <AreasWeServe currentPath={currentPath} />
    </MemoryRouter>,
  ).container;
}

describe('AreasWeServe', () => {
  it('names the three counties and the office under one section title', () => {
    const container = renderBand();
    expect([...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) => [heading.tagName, heading.textContent])).toEqual([
      ['H2', 'Areas we serve'],
    ]);
    expect(container.querySelector('h2 + p')?.textContent).toBe(
      'New Wave IT works with businesses across Broward, Miami-Dade and Palm Beach counties from its office at 710 NW 5th Ave in Fort Lauderdale.',
    );
  });

  it('links each local page with text that says what and where', () => {
    expect(links(renderBand(), 'li a')).toEqual(AREA_LINKS);
  });

  it('links only pages the site has', () => {
    const container = renderBand();
    const hrefs = [...container.querySelectorAll('a')].map((link) => link.getAttribute('href') ?? '');
    expect(hrefs).toHaveLength(AREA_LINKS.length + 3);
    hrefs.forEach((href) => expect(Object.keys(IT_PAGE_META), href).toContain(href));
  });

  it('closes with the services, pricing and the blog, leaving out the page it sits on', () => {
    const home = renderBand();
    expect(home.querySelector('ul + p')?.textContent).toBe('Also see all IT services, pricing and the New Wave IT blog.');
    expect(links(home, 'ul + p a')).toEqual([
      ['/services', 'all IT services'],
      ['/pricing', 'pricing'],
      ['/blog', 'the New Wave IT blog'],
    ]);

    const services = renderBand('/services');
    expect(services.querySelector('ul + p')?.textContent).toBe('Also see pricing and the New Wave IT blog.');
    expect(services.querySelector('a[href="/services"]')).toBeNull();
  });

  it('follows the page layout rules: no label above the title, no word chips', () => {
    const container = renderBand();
    expect(container.querySelectorAll('.nw-kicker')).toHaveLength(0);
    expect([...container.querySelectorAll('.rounded-full')].filter((element) => /[A-Za-z]/.test(element.textContent ?? ''))).toEqual([]);
    // A white band like the page's others, unless a page asks for the base tone.
    expect(container.querySelector('section')?.className).toContain('bg-[var(--nw-pure-white)]');
    const base = render(<MemoryRouter><AreasWeServe tone="base" /></MemoryRouter>).container;
    expect(base.querySelector('section')?.className).not.toContain('bg-[var(--nw-pure-white)]');
  });
});

describe('where the band is mounted', () => {
  /** The components a page function returns, in order: `<Navbar />`, `<Hero />`, … */
  const composition = (source: string, name: string) => {
    const body = source.slice(source.indexOf(`function ${name}(`));
    const jsx = body.slice(body.indexOf('return ('), body.indexOf('\n}\n'));
    return [...jsx.matchAll(/<([A-Z]\w*)\b[^>]*\/>/g)].map((match) => match[1]);
  };

  it('sits after WhyUs and before the footer on the home page, in the app and in the build render alike', () => {
    const app = composition(read('App.tsx'), 'HomePage');
    expect(app).toEqual(['Navbar', 'Hero', 'TrustBar', 'Services', 'WhyUs', 'AreasWeServe', 'Footer']);
    // The static homepage is rendered from HomeBody: a band added to one and not the other
    // would show for a moment and then vanish, or never reach a reader without JavaScript.
    expect(composition(read('lib/prerenderBody.tsx'), 'HomeBody')).toEqual(app);
  });

  it('sits before the closing contact form on /services, without a link to /services', () => {
    const page = read('pages/ServicesPage.tsx');
    expect(page).toMatch(/<Services variant="page" showOtherSpecialties \/>\s*<AreasWeServe currentPath="\/services" \/>\s*<Contact \/>/);
  });

  it('is never rendered by a division page', () => {
    // The division names no home market (src/divisions/socialEngineering/pages.test.tsx).
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(entry) ? [full] : [];
      });
    const users = files(path.join(SRC, 'divisions')).filter((file) => readFileSync(file, 'utf8').includes('AreasWeServe'));
    expect(users).toEqual([]);
  });
});
