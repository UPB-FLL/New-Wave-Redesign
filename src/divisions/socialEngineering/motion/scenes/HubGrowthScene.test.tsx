import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sceneColor, wavePath } from '../index';
import { HubGrowthScene } from './HubGrowthScene';

describe('HubGrowthScene', () => {
  it('renders its static final frame as a decorative svg', () => {
    const { container } = render(<HubGrowthScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    const svg = container.querySelector('svg');

    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame).toHaveAttribute('data-scene-tone', 'dark');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('viewBox', '0 0 480 320');
    expect(container.querySelector('text')).toBeNull();

    const paths = [...container.querySelectorAll('path')];
    // The brand wave ends as the rising trend, in the accent.
    const trend = wavePath({ x: 56, y: 256, width: 368, amplitude: 14, rise: 168 });
    const accent = paths.filter((p) => p.getAttribute('stroke') === sceneColor('accent'));
    expect(accent.map((p) => p.getAttribute('d'))).toEqual([trend]);
    // The guesswork ghost stays behind as the only dotted line.
    const dotted = paths.filter((p) => p.hasAttribute('stroke-dasharray'));
    expect(dotted).toHaveLength(1);
    expect(dotted[0]).toHaveAttribute('d', wavePath({ x: 56, y: 184, width: 368, amplitude: 50 }));
    // Three bookings on the line, each ring knocking the line out.
    const rings = container.querySelectorAll('circle[r="13"]');
    expect(rings).toHaveLength(3);
    rings.forEach((ring) => expect(ring).toHaveAttribute('fill', sceneColor('ground')));
  });

  it('renders the final frame without IntersectionObserver (jsdom), on the light tone too', () => {
    const { container } = render(<HubGrowthScene tone="light" className="scene" />);
    const frame = container.querySelector('[data-scene]');
    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(frame).toHaveAttribute('data-scene-tone', 'light');
    expect(frame).toHaveClass('scene');
  });
});
