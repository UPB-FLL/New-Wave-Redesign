import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECTIONS } from './descriptors';
import { isListField } from './types';
import { allNavEntries, searchAdminFields } from '../adminNav';
import { parseList } from './listValue';

const src = join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Every `content.<key>` / `c.<key>` a public component reads from a section it loads with useContent. */
function keysReadBySite(): Map<string, Set<string>> {
  const bySection = new Map<string, Set<string>>();
  for (const file of [...walk(join(src, 'components')), ...walk(join(src, 'pages'))]) {
    const text = readFileSync(file, 'utf8');
    const uses = [...text.matchAll(/const (\w+) = useContent(?:WithStatus)?\('([a-z_-]+)'\)/g)];
    for (const [, variable, section] of uses) {
      const keys = bySection.get(section) ?? new Set<string>();
      for (const m of text.matchAll(new RegExp(`\\b${variable}\\.([a-z_0-9]+)`, 'g'))) keys.add(m[1]);
      // `const { content } = useContentWithStatus(...)` reads through `content.`
      if (variable === '{ content, loaded }') for (const m of text.matchAll(/\bcontent\.([a-z_0-9]+)/g)) keys.add(m[1]);
      bySection.set(section, keys);
    }
    for (const [, section] of text.matchAll(/useContentWithStatus\('([a-z_-]+)'\)/g)) {
      const keys = bySection.get(section) ?? new Set<string>();
      for (const m of text.matchAll(/\bcontent\.([a-z_0-9]+)/g)) keys.add(m[1]);
      bySection.set(section, keys);
    }
  }
  return bySection;
}

describe('section descriptors', () => {
  it('cover every key the public site reads, under the same section', () => {
    const read = keysReadBySite();
    expect(read.size).toBeGreaterThan(8);
    for (const [section, keys] of read) {
      const descriptor = SECTIONS[section];
      expect(descriptor, section).toBeDefined();
      const defined = new Set(descriptor.blocks.flatMap((b) => b.fields.map((f) => f.key)));
      for (const key of keys) {
        if (['loaded', 'then'].includes(key)) continue;
        expect(defined, `${section}.${key}`).toContain(key);
      }
    }
  });

  it('are reachable from the sidebar, one entry per section', () => {
    const sections = allNavEntries().map((e) => e.section).filter(Boolean);
    for (const section of Object.keys(SECTIONS)) expect(sections).toContain(section);
  });

  it('use unique keys within a section and complete list items', () => {
    for (const d of Object.values(SECTIONS)) {
      const keys = d.blocks.flatMap((b) => b.fields.map((f) => f.key));
      expect(new Set(keys).size, d.section).toBe(keys.length);
      for (const block of d.blocks) {
        for (const field of block.fields) {
          if (!isListField(field)) continue;
          const itemKeys = field.fields.map((f) => f.key);
          expect(itemKeys, `${d.section}.${field.key}`).toContain(field.titleKey);
          if (field.subtitleKey) expect(itemKeys).toContain(field.subtitleKey);
          expect(Object.keys(field.newItem).sort(), `${d.section}.${field.key} newItem`).toEqual([...itemKeys].sort());
          for (const item of field.defaults ?? []) expect(Object.keys(item).sort(), `${d.section}.${field.key} default`).toEqual([...itemKeys].sort());
          for (const f of field.fields) if (f.kind === 'select') expect(f.options?.length, f.key).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keep the stored shapes the old editors wrote', () => {
    const list = (section: string, key: string) => {
      const f = SECTIONS[section].blocks.flatMap((b) => b.fields).find((x) => x.key === key);
      return f && isListField(f) ? f.fields.map((x) => `${x.key}:${x.kind}`) : undefined;
    };
    expect(list('pricing', 'tiers')).toEqual(['name:text', 'description:text', 'price:text', 'period:text', 'features:strings', 'highlight:checkbox', 'accent:color']);
    expect(list('status', 'services')).toEqual(['name:text', 'category:select', 'status:select', 'uptime:number', 'lastChecked:text']);
    expect(list('threats-detail', 'threats_list')).toContain('mitigation_strategies:strings');
    expect(list('services-detail', 'services_list')).toEqual(['name:text', 'slug:text', 'description:textarea', 'features:strings', 'benefits:strings', 'pricing_note:textarea']);
    expect(list('trustbar', 'items')).toEqual(['icon:select', 'label:text', 'sub:text']);
  });
});

describe('parseList', () => {
  it('reads a list, and reports what it cannot read instead of resetting', () => {
    expect(parseList(undefined)).toEqual({ items: [] });
    expect(parseList('')).toEqual({ items: [] });
    expect(parseList('[{"a":1}]')).toEqual({ items: [{ a: 1 }] });
    expect(parseList('{"a":1}').error).toBe('The stored value is not a list.');
    expect(parseList('[1]').error).toMatch(/not an object/);
    expect(parseList('not json').error).toBeTruthy();
  });
});

describe('searchAdminFields', () => {
  it('finds fields by label and links to the editor with the field parameter', () => {
    const hits = searchAdminFields('phone');
    expect(hits.map((h) => h.href)).toEqual(['/admin/hero?field=phone', '/admin/contact?field=phone', '/admin/contact?field=phone_sub', '/admin/footer?field=phone']);
    expect(hits[0]).toMatchObject({ label: 'Phone number', block: 'Buttons and phone' });
    expect(searchAdminFields('')).toEqual([]);
  });
});
