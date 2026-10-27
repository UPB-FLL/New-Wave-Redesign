import { ArrowRight, Award, CheckCircle2, Clock, Lightbulb, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import { CheckList } from './brand/CheckList';
import { cmsHeadline } from './brand/cmsHeadline';
import { SectionHeading } from './brand/SectionHeading';

type FeatureCard = { title: string; desc: string };

const iconList: LucideIcon[] = [Clock, Award, Users, Lightbulb, CheckCircle2, Award];

/** The section's title and description when the CMS has none. */
export const WHYUS_DEFAULT_TITLE = 'Built for businesses that need continuity';
export const WHYUS_DEFAULT_DESCRIPTION = 'We do more than resolve tickets. We create a technology relationship that keeps your business moving with confidence.';
export const WHYUS_DEFAULT_CTA = 'Schedule a Free Assessment';

const defaultProofPoints = [
  'No long-term contracts required',
  'Flat-rate transparent pricing',
  'Local Fort Lauderdale team',
  'Dedicated account manager for every client',
  'Proactive support before issues become disruptions',
];

const defaultCards: FeatureCard[] = [
  { title: '24/7 Service & Monitoring', desc: 'Round-the-clock monitoring and support so issues are identified early and handled with care.' },
  { title: 'Partner-Backed Engineers', desc: 'New Wave IT is a Microsoft, Cisco, and Huntress partner.' },
  { title: 'Dedicated Project Managers', desc: 'Every engagement comes with a dedicated contact keeping timelines and deliverables clear.' },
  { title: 'Strategic Tech Advisors', desc: 'We align technology investments with your business goals for long-term progress.' },
  { title: 'Security & Compliance', desc: 'HIPAA, SOC 2, and industry-specific expertise to help keep data protected and audit-ready.' },
  { title: 'Cloud Migration & Integration', desc: 'Carefully managed transitions to cloud platforms and practical integration with existing tools.' },
];

function readStringList(raw?: string): string[] {
  if (!raw) return defaultProofPoints;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') && parsed.length ? parsed : defaultProofPoints;
  } catch {
    return defaultProofPoints;
  }
}

function readFeatureCards(raw?: string): FeatureCard[] {
  if (!raw) return defaultCards;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultCards;
    const valid = parsed.filter(
      (card): card is FeatureCard =>
        typeof card === 'object' && card !== null && typeof card.title === 'string' && typeof card.desc === 'string',
    );
    return valid.length ? [...valid, ...defaultCards.slice(valid.length)] : defaultCards;
  } catch {
    return defaultCards;
  }
}

/**
 * Proof points, feature cards, and how an engagement works. On the home page
 * the CMS headline titles it; on /why-us the page header carries the
 * headline, and the band's own groups take plain titles.
 */
export default function WhyUs({ variant = 'home' }: { variant?: 'home' | 'page' } = {}) {
  const content = useContent('whyus');
  const proofPoints = readStringList(content.proof_points);
  const cards = readFeatureCards(content.feature_cards);
  const steps = [
    {
      title: content.how_step1_title || 'Assessment',
      description: content.how_step1_desc || 'We learn how your team works, review the environment, and identify practical priorities.',
    },
    {
      title: content.how_step2_title || 'Planning',
      description: content.how_step2_desc || 'Together we build a clear technology roadmap aligned to business outcomes.',
    },
    {
      title: content.how_step3_title || 'Implementation & Support',
      description: content.how_step3_desc || 'We deliver the plan and remain accountable as your day-to-day technology partner.',
    },
  ];

  return (
    <section id="why-us" className="relative z-10 border-t bg-[var(--nw-pure-white)] py-16 sm:py-20" style={{ borderColor: 'var(--nw-mist-gray)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* The list is shorter than the six cards beside it, so it stays in view while they scroll past. */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            {variant === 'home' ? (
              <SectionHeading
                title={cmsHeadline(content, WHYUS_DEFAULT_TITLE)}
                description={content.subheadline || WHYUS_DEFAULT_DESCRIPTION}
              />
            ) : (
              <SectionHeading title="What you can expect" />
            )}

            <CheckList items={proofPoints} className="mt-8" />

            {variant === 'home' ? (
              <Link to="/contact" className="btn-primary mt-8">
                {content.cta_label || WHYUS_DEFAULT_CTA}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((feature, index) => {
              const Icon = iconList[index % iconList.length];
              return (
                <article key={feature.title} className="nw-surface rounded-lg p-5 transition-colors hover:border-[var(--nw-tide-blue)]">
                  <span className="nw-icon-signal h-10 w-10">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-bold text-[var(--nw-current-navy)]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-16 border-t pt-12" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <SectionHeading
            title={content.how_it_works_title || 'How it works'}
            description={content.how_it_works_desc || 'A straightforward engagement from first conversation through continuous support.'}
          />
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-lg border p-6" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <span className="nw-display flex h-9 w-9 items-center justify-center rounded-full text-sm text-[var(--nw-deep-current)]" style={{ background: 'var(--nw-signal-cyan)' }} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold text-[var(--nw-current-navy)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--nw-slate)]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
