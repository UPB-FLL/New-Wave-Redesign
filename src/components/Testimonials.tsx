import { Quote, Star } from 'lucide-react';
import { SectionHeading } from './brand/SectionHeading';

const testimonials = [
  {
    quote:
      'New Wave IT transformed our security posture. Within 30 days we went from constant phishing incidents to no successful attacks. Their team feels like an extension of ours.',
    author: 'Sarah Mitchell',
    title: 'Operations Director',
    company: 'Coastal Health Group',
    industry: 'Healthcare',
  },
  {
    quote:
      'We migrated three offices to the cloud with minimal disruption to daily work. The project management was clear, measured, and ahead of schedule.',
    author: 'Marcus Chen',
    title: 'CFO',
    company: 'Atlantic Logistics',
    industry: 'Logistics',
  },
  {
    quote:
      'The 24/7 support is real. We had a server issue on a Sunday and it was resolved before our team arrived on Monday. That is the kind of partner you need.',
    author: 'Jennifer Rodriguez',
    title: 'IT Manager',
    company: 'Sunshine Manufacturing',
    industry: 'Manufacturing',
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[var(--nw-cloud-white)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="Customer Stories"
          title={<>Measured support. <span className="text-[var(--nw-tide-blue)]">Real outcomes.</span></>}
          description="Stories from South Florida organizations New Wave IT has helped support, secure, and modernize."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => {
            const initials = testimonial.author
              .split(' ')
              .map((name) => name[0])
              .join('');

            return (
              <figure key={testimonial.author} className="nw-surface flex min-h-[280px] flex-col rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <Quote size={24} className="text-[var(--nw-tide-blue)]" aria-hidden="true" />
                  <div className="flex gap-0.5 text-[var(--nw-signal-cyan)]" aria-label="Five-star testimonial">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={14} fill="currentColor" aria-hidden="true" />
                    ))}
                  </div>
                </div>
                <blockquote className="mt-6 flex-1 text-sm leading-relaxed text-[var(--nw-current-navy)]">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t pt-5" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--nw-current-navy)] text-sm font-bold text-[var(--nw-cloud-white)]">
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-[var(--nw-current-navy)]">{testimonial.author}</span>
                    <span className="block truncate text-xs text-[var(--nw-slate)]">{testimonial.title}, {testimonial.company}</span>
                  </span>
                  <span className="nw-meta text-xs text-[var(--nw-tide-blue)]">{testimonial.industry}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
