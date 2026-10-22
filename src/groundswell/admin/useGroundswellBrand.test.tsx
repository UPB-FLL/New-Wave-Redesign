import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGroundswellBrand } from './useGroundswellBrand';

function StaffBrand() {
  useGroundswellBrand();
  return null;
}

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('GroundSwell staff browser identity', () => {
  it('uses the supplied icons and restores the parent website identity on exit', () => {
    document.head.innerHTML =
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="shortcut icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple.png"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#101E2D"><meta name="description" content="Parent website">';
    const original = [...document.head.children];
    const { unmount } = render(
      <StrictMode>
        <StaffBrand />
      </StrictMode>,
    );

    expect([...document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')].map((link) => link.getAttribute('href'))).toEqual([
      '/brand/social-engineering/06_Digital/favicon.ico',
      '/brand/social-engineering/06_Digital/GroundSwell_Favicon_32.png',
    ]);
    expect(document.head.querySelector('link[rel="shortcut icon"]')).toBeNull();
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/brand/social-engineering/06_Digital/GroundSwell_Favicon_180.png',
    );
    expect(document.head.querySelector('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/brand/social-engineering/06_Digital/site.webmanifest',
    );
    expect(document.head.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#09131D');
    expect(document.head.querySelector('link[rel="stylesheet"]')).toHaveAttribute('href', '/brand/social-engineering/04_Fonts/fonts.css');

    unmount();
    expect([...document.head.children]).toEqual(original);
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Parent website');
  });

  it('removes its own head entries when the incoming page has no icons or theme', () => {
    const { unmount } = render(<StaffBrand />);
    expect(document.head.querySelector('link[rel="manifest"]')).not.toBeNull();
    unmount();
    expect(document.head.childNodes).toHaveLength(0);
  });
});
