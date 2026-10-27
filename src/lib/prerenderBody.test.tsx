// @vitest-environment node
// Every static New Wave IT page renders its real body at build time, so a
// reader that never runs the bundle gets the page, not an empty shell. Run
// under Node, as the build does: no window, no localStorage, so a component
// that touches either at render time fails here instead of in the build.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPrerenderedItPath, renderItBody } from './prerenderBody';
import { prerenderedItRoutes } from './routeMeta';

const appSource = readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
const bodyRoutes = ['/', ...prerenderedItRoutes().map((route) => route.path)].filter(isPrerenderedItPath);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('renderItBody', () => {
  it('renders every static route but the lazy partner sign-in', () => {
    const paths = prerenderedItRoutes().map((route) => route.path);
    expect(bodyRoutes).toHaveLength(paths.length); // 32 routes + "/" - "/groundswell"
    expect(isPrerenderedItPath('/groundswell')).toBe(false);
    expect(isPrerenderedItPath('/status')).toBe(true);
    expect(isPrerenderedItPath('/service/some-cms-page')).toBe(false);
    expect(() => renderItBody('/groundswell')).toThrow(/No New Wave IT body/);
  });

  it('covers every literal public route App.tsx mounts', () => {
    const literal = [...appSource.matchAll(/<Route path="(\/[^":]*)" element=/g)].map((m) => m[1]);
    const expectedShell = new Set(['/groundswell', '/admin']);
    for (const routePath of literal.filter((p) => !expectedShell.has(p))) {
      expect(isPrerenderedItPath(routePath), `${routePath} needs a row in IT_ROUTE_ELEMENTS`).toBe(true);
    }
  });

  it.each(bodyRoutes)('%s renders one H1 and readable copy', (routePath) => {
    const html = renderItBody(routePath);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(text(html).split(' ').filter(Boolean).length).toBeGreaterThan(100);
    expect(html).not.toContain('<script');
    // Reveal animations start visible in the prerender; no copy sits hidden.
    expect(html).not.toMatch(/opacity:\s*0[;"]/);
    expect(html).not.toMatch(/translateY\(\d+px\)/);
  });

  it('renders the CMS copy it is seeded with, and only for that render', () => {
    const seeded = renderItBody('/about', { footer: { phone: '(561) 000-0000' } });
    expect(seeded).toContain('(561) 000-0000');
    expect(renderItBody('/about')).not.toContain('(561) 000-0000');
    expect(renderItBody('/about')).toContain('(561) 564-1846');
  });

  it('renders each service guide at its own URL', () => {
    expect(text(renderItBody('/l/it-repair-guide'))).toMatch(/repair/i);
    expect(text(renderItBody('/l/cloud-solutions-guide'))).toMatch(/cloud/i);
  });
});
