import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FaqSection } from './FaqSection';

const items = [
  { question: 'Is the price list published?', answer: 'Yes. Every monthly rate is on the pricing page.' },
  { question: 'Is there a long-term contract?', answer: 'No. Support runs without a long-term contract.' },
];

describe('FaqSection', () => {
  it('titles the band and shows every question with its answer', () => {
    const { container } = render(<FaqSection items={items} />);

    expect(container.querySelector('h2')?.textContent).toBe('Frequently asked questions');
    expect([...container.querySelectorAll('h3')].map((question) => question.textContent)).toEqual(items.map((item) => item.question));
    expect([...container.querySelectorAll('p')].map((answer) => answer.textContent)).toEqual(items.map((item) => item.answer));
    expect(container.querySelector('details, aside, script')).toBeNull();
  });

  it('takes a title and a band tone', () => {
    const white = render(<FaqSection title="Pricing questions" items={items} />);
    expect(white.container.querySelector('h2')?.textContent).toBe('Pricing questions');
    expect(white.container.querySelector('section')?.className).toContain('bg-[var(--nw-pure-white)]');
    white.unmount();

    const base = render(<FaqSection items={items} tone="base" />);
    expect(base.container.querySelector('section')?.className).not.toContain('bg-[var(--nw-pure-white)]');
  });

  it('renders nothing without questions', () => {
    const { container } = render(<FaqSection items={[]} />);

    expect(container.innerHTML).toBe('');
  });
});
