import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADMIN_NAV, SITE_PAGES, allNavEntries, pageForPath, searchAdminNav } from './adminNav';

const root = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** The admin routes App.tsx declares, as absolute paths. */
function adminRoutePaths(): Set<string> {
  const app = readFileSync(join(root, 'App.tsx'), 'utf8');
  const start = app.indexOf('path="/admin"');
  const end = app.indexOf('</Route>', start);
  const block = app.slice(start, end);
  const paths = new Set<string>(['/admin']);
  for (const m of block.matchAll(/<Route path="([^"]+)"/g)) paths.add(`/admin/${m[1]}`);
  return paths;
}

/** Every `site_content` section the public site reads. */
function publicSections(): Set<string> {
  const sections = new Set<string>();
  for (const file of [...walk(join(root, 'components')), ...walk(join(root, 'pages'))]) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/useContent(?:WithStatus)?\('([a-z_-]+)'\)/g)) sections.add(m[1]);
  }
  return sections;
}

describe('admin navigation model', () => {
  it('links only to routes App.tsx declares', () => {
    const routes = adminRoutePaths();
    for (const entry of allNavEntries()) expect(routes, entry.label).toContain(entry.path);
  });

  it('has an editor for every CMS section the public site reads', () => {
    const edited = new Set(allNavEntries().map((e) => e.section));
    for (const section of publicSections()) expect(edited, section).toContain(section);
  });

  it('lists each editor once, under one site page at most', () => {
    const paths = allNavEntries().map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const page of SITE_PAGES) for (const entry of page.entries) expect(pageForPath(entry.path)).toBe(page);
    expect(pageForPath('/admin/blog')).toBeUndefined();
  });

  it('has no Groundswell group: Groundswell is its own portal at /groundswell', () => {
    expect(ADMIN_NAV.map((g) => g.id)).toEqual(['site', 'blog', 'seo']);
    for (const entry of allNavEntries()) expect(entry.path).not.toContain('groundswell');
  });

  it('finds editors by label, field, or page', () => {
    expect(searchAdminNav('phone').map((e) => e.label)).toEqual(['Hero', 'Contact', 'Footer']);
    expect(searchAdminNav('tiers').map((e) => e.path)).toEqual(['/admin/pricing']);
    expect(searchAdminNav('quote builder').map((e) => e.path)).toEqual(['/admin/pricing-units']);
    expect(searchAdminNav('threat details')).toHaveLength(1);
    expect(searchAdminNav('  ')).toHaveLength(allNavEntries().length);
    expect(searchAdminNav('no such thing')).toEqual([]);
  });

  it('leaves no placeholder screens behind', () => {
    for (const file of walk(join(root, 'admin'))) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/not yet implemented/i);
      expect(src, file).not.toMatch(/Unified Dashboard|Legacy Dashboard|testimonials/i);
    }
  });
});
