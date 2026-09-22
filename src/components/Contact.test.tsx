// The shared contact form's optional `icons` prop is additive: New Wave IT
// pages pass nothing and keep their Lucide icons; a division page can swap in
// its own set.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Contact from './Contact';

vi.mock('../lib/useContent', () => ({ useContent: vi.fn(() => ({})) }));

beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify(init?.method === 'POST' ? { success: true } : { token: '1.test' }), { status: 200 }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const lucideClasses = (root: ParentNode) =>
  [...root.querySelectorAll('svg.lucide')].map((svg) => [...svg.classList].find((name) => name !== 'lucide'));

let now = 0;

/** Submits the form with the spam token comfortably past its minimum age. */
async function submit() {
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  now += 60_000;
  fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText(/How can we help/), { target: { value: 'Our laptops need managing.' } });
  fireEvent.click(screen.getByRole('button', { name: /Send message/ }));
  await screen.findByText('Message received');
}

describe('Contact icons', () => {
  it('renders the Lucide icons New Wave IT pages use when no icons are passed', async () => {
    const { container } = render(<Contact />);
    expect(lucideClasses(container)).toEqual(['lucide-phone', 'lucide-mail', 'lucide-map-pin', 'lucide-send']);
    container.querySelectorAll('svg.lucide').forEach((svg) => {
      expect(svg).toHaveAttribute('width', '18');
      expect(svg).toHaveAttribute('height', '18');
    });

    await submit();
    const success = container.querySelector('.nw-icon-success svg.lucide');
    expect(success).toHaveClass('lucide-check-circle');
    expect(success).toHaveAttribute('width', '32');
  });

  it('draws the icons a caller passes in their slots, and falls back per slot', async () => {
    const icon = (slot: string) => <svg data-testid={`icon-${slot}`} />;
    const { container } = render(<Contact icons={{ phone: icon('phone'), mail: icon('mail'), send: icon('send'), success: icon('success') }} />);

    expect(screen.getByTestId('icon-phone')).toBeInTheDocument();
    expect(screen.getByTestId('icon-mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send message/ })).toContainElement(screen.getByTestId('icon-send'));
    // mapPin was not passed, so it keeps the Lucide default.
    expect(lucideClasses(container)).toEqual(['lucide-map-pin']);

    await submit();
    expect(container.querySelector('.nw-icon-success')).toContainElement(screen.getByTestId('icon-success'));
  });
});
