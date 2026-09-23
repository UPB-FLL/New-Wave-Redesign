import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sceneColor, wavePath } from '../index';
import { BrandAlignScene } from './BrandAlignScene';

describe('BrandAlignScene', () => {
  it('renders its static final frame as a decorative svg', () => {
    const { container } = render(<BrandAlignScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    const svg = container.querySelector('svg');

    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(container.querySelector('text')).toBeNull();

    const paths = [...container.querySelectorAll('path')];
    // One brand: four identical amber marks at the same height, one per touchpoint.
    const marks = paths.filter((p) => p.getAttribute('stroke') === sceneColor('accent')).map((p) => p.getAttribute('d'));
    expect(marks).toEqual([68, 172, 272, 382].map((x) => wavePath({ x, y: 178, width: 40, amplitude: 6 })));
    // The mismatched start marks are gone from the final frame.
    for (const role of ['cyan', 'tide'] as const) {
      expect(paths.some((p) => p.getAttribute('stroke') === sceneColor(role))).toBe(false);
    }
    // Every touchpoint ends upright: no leftover tilt or offset.
    container.querySelectorAll('g').forEach((g) => {
      const transform = g.getAttribute('transform') ?? '';
      expect(transform).not.toMatch(/rotate/);
      expect(g.style.transform).toBe('');
    });
    // The listing card's pin is the approved map-pin icon.
    expect(container.querySelector('[data-scene-icon="map-pin"]')).not.toBeNull();
  });

  it('renders the final frame without IntersectionObserver (jsdom)', () => {
    const { container } = render(<BrandAlignScene tone="light" />);
    expect(container.querySelector('[data-scene]')).toHaveAttribute('data-scene-state', 'static');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
