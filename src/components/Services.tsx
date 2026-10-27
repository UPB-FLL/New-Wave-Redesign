import { Shield, Headphones, Wrench, Monitor, Cloud, Network, Briefcase, Stethoscope, Crown, Signal, Laptop, Lock, Mail, Eye, GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useContent } from '../lib/useContent';
import { FadeIn } from './ui/fade-in';
import { FADE_UP, DURATION, EASE, STAGGER_CONTAINER } from '../lib/animation';
import { cmsHeadline } from './brand/cmsHeadline';
import { SectionHeading } from './brand/SectionHeading';

const iconMap: Record<string, React.ElementType> = {
  Cybersecurity: Shield,
  'Live IT Support': Headphones,
  'IT Repair & Upgrades': Wrench,
  'Managed IT Services': Monitor,
  'Cloud Solutions': Cloud,
  'Network Infrastructure': Network,
  'Family Offices': Briefcase,
  'Healthcare': Stethoscope,
  'Luxury': Crown,
  'Cellular DAS & Public Safety': Signal,
};

const slugMap: Record<string, string> = {
  Cybersecurity: 'cybersecurity',
  'Live IT Support': 'live-it-support',
  'IT Repair & Upgrades': 'it-repair-upgrades',
  'Managed IT Services': 'managed-it-services',
  'Cloud Solutions': 'cloud-solutions',
  'Network Infrastructure': 'network-infrastructure',
  'Family Offices': 'family-offices',
  'Healthcare': 'healthcare',
  'Luxury': 'luxury',
  'Cellular DAS & Public Safety': 'cellular-das-and-public-safety',
};

const defaultCards = [
  { title: 'Cybersecurity', description: 'Protect your business from evolving threats with enterprise-grade security solutions.', highlights: ['Threat detection & response', 'Firewall & endpoint protection', 'Compliance audits'], accent: '#31C6CF' },
  { title: 'Live IT Support', description: 'Real humans, real solutions — available 24/7 for any IT issue, big or small.', highlights: ['24/7 help desk access', 'Remote & on-site support', 'Fast resolution times'], accent: '#62BE68' },
  { title: 'IT Repair & Upgrades', description: "Hardware failures and slow systems don't wait — neither do we.", highlights: ['Hardware repair & replacement', 'System upgrades & optimization', 'Data recovery services'], accent: '#31C6CF' },
  { title: 'Managed IT Services', description: 'Fully managed IT so you can focus on growing your business, not troubleshooting it.', highlights: ['Proactive monitoring 24/7', 'Patch management', 'IT roadmap & strategy'], accent: '#62BE68' },
  { title: 'Cloud Solutions', description: 'Modernize your infrastructure with scalable, secure cloud environments built for your needs.', highlights: ['Cloud migration & setup', 'Microsoft 365 management', 'Hybrid environment support'], accent: '#31C6CF' },
  { title: 'Network Infrastructure', description: 'Reliable, high-performance networks engineered for uptime and business continuity.', highlights: ['Network design & installation', 'WiFi solutions & optimization', 'VPN & remote access'], accent: '#62BE68' },
];

const cyberFeatures = [
  { icon: Lock, label: 'Managed EDR & Antivirus', detail: 'Every endpoint monitored, isolated, and remediated in real time' },
  { icon: Mail, label: 'Email & Phishing Defense', detail: 'Advanced filtering that stops threats before the inbox' },
  { icon: Eye, label: 'Dark Web Monitoring', detail: 'Instant alerts when company credentials surface online' },
  { icon: GraduationCap, label: 'Security Awareness Training', detail: 'Ongoing phishing simulations that turn your team into defenders' },
];

const cyberStats = [
  { value: '24/7', label: 'SOC monitoring' },
  { value: 'EDR', label: 'on every endpoint' },
  { value: 'Huntress', label: 'partner' },
];

function BeamConnection() {
  const reduced = useReducedMotion();

  return (
    <div
      data-testid="cybersecurity-beam"
      data-motion={reduced ? 'static' : 'animated'}
      className="relative flex items-center justify-between gap-3 mt-4 mb-2 px-2"
    >
      {/* Your Business node */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(57,204,204,0.2)', border: '1px solid rgba(57,204,204,0.4)' }}
        >
          <Laptop size={18} style={{ color: '#31C6CF' }} />
        </div>
        <span className="text-[10px] font-medium text-center" style={{ color: 'rgba(224,242,241,0.6)' }}>
          Your Business
        </span>
      </div>

      {/* Beam path */}
      <div className="flex-1 relative h-8">
        <svg
          viewBox="0 0 160 30"
          preserveAspectRatio="none"
          className="w-full h-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="#31C6CF" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#62BE68" stopOpacity="0.8" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path
            d="M 0 15 C 40 5, 120 25, 160 15"
            stroke="rgba(57,204,204,0.15)"
            strokeWidth="2"
            fill="none"
          />
          {/* Animated beam */}
          {!reduced ? (
            <motion.path
              d="M 0 15 C 40 5, 120 25, 160 15"
              stroke="url(#beam-grad)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              initial={{ pathLength: 0.25, pathOffset: -0.25 }}
              animate={{ pathOffset: 1.25 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 0.5 }}
            />
          ) : (
            <path
              d="M 0 15 C 40 5, 120 25, 160 15"
              stroke="rgba(57,204,204,0.4)"
              strokeWidth="2"
              fill="none"
            />
          )}
        </svg>
      </div>

      {/* New Wave SOC node */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(94,188,103,0.2)', border: '1px solid rgba(94,188,103,0.4)' }}
        >
          <Shield size={18} style={{ color: '#62BE68' }} />
        </div>
        <span className="text-[10px] font-medium text-center" style={{ color: 'rgba(224,242,241,0.6)' }}>
          New Wave SOC
        </span>
      </div>
    </div>
  );
}

function ServiceCardInner({
  service,
  large = false,
}: {
  service: typeof defaultCards[0];
  large?: boolean;
}) {
  const Icon = iconMap[service.title] || Shield;
  const slug = slugMap[service.title] || service.title.toLowerCase();
  const highlights = Array.isArray(service.highlights) ? service.highlights : [];

  return (
    <Link
      to={`/service-category/${slug}`}
      className="group rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 no-underline flex flex-col h-full"
      style={{ background: 'rgba(26, 47, 63, 0.8)', border: `1px solid ${service.accent}40`, boxShadow: `0 2px 12px ${service.accent}10` }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${service.accent}30`;
        (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}80`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${service.accent}10`;
        (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}40`;
      }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${service.accent}25` }}>
        <Icon size={20} style={{ color: service.accent }} />
      </div>
      <h3 className={`font-bold mb-2 ${large ? 'text-xl sm:text-2xl' : 'text-lg'}`} style={{ color: 'var(--nw-mist-gray)' }}>
        {service.title}
      </h3>
      <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(224,242,241,0.9)' }}>
        {service.description}
      </p>

      {large && <BeamConnection />}

      <ul className={`grid gap-2 ${large ? 'sm:grid-cols-3 sm:gap-3' : ''}`}>
        {highlights.map((h: string) => (
          <li key={h} className="flex items-start gap-2 text-sm leading-snug" style={{ color: 'var(--nw-mist-gray)' }}>
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: service.accent }} aria-hidden="true" />
            {h}
          </li>
        ))}
      </ul>

      {large && (
        <div className="mt-5 pt-5 flex flex-col flex-1" style={{ borderTop: `1px solid ${service.accent}25` }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {cyberFeatures.map(({ icon: FeatureIcon, label, detail }) => (
              <div
                key={label}
                className="flex items-start gap-2.5 rounded-xl p-3"
                style={{ background: `${service.accent}0D`, border: `1px solid ${service.accent}20` }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${service.accent}20` }}>
                  <FeatureIcon size={14} style={{ color: service.accent }} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--nw-mist-gray)' }}>{label}</p>
                  <p className="text-xs leading-snug mt-0.5" style={{ color: 'rgba(224,242,241,0.6)' }}>{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {cyberStats.map(({ value, label }) => (
              <div
                key={label}
                className="text-center rounded-xl py-2.5 px-1"
                style={{ background: 'rgba(94,188,103,0.08)', border: '1px solid rgba(94,188,103,0.25)' }}
              >
                <p className="text-lg sm:text-xl font-bold" style={{ color: '#62BE68' }}>{value}</p>
                <p className="text-[10px] sm:text-xs" style={{ color: 'rgba(224,242,241,0.6)' }}>{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 mt-auto pt-4 text-sm font-semibold" style={{ color: service.accent }}>
            Explore cybersecurity services
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      )}
    </Link>
  );
}

// Luxury and Cellular DAS stay live but sit outside the home page and menus, which
// lead with managed IT; the /services page lists them as other specialties.
const OTHER_SPECIALTIES = [
  { title: 'Luxury', description: 'Smart home automation and guest technology for luxury properties.' },
  { title: 'Cellular DAS & Public Safety', description: 'In-building cellular and public safety communications.' },
];

/** The band's title and description when the CMS has none (production stores the same title). */
export const SERVICES_DEFAULT_TITLE = 'IT services built for modern business';
export const SERVICES_DEFAULT_DESCRIPTION = 'From day-to-day support to long-term IT strategy, we provide everything your business needs to stay secure, efficient, and ahead of the curve.';

const INDUSTRIES = [
  { title: 'Family Offices', description: 'Secure wealth management technology for multi-generational family enterprises with privacy-first infrastructure.', accent: '#31C6CF' },
  { title: 'Healthcare', description: 'HIPAA-compliant systems with EHR integration and secure patient data management for medical practices.', accent: '#62BE68' },
];

/**
 * The services band. On the home page it carries the CMS headline; on
 * /services the page header does, and the band titles its two groups.
 */
export default function Services({
  variant = 'home',
  showOtherSpecialties = false,
}: { variant?: 'home' | 'page'; showOtherSpecialties?: boolean } = {}) {
  const c = useContent('services');
  const reduced = useReducedMotion();

  let cards = defaultCards;
  try { if (c.cards) cards = JSON.parse(c.cards); } catch { /* use default */ }

  const [cyberCard, ...restCards] = cards;

  return (
    <section id="services" className="relative scroll-mt-20 border-t bg-white py-16 sm:py-20" style={{ borderColor: 'var(--nw-mist-gray)', zIndex: 10 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          {variant === 'home' ? (
            <SectionHeading
              className="mb-10"
              title={cmsHeadline(c, SERVICES_DEFAULT_TITLE)}
              description={c.subheadline || SERVICES_DEFAULT_DESCRIPTION}
            />
          ) : (
            <SectionHeading className="mb-10" title="Core services" />
          )}
        </FadeIn>

        {/* BentoGrid layout */}
        {reduced ? (
          <div data-testid="service-bento-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {cards.map((service, i) => (
              <div
                key={service.title}
                data-testid={i === 0 ? 'cybersecurity-bento-card' : 'supporting-service-card'}
                className={i === 0 ? 'md:col-span-2 lg:col-span-2 lg:row-span-2' : undefined}
              >
                <ServiceCardInner service={service} large={i === 0} />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            data-testid="service-bento-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={STAGGER_CONTAINER}
          >
            {/* Cybersecurity — large bento cell (col-span-2, row-span-2) */}
            <motion.div
              data-testid="cybersecurity-bento-card"
              className="md:col-span-2 lg:col-span-2 lg:row-span-2"
              variants={{
                hidden: FADE_UP.hidden,
                visible: { ...FADE_UP.visible, transition: { duration: DURATION.base, ease: EASE.out } },
              }}
            >
              <ServiceCardInner service={cyberCard} large />
            </motion.div>

            {/* Rest of cards — staggered */}
            {restCards.map((service) => (
              <motion.div
                key={service.title}
                data-testid="supporting-service-card"
                variants={{
                  hidden: FADE_UP.hidden,
                  visible: { ...FADE_UP.visible, transition: { duration: DURATION.base, ease: EASE.out } },
                }}
              >
                <ServiceCardInner service={service} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Industry solutions */}
        <div className="mt-16 border-t pt-12" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <FadeIn>
            <SectionHeading
              className="mb-8"
              title="Industry solutions"
              description="Tailored technology for specialized industries with unique challenges and compliance requirements."
            />
          </FadeIn>

          <motion.div
            data-testid="industry-service-grid"
            className="grid grid-cols-1 items-stretch gap-3 sm:gap-4 md:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={STAGGER_CONTAINER}
          >
            {INDUSTRIES.map((service) => {
              const Icon = iconMap[service.title] || Shield;
              const slug = slugMap[service.title] || service.title.toLowerCase();
              return (
                <motion.div
                  key={service.title}
                  data-testid="industry-service-card"
                  className="h-full"
                  variants={{
                    hidden: FADE_UP.hidden,
                    visible: { ...FADE_UP.visible, transition: { duration: DURATION.base, ease: EASE.out } },
                  }}
                >
                  <Link
                    to={`/service-category/${slug}`}
                    className="group flex h-full items-start gap-4 rounded-2xl p-5 no-underline transition-all duration-300 hover:-translate-y-1 sm:p-6"
                    style={{ background: 'rgba(26, 47, 63, 0.8)', border: `1px solid ${service.accent}40`, boxShadow: `0 2px 12px ${service.accent}10` }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${service.accent}30`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}80`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${service.accent}10`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${service.accent}40`;
                    }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${service.accent}25` }}>
                      <Icon size={20} style={{ color: service.accent }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--nw-mist-gray)' }}>{service.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,242,241,0.9)' }}>{service.description}</p>
                    </div>
                    <ArrowRight size={18} className="mt-1 shrink-0 transition-transform duration-300 group-hover:translate-x-1" style={{ color: service.accent }} aria-hidden="true" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>

          {showOtherSpecialties && (
            <div data-testid="other-specialties" className="mt-10">
              <h3 className="text-lg font-bold" style={{ color: 'var(--nw-current-navy)' }}>
                Other specialties
              </h3>
              <ul className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-8">
                {OTHER_SPECIALTIES.map((specialty) => (
                  <li key={specialty.title} className="text-sm text-[var(--nw-slate)]">
                    <Link to={`/service-category/${slugMap[specialty.title]}`} className="font-semibold underline" style={{ color: 'var(--nw-current-navy)' }}>
                      {specialty.title}
                    </Link>
                    {': '}
                    {specialty.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
