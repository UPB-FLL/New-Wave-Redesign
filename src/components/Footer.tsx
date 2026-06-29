import { Mail, Phone, MapPin, Linkedin, Facebook, Twitter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useContent } from '../lib/useContent';
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

const linkClass = "text-sm transition-colors hover:text-white/85";
const linkStyle = { color: 'rgba(255,255,255,0.45)' };

export default function Footer() {
  const c = useContent('footer');
  const navigate = useNavigate();

  const phone = c.phone || '(954) 555-0100';
  const email = c.email || 'support@newwaveitfl.com';
  const address = c.address || '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';

  const handleContactClick = () => {
    navigate('/contact');
  };

  return (
    <footer style={{ background: '#152232', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 10 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-6 sm:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-14">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-5" onClick={() => window.scrollTo({ top: 0 })} aria-label="New Wave IT home">
              <Logo tone="onDark" />
            </Link>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {c.tagline || "Fort Lauderdale's trusted IT services partner. We keep your business secure, supported, and moving forward."}
            </p>
            <div className="flex gap-3">
              {[
                { icon: Linkedin, href: c.linkedin_url || '#', label: 'LinkedIn' },
                { icon: Facebook, href: c.facebook_url || '#', label: 'Facebook' },
                { icon: Twitter, href: c.twitter_url || '#', label: 'X (Twitter)' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={href !== '#' ? '_blank' : undefined}
                  rel={href !== '#' ? 'noopener noreferrer' : undefined}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(57,204,204,0.15)';
                    (e.currentTarget as HTMLElement).style.color = '#39CCCC';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(57,204,204,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Services column */}
          <div>
            <h4 className="font-semibold text-sm mb-5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>Services</h4>
            <ul className="flex flex-col gap-3">
              {serviceLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className={linkClass}
                    style={linkStyle}
                    onClick={() => window.scrollTo({ top: 0 })}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <h4 className="font-semibold text-sm mb-5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>Company</h4>
            <ul className="flex flex-col gap-3">
              {companyLinks.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className={linkClass}
                    style={linkStyle}
                    onClick={() => window.scrollTo({ top: 0 })}
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={handleContactClick}
                  className={linkClass}
                  style={linkStyle}
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h4 className="font-semibold text-sm mb-5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>Get in Touch</h4>
            <div className="flex flex-col gap-4">
              <a
                href={`tel:${phone.replace(/\D/g, '')}`}
                className="flex items-start gap-3 transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
              >
                <Phone size={16} className="mt-0.5 shrink-0" style={{ color: '#39CCCC' }} />
                <span className="text-sm">{phone}</span>
              </a>
              <a
                href={`mailto:${email}`}
                className="flex items-start gap-3 transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
              >
                <Mail size={16} className="mt-0.5 shrink-0" style={{ color: '#39CCCC' }} />
                <span className="text-sm">{email}</span>
              </a>
              <div className="flex items-start gap-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: '#5EBC67' }} />
                <span className="text-sm">{address}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            &copy; {new Date().getFullYear()} New Wave IT. All rights reserved.
          </p>
          <div className="flex gap-6">
            {c.privacy_url && c.privacy_url !== '#' ? (
              <a
                href={c.privacy_url}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              >
                Privacy Policy
              </a>
            ) : (
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Privacy Policy</span>
            )}
            {c.terms_url && c.terms_url !== '#' ? (
              <a
                href={c.terms_url}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
              >
                Terms of Service
              </a>
            ) : (
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Terms of Service</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
