import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrandMark } from './BrandMark';
import { NewWaveLogo } from './NewWaveLogo';

describe('NewWaveLogo', () => {
  it('renders the accessible three-current lockup from canonical paths', () => {
    render(<NewWaveLogo tone="onLight" showTagline />);

    expect(screen.getByLabelText('New Wave IT')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-role="current-stroke"]')).toHaveLength(3);
    expect(document.querySelector('[data-role="wordmark-path"]')).toBeInTheDocument();
    expect(document.querySelector('linearGradient')).not.toBeInTheDocument();
  });
});

describe('BrandMark', () => {
  it('uses the two-stroke micro mark only at 24px and below', () => {
    const { container } = render(<BrandMark opticalSize="micro" size={24} />);

    expect(container.querySelectorAll('[data-role="current-stroke"]')).toHaveLength(2);
  });

  it('rejects oversized micro marks unless a test-only override is supplied', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => render(<BrandMark opticalSize="micro" size={25} />)).toThrow(
        'Micro BrandMark instances are limited to 24px',
      );
    } finally {
      consoleError.mockRestore();
    }

    const { container } = render(
      <BrandMark opticalSize="micro" size={25} allowMicroOversizeForTesting />,
    );
    expect(container.querySelectorAll('[data-role="current-stroke"]')).toHaveLength(2);
  });
});
