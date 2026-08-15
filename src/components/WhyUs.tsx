import { ArrowRight, Award, CheckCircle2, Clock, Lightbulb, Users, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import { SectionHeading } from './brand/SectionHeading';

type FeatureCard = { title: string; desc: string };

const iconList: LucideIcon[] = [Clock, Award, Users, Lightbulb, CheckCircle2, Award];

const defaultProofPoints = [
  'No long-term contracts required',
  'Flat-rate transparent pricing',
  'Local Fort Lauderdale team',
  'Average ticket resolution under 1 hour',
  'Dedicated account manager for every client',
  'Proactive support before issues become disruptions',
];

const defaultCards: FeatureCard[] = [
  { title: '24/7 Service & Monitoring', desc: 'Round-the-clock monitoring and support so issues are identified early and handled with care.' },
  { title: 'Industry-Certified Engineers', desc: 'Microsoft, Cisco, and CompTIA certified engineers with deep expertise across platforms.' },
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

export default function WhyUs({ headlineAs: Heading = 'h2' }: { headlineAs?: 'h1' | 'h2' } = {}) {
  const content = useContent('whyus');
  const navigate = useNavigate();
  const proofPoints = readStringList(content.proof_points);
  const cards = readFeatureCards(content.feature_cards);
  const headline = content.headline || 'Built for businesses that';
  const accent = content.headline_accent || 'need continuity.';
  const steps = [
    {
      step: '01',
      title: content.how_step1_title || 'Assessment',
      description: content.how_step1_desc || 'We learn how your team works, review the environment, and identify practical priorities.',
    },
    {
      step: '02',
      title: content.how_step2_title || 'Planning',
      description: content.how_step2_desc || 'Together we build a clear technology roadmap aligned to business outcomes.',
    },
    {
      step: '03',
      title: content.how_step3_title || 'Implementation & Support',
      description: content.how_step3_desc || 'We deliver the plan and remain accountable as your day-to-day technology partner.',
    },
  ];

  return (
    <section id="why-us" className="bg-[var(--nw-pure-white)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              as={Heading}
              eyebrow={content.section_label || 'Why New Wave IT'}
              title={
                <>
                  {headline} <span className="text-[var(--nw-tide-blue)]">{accent}</span>
                </>
              }
              description={
                content.subheadline ||
                'We do more than resolve tickets. We create a technology relationship that keeps your business moving with confidence.'
              }
            />

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {proofPoints.map((point) => (
                <li key={point} className="flex gap-2 rounded-md border bg-[var(--nw-cloud-white)] p-3 text-sm text-[var(--nw-current-navy)]" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--nw-continuity-green)]" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <button type="button" onClick={() => navigate('/contact')} className="btn-primary mt-8">
              {content.cta_label || 'Schedule a Free Assessment'}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
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

        <div className="mt-20 border-t pt-16" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <SectionHeading
            as="h3"
            align="center"
            eyebrow="How It Works"
            title={content.how_it_works_title || 'A clear route to better technology.'}
            description={content.how_it_works_desc || 'A straightforward engagement from first conversation through continuous support.'}
          />
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <li key={step.step} className="rounded-lg border p-6" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <p className="nw-meta text-sm text-[var(--nw-tide-blue)]">{step.step}</p>
                <h4 className="mt-6 text-lg font-bold text-[var(--nw-current-navy)]">{step.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-[var(--nw-slate)]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
