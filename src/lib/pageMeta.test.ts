import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, SITE_URL, headEntries, resolvePageMeta } from './pageMeta';

describe('resolvePageMeta', () => {
  it('appends the site name unless the title already carries it or the page opts out', () => {
    expect(resolvePageMeta({ title: 'Pricing' }, '/pricing').title).toBe('Pricing | New Wave IT');
    expect(resolvePageMeta({ title: 'About New Wave IT' }, '/about').title).toBe('About New Wave IT');
    expect(resolvePageMeta({ title: 'CodeNest', includeSiteName: false }, '/codenest').title).toBe('CodeNest');
    expect(resolvePageMeta({ title: 'Hub', siteName: 'Division' }, '/x').title).toBe('Hub | Division');
  });

  it('defaults canonical to the site URL plus the path, and fills the other defaults', () => {
    expect(resolvePageMeta({ title: 'T' }, '/service-category/luxury')).toEqual({
      title: 'T | New Wave IT',
      description: DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}/service-category/luxury`,
      ogImage: DEFAULT_OG_IMAGE,
      ogType: 'website',
      siteName: 'New Wave IT',
      robots: 'index, follow',
      keywords: DEFAULT_KEYWORDS,
    });
    expect(resolvePageMeta({ title: 'T', canonical: 'https://x.test/y', noindex: true }, '/ignored')).toMatchObject({
      canonical: 'https://x.test/y',
      robots: 'noindex, nofollow',
    });
  });
});

describe('headEntries', () => {
  it('lists canonical + og:url from one value and always emits keywords, defaulting to the site keywords', () => {
    const entries = headEntries(resolvePageMeta({ title: 'T' }, '/a'));
    expect(entries).toContainEqual({ kind: 'canonical', href: `${SITE_URL}/a` });
    expect(entries).toContainEqual({ kind: 'meta', attr: 'property', key: 'og:url', value: `${SITE_URL}/a` });
    expect(entries).toContainEqual({ kind: 'meta', attr: 'name', key: 'keywords', value: DEFAULT_KEYWORDS });
    expect(headEntries(resolvePageMeta({ title: 'T', keywords: '' }, '/a'))).toContainEqual({
      kind: 'meta',
      attr: 'name',
      key: 'keywords',
      value: DEFAULT_KEYWORDS,
    });
    expect(headEntries(resolvePageMeta({ title: 'T', keywords: 'a, b' }, '/a'))).toContainEqual({
      kind: 'meta',
      attr: 'name',
      key: 'keywords',
      value: 'a, b',
    });
  });
});

describe('DEFAULT_KEYWORDS', () => {
  it('matches the shell (index.html) keywords, so pages without their own restore the homepage value', () => {
    const shell = readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
    const doc = new DOMParser().parseFromString(shell, 'text/html');
    expect(doc.head.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe(DEFAULT_KEYWORDS);
  });
});
