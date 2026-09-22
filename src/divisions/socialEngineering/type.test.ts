// The division's self-hosted type system (type.css + public/brand/social-engineering/fonts):
// every file it references exists and is licensed, the families are the
// division's own, and nothing in it can reach a New Wave IT page.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss, { type AtRule, type Declaration, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const publicDir = path.resolve(__dirname, '../../../public');
const fontsDir = path.join(publicDir, 'brand/social-engineering/fonts');
const css = readFileSync(path.resolve(__dirname, 'type.css'), 'utf8');
const root = postcss.parse(css);

/** Google Fonts' latin block, as served by the css2 API. */
const GOOGLE_LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

const WEB_FAMILIES = ['NWSE Display', 'NWSE Text', 'NWSE Mono'];
const FALLBACK_FAMILIES = WEB_FAMILIES.map((family) => `${family} Fallback`);

/** Family slug → the copyright holder its OFL file must name. */
const LICENSE_HOLDERS: Record<string, RegExp> = {
  'plus-jakarta-sans': /Copyright \d{4} The Plus Jakarta Sans Project Authors/,
  inter: /Copyright \d{4} The Inter Project Authors/,
  'ibm-plex-mono': /Copyright © \d{4} IBM Corp\. with Reserved Font Name "Plex"/,
};

const unquote = (value: string) => value.trim().replace(/^['"]|['"]$/g, '');

// Tailwind scans every .ts file under src/ for class names, and the quoted
// kebab-case name of the display descriptor is also a utility class, which
// would add a rule to the New Wave IT stylesheet. Write it in camelCase.
const FONT_DISPLAY = 'fontDisplay'.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function fontFaces() {
  const faces: { family: string; decls: Map<string, string> }[] = [];
  root.walkAtRules('font-face', (rule: AtRule) => {
    const decls = new Map<string, string>();
    rule.walkDecls((decl: Declaration) => {
      decls.set(decl.prop, decl.value);
    });
    faces.push({ family: unquote(decls.get('font-family') ?? ''), decls });
  });
  return faces;
}

const urls = [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((match) => match[1]);
const fontFiles = readdirSync(fontsDir).filter((file) => file.endsWith('.woff2'));

describe('division font files', () => {
  it('ships the five latin WOFF2 files', () => {
    expect(fontFiles.sort()).toEqual([
      'ibm-plex-mono-latin-400.woff2',
      'ibm-plex-mono-latin-500.woff2',
      'ibm-plex-mono-latin-600.woff2',
      'inter-latin-var.woff2',
      'plus-jakarta-sans-latin-var.woff2',
    ]);
  });

  it.each(fontFiles)('%s is a real WOFF2 file', (file) => {
    const bytes = readFileSync(path.join(fontsDir, file));
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2');
    expect(bytes.length).toBeGreaterThan(10_000);
  });

  it.each(fontFiles)('%s has a matching SIL OFL 1.1 licence', (file) => {
    const slug = file.replace(/-latin-.*$/, '');
    const license = path.join(fontsDir, `OFL-${slug}.txt`);
    expect(existsSync(license)).toBe(true);
    const text = readFileSync(license, 'utf8');
    expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(text).toMatch(LICENSE_HOLDERS[slug]);
  });

  it('has no licence without a font, and no font that type.css does not use', () => {
    const licenses = readdirSync(fontsDir).filter((file) => file.startsWith('OFL-'));
    const slugs = new Set(fontFiles.map((file) => file.replace(/-latin-.*$/, '')));
    expect(licenses.map((file) => file.replace(/^OFL-|\.txt$/g, '')).sort()).toEqual([...slugs].sort());
    for (const file of fontFiles) {
      expect(urls).toContain(`/brand/social-engineering/fonts/${file}`);
    }
  });
});

describe('type.css', () => {
  it('points every url() at an existing file in public/', () => {
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith('/brand/social-engineering/fonts/')).toBe(true);
      expect(existsSync(path.join(publicDir, url))).toBe(true);
    }
  });

  it('declares only the division-only families', () => {
    const families = new Set(fontFaces().map((face) => face.family));
    expect([...families].sort()).toEqual([...WEB_FAMILIES, ...FALLBACK_FAMILIES].sort());
    // Never a parent family name, which would override New Wave IT's Google-hosted faces.
    for (const parentFamily of ['Plus Jakarta Sans', 'Inter', 'IBM Plex Mono']) {
      expect(families.has(parentFamily)).toBe(false);
    }
  });

  it('serves each web face as swap-displayed latin WOFF2', () => {
    const webFaces = fontFaces().filter((face) => WEB_FAMILIES.includes(face.family));
    expect(webFaces).toHaveLength(5);
    for (const { decls } of webFaces) {
      expect(decls.get(FONT_DISPLAY)).toBe('swap');
      expect(decls.get('font-style')).toBe('normal');
      expect(decls.get('unicode-range')).toBe(GOOGLE_LATIN_RANGE);
      expect(decls.get('src')).toMatch(/^url\('\/brand\/social-engineering\/fonts\/[a-z0-9-]+\.woff2'\) format\('woff2'\)$/);
    }
    const weights = (family: string) =>
      webFaces.filter((face) => face.family === family).map((face) => face.decls.get('font-weight'));
    expect(weights('NWSE Display')).toEqual(['200 800']);
    expect(weights('NWSE Text')).toEqual(['100 900']);
    expect(weights('NWSE Mono')).toEqual(['400', '500', '600']);
  });

  it('metric-matches every fallback face to a local system font', () => {
    const fallbacks = fontFaces().filter((face) => FALLBACK_FAMILIES.includes(face.family));
    expect(fallbacks).toHaveLength(6);
    for (const { decls } of fallbacks) {
      const sources = (decls.get('src') ?? '').split(/,\s*/);
      sources.forEach((source) => expect(source).toMatch(/^local\('[^']+'\)$/));
      for (const prop of ['size-adjust', 'ascent-override', 'descent-override', 'line-gap-override']) {
        expect(decls.get(prop)).toMatch(/^\d+(\.\d+)?%$/);
      }
      expect(decls.has(FONT_DISPLAY)).toBe(false);
    }
  });

  it('scopes every rule to the division root: no :root, html, body, or global font overrides', () => {
    const selectors: string[] = [];
    root.walkRules((rule: Rule) => {
      selectors.push(...rule.selectors);
    });
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector === '.nwse-root' || /^:where\(\.nwse-root\) \.nwse-type-[a-z0-9-]+$/.test(selector)).toBe(true);
      // No :root and no global type selectors (html, body, *, headings).
      expect(selector).not.toMatch(/:root|(?:^|[\s>+~(,])(?:html|body|\*|h[1-6])(?![\w-])/);
    }
    // Only @font-face and the sm breakpoint as at-rules.
    const atRules: string[] = [];
    root.walkAtRules((rule: AtRule) => {
      atRules.push(rule.name === 'media' ? `media ${rule.params}` : rule.name);
    });
    expect(new Set(atRules)).toEqual(new Set(['font-face', 'media (min-width: 640px)']));
  });

  it('points the parent font tokens at the NWSE families inside .nwse-root only', () => {
    const tokenRules: string[] = [];
    root.walkDecls(/^--nw-font-/, (decl: Declaration) => {
      tokenRules.push((decl.parent as Rule).selector);
    });
    expect(new Set(tokenRules)).toEqual(new Set(['.nwse-root']));

    const tokens = new Map<string, string>();
    root.walkRules('.nwse-root', (rule: Rule) => {
      rule.walkDecls((decl) => {
        tokens.set(decl.prop, decl.value);
      });
    });
    expect(tokens.get('--nw-font-display')).toBe("'NWSE Display', 'NWSE Display Fallback', system-ui, sans-serif");
    expect(tokens.get('--nw-font-body')).toBe("'NWSE Text', 'NWSE Text Fallback', system-ui, sans-serif");
    expect(tokens.get('--nw-font-technical')).toBe("'NWSE Mono', 'NWSE Mono Fallback', ui-monospace, monospace");
    // html resolves the parent stack; the root has to re-resolve it for inheritance.
    expect(tokens.get('font-family')).toBe('var(--nw-font-body)');
  });

  it('defines the full type scale as .nwse-root tokens and classes', () => {
    const styles = ['display-1', 'display-2', 'title-1', 'title-2', 'lead', 'body', 'body-small', 'caption', 'label', 'kicker'];
    const tokens = new Set<string>();
    root.walkRules('.nwse-root', (rule: Rule) => {
      rule.walkDecls(/^--nwse-type-/, (decl) => {
        tokens.add(decl.prop);
      });
    });

    const classes = new Map<string, Map<string, string>>();
    root.walkRules(/\.nwse-type-/, (rule: Rule) => {
      const name = rule.selector.replace(/^:where\(\.nwse-root\) \.nwse-type-/, '');
      const decls = new Map<string, string>();
      rule.walkDecls((decl) => {
        decls.set(decl.prop, decl.value);
      });
      classes.set(name, decls);
    });

    for (const style of styles) {
      const decls = classes.get(style);
      expect(decls, style).toBeDefined();
      for (const [prop, token] of [
        ['font-family', 'family'],
        ['font-size', 'size'],
        ['font-weight', 'weight'],
        ['letter-spacing', 'tracking'],
        ['line-height', 'line-height'],
      ]) {
        expect(tokens.has(`--nwse-type-${style}-${token}`), `--nwse-type-${style}-${token}`).toBe(true);
        expect(decls?.get(prop)).toBe(`var(--nwse-type-${style}-${token})`);
      }
    }
    expect(classes.get('label')?.get('text-transform')).toBe('uppercase');
    expect(classes.get('kicker')?.get('text-transform')).toBe('uppercase');
    expect(classes.get('numeric')?.get('font-variant-numeric')).toBe('tabular-nums');
  });

  it('keeps OpenType features at their defaults, with tabular figures only in the numeric helper', () => {
    expect(css).not.toMatch(/^\s*font-feature-settings\s*:/m);
    const numericDecls: string[] = [];
    root.walkDecls(/^font-variant/, (decl: Declaration) => {
      numericDecls.push((decl.parent as Rule).selector);
    });
    expect(numericDecls).toEqual([':where(.nwse-root) .nwse-type-numeric']);
  });

  it('is loaded by the division layout, after division.css', () => {
    const layout = readFileSync(path.resolve(__dirname, 'components/DivisionLayout.tsx'), 'utf8');
    const division = layout.indexOf("import '../division.css';");
    const type = layout.indexOf("import '../type.css';");
    expect(division).toBeGreaterThan(-1);
    expect(type).toBeGreaterThan(division);
  });
});

describe('type scale on the division pages', () => {
  // Class names are assembled from parts so Tailwind's scanner, which reads
  // this file too, never sees a utility it would add to the IT stylesheet.
  const utility = (...parts: string[]) => parts.join('');
  const markupFiles = ['components', 'pages'].flatMap((dir) =>
    readdirSync(path.resolve(__dirname, dir))
      .filter((file) => file.endsWith('.tsx') && !file.includes('.test.'))
      .map((file) => path.resolve(__dirname, dir, file)),
  );
  /** Every static class list in the division's markup: className="…", '…' consts, and template literals. */
  const classLists = markupFiles.flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return [...source.matchAll(/className="([^"]+)"|className=\{`([^`]+)`\}|Class =\s*'([^']+)'/g)].map((match) => ({
      file: path.basename(file),
      classes: (match[1] ?? match[2] ?? match[3]).split(/\s+/),
    }));
  });

  it('finds the division markup', () => {
    expect(classLists.length).toBeGreaterThan(50);
  });

  it('pairs every label and kicker colour class with its type class', () => {
    for (const { file, classes } of classLists) {
      if (classes.includes('nwse-kicker') || classes.includes('nwse-kicker-on-dark')) {
        expect(classes, file).toContain('nwse-type-kicker');
      }
      if (classes.includes('nwse-label')) expect(classes, file).toContain('nwse-type-label');
    }
  });

  it('sets display sizes and leading only through the type scale', () => {
    const adHoc = new RegExp(
      `^(?:[a-z]+:)?(?:${utility('lead', 'ing-')}.+|${utility('te', 'xt-')}(?:lg|xl|[2-9]xl))$`,
    );
    for (const { file, classes } of classLists) {
      expect(classes.filter((name) => adHoc.test(name)), file).toEqual([]);
      expect(classes, file).not.toContain(utility('nwse', '-display'));
    }
  });

  it('leaves colour, not type, to the division.css label classes', () => {
    const divisionCss = postcss.parse(readFileSync(path.resolve(__dirname, 'division.css'), 'utf8'));
    const selectors: string[] = [];
    divisionCss.walkRules(/^\.nwse-(kicker|kicker-on-dark|label)$/, (rule: Rule) => {
      selectors.push(rule.selector);
      const props: string[] = [];
      rule.walkDecls((decl: Declaration) => {
        props.push(decl.prop);
      });
      expect(props, rule.selector).toEqual(['color']);
    });
    expect(selectors.sort()).toEqual(['.nwse-kicker', '.nwse-kicker-on-dark', '.nwse-label']);
  });
});
