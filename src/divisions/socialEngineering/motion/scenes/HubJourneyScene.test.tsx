import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { checkPath, sceneColor } from '../index';
import { HubJourneyScene } from './HubJourneyScene';

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

describe('HubJourneyScene', () => {
  it('renders its static final frame as a decorative svg on the Cloud White band: booked, returning, referred', () => {
    const { container } = render(<HubJourneyScene forceStatic />);
    const frame = container.querySelector('[data-scene]') as HTMLElement;
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    // Made for the light "What we gather" band: light by default, knocking out to Cloud White.
    expect(frame).toHaveAttribute('data-scene-tone', 'light');
    expect(frame.style.getPropertyValue('--scene-ground')).toBe('#F7FAFB');

    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 480 320');
    expect(svg.querySelector('text')).toBeNull();
    expect(paintOutsidePalette(svg)).toEqual([]);

    // Six stage rings on one amber path; Book is the larger one and holds the check.
    const rings = Array.from(svg.querySelectorAll(`circle[fill="${sceneColor('ground')}"]`));
    expect(rings.map((c) => c.getAttribute('r'))).toEqual(['9', '9', '15', '9', '9', '9']);
    expect(svg.querySelectorAll(`[stroke="${sceneColor('accent')}"]`)).toHaveLength(1);
    expect(svg.querySelector(`path[d="${checkPath([208, 144], 26)}"]`)).not.toBeNull();

    // Returning customers (tide arc and chevron), and a referral (cyan) back to the start.
    expect(svg.querySelectorAll(`[stroke="${sceneColor('tide')}"]`)).toHaveLength(2);
    expect(svg.querySelectorAll(`[stroke="${sceneColor('cyan')}"]`)).toHaveLength(1);

    // One customer rests in the Refer ring, and the referred one in the Discover ring.
    const dots = Array.from(svg.querySelectorAll('circle[r="6"]')).map((c) => [c.getAttribute('cx'), c.getAttribute('cy')]);
    expect(dots).toEqual([
      ['64', '144'],
      ['424', '144'],
    ]);
    // The referral arc itself stops just outside both rings, so their outlines stay whole.
    expect(svg.querySelector(`[stroke="${sceneColor('cyan')}"]`)).toHaveAttribute('d', 'M 424 160 C 416 266 72 266 64 160');
  });

  it('keeps the dark ground on the dark tone', () => {
    const { container } = render(<HubJourneyScene tone="dark" forceStatic />);
    const frame = container.querySelector('[data-scene]') as HTMLElement;
    expect(frame).toHaveAttribute('data-scene-tone', 'dark');
    expect(frame.style.getPropertyValue('--scene-ground')).toBe('#09131D');
  });
});
