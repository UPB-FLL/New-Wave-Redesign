// @vitest-environment node
// The hand-over of a page's JSON-LD from usePageMeta to the build render
// (jsonLdCapture.ts), under Node as the build runs it: no effects, no DOM.

import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginJsonLdCapture, captureJsonLd, endJsonLdCapture } from './jsonLdCapture';
import type { PageMetaOptions } from './pageMeta';
import { renderItPage } from './prerenderBody';
import { usePageMeta } from './usePageMeta';

// /status stands in for a page that reports its JSON-LD and then fails to render.
vi.mock('../pages/StatusPage', async () => {
  const hook = await import('./usePageMeta');
  return {
    default: function BrokenPage() {
      hook.usePageMeta({ title: 'Broken', jsonLd: { '@type': 'Thing', name: 'From the page that threw' } });
      throw new Error('render failed');
    },
  };
});

const PAGE = { '@type': 'Service', name: 'From the page' };
const NESTED = { '@type': 'FAQPage', name: 'From a nested component' };

function Meta({ children, ...options }: PageMetaOptions & { children?: ReactNode }) {
  usePageMeta(options);
  return <div>{children}</div>;
}

/** What a build render of `tree` captures. */
function captured(tree: ReactNode): object[] | null {
  beginJsonLdCapture();
  try {
    renderToString(<>{tree}</>);
    return endJsonLdCapture();
  } finally {
    endJsonLdCapture();
  }
}

// No test may leave a capture open for the next one.
afterEach(() => void endJsonLdCapture());

describe('JSON-LD capture', () => {
  it('captures nothing when no capture is open, as in a browser', () => {
    captureJsonLd(PAGE);
    expect(endJsonLdCapture()).toBeNull();

    // A render outside a capture reports nothing either, and nothing waits for the next capture.
    renderToString(<Meta title="A page" jsonLd={PAGE} />);
    expect(captured(<Meta title="A page without JSON-LD" />)).toBeNull();
  });

  it('returns what the page passed, always as an array', () => {
    expect(captured(<Meta title="One node" jsonLd={PAGE} />)).toEqual([PAGE]);
    expect(captured(<Meta title="Two nodes" jsonLd={[PAGE, NESTED]} />)).toEqual([PAGE, NESTED]);
  });

  it('hands over a copy of an array, never the page’s own', () => {
    const own = [PAGE];
    const nodes = captured(<Meta title="A page" jsonLd={own} />);
    expect(nodes).toEqual(own);
    expect(nodes).not.toBe(own);
  });

  it('returns null when the page passes none', () => {
    expect(captured(<Meta title="No JSON-LD" />)).toBeNull();
    expect(captured(<Meta title="An empty list" jsonLd={[]} />)).toBeNull();
    expect(captured(<p>No usePageMeta call at all</p>)).toBeNull();
  });

  it('keeps the page’s JSON-LD when a nested component passes its own', () => {
    const nodes = captured(
      <Meta title="Page" jsonLd={PAGE}>
        <Meta title="Nested" jsonLd={NESTED} />
      </Meta>,
    );
    expect(nodes).toEqual([PAGE]);
  });

  it('lets a wrapper that passes none leave the claim to the page inside it', () => {
    const nodes = captured(
      <Meta title="Layout">
        <Meta title="Page" jsonLd={PAGE}>
          <Meta title="Nested" jsonLd={NESTED} />
        </Meta>
      </Meta>,
    );
    expect(nodes).toEqual([PAGE]);
  });

  it('closes on end: a later call is ignored, and a second end returns null', () => {
    beginJsonLdCapture();
    captureJsonLd(PAGE);
    expect(endJsonLdCapture()).toEqual([PAGE]);
    captureJsonLd(NESTED);
    expect(endJsonLdCapture()).toBeNull();
  });

  it('starts empty even when an earlier capture was never closed', () => {
    beginJsonLdCapture();
    captureJsonLd(PAGE);
    // No end: begin must not carry that page into the next render.
    expect(captured(<Meta title="Next page" />)).toBeNull();
  });
});

describe('renderItPage when a page throws', () => {
  it('closes the capture, so the failed page’s JSON-LD never reaches the next render', () => {
    expect(() => renderItPage('/status')).toThrow('render failed');

    // Closed: a stray call is ignored and there is nothing to collect.
    captureJsonLd(NESTED);
    expect(endJsonLdCapture()).toBeNull();
    // The legal pages pass no JSON-LD.
    expect(renderItPage('/privacy-policy').jsonLd).toBeNull();
    expect(renderItPage('/contact').jsonLd?.map((node) => (node as { '@type': string })['@type'])).toContain('ContactPage');
  });
});
