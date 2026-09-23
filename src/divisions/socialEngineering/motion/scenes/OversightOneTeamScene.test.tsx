import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkPath, sceneColor } from '../index';
import { OversightOneTeamScene } from './OversightOneTeamScene';

/** Every stroke and fill in a scene is a palette variable (or none), never a hard-coded colour. */
function paintOutsidePalette(svg: SVGSVGElement): string[] {
  const offenders: string[] = [];
  for (const el of Array.from(svg.querySelectorAll('*'))) {
    for (const attr of ['stroke', 'fill']) {
      const value = el.getAttribute(attr);
      if (value && value !== 'none' && !value.startsWith('var(--scene-')) offenders.push(`${el.tagName} ${attr}=${value}`);
    }
  }
  return offenders;
}

/** The gap in the customer's path, between the 4th and 5th touchpoints. */
const GAP = 'M 264 250 C 281.61 239.33 302.39 239.33 320 250';

describe('OversightOneTeamScene', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders its static final frame as a decorative svg: the gap closed, the needle in the icon pose', () => {
    const { container } = render(<OversightOneTeamScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    expect(frame).toHaveAttribute('data-scene-state', 'static');

    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg.querySelector('text')).toBeNull();
    expect(paintOutsidePalette(svg)).toEqual([]);

    // The path is unbroken and every touchpoint has been checked (ring + filled centre).
    expect(svg.querySelector(`path[d="${GAP}"]`)).toHaveAttribute('stroke', sceneColor('accent'));
    const rings = svg.querySelectorAll('circle[r="10"]');
    const centres = svg.querySelectorAll('circle[r="3.5"]');
    expect(rings).toHaveLength(5);
    expect(centres).toHaveLength(5);

    // The needle ends at 315° about the pivot (220, 206): up and to the right, as in the icon.
    expect(svg.querySelector('path[d="M 220 206 L 287.88 138.12"]')).not.toBeNull();

    // The customer rests at the calendar's entry, and the calendar holds its check.
    const dot = svg.querySelector('circle[r="6"]');
    expect(dot).toHaveAttribute('cx', '376');
    expect(dot).toHaveAttribute('cy', '250');
    expect(svg.querySelector(`path[d="${checkPath([406, 268.33], 33.33)}"]`)).not.toBeNull();
  });

  it('holds its start state until it is scrolled into view: needle pointing left, gap still open', () => {
    class IdleObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal('IntersectionObserver', IdleObserver);
    const { container } = render(<OversightOneTeamScene />);
    expect(container.querySelector('[data-scene]')).toHaveAttribute('data-scene-state', 'idle');
    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    // The needle waits at 190°, on the dial's left foot side.
    expect(svg.querySelector('path[d="M 220 206 L 125.46 189.33"]')).not.toBeNull();
    expect(svg.querySelector('path[d="M 220 206 L 287.88 138.12"]')).toBeNull();
  });
});
