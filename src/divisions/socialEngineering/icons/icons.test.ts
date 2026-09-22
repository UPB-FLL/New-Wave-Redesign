// The division icon registry (iconData.ts): every entry follows the icon spec,
// every name the code and content use exists, and the division no longer
// draws with Lucide.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hubContent } from '../content';
import { DIVISION_ICONS, DIVISION_ICON_NAMES, type DivisionIconGroup, type DivisionIconName } from './iconData';

const divisionDir = path.resolve(__dirname, '..');
const divisionsRoot = path.resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

const entries = Object.entries(DIVISION_ICONS) as [DivisionIconName, (typeof DIVISION_ICONS)[DivisionIconName]][];

/** UI glyphs the spec keeps accent-free: arrows, chevrons, close, and check. */
const NO_ACCENT: DivisionIconName[] = ['arrow-right', 'arrow-up-right', 'chevron-down', 'chevron-right', 'close', 'check'];

const PARAMS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/** Every absolute point a path names (endpoints and control points), with relative commands resolved. */
function pathPoints(d: string): [number, number][] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const points: [number, number][] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let i = 0;
  while (i < tokens.length) {
    const command = tokens[i++];
    if (!/^[a-zA-Z]$/.test(command)) throw new Error(`expected a command in "${d}", got ${command}`);
    const lower = command.toLowerCase();
    const relative = command === lower;
    const count = PARAMS[lower];
    if (count === undefined) throw new Error(`unknown command ${command} in "${d}"`);
    if (count === 0) {
      x = startX;
      y = startY;
      continue;
    }
    let first = true;
    do {
      const args = tokens.slice(i, i + count).map(Number);
      if (args.length !== count || args.some(Number.isNaN)) throw new Error(`bad arguments for ${command} in "${d}"`);
      i += count;
      const ox = relative ? x : 0;
      const oy = relative ? y : 0;
      if (lower === 'h') {
        x = ox + args[0];
      } else if (lower === 'v') {
        y = oy + args[0];
      } else if (lower === 'a') {
        x = ox + args[5];
        y = oy + args[6];
      } else {
        for (let k = 0; k < count - 2; k += 2) points.push([ox + args[k], oy + args[k + 1]]);
        x = ox + args[count - 2];
        y = oy + args[count - 1];
      }
      points.push([x, y]);
      if (lower === 'm' && first) {
        startX = x;
        startY = y;
      }
      first = false;
    } while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]));
  }
  return points;
}

describe('DIVISION_ICONS', () => {
  it('lists the 35 icons of the set in display order', () => {
    expect(DIVISION_ICON_NAMES).toHaveLength(35);
    expect(DIVISION_ICON_NAMES).toEqual(Object.keys(DIVISION_ICONS));
    const groups: DivisionIconGroup[] = ['services', 'phases', 'method', 'journey', 'metrics', 'ui'];
    const order = DIVISION_ICON_NAMES.map((name) => groups.indexOf(DIVISION_ICONS[name].group));
    expect(order.every((group) => group >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it.each(entries)('%s is valid path data on the 24 x 24 grid', (_name, icon) => {
    expect(icon.paths.length).toBeGreaterThan(0);
    for (const { d } of icon.paths) {
      expect(d).toMatch(/^M/);
      expect(d).toMatch(/^[MmLlHhVvCcSsQqTtAaZz\d\s.,-]+$/);
      for (const [px, py] of pathPoints(d)) {
        expect(px).toBeGreaterThanOrEqual(0);
        expect(px).toBeLessThanOrEqual(24);
        expect(py).toBeGreaterThanOrEqual(0);
        expect(py).toBeLessThanOrEqual(24);
      }
    }
  });

  it.each(entries)('%s has at most one accent group: 1-2 curved paths, drawn last', (name, icon) => {
    const flags = icon.paths.map((p) => Boolean(p.accent));
    const accents = flags.filter(Boolean).length;
    expect(accents).toBeLessThanOrEqual(2);
    if (accents === 0) return;
    expect(flags.slice(-accents).every(Boolean)).toBe(true);
    expect(accents).toBeLessThan(flags.length); // never accent-only: the icon must read in one colour
    for (const { d } of icon.paths.filter((p) => p.accent)) {
      // The brand wave is built from cubic curves, never lines or arcs.
      expect(d, name).toMatch(/^M[\d\s.,-]+(?:[CcSs][\d\s.,-]+)+$/);
    }
  });

  it('keeps UI arrows, chevrons, close, and check accent-free', () => {
    for (const name of NO_ACCENT) {
      expect(DIVISION_ICONS[name].paths.some((p) => p.accent), name).toBe(false);
    }
  });

  it('labels every icon, uniquely within its group', () => {
    const seen = new Set<string>();
    for (const [name, icon] of entries) {
      expect(icon.label.trim(), name).not.toBe('');
      const key = `${icon.group}:${icon.label.toLowerCase()}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('names no security or phishing metaphor', () => {
    const SECURITY = /lock|shield|hook|fish|phish|mask|hack|virus|bug|key|alarm|siren/i;
    for (const [name, icon] of entries) {
      expect(`${name} ${icon.label}`).not.toMatch(SECURITY);
    }
  });

  it('is pure data: iconData.ts imports nothing', () => {
    const source = readFileSync(path.join(__dirname, 'iconData.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\brequire\(/);
  });
});

describe('icon usage', () => {
  it('gives the hub method, roadmap, and metrics an icon from the matching group', () => {
    const expectGroup = (icons: (DivisionIconName | undefined)[], group: DivisionIconGroup) => {
      expect(icons.every(Boolean)).toBe(true);
      icons.forEach((icon) => expect(DIVISION_ICONS[icon!].group).toBe(group));
      expect(new Set(icons).size).toBe(icons.length);
    };
    expectGroup(hubContent.method.map((step) => step.icon), 'method');
    expectGroup(hubContent.roadmap.map((phase) => phase.icon), 'phases');
    expectGroup(hubContent.metrics.map((metric) => metric.icon), 'metrics');
  });

  it('only names icons that exist', () => {
    const used = new Set<string>();
    for (const file of sourceFiles(divisionDir)) {
      if (file.endsWith('iconData.ts') || file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
      const source = readFileSync(file, 'utf8');
      // <NwseIcon name="x" />, name={'x'}, and name={cond ? 'x' : 'y'}.
      for (const match of source.matchAll(/<NwseIcon\b[^>]*?\bname=(?:"([^"]+)"|\{([^}]+)\})/g)) {
        if (match[1]) used.add(match[1]);
        else for (const literal of match[2].matchAll(/'([a-z0-9-]+)'/g)) used.add(literal[1]);
      }
      for (const match of source.matchAll(/\bicon: '([a-z0-9-]+)'/g)) used.add(match[1]);
      for (const match of source.matchAll(/'((?:service|phase|method|journey|metric)-[a-z-]+)'/g)) used.add(match[1]);
    }
    // Service keys (icon: 'social') map through ServiceIcon; everything else must be a registry name.
    const serviceKeys = new Set(['social', 'brand', 'web', 'marketing', 'integration', 'oversight']);
    const iconNames = [...used].filter((name) => !serviceKeys.has(name));
    expect(iconNames.length).toBeGreaterThan(20);
    for (const name of iconNames) {
      expect(DIVISION_ICONS, name).toHaveProperty([name]);
    }
  });

  it('no file under src/divisions imports lucide-react', () => {
    const offenders = sourceFiles(divisionsRoot).filter((file) =>
      /from\s+['"]lucide-react['"]|import\(\s*['"]lucide-react['"]\s*\)|require\(\s*['"]lucide-react['"]\s*\)/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders.map((file) => path.relative(divisionsRoot, file))).toEqual([]);
  });
});
