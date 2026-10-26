// Owner's call in the GEO audit (docs/geo/fact-sheet.md, Q6, 2026-10-26): the
// site promises no response or resolution times, because none is backed by an
// SLA. The CMS rows were rewritten by migration 20261102120000; this keeps the
// code fallbacks and constants from bringing a promise back.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../../..');
const PROMISES = [/within (?:one|1|a) business day/i, /sub-hour/i, /responding in minutes/i, /respond(?:s|ing)? within/i, /\b\d+[- ]?(?:hour|hr|minute|min)s?\b[^.]{0,20}\bresponse\b/i, /response time/i];
// Not scanned: src/divisions (its own copy rules), src/pages/ServiceGuidePage.tsx
// (generic industry figures, not promises by New Wave), and the two unrouted
// pages App.tsx never mounts (ServiceCategoryDetailPage, SeoLandingPage).
const SKIP = new Set(['src/pages/ServiceGuidePage.tsx', 'src/pages/ServiceCategoryDetailPage.tsx', 'src/pages/SeoLandingPage.tsx']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === 'divisions' ? [] : files(full);
    return /\.(tsx?|html)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe('New Wave IT copy makes no response-time promise', () => {
  const scanned = [...files(path.join(ROOT, 'src/pages')), ...files(path.join(ROOT, 'src/components')), path.join(ROOT, 'src/lib/routeMeta.ts'), path.join(ROOT, 'index.html')]
    .filter((file) => !SKIP.has(path.relative(ROOT, file)));

  it('scans the public pages, components, the route registry and the shell', () => {
    expect(scanned.length).toBeGreaterThan(40);
  });

  it.each(scanned.map((file) => [path.relative(ROOT, file), file] as const))('%s', (_label, file) => {
    const text = readFileSync(file, 'utf8');
    for (const pattern of PROMISES) expect(text, `${pattern}`).not.toMatch(pattern);
  });
});
