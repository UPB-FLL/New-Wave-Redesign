import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sceneColor } from '../index';
import { pathEndpoints } from '../geometry';
import { ContactUsReplyScene } from './ContactUsReplyScene';

describe('ContactUsReplyScene', () => {
  it('renders its static final frame as a decorative svg', () => {
    const { container } = render(<ContactUsReplyScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    const svg = container.querySelector('svg');

    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(container.querySelector('text')).toBeNull();

    const paths = [...container.querySelectorAll('path')];
    const ds = paths.map((p) => p.getAttribute('d') ?? '');
    // The visitor's note (tail bottom-left) and the team's bubble (tail bottom-right), level.
    expect(ds.some((d) => d.startsWith('M 24 230 '))).toBe(true);
    expect(ds.some((d) => d.startsWith('M 456 230 '))).toBe(true);
    // The typing dots are gone once the reply lands.
    expect(ds.filter((d) => d.includes('.01 '))).toEqual([]);
    // The reply is the one amber stroke, inside the team's bubble.
    const accent = paths.filter((p) => p.getAttribute('stroke') === sceneColor('accent'));
    expect(accent).toHaveLength(1);
    expect(pathEndpoints(accent[0].getAttribute('d')!)).toEqual({ start: [322, 150], end: [426, 150] });
    // The note rests where the brand wave meets the team's bubble: on its
    // left side (x 292), between the rounded corners (y 118–182).
    const dot = container.querySelector('circle')!;
    expect(dot).toHaveAttribute('cx', '292');
    const cy = Number(dot.getAttribute('cy'));
    expect(cy).toBeGreaterThan(118);
    expect(cy).toBeLessThan(182);
  });

  it('renders the final frame without IntersectionObserver (jsdom)', () => {
    const { container } = render(<ContactUsReplyScene />);
    expect(container.querySelector('[data-scene]')).toHaveAttribute('data-scene-state', 'static');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
