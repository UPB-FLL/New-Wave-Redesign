import { describe, expect, it } from 'vitest';
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_URL, headEntries, resolvePageMeta } from './pageMeta';

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
      keywords: undefined,
    });
    expect(resolvePageMeta({ title: 'T', canonical: 'https://x.test/y', noindex: true }, '/ignored')).toMatchObject({
      canonical: 'https://x.test/y',
      robots: 'noindex, nofollow',
    });
  });
});

describe('headEntries', () => {
  it('lists canonical + og:url from one value and only emits keywords when present', () => {
    const entries = headEntries(resolvePageMeta({ title: 'T' }, '/a'));
    expect(entries).toContainEqual({ kind: 'canonical', href: `${SITE_URL}/a` });
    expect(entries).toContainEqual({ kind: 'meta', attr: 'property', key: 'og:url', value: `${SITE_URL}/a` });
    expect(entries.some((entry) => entry.kind === 'meta' && entry.key === 'keywords')).toBe(false);
    expect(headEntries(resolvePageMeta({ title: 'T', keywords: 'a, b' }, '/a'))).toContainEqual({
      kind: 'meta',
      attr: 'name',
      key: 'keywords',
      value: 'a, b',
    });
  });
});
