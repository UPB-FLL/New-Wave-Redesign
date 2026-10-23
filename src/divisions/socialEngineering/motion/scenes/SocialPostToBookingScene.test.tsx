import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sceneColor } from '../index';
import { SocialPostToBookingScene } from './SocialPostToBookingScene';
import { bookedCalendarEntry } from './bookedCalendarEntry';

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

describe('SocialPostToBookingScene', () => {
  it('renders its static final frame as a decorative svg: the customer rests at the booked calendar', () => {
    const { container } = render(<SocialPostToBookingScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame).toHaveAttribute('data-scene-tone', 'dark');

    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 480 320');
    expect(svg.querySelector('text')).toBeNull();
    expect(paintOutsidePalette(svg)).toEqual([]);

    // Final frame: the amber path ends at the calendar's entry, and the dot rests there.
    expect(bookedCalendarEntry(392, 176, 104)).toEqual([355.17, 167.33]);
    const path = svg.querySelector('path[d^="M 160 168 C 200 168 206 240 256 240"]');
    expect(path).toHaveAttribute('stroke', sceneColor('accent'));
    expect(path?.getAttribute('d')).toMatch(/ 355\.17 167\.33$/);
    const dot = svg.querySelector('circle');
    expect(dot).toHaveAttribute('cx', '355.17');
    expect(dot).toHaveAttribute('cy', '167.33');
    // The story has landed: the calendar holds its check, and the only amber is
    // the winning post's wave, the path, and the calendar's header.
    expect(svg.querySelector('path[d="M8.5 15.5L11 18L16 13"]')).toHaveAttribute('stroke', sceneColor('line'));
    expect(svg.querySelectorAll(`[stroke="${sceneColor('accent')}"]`)).toHaveLength(3);
  });
});
