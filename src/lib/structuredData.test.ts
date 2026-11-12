import { describe, expect, it } from 'vitest';
import { faqPageNode, type FaqItem } from './structuredData';

const faqs: FaqItem[] = [
  { question: 'Where is the office?', answer: 'At 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311.' },
  { question: 'What does a computer cost per month?', answer: '$105 per computer, per month.' },
];

describe('faqPageNode', () => {
  it('states each question and answer as given, in order', () => {
    expect(faqPageNode(faqs)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Where is the office?', acceptedAnswer: { '@type': 'Answer', text: 'At 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311.' } },
        { '@type': 'Question', name: 'What does a computer cost per month?', acceptedAnswer: { '@type': 'Answer', text: '$105 per computer, per month.' } },
      ],
    });
  });

  it('leaves the strings untouched: no trimming, escaping or markup', () => {
    const item = { question: ' Do you support Microsoft 365 & "Teams"? ', answer: "Yes. It's on the help desk's list.\nAsk for it." };
    const [question] = faqPageNode([item]).mainEntity as { name: string; acceptedAnswer: { text: string } }[];

    expect(question.name).toBe(item.question);
    expect(question.acceptedAnswer.text).toBe(item.answer);
  });

  it('is plain JSON and does not hold on to the list it was given', () => {
    const node = faqPageNode(faqs);

    expect(JSON.parse(JSON.stringify(node))).toEqual(node);
    expect(node.mainEntity).not.toBe(faqs);
    expect(faqs).toHaveLength(2);
  });
});
