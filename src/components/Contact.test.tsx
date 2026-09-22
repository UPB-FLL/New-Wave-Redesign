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

// The optional `details` prop and `intro.phonePlaceholder` are additive too:
// without them New Wave IT pages keep the CMS 'contact' values and fallbacks.
describe('Contact details', () => {
  const rows = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-contact-method]')].map((row) => row.querySelector('h3')?.textContent);

  it('keeps the Call, Email, and Visit rows and the sample phone placeholder by default', () => {
    const { container } = render(<Contact />);
    expect(rows(container)).toEqual(['Call us', 'Email us', 'Visit us']);
    expect(container.querySelector('a[href^="tel:"]')).toHaveTextContent('(954) 555-0100');
    expect(screen.getByLabelText('Phone number')).toHaveAttribute('placeholder', '(954) 555-0100');
    expect(screen.getByText(/710 NW 5th Ave, Suite 1072/)).toHaveTextContent('710 NW 5th Ave, Suite 1072 Fort Lauderdale, FL 33311');
  });

  it('shows the details a page passes, and leaves out the Call row without a phone', () => {
    const intro = { label: 'L', headline: 'H', subheadline: 'S', messagePlaceholder: 'M', phonePlaceholder: 'Optional' };
    const { container } = render(
      <Contact intro={intro} details={{ email: 'hello@example.com', address: '1 Main St\nFort Lauderdale, FL 33301' }} />,
    );
    expect(rows(container)).toEqual(['Email us', 'Visit us']);
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.textContent).not.toContain('555-0100');
    expect(container.querySelector('a[href="mailto:hello@example.com"]')).not.toBeNull();
    // The address is shown as given: no second city line appended.
    expect(container.textContent).not.toContain('33311');
    expect(screen.getByLabelText('Phone number')).toHaveAttribute('placeholder', 'Optional');
  });

  it('shows a phone the page passes', () => {
    const { container } = render(<Contact details={{ phone: '(954) 321-7788', email: 'a@b.co', address: 'x' }} />);
    expect(rows(container)).toEqual(['Call us', 'Email us', 'Visit us']);
    expect(container.querySelector('a[href="tel:9543217788"]')).toHaveTextContent('(954) 321-7788');
  });
});
