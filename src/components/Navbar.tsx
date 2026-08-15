import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  ChevronDown,
  Cloud,
  Crown,
  Headphones,
  Menu,
  Monitor,
  Network,
  Shield,
  Signal,
  Stethoscope,
  Wrench,
  X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo';

const serviceGroups = [
  {
    heading: 'Core services',
    accent: 'var(--nw-signal-cyan)',
    tint: 'color-mix(in srgb, var(--nw-signal-cyan) 12%, transparent)',
    items: [
      { label: 'Cybersecurity', href: '/service-category/cybersecurity', icon: Shield },
      { label: 'Live IT Support', href: '/service-category/live-it-support', icon: Headphones },
      { label: 'IT Repair & Upgrades', href: '/service-category/it-repair-upgrades', icon: Wrench },
      { label: 'Managed IT Services', href: '/service-category/managed-it-services', icon: Monitor },
      { label: 'Cloud Solutions', href: '/service-category/cloud-solutions', icon: Cloud },
      { label: 'Network Infrastructure', href: '/service-category/network-infrastructure', icon: Network },
    ],
  },
  {
    heading: 'Industry solutions',
    accent: 'var(--nw-tide-blue)',
    tint: 'color-mix(in srgb, var(--nw-tide-blue) 12%, transparent)',
    items: [
      { label: 'Family Offices', href: '/service-category/family-offices', icon: Briefcase },
      { label: 'Healthcare', href: '/service-category/healthcare', icon: Stethoscope },
      { label: 'Luxury', href: '/service-category/luxury', icon: Crown },
      { label: 'Cellular DAS & Public Safety', href: '/service-category/cellular-das-and-public-safety', icon: Signal },
    ],
  },
];

const navLinks = [
  { label: 'Blog', href: '/blog' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Why Us', href: '/why-us' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
  { label: 'Status', href: '/status' },
  { label: 'Contact', href: '/contact' },
];

const navLinkClass = 'text-sm font-medium text-brand-navy transition-colors hover:text-brand-tide-blue';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const closeTimeout = useRef<number | undefined>();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => () => window.clearTimeout(closeTimeout.current), []);

  const handleLogoClick = (event: React.MouseEvent) => {
    if (location.pathname === '/') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openServices = () => {
    window.clearTimeout(closeTimeout.current);
    setServicesDropdownOpen(true);
  };

  const closeServicesSoon = () => {
    closeTimeout.current = window.setTimeout(() => setServicesDropdownOpen(false), 180);
  };

  const closeMobileNavigation = () => {
    setIsOpen(false);
    setServicesDropdownOpen(false);
  };

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b transition-shadow duration-200"
      style={{
        background: 'var(--nw-cloud-white)',
        borderColor: 'var(--nw-mist-gray)',
        boxShadow: scrolled ? '0 3px 14px rgba(9, 19, 29, 0.1)' : 'none',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-5">
          <Link
            to="/"
            onClick={handleLogoClick}
            className="flex shrink-0 items-center transition-opacity hover:opacity-80"
            aria-label="New Wave IT home"
          >
            <Logo tone="onLight" />
          </Link>

          <div className="hidden items-center gap-4 lg:flex xl:gap-5">
            <Link to="/" className={navLinkClass}>
              Home
            </Link>

            <div className="relative" onMouseEnter={openServices} onMouseLeave={closeServicesSoon}>
              <button
                type="button"
                className={`${navLinkClass} flex items-center gap-1`}
                onClick={() => setServicesDropdownOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={servicesDropdownOpen}
                aria-controls="services-menu"
              >
                Services
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${servicesDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {servicesDropdownOpen ? (
                <div className="absolute left-1/2 top-full z-50 w-[620px] -translate-x-1/2 pt-3">
                  <div id="services-menu" className="overflow-hidden rounded-lg nw-surface">
                    <div className="grid grid-cols-2">
                      {serviceGroups.map((group, groupIndex) => (
                        <div
                          key={group.heading}
                          className="p-3"
                          style={
                            groupIndex === 1
                              ? { borderLeft: '1px solid var(--nw-mist-gray)', background: 'var(--nw-cloud-white)' }
                              : undefined
                          }
                        >
                          <p className="px-2 py-1 nw-kicker" style={{ color: group.accent }}>
                            {group.heading}
                          </p>
                          <div className="flex flex-col gap-0.5">
                            {group.items.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <Link
                                  key={item.href}
                                  to={item.href}
                                  onClick={() => setServicesDropdownOpen(false)}
                                  className="flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-[var(--nw-cloud-white)]"
                                >
                                  <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                                    style={{ background: group.tint, color: group.accent }}
                                  >
                                    <ItemIcon size={16} />
                                  </span>
                                  <span className="text-sm font-medium leading-snug text-brand-navy">{item.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Link
                      to="/services"
                      onClick={() => setServicesDropdownOpen(false)}
                      className="flex items-center justify-between border-t px-5 py-3 text-sm transition-colors hover:bg-[var(--nw-cloud-white)]"
                      style={{ borderColor: 'var(--nw-mist-gray)' }}
                    >
                      <span style={{ color: 'var(--nw-slate)' }}>Not sure where to start?</span>
                      <span className="flex items-center gap-1.5 font-semibold text-brand-tide-blue">
                        View all services
                        <ArrowRight size={15} />
                      </span>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {navLinks
              .filter((link) => link.label !== 'Support')
              .map((link) => (
                <Link key={link.href} to={link.href} className={navLinkClass}>
                  {link.label}
                </Link>
              ))}

            <Link to="/support" className="btn-primary min-h-10 shrink-0 px-4 py-2 text-sm">
              Support
            </Link>
          </div>

          <button
            type="button"
            className="rounded-md p-2 text-brand-navy transition-colors hover:bg-[var(--nw-mist-gray)] lg:hidden"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-nav-menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div id="mobile-nav-menu" className="border-t lg:hidden" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <div className="flex flex-col gap-3 px-5 py-5">
            <Link to="/" onClick={closeMobileNavigation} className={navLinkClass}>
              Home
            </Link>

            <div>
              <button
                type="button"
                onClick={() => setServicesDropdownOpen((open) => !open)}
                className={`${navLinkClass} flex w-full items-center justify-between`}
                aria-expanded={servicesDropdownOpen}
                aria-controls="mobile-services-menu"
              >
                Services
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${servicesDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {servicesDropdownOpen ? (
                <div id="mobile-services-menu" className="mt-2 space-y-3 border-l pl-3" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                  {serviceGroups.map((group) => (
                    <div key={group.heading}>
                      <p className="mb-1 nw-kicker" style={{ color: group.accent }}>
                        {group.heading}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              to={item.href}
                              onClick={closeMobileNavigation}
                              className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm text-brand-navy transition-colors hover:bg-[var(--nw-cloud-white)]"
                            >
                              <ItemIcon size={15} style={{ color: group.accent }} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <Link
                    to="/services"
                    onClick={closeMobileNavigation}
                    className="flex items-center gap-1.5 text-sm font-semibold text-brand-tide-blue"
                  >
                    View all services
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : null}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={closeMobileNavigation}
                className={link.label === 'Support' ? 'btn-primary justify-start' : navLinkClass}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/contact" onClick={closeMobileNavigation} className="btn-dark mt-1 justify-center">
              Request an assessment
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
