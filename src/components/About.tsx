import { Award, Shield, Users, Zap, type LucideIcon } from 'lucide-react';
import { useContent } from '../lib/useContent';
import { CurrentField } from './brand/CurrentField';
import { SectionHeading } from './brand/SectionHeading';

const approachIcons: LucideIcon[] = [Shield, Users, Award, Zap];

/** The headline and opening paragraph when the CMS has none; /about's page header shows them. */
export const ABOUT_DEFAULT_TITLE = "Fort Lauderdale's trusted IT partner";
export const ABOUT_DEFAULT_INTRO = 'New Wave IT was founded to give South Florida businesses enterprise-grade IT support they can rely on, without enterprise complexity.';

/** The body of /about: the rest of the story, the approach, and why clients choose New Wave IT. */
export default function About() {
  const content = useContent('about');
  const approach = [
    {
      title: content.approach_point1_title || 'Proactive',
      description: content.approach_point1_desc || 'We monitor your systems and address issues before they become business problems.',
    },
    {
      title: content.approach_point2_title || 'Collaborative',
      description: content.approach_point2_desc || 'Your dedicated project manager keeps communication clear across every engagement.',
    },
    {
      title: content.approach_point3_title || 'Partner-Backed',
      description: content.approach_point3_desc || 'New Wave IT is a Microsoft, Cisco, and Huntress partner.',
    },
    {
      title: content.approach_point4_title || 'Responsive',
      description: content.approach_point4_desc || 'A reliable team is ready to resolve the IT work that cannot wait.',
    },
  ];
  const reasons = [
    {
      title: content.why_reason1_title || 'Flat-Rate Pricing',
      description: content.why_reason1_desc || 'Predictable costs without hidden fees or restrictive long-term commitments.',
    },
    {
      title: content.why_reason2_title || 'Local Expertise',
      description: content.why_reason2_desc || 'A Fort Lauderdale team that understands the organizations and industries it serves.',
    },
    {
      title: content.why_reason3_title || 'True Partnership',
      description: content.why_reason3_desc || 'A dedicated relationship with people who know your business and its technology.',
    },
  ];

  return (
    <section id="about" className="relative z-10 border-t bg-[var(--nw-pure-white)] py-16 sm:py-20" style={{ borderColor: 'var(--nw-mist-gray)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <SectionHeading title="Our story" />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-[var(--nw-slate)] sm:text-lg">
              <p>{content.paragraph2 || 'Based in Fort Lauderdale, our certified engineers and technology advisors have helped organizations modernize infrastructure, strengthen security, and support sustainable growth.'}</p>
              <p>{content.paragraph3 || 'We are a hands-on technology partner focused on clear advice, dependable service, and practical results.'}</p>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-lg p-8 sm:p-10" style={{ background: 'var(--nw-deep-current)' }}>
            <CurrentField density="standard" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
            <div className="relative">
              <p className="nw-display text-5xl text-[var(--nw-cloud-white)] sm:text-6xl">{content.years_badge || 'Local'}</p>
              <p className="mt-3 max-w-[16rem] whitespace-pre-line text-lg leading-relaxed text-[var(--nw-mist-gray)]">
                {content.years_label || 'IT for Fort Lauderdale\nand South Florida'}
              </p>
              <div className="mt-10 border-t pt-5" style={{ borderColor: 'var(--nw-tide-blue)' }}>
                <p className="font-semibold text-[var(--nw-cloud-white)]">{content.team_tagline || 'Our team is ready'}</p>
                <p className="mt-1 text-sm text-[var(--nw-mist-gray)]">{content.team_sub || 'Certified engineers on standby 24/7'}</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-16 border-t pt-12" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <SectionHeading
            title={content.approach_title || 'Our approach'}
            description={content.approach_desc || 'We combine technical expertise with genuine partnership to deliver solutions that work for the people using them.'}
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {approach.map((item, index) => {
              const Icon = approachIcons[index];
              return (
                <article key={item.title} className="rounded-lg border p-5" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                  <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
                  <h3 className="mt-5 font-bold text-[var(--nw-current-navy)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{item.description}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-16 border-t pt-12" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <SectionHeading
            title={content.why_choose_title || 'Why choose us'}
            description={content.why_choose_desc || 'A dependable technology relationship is built on visibility, accountability, and trust.'}
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {reasons.map((reason) => (
              <article key={reason.title} className="rounded-lg border-l-4 p-6" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-signal-cyan)' }}>
                <h3 className="text-lg font-bold text-[var(--nw-cloud-white)]">{reason.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--nw-mist-gray)]">{reason.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
