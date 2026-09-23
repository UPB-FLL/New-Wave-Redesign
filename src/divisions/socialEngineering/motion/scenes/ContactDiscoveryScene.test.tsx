import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sceneColor } from '../index';
import { ContactDiscoveryScene } from './ContactDiscoveryScene';

describe('ContactDiscoveryScene', () => {
  it('renders its static final frame as a decorative svg', () => {
    const { container } = render(<ContactDiscoveryScene forceStatic />);
    const frame = container.querySelector('[data-scene]');
    const svg = container.querySelector('svg');

    expect(frame).toHaveAttribute('data-scene-state', 'static');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(container.querySelector('text')).toBeNull();

    const paths = [...container.querySelectorAll('path')];
    // Today's dotted route is gone; the clear amber path (and the lens's wave) remain.
    expect(paths.some((p) => p.hasAttribute('stroke-dasharray'))).toBe(false);
    const accent = paths.filter((p) => p.getAttribute('stroke') === sceneColor('accent'));
    expect(accent).toHaveLength(2);
    expect(accent[1].getAttribute('d')).toMatch(/^M 164 190 .* 404 126$/);
    // The business rests at the flag's foot.
    const dot = container.querySelector('circle');
    expect(dot).toHaveAttribute('cx', '404');
    expect(dot).toHaveAttribute('cy', '126');
  });

  it('renders the final frame without IntersectionObserver (jsdom)', () => {
    const { container } = render(<ContactDiscoveryScene />);
    expect(container.querySelector('[data-scene]')).toHaveAttribute('data-scene-state', 'static');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
