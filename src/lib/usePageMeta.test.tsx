import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BREADCRUMBS_ELEMENT_ID, PAGE_JSONLD_ELEMENT_ID, type PageMetaOptions } from './pageMeta';
import { IT_PAGE_META } from './routeMeta';
import { usePageMeta } from './usePageMeta';

function Page(props: PageMetaOptions) {
  usePageMeta(props);
  return null;
}

const blocks = () => [...document.head.querySelectorAll(`script#${BREADCRUMBS_ELEMENT_ID}`)];
const names = () => JSON.parse(blocks()[0]?.textContent ?? '{}').itemListElement?.map((item: { name: string }) => item.name);

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('usePageMeta breadcrumbs', () => {
  it('takes over the prerendered block instead of adding a second one, and removes it on unmount', () => {
    document.head.innerHTML = `<script type="application/ld+json" id="${BREADCRUMBS_ELEMENT_ID}">{"stale":true}</script>`;
    const { unmount } = render(<Page {...IT_PAGE_META['/service-category/healthcare']} />);

    expect(blocks()).toHaveLength(1);
    expect(names()).toEqual(['New Wave IT', 'Services', 'Healthcare IT']);
    unmount();
    expect(blocks()).toHaveLength(0);
  });

  it('never leaves one page’s trail on the next page', () => {
    const { rerender } = render(<Page {...IT_PAGE_META['/pricing']} />);
    expect(names()).toEqual(['New Wave IT', 'Pricing']);

    rerender(<Page title="Page without a trail" />);
    expect(blocks()).toHaveLength(0);
  });
});

describe('usePageMeta JSON-LD', () => {
  const graphs = () => [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? 'null'));
  const serverBlock = `<script type="application/ld+json" id="${PAGE_JSONLD_ELEMENT_ID}">[{"@type":"BlogPosting","headline":"From the server"}]</script>`;

  it('replaces the server-written block (api/blog-page.ts) instead of listing the graph twice', () => {
    document.head.innerHTML = serverBlock;
    const { unmount } = render(<Page title="A post" jsonLd={[{ '@type': 'BlogPosting', headline: 'From the page' }]} />);

    expect(graphs()).toEqual([[{ '@type': 'BlogPosting', headline: 'From the page' }]]);
    unmount();
    expect(graphs()).toEqual([]);
  });

  it('drops the server block when the page leaves without writing its own (the post never loaded client-side)', () => {
    document.head.innerHTML = serverBlock;
    const { unmount } = render(<Page title="IT Support Blog" />);

    // Still describing the post while it loads.
    expect(document.getElementById(PAGE_JSONLD_ELEMENT_ID)).not.toBeNull();
    unmount();
    expect(document.getElementById(PAGE_JSONLD_ELEMENT_ID)).toBeNull();
  });
});
