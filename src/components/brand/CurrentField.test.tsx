import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CurrentField } from './CurrentField';

describe('CurrentField', () => {
  it('renders an aria-hidden, solid-color current field by default', () => {
    const { container } = render(<CurrentField density="standard" tone="dark" />);
    const field = container.querySelector('[data-role="current-field"]');

    expect(field).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('[data-role="current-field-stroke"]').length).toBeGreaterThan(2);
    expect(container.querySelector('linearGradient')).not.toBeInTheDocument();
  });
});
