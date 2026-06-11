import { Shield, Headphones, Wrench, Monitor, Cloud, Network, Briefcase, Stethoscope, Crown, Signal, Laptop } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useContent } from '../lib/useContent';
import { FadeIn } from './ui/fade-in';
import { FADE_UP, DURATION, EASE, STAGGER_CONTAINER } from '../lib/animation';

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
  { title: 'Cybersecurity', description: 'Protect your business from evolving threats with enterprise-grade security solutions.', highlights: ['Threat detection & response', 'Firewall & endpoint protection', 'Compliance audits'], accent: '#39CCCC' },
  { title: 'Live IT Support', description: 'Real humans, real solutions — available 24/7 for any IT issue, big or small.', highlights: ['24/7 help desk access', 'Remote & on-site support', 'Fast resolution times'], accent: '#5EBC67' },
  { title: 'IT Repair & Upgrades', description: "Hardware failures and slow systems don't wait — neither do we.", highlights: ['Hardware repair & replacement', 'System upgrades & optimization', 'Data recovery services'], accent: '#39CCCC' },
  { title: 'Managed IT Services', description: 'Fully managed IT so you can focus on growing your business, not troubleshooting it.', highlights: ['Proactive monitoring 24/7', 'Patch management', 'IT roadmap & strategy'], accent: '#5EBC67' },
  { title: 'Cloud Solutions', description: 'Modernize your infrastructure with scalable, secure cloud environments built for your needs.', highlights: ['Cloud migration & setup', 'Microsoft 365 management', 'Hybrid environment support'], accent: '#39CCCC' },
  { title: 'Network Infrastructure', description: 'Reliable, high-performance networks engineered for uptime and business continuity.', highlights: ['Network design & installation', 'WiFi solutions & optimization', 'VPN & remote access'], accent: '#5EBC67' },
];

function BeamConnection() {
  const reduced = useReducedMotion();

  return (
    <div className="relative flex items-center justify-between gap-3 mt-4 mb-2 px-2">
      {/* Your Business node */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(57,204,204,0.2)', border: '1px solid rgba(57,204,204,0.4)' }}
        >
          <Laptop size={18} style={{ color: '#39CCCC' }} />
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
              <stop offset="40%" stopColor="#39CCCC" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#5EBC67" stopOpacity="0.8" />
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
          <Shield size={18} style={{ color: '#5EBC67' }} />
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
      className="group rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 no-underline block h-full"
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
      <h3 className={`font-bold mb-2 ${large ? 'text-xl sm:text-2xl' : 'text-lg'}`} style={{ color: '#E0F2F1' }}>
        {service.title}
      </h3>
      <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(224,242,241,0.75)' }}>
        {service.description}
      </p>

      {large && <BeamConnection />}

      <div className="flex flex-wrap gap-1.5">
        {highlights.map((h: string) => (
          <span
            key={h}
            className="text-xs font-medium px-2.5 py-0.5 rounded-full"
            style={{ background: `${service.accent}35`, color: service.accent, border: `1px solid ${service.accent}60` }}
          >
            {h}
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function Services() {
  const c = useContent('services');
  const reduced = useReducedMotion();

  let cards = defaultCards;
  try { if (c.cards) cards = JSON.parse(c.cards); } catch { /* use default */ }

  const [cyberCard, ...restCards] = cards;

  return (
    <section id="services" className="bg-white py-12 sm:py-16 relative" style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
              {c.section_label || 'What We Do'}
            </span>
            <h2
              className="text-4xl sm:text-5xl lg:text-7xl mt-2 mb-4 leading-[0.95] tracking-tight"
              style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
            >
              {c.headline && c.headline_accent ? (
                <>
                  {c.headline}{' '}
                  <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{c.headline_accent}</span>
                </>
              ) : (
                <>
                  IT Services Built for{' '}
                  <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Modern Business</span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
              {c.subheadline || 'From day-to-day support to long-term IT strategy, we provide everything your business needs to stay secure, efficient, and ahead of the curve.'}
            </p>
          </div>
        </FadeIn>

        {/* BentoGrid layout */}
        {reduced ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {cards.map((service) => (
              <ServiceCardInner key={service.title} service={service} large={service.title === 'Cybersecurity'} />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={STAGGER_CONTAINER}
          >
            {/* Cybersecurity — large bento cell (col-span-2, row-span-2) */}
            <motion.div
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

        {/* Industry Solutions */}
        <div className="mt-16 pt-12 border-t" style={{ borderColor: 'rgba(21,34,50,0.1)' }}>
          <FadeIn>
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
                Specialized Industries
              </span>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 leading-[0.95] tracking-tight" style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}>
                Industry-Specific{' '}
                <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Solutions</span>
              </h3>
              <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
                Tailored technology for specialized industries with unique challenges and compliance requirements.
              </p>
            </div>
          </FadeIn>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={STAGGER_CONTAINER}
          >
            {[
              { title: 'Family Offices', description: 'Secure wealth management technology for multi-generational family enterprises with privacy-first infrastructure.', accent: '#39CCCC' },
              { title: 'Healthcare', description: 'HIPAA-compliant systems with EHR integration and secure patient data management for medical practices.', accent: '#5EBC67' },
              { title: 'Luxury', description: 'Premium smart home automation and guest experience technology for luxury properties and resorts.', accent: '#39CCCC' },
              { title: 'Cellular DAS & Public Safety', description: 'FirstNet-compliant communications infrastructure for emergency responders and critical facilities.', accent: '#5EBC67' },
            ].map((service) => {
              const Icon = iconMap[service.title] || Shield;
              const slug = slugMap[service.title] || service.title.toLowerCase();
              return (
                <motion.div
                  key={service.title}
                  variants={{
                    hidden: FADE_UP.hidden,
                    visible: { ...FADE_UP.visible, transition: { duration: DURATION.base, ease: EASE.out } },
                  }}
                >
                  <Link
                    to={`/service-category/${slug}`}
                    className="group rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 no-underline block"
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
                    <h3 className="font-bold text-lg mb-2" style={{ color: '#E0F2F1' }}>{service.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,242,241,0.75)' }}>{service.description}</p>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
