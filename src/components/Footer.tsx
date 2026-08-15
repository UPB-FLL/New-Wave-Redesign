import { Facebook, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import { CurrentField } from './brand/CurrentField';
import Logo from './Logo';

const serviceLinks = [
  { label: 'Cybersecurity', href: '/service-category/cybersecurity' },
  { label: 'Live IT Support', href: '/service-category/live-it-support' },
  { label: 'IT Repair & Upgrades', href: '/service-category/it-repair-upgrades' },
  { label: 'Managed IT Services', href: '/service-category/managed-it-services' },
  { label: 'Cloud Solutions', href: '/service-category/cloud-solutions' },
  { label: 'Network Infrastructure', href: '/service-category/network-infrastructure' },
];

const companyLinks = [
  { label: 'Blog', href: '/blog' },
  { label: 'About Us', href: '/about' },
  { label: 'Why Us', href: '/why-us' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Support', href: '/support' },
  { label: 'Status', href: '/status' },
];

const linkClass = 'text-sm text-[var(--nw-mist-gray)] transition-colors hover:text-[var(--nw-signal-cyan)]';
const sectionHeadingClass = 'mb-5 text-sm font-semibold uppercase text-[var(--nw-cloud-white)]';

export default function Footer() {
  const content = useContent('footer');
  const phone = content.phone || '(954) 555-0100';
  const email = content.email || 'support@newwaveitfl.com';
  const address = content.address || '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';

  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: 'var(--nw-deep-current)', borderTop: '1px solid var(--nw-current-navy)', zIndex: 10 }}
    >
      <CurrentField
        density="subtle"
        tone="dark"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full opacity-60"
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-2 lg:mb-14 lg:grid-cols-4">
          <div>
            <Link to="/" className="mb-5 inline-block" onClick={() => window.scrollTo({ top: 0 })} aria-label="New Wave IT home">
              <Logo tone="onDark" />
            </Link>
            <p className="mb-6 text-sm leading-relaxed text-[var(--nw-mist-gray)]">
              {content.tagline || 'Fort Lauderdale IT services that keep your business secure, supported, and moving.'}
            </p>
            <div className="flex gap-2">
              {[
                { icon: Linkedin, href: content.linkedin_url || '#', label: 'LinkedIn' },
                { icon: Facebook, href: content.facebook_url || '#', label: 'Facebook' },
                { icon: Twitter, href: content.twitter_url || '#', label: 'X (Twitter)' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href !== '#' ? '_blank' : undefined}
                  rel={href !== '#' ? 'noopener noreferrer' : undefined}
                  className="flex h-9 w-9 items-center justify-center rounded-md border text-[var(--nw-mist-gray)] transition-colors hover:border-[var(--nw-signal-cyan)] hover:text-[var(--nw-signal-cyan)]"
                  style={{ borderColor: 'var(--nw-slate)' }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h2 className={sectionHeadingClass}>Services</h2>
            <ul className="flex flex-col gap-3">
              {serviceLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link to={href} className={linkClass} onClick={() => window.scrollTo({ top: 0 })}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={sectionHeadingClass}>Company</h2>
            <ul className="flex flex-col gap-3">
              {companyLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link to={href} className={linkClass} onClick={() => window.scrollTo({ top: 0 })}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/contact" className={linkClass}>
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className={sectionHeadingClass}>Get in touch</h2>
            <div className="flex flex-col gap-4 text-[var(--nw-mist-gray)]">
              <a href={`tel:${phone.replace(/\D/g, '')}`} className="flex items-start gap-3 text-sm transition-colors hover:text-[var(--nw-cloud-white)]">
                <Phone size={16} className="mt-0.5 shrink-0 text-[var(--nw-signal-cyan)]" />
                <span>{phone}</span>
              </a>
              <a href={`mailto:${email}`} className="flex items-start gap-3 text-sm transition-colors hover:text-[var(--nw-cloud-white)]">
                <Mail size={16} className="mt-0.5 shrink-0 text-[var(--nw-signal-cyan)]" />
                <span>{email}</span>
              </a>
              <div className="flex items-start gap-3 text-sm">
                <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--nw-tide-blue)]" />
                <span>{address}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t pt-7 sm:flex-row" style={{ borderColor: 'var(--nw-slate)' }}>
          <p className="text-sm text-[var(--nw-mist-gray)]">&copy; {new Date().getFullYear()} New Wave IT. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pb-16 sm:pb-0">
            {[
              { label: 'Privacy Policy', to: '/privacy-policy' },
              { label: 'Terms and Conditions', to: '/terms-and-conditions' },
              { label: 'Cookie Policy', to: '/cookie-policy' },
            ].map(({ label, to }) => (
              <Link key={to} to={to} className={linkClass}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
