// Hands a page's JSON-LD from usePageMeta to the build-time render.
//
// usePageMeta writes JSON-LD in an effect, and effects never run in the
// build's renderToString, so the static HTML would carry no Service, FAQPage
// or Article node. The build render (src/lib/prerenderBody.tsx) opens a
// capture around each page; usePageMeta reports what the page passed while it
// renders, and the prerender writes that into the raw HTML. No capture is
// ever open in a browser, so captureJsonLd does nothing there. Same pattern
// as seedContentCache in content.ts. No React or DOM access in this module.

export type JsonLd = object | object[];

/** Null outside a build render. `nodes` stays null until a component passes JSON-LD. */
let capture: { nodes: object[] | null } | null = null;

/** Opens a capture for one page render, dropping anything an earlier render left behind. */
export function beginJsonLdCapture(): void {
  capture = { nodes: null };
}

/**
 * Called by usePageMeta during render. Keeps the first JSON-LD passed while a
 * capture is open and ignores later calls: React renders a parent before its
 * children, so the first component to pass JSON-LD is the outermost one, the
 * page itself, and a nested component cannot replace the page's graph. A call
 * without JSON-LD (a layout that only sets a title, or an empty array) claims
 * nothing.
 */
export function captureJsonLd(jsonLd: JsonLd | null | undefined): void {
  if (!capture || capture.nodes || !jsonLd) return;
  // A copy, so the caller's array is never the one handed to the build.
  const nodes = Array.isArray(jsonLd) ? [...jsonLd] : [jsonLd];
  if (nodes.length) capture.nodes = nodes;
}

/** Closes the capture and returns the page's JSON-LD as an array, or null when the page passed none. */
export function endJsonLdCapture(): object[] | null {
  const nodes = capture?.nodes ?? null;
  capture = null;
  return nodes;
}
