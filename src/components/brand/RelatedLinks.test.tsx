import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RelatedLinks } from './RelatedLinks';

const links = [
  { label: 'Cybersecurity', href: '/service-category/cybersecurity', description: 'Endpoint protection, monitoring, and email filtering.' },
  { label: 'Pricing', href: '/pricing' },
];

describe('RelatedLinks', () => {
  it('lists each page as a link whose text is its label', () => {
    const { container } = render(<MemoryRouter><RelatedLinks links={links} /></MemoryRouter>);

    expect(container.querySelector('h2')?.textContent).toBe('Related services and areas');
    expect([...container.querySelectorAll('li a')].map((link) => [link.getAttribute('href'), link.textContent])).toEqual([
      ['/service-category/cybersecurity', 'Cybersecurity'],
      ['/pricing', 'Pricing'],
    ]);
    expect(container.querySelector('li')?.textContent).toContain('Endpoint protection, monitoring, and email filtering.');
  });

  it('takes a title, and renders nothing without links', () => {
    const titled = render(<MemoryRouter><RelatedLinks title="Other areas we serve" links={links} tone="base" /></MemoryRouter>);
    expect(titled.container.querySelector('h2')?.textContent).toBe('Other areas we serve');
    expect(titled.container.querySelector('section')?.className).not.toContain('bg-[var(--nw-pure-white)]');
    titled.unmount();

    const empty = render(<MemoryRouter><RelatedLinks links={[]} /></MemoryRouter>);
    expect(empty.container.innerHTML).toBe('');
  });
});
