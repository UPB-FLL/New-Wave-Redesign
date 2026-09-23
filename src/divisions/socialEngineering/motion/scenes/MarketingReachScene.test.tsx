import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { checkPath, sceneColor } from '../index';
import { MarketingReachScene } from './MarketingReachScene';

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

describe('MarketingReachScene', () => {
  it('renders its static final frame as a decorative svg: impressions faded, the page booked, the follow-up in place', () => {
    const { container } = render(<MarketingReachScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame).toHaveAttribute('data-scene-tone', 'dark');

    const svg = container.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 480 320');
    expect(svg.querySelector('text')).toBeNull();
    expect(paintOutsidePalette(svg)).toEqual([]);

    // The broadcast ripples hold at 30%: impressions are not the measure.
    const ripples = svg.querySelector('g[opacity="0.3"]');
    expect(ripples?.querySelectorAll(`path[stroke="${sceneColor('line2')}"]`)).toHaveLength(6);

    // The megaphone's amber wave is the path itself: one wave from where its accent starts to the page's edge.
    expect(svg.querySelector('[data-scene-icon="service-marketing"]')).not.toBeNull();
    const amber = Array.from(svg.querySelectorAll(`[stroke="${sceneColor('accent')}"]`)).map((el) => el.getAttribute('d'));
    expect(amber).toHaveLength(1);
    expect(amber[0]).toMatch(/^M 84 164 C .* 352 164$/);

    // The customer rests at the page, which holds the check.
    const dots = svg.querySelectorAll('circle');
    expect(dots).toHaveLength(1);
    expect(dots[0]).toHaveAttribute('cx', '352');
    expect(dots[0]).toHaveAttribute('cy', '164');
    expect(svg.querySelector(`path[d="${checkPath([400, 176], 40)}"]`)).not.toBeNull();

    // The follow-up: a tide arc and chevron, carried by an email.
    expect(svg.querySelectorAll(`[stroke="${sceneColor('tide')}"]`)).toHaveLength(2);
    expect(svg.querySelector('[data-scene-icon="mail"]')).not.toBeNull();
  });
});
