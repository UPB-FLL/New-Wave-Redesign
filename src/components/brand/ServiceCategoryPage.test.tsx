// The shared service page takes long-form copy, a visible FAQ and links to
// related pages as optional fields. A page that sets none of them renders as
// it always has; a page that sets them keeps the layout every IT page holds.

import { render } from '@testing-library/react';
import { DollarSign, Headphones } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { faqPageNode, type FaqItem } from '../../lib/structuredData';
import { ServiceCategoryPage, type ServiceCategoryPageData } from './ServiceCategoryPage';

vi.mock('../../lib/useContent', () => ({ useContent: () => ({}) }));
vi.mock('../Navbar', () => ({ default: () => null }));
vi.mock('../Footer', () => ({ default: () => null }));

const base: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'IT Support in Fort Lauderdale',
  heroTitle: 'IT support for Fort Lauderdale businesses',
  description: 'Help desk, remote, and on-site IT support.',
  details: 'New Wave IT supports offices from 710 NW 5th Ave in Fort Lauderdale.',
  highlights: ['24/7 help desk access', 'Flat per-device pricing'],
  seoLink: '/pricing',
  guideLabel: 'See our pricing',
  featureTitle: 'What IT support covers',
  featureCards: [{ icon: Headphones, title: 'Help Desk', description: 'Password resets, email problems, and printers.' }],
  sections: [
    {
      title: 'Published, per-device pricing',
      description: 'Every rate is on the price list.',
      cards: [{ icon: DollarSign, title: '$105 per computer', description: 'Per computer or device, per month.' }],
    },
    { title: 'How getting started works', ordered: true, items: ['A free assessment.', 'A written quote.'] },
  ],
  ctaTitle: 'Need IT support in Fort Lauderdale?',
};

const faqs: FaqItem[] = [
  {
    question: 'Where is the New Wave IT office?',
    answer: 'The office is at 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311. It is open Monday to Friday, 8am to 6pm.',
  },
  {
    question: 'What does IT support cost per computer?',
    answer: 'Support is $105 per computer per month on the published price list, plus $5 per user account and $175 per managed server.',
  },
];

const full: ServiceCategoryPageData = {
  ...base,
  overviewTitle: 'What is IT support from New Wave IT?',
  overviewBody: ['The second overview paragraph names the help desk.', 'The third overview paragraph names on-site visits.'],
  sections: [
    {
      ...base.sections![0],
      body: ['The first pricing paragraph lists the monthly rate per computer.', 'The second pricing paragraph lists the rate per server.'],
    },
    base.sections![1],
  ],
  faqs,
  relatedLinks: [
    { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale', description: 'Monitoring, patching, and backup at a flat monthly rate.' },
    { label: 'Pricing', href: '/pricing' },
  ],
};

function renderPage(data: ServiceCategoryPageData) {
  const { container } = render(
    <MemoryRouter>
      <ServiceCategoryPage data={data} breadcrumbs={[{ name: 'IT Support Fort Lauderdale', path: '/it-support-fort-lauderdale' }]} />
    </MemoryRouter>,
  );
  const main = container.querySelector('main') as HTMLElement;
  return { container, main };
}

const h2s = (root: HTMLElement) => [...root.querySelectorAll('h2')].map((heading) => heading.textContent);
const byText = (root: HTMLElement, selector: string, text: string) => [...root.querySelectorAll(selector)].find((element) => element.textContent === text) as HTMLElement;
/** Whether each band is Pure White, down to (not including) the dark closing band. */
const whiteBands = (main: HTMLElement) => [...main.querySelectorAll(':scope > section')].slice(0, -1).map((band) => band.className.includes('bg-[var(--nw-pure-white)]'));

/**
 * The page as scripts/geo_citability.py reads it: asides, headers, navs,
 * footers and forms dropped, then every paragraph and list filed under the
 * heading before it.
 */
function blocksUnderHeadings(main: HTMLElement): Map<string, string[]> {
  const copy = main.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('script, style, nav, footer, header, aside, form').forEach((element) => element.remove());
  const blocks = new Map<string, string[]>();
  let heading = '';
  for (const element of copy.querySelectorAll('h1, h2, h3, h4, p, ul, ol, table')) {
    if (/^H\d$/.test(element.tagName)) heading = element.textContent ?? '';
    else blocks.set(heading, [...(blocks.get(heading) ?? []), element.textContent ?? '']);
  }
  return blocks;
}

describe('ServiceCategoryPage without the long-form fields', () => {
  it('renders the bands it always has: no FAQ, no related links, the Overview title', () => {
    const { main } = renderPage(base);

    expect(h2s(main)).toEqual(['Overview', 'What IT support covers', 'Published, per-device pricing', 'How getting started works', 'Need IT support in Fort Lauderdale?']);
    expect(main.textContent).not.toContain('Frequently asked questions');
    expect(main.textContent).not.toContain('Related services and areas');
    // Overview, feature, two sections: white and base in turn.
    expect(whiteBands(main)).toEqual([true, false, true, false]);
  });

  it('treats empty lists as unset', () => {
    const { main } = renderPage({ ...base, overviewBody: [], faqs: [], relatedLinks: [] });

    expect(h2s(main)).toEqual(['Overview', 'What IT support covers', 'Published, per-device pricing', 'How getting started works', 'Need IT support in Fort Lauderdale?']);
  });
});

describe('ServiceCategoryPage with the long-form fields', () => {
  it('places the FAQ and the related links after the sections and before the closing band', () => {
    const { main } = renderPage(full);

    expect(h2s(main)).toEqual([
      'What is IT support from New Wave IT?',
      'What IT support covers',
      'Published, per-device pricing',
      'How getting started works',
      'Frequently asked questions',
      'Related services and areas',
      'Need IT support in Fort Lauderdale?',
    ]);
    expect(whiteBands(main)).toEqual([true, false, true, false, true, false]);
  });

  it('keeps the bands alternating when a page has no feature band and no FAQ', () => {
    const { main } = renderPage({ ...full, featureCards: undefined, faqs: undefined });

    // Overview, two sections, related links.
    expect(whiteBands(main)).toEqual([true, false, true, false]);
  });

  it('shows each question as an h3 with its answer in the paragraph under it, nothing folded away', () => {
    const { main } = renderPage(full);
    const band = byText(main, 'h2', 'Frequently asked questions').closest('section') as HTMLElement;

    const questions = [...band.querySelectorAll('h3')];
    expect(questions.map((question) => question.textContent)).toEqual(faqs.map((item) => item.question));
    questions.forEach((question, index) => {
      const answer = question.nextElementSibling as HTMLElement;
      expect(answer.tagName).toBe('P');
      expect(answer.textContent).toBe(faqs[index].answer);
    });
    expect(band.querySelector('details, summary, aside, script, button')).toBeNull();
  });

  it('shows exactly the strings the FAQPage node states', () => {
    const { main } = renderPage(full);
    const band = byText(main, 'h2', 'Frequently asked questions').closest('section') as HTMLElement;
    const shown = [...band.querySelectorAll('h3')].map((question) => ({
      '@type': 'Question',
      name: question.textContent,
      acceptedAnswer: { '@type': 'Answer', text: question.nextElementSibling?.textContent },
    }));

    expect(faqPageNode(faqs).mainEntity).toEqual(shown);
  });

  it('links each related page by its label, with the description beside it as plain text', () => {
    const { main } = renderPage(full);
    const band = byText(main, 'h2', 'Related services and areas').closest('section') as HTMLElement;

    const links = [...band.querySelectorAll('a')];
    expect(links.map((link) => [link.getAttribute('href'), link.textContent])).toEqual([
      ['/managed-it-services-fort-lauderdale', 'Managed IT services in Fort Lauderdale'],
      ['/pricing', 'Pricing'],
    ]);
    expect(band.querySelectorAll('li')).toHaveLength(2);
    expect(links[0].nextElementSibling?.textContent).toBe('Monitoring, patching, and backup at a flat monthly rate.');
    expect(links[0].nextElementSibling?.querySelector('a')).toBeNull();
    // A link without a description stands alone.
    expect(links[1].nextElementSibling).toBeNull();
  });

  it('takes its own titles for the FAQ and the related links', () => {
    const { main } = renderPage({ ...full, faqTitle: 'Questions about IT support in Fort Lauderdale', relatedTitle: 'More from New Wave IT' });

    expect(h2s(main)).toContain('Questions about IT support in Fort Lauderdale');
    expect(h2s(main)).toContain('More from New Wave IT');
    expect(h2s(main)).not.toContain('Frequently asked questions');
    expect(h2s(main)).not.toContain('Related services and areas');
  });

  it('replaces the Overview title and adds the overview paragraphs after the details', () => {
    const { main } = renderPage(full);

    expect(h2s(main)).not.toContain('Overview');
    const band = byText(main, 'h2', 'What is IT support from New Wave IT?').closest('section') as HTMLElement;
    const paragraphs = [...band.querySelectorAll('p')].filter((paragraph) => !paragraph.closest('aside'));
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual([base.details, ...full.overviewBody!]);
  });

  it("puts a section's paragraphs after its description and before its cards", () => {
    const { main } = renderPage(full);
    const band = byText(main, 'h2', 'Published, per-device pricing').closest('section') as HTMLElement;

    expect([...band.querySelectorAll('p')].map((paragraph) => paragraph.textContent)).toEqual([
      'Every rate is on the price list.',
      'The first pricing paragraph lists the monthly rate per computer.',
      'The second pricing paragraph lists the rate per server.',
      'Per computer or device, per month.',
    ]);
  });

  it('keeps the long-form copy where a reader that drops asides finds it under its heading', () => {
    const { main } = renderPage(full);
    const blocks = blocksUnderHeadings(main);

    expect(blocks.get('What is IT support from New Wave IT?')).toEqual([base.details, ...full.overviewBody!]);
    expect(blocks.get('Published, per-device pricing')).toEqual(['Every rate is on the price list.', ...full.sections![0].body!]);
    for (const item of faqs) expect(blocks.get(item.question)).toEqual([item.answer]);
    // The related links are one list, each description counted once.
    expect(blocks.get('Related services and areas')).toHaveLength(1);
  });

  it('holds the layout every New Wave IT page holds', () => {
    const { container, main } = renderPage(full);

    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].closest('header')).not.toBeNull();
    expect(container.querySelectorAll('.nw-kicker')).toHaveLength(0);
    const levels = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) => Number(heading.tagName[1]));
    levels.forEach((level, index) => {
      if (index) expect(level).toBeLessThanOrEqual(levels[index - 1] + 1);
    });
    const chips = [...container.querySelectorAll('.rounded-full')].filter((element) => /[A-Za-z]/.test(element.textContent ?? ''));
    expect(chips).toEqual([]);
    expect(main.querySelector('a[href="/services"]')?.textContent).toBe('See all IT services');
    expect(container.innerHTML).not.toContain('<script');
  });
});
