import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Eye,
  Globe,
  Headphones,
  Lock,
  Mail,
  Monitor,
  Network,
  Server,
  Shield,
  Star,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useContent } from '../lib/useContent';
import { FadeIn } from './ui/fade-in';

type TrustItem = { icon: string; label: string; sub: string };

const requiredTrustItem: TrustItem = {
  icon: 'CheckCircle',
  label: '24/7 Support',
  sub: 'Always available',
};

const iconMap: Record<string, typeof Shield> = {
  Shield,
  Award,
  Star,
  Users,
  TrendingUp,
  CheckCircle,
  Lock,
  Cloud,
  Server,
  Zap,
  Globe,
  Briefcase,
};

const defaultTrustItems: TrustItem[] = [
  { icon: 'Shield', label: 'SOC 2 Type II', sub: 'Audited and certified' },
  { icon: 'Award', label: 'Microsoft Gold', sub: 'Cloud solutions partner' },
  { icon: 'Users', label: 'Cisco Premier', sub: 'Network solutions' },
  { icon: 'Star', label: 'CompTIA', sub: 'Authorized partner' },
  { icon: 'TrendingUp', label: 'HIPAA Compliant', sub: 'Healthcare ready' },
  requiredTrustItem,
];

const partnerLogos = [
  { name: 'Microsoft 365', src: '/logos/microsoft-365.svg' },
  { name: 'SentinelOne', src: '/logos/sentinelone.svg' },
  { name: 'Huntress', src: '/logos/huntress.svg' },
  { name: 'NinjaOne', src: '/logos/ninjaone.svg' },
  { name: 'ConnectWise', src: '/logos/connectwise.svg' },
  { name: 'Cloudflare', src: '/logos/cloudflare.svg' },
];

const SIGNAL_CYAN = '#31C6CF';
const CONTINUITY_GREEN = '#62BE68';
const cardAccents = [SIGNAL_CYAN, CONTINUITY_GREEN];

const tools = [
  { icon: Mail, name: 'Microsoft 365', role: 'Email, Teams and Office', accent: SIGNAL_CYAN },
  { icon: Cloud, name: 'Azure & Entra ID', role: 'Identity and cloud infrastructure', accent: CONTINUITY_GREEN },
  { icon: Globe, name: 'Google Workspace', role: 'Mail and collaboration', accent: SIGNAL_CYAN },
  { icon: Shield, name: 'SentinelOne', role: 'Managed EDR', accent: CONTINUITY_GREEN },
  { icon: Eye, name: 'Huntress', role: 'Managed threat detection', accent: SIGNAL_CYAN },
  { icon: Network, name: 'Cloudflare', role: 'Zero-trust and DNS', accent: CONTINUITY_GREEN },
  { icon: Monitor, name: 'NinjaOne', role: 'Remote monitoring', accent: SIGNAL_CYAN },
  { icon: Headphones, name: 'ConnectWise', role: 'Service desk and ticketing', accent: CONTINUITY_GREEN },
];

const services = [
  { icon: Shield, title: 'Cybersecurity', blurb: 'Protection against evolving threats.', slug: 'cybersecurity', accent: SIGNAL_CYAN },
  { icon: Headphones, title: 'Live IT Support', blurb: 'Real people, available 24/7.', slug: 'live-it-support', accent: CONTINUITY_GREEN },
  { icon: Wrench, title: 'IT Repair and Upgrades', blurb: 'Repair, upgrades, and data recovery.', slug: 'it-repair-upgrades', accent: SIGNAL_CYAN },
  { icon: Monitor, title: 'Managed IT Services', blurb: 'IT management for focused teams.', slug: 'managed-it-services', accent: CONTINUITY_GREEN },
  { icon: Cloud, title: 'Cloud Solutions', blurb: 'Secure, scalable cloud operations.', slug: 'cloud-solutions', accent: SIGNAL_CYAN },
  { icon: Network, title: 'Network Infrastructure', blurb: 'Networks engineered for uptime.', slug: 'network-infrastructure', accent: CONTINUITY_GREEN },
];

const SLIDE_CLASS = 'flex h-full flex-col justify-center rounded-lg bg-[var(--nw-pure-white)] p-5 sm:p-8';
const SERVICE_CARD_CLASS = 'h-full min-w-0 rounded-2xl border text-[var(--nw-mist-gray)]';

function serviceCardStyle(accent: string) {
  return {
    background: 'rgba(26, 47, 63, 0.8)',
    borderColor: `${accent}40`,
    boxShadow: `0 2px 12px ${accent}10`,
    color: 'var(--nw-mist-gray)',
  };
}

function normalizeTrustItems(rawItems?: string): TrustItem[] {
  if (!rawItems) return defaultTrustItems;

  try {
    const parsed = JSON.parse(rawItems);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultTrustItems;
    if (parsed.length !== 5) return parsed as TrustItem[];

    const items = parsed as TrustItem[];
    const fallback = items.some((item) => item?.label === requiredTrustItem.label)
      ? defaultTrustItems.find((candidate) => !items.some((item) => item?.label === candidate.label))
      : requiredTrustItem;

    return fallback ? [...items, fallback] : items;
  } catch {
    return defaultTrustItems;
  }
}

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 36 : -36 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -36 : 36 }),
};

function TrustedSlide({ items }: { items: TrustItem[] }) {
  return (
    <div data-testid="trusted-slide" className={SLIDE_CLASS}>
      <div className="mb-6 text-center">
        <p className="nw-kicker text-[var(--nw-signal-cyan)]">Trusted partner</p>
        <h2 className="nw-display mt-2 text-2xl text-brand-navy sm:text-3xl">Trusted foundations for daily work</h2>
      </div>

      <div
        data-testid="trusted-proof-grid"
        className="mx-auto mb-7 grid w-full max-w-5xl grid-cols-2 auto-rows-[104px] gap-3 md:grid-cols-3"
      >
        {items.map((item, index) => {
          const Icon = iconMap[item.icon] || Shield;
          const accent = cardAccents[index % cardAccents.length];
          return (
            <div
              key={`${item.label}-${index}`}
              data-testid="trusted-proof-card"
              className={`${SERVICE_CARD_CLASS} flex items-center gap-2.5 p-3`}
              style={serviceCardStyle(accent)}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${accent}25`, color: accent }}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate whitespace-nowrap text-xs font-semibold text-[var(--nw-mist-gray)]">{item.label}</p>
                <p className="mt-1 truncate whitespace-nowrap text-[10px] text-[rgba(224,242,241,0.75)]">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 border-t pt-6" style={{ borderColor: 'var(--nw-mist-gray)' }}>
        {partnerLogos.map((logo) => (
          <div key={logo.name} data-testid="partner-logo-tile" className="rounded-md bg-[var(--nw-pure-white)] px-3 py-2">
            <img
              src={logo.src}
              alt={logo.name}
              className="h-6 w-auto max-w-[128px] object-contain opacity-65 grayscale transition-opacity hover:opacity-100"
              height={24}
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolsSlide() {
  return (
    <div data-testid="tools-slide" className={SLIDE_CLASS}>
      <div className="mb-4 text-center sm:mb-6">
        <p className="nw-kicker text-[var(--nw-signal-cyan)]">Your stack, managed</p>
        <h2 className="nw-display mt-2 text-2xl text-brand-navy sm:text-3xl lg:text-4xl">Familiar tools, stronger operations</h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-[var(--nw-slate)] sm:mt-3 sm:text-base">
          We run the platforms your team already knows and harden, monitor, and optimize them behind the scenes.
        </p>
      </div>

      <div
        data-testid="tools-slide-grid"
        className="mx-auto grid w-full max-w-5xl grid-cols-2 auto-rows-[104px] gap-3 sm:auto-rows-[96px] md:grid-cols-4 md:auto-rows-[104px] lg:auto-rows-[108px]"
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.name}
              data-testid="trust-tool-card"
              className={`${SERVICE_CARD_CLASS} flex items-center gap-2 p-2.5`}
              style={serviceCardStyle(tool.accent)}
            >
              <div
                data-testid="trust-tool-icon"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${tool.accent}25`, color: tool.accent }}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p
                  data-testid="trust-tool-title"
                  className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold leading-4 text-[var(--nw-mist-gray)] lg:text-sm"
                >
                  {tool.name}
                </p>
                <p
                  data-testid="trust-tool-role"
                  className="mt-1 h-8 overflow-hidden text-[10px] leading-4 text-[rgba(224,242,241,0.75)] sm:text-[11px] lg:text-xs"
                >
                  {tool.role}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServicesSlide() {
  return (
    <div data-testid="services-slide" className={SLIDE_CLASS}>
      <div className="mb-5 text-center sm:mb-6">
        <p className="nw-kicker text-[var(--nw-signal-cyan)]">What we do</p>
        <h2 className="nw-display mt-2 text-2xl text-brand-navy sm:text-3xl lg:text-4xl">IT services built for modern business</h2>
      </div>

      <div
        data-testid="services-slide-grid"
        className="mx-auto grid w-full max-w-5xl grid-cols-2 auto-rows-[116px] gap-3 sm:auto-rows-[120px] md:grid-cols-3 md:auto-rows-[112px] lg:auto-rows-[112px]"
      >
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.title}
              to={`/service-category/${service.slug}`}
              data-testid="trust-service-card"
              className={`${SERVICE_CARD_CLASS} flex flex-col justify-center gap-2 overflow-hidden p-3 no-underline transition-all duration-300 hover:-translate-y-1 sm:flex-row sm:items-center sm:gap-3 sm:p-4`}
              style={serviceCardStyle(service.accent)}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9"
                style={{ background: `${service.accent}25`, color: service.accent }}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span
                  data-testid="trust-service-title"
                  className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold leading-4 text-[var(--nw-mist-gray)] lg:text-sm"
                >
                  {service.title}
                </span>
                <span
                  data-testid="trust-service-blurb"
                  className="mt-1 block h-8 overflow-hidden text-[10px] leading-4 text-[rgba(224,242,241,0.75)] sm:text-[11px] lg:text-xs"
                >
                  {service.blurb}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 text-center sm:mt-7">
        <Link to="/services" className="btn-primary">
          View all services
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function TrustBar() {
  const content = useContent('trustbar');
  const reducedMotion = useReducedMotion();
  const items = normalizeTrustItems(content.items);

  const [[index, direction], setSlide] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);
  const slideCount = 3;

  const goTo = useCallback((next: number) => {
    setSlide(([previous]) => {
      const wrapped = (next + slideCount) % slideCount;
      return [wrapped, wrapped > previous || (previous === slideCount - 1 && wrapped === 0) ? 1 : -1];
    });
  }, []);

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timeout = window.setTimeout(() => goTo(index + 1), 6500);
    return () => window.clearTimeout(timeout);
  }, [goTo, index, paused, reducedMotion]);

  const slides = [
    <TrustedSlide key="trusted" items={items} />,
    <ToolsSlide key="tools" />,
    <ServicesSlide key="services" />,
  ];

  return (
    <section className="relative border-y bg-[var(--nw-pure-white)] py-10 sm:py-14" style={{ borderColor: 'var(--nw-mist-gray)', zIndex: 10 }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            role="region"
            aria-roledescription="carousel"
            aria-label="New Wave IT highlights"
          >
            <div
              data-testid="carousel-viewport"
              data-stable-height="true"
              className="h-[660px] overflow-hidden sm:h-[620px] lg:h-[500px]"
            >
              {reducedMotion ? (
                slides[index]
              ) : (
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={index}
                    className="h-full"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {slides[index]}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            <button
              type="button"
              onClick={previous}
              aria-label="Previous slide"
              title="Previous slide"
              className="absolute -left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-[var(--nw-pure-white)] text-brand-navy shadow-sm transition-colors hover:border-[var(--nw-signal-cyan)] sm:flex lg:-left-5"
              style={{ borderColor: 'var(--nw-mist-gray)' }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              title="Next slide"
              className="absolute -right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border bg-[var(--nw-pure-white)] text-brand-navy shadow-sm transition-colors hover:border-[var(--nw-signal-cyan)] sm:flex lg:-right-5"
              style={{ borderColor: 'var(--nw-mist-gray)' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </FadeIn>

        <div className="mt-6 flex items-center justify-center gap-2.5">
          {Array.from({ length: slideCount }).map((_, slideIndex) => (
            <button
              key={slideIndex}
              type="button"
              onClick={() => goTo(slideIndex)}
              aria-label={`Go to slide ${slideIndex + 1}`}
              aria-current={slideIndex === index}
              className="h-2 rounded-full transition-colors"
              style={{ width: slideIndex === index ? '28px' : '8px', background: slideIndex === index ? 'var(--nw-signal-cyan)' : 'var(--nw-slate)' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
