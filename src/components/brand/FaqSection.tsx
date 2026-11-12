import type { FaqItem } from '../../lib/structuredData';
import { Section } from './Section';
import { SectionHeading } from './SectionHeading';

type FaqSectionProps = {
  title?: string;
  items: readonly FaqItem[];
  tone?: 'white' | 'base';
};

/**
 * A page's questions, every answer in the open: no accordion, so a reader
 * without JavaScript gets the whole answer, and each one is a paragraph
 * directly under its question. Pass the same items to faqPageNode() so the
 * FAQPage node states exactly what is shown here.
 */
export function FaqSection({ title, items, tone = 'white' }: FaqSectionProps) {
  if (!items.length) return null;
  return (
    <Section tone={tone}>
      <SectionHeading title={title || 'Frequently asked questions'} />
      <div className="mt-8 max-w-3xl">
        {items.map((item) => (
          <div key={item.question} className="border-t py-6 last:pb-0" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <h3 className="text-lg font-bold text-[var(--nw-current-navy)]">{item.question}</h3>
            <p className="mt-2 text-base leading-relaxed text-[var(--nw-slate)]">{item.answer}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
