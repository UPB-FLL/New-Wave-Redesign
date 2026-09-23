import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { checkPath, sceneColor } from '../index';
import { IntegrationOnePathScene } from './IntegrationOnePathScene';
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

describe('IntegrationOnePathScene', () => {
  it('renders its static final frame as a decorative svg: three tools, one path, one booking', () => {
    const { container } = render(<IntegrationOnePathScene forceStatic tone="light" />);
    const frame = container.querySelector('[data-scene]');
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame).toHaveAttribute('data-scene-tone', 'light');

    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg.querySelector('text')).toBeNull();
    expect(paintOutsidePalette(svg)).toEqual([]);

    // The tools the business already uses, in place.
    const icons = Array.from(svg.querySelectorAll('[data-scene-icon]')).map((g) => g.getAttribute('data-scene-icon'));
    expect(icons).toEqual(['service-social', 'map-pin', 'mail']);

    // Each current converges on the merge point; the one amber path runs from there into the calendar.
    const currents = Array.from(svg.querySelectorAll('path[d^="M 80 "]'));
    expect(currents.map((p) => p.getAttribute('stroke'))).toEqual([
      sceneColor('cyan'),
      sceneColor('line2'),
      sceneColor('tide'),
    ]);
    for (const current of currents) expect(current.getAttribute('d')).toMatch(/ 204 160$/);
    const [entryX, entryY] = bookedCalendarEntry(404, 168, 104);
    const onePath = svg.querySelector('path[d^="M 204 160 C"]');
    expect(onePath).toHaveAttribute('stroke', sceneColor('accent'));
    expect(onePath?.getAttribute('d')).toMatch(new RegExp(` ${entryX} ${entryY}$`));

    // All three customers rest at the calendar's entry; the calendar holds its check.
    const dots = Array.from(svg.querySelectorAll('circle'));
    expect(dots).toHaveLength(3);
    for (const dot of dots) {
      expect(dot).toHaveAttribute('cx', String(entryX));
      expect(dot).toHaveAttribute('cy', String(entryY));
    }
    expect(svg.querySelector(`path[d="${checkPath([404, 185.33], 43.33)}"]`)).not.toBeNull();
  });
});
