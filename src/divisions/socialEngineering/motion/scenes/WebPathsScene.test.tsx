import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { checkPath, sceneColor } from '../index';
import { WebPathsScene } from './WebPathsScene';

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

describe('WebPathsScene', () => {
  it('renders its static final frame as a decorative svg: the customer has booked through the listing lane', () => {
    const { container } = render(<WebPathsScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame).toHaveAttribute('data-scene-tone', 'dark');

    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 480 320');
    expect(svg.querySelector('text')).toBeNull();
    expect(paintOutsidePalette(svg)).toEqual([]);

    // Three sources: a post, an ad, a listing.
    const sources = Array.from(svg.querySelectorAll('[data-scene-icon]')).map((el) => el.getAttribute('data-scene-icon'));
    expect(sources).toEqual(['service-social', 'service-marketing', 'map-pin']);

    // The only amber is the listing's lane; it straightens inside the site and stops short of its button.
    const amber = svg.querySelectorAll(`[stroke="${sceneColor('accent')}"]`);
    expect(amber).toHaveLength(1);
    expect(amber[0].getAttribute('d')).toMatch(/^M 64 224 C .* L 376 224$/);

    // The customer rests at the end of that lane, beside the button, which holds the check.
    const dots = svg.querySelectorAll('circle');
    expect(dots).toHaveLength(1);
    expect(dots[0]).toHaveAttribute('cx', '376');
    expect(dots[0]).toHaveAttribute('cy', '224');
    expect(svg.querySelector(`path[d="${checkPath([408, 224], 22)}"]`)).not.toBeNull();
  });
});
