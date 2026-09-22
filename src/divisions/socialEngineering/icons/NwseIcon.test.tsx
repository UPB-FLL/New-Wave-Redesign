import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NwseIcon } from './NwseIcon';
import { DIVISION_ICONS } from './iconData';

const svgOf = (container: HTMLElement) => container.querySelector('svg')!;

describe('NwseIcon', () => {
  it('is decorative by default: hidden from assistive tech and out of the tab order', () => {
    const { container } = render(<NwseIcon name="phone" />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).not.toHaveAttribute('role');
    expect(svg.querySelector('title')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('draws the spec: 24 x 24 grid, currentColor stroke 1.75, round caps and joins', () => {
    const { container } = render(<NwseIcon name="service-web" />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '1.75');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
    expect(svg).toHaveAttribute('data-icon', 'service-web');
    expect([...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))).toEqual(
      DIVISION_ICONS['service-web'].paths.map((p) => p.d),
    );
  });

  it('scales with size and passes className through', () => {
    const { container } = render(<NwseIcon name="check" size={13} className="shrink-0 text-[var(--nw-slate)]" />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('width', '13');
    expect(svg).toHaveAttribute('height', '13');
    expect(svg).toHaveAttribute('class', 'shrink-0 text-[var(--nw-slate)]');
  });

  it('strokes only the accent paths with --nwse-icon-accent, falling back to currentColor', () => {
    const { container } = render(<NwseIcon name="method-discover" />);
    const paths = [...svgOf(container).querySelectorAll('path')];
    const accents = paths.filter((p) => p.getAttribute('data-accent') === 'true');
    expect(accents).toHaveLength(1);
    expect(accents[0].style.stroke).toBe('var(--nwse-icon-accent, currentColor)');
    paths.filter((p) => !accents.includes(p)).forEach((p) => expect(p.style.stroke).toBe(''));
  });

  it('lets accentColor override the accent stroke', () => {
    const { container } = render(<NwseIcon name="menu" accentColor="#F2A33A" />);
    const accent = svgOf(container).querySelector('path[data-accent="true"]') as SVGPathElement;
    expect(accent.style.stroke.toLowerCase()).toMatch(/#f2a33a|rgb\(242, 163, 58\)/);
  });

  it('draws UI glyphs without an accent', () => {
    const { container } = render(<NwseIcon name="arrow-right" />);
    expect(svgOf(container).querySelector('[data-accent]')).toBeNull();
  });

  it('becomes an image named by its title when given one', () => {
    render(<NwseIcon name="map-pin" title="Service area" />);
    const img = screen.getByRole('img', { name: 'Service area' });
    expect(img.tagName.toLowerCase()).toBe('svg');
    expect(img).not.toHaveAttribute('aria-hidden');
    expect(img).toHaveAttribute('focusable', 'false');
    const title = img.querySelector('title')!;
    expect(title).toHaveTextContent('Service area');
    expect(img.getAttribute('aria-labelledby')).toBe(title.id);
  });

  it('gives each titled icon its own title id', () => {
    render(
      <>
        <NwseIcon name="phone" title="Call" />
        <NwseIcon name="mail" title="Email" />
      </>,
    );
    const ids = screen.getAllByRole('img').map((img) => img.getAttribute('aria-labelledby'));
    expect(new Set(ids).size).toBe(2);
  });
});
