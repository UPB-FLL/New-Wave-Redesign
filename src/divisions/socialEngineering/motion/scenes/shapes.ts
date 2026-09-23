// Small path builders the scenes share. Pure strings on the 480 × 320 scene
// canvas (no React), so any scene or test can import them.

/**
 * A rounded rectangle as one closed path, drawn clockwise from the end of its
 * top-left corner, so a draw-on starts along the top edge.
 */
export function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  return [
    `M ${x + r} ${y}`,
    `H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`,
  ].join(' ');
}

/** A round-capped dot, the icon set's `h.01` idiom (a browser's window dots). */
export const dot = (x: number, y: number) => `M ${x} ${y} L ${x + 0.01} ${y}`;
