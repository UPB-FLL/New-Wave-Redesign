import { Mail, Phone, MapPin, Linkedin, Facebook, Twitter } from 'lucide-react';
import { useContent } from '../lib/useContent';

const LOGO_URL =
  'https://images.squarespace-cdn.com/content/v1/64c044f11baf2d14ebb899c6/fb59af7c-4a76-48a9-ab9d-88a58a54496e/new-wave-it-high-resolution-logo-transparent.png?format=500w';

const serviceLinks = [
  'Cybersecurity',
  'Live IT Support',
  'IT Repair & Upgrades',
  'Managed IT Services',
  'Cloud Solutions',
  'Network Infrastructure',
];

const companyLinks = ['About Us', 'Our Team', 'Careers', 'Blog', 'Contact'];

export default function Footer() {
  const c = useContent('footer');

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const phone = c.phone || '(954) 555-0100';
  const email = c.email || 'support@newwaveitfl.com';
  const address = c.address || '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';

  return (
    <footer style={{ background: '#152232', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          <div className="lg:col-span-1">
            <div className="mb-5">
              <img src={LOGO_URL} alt="New Wave IT" className="h-14 w-auto object-contain" />
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {c.tagline || "Fort Lauderdale's trusted IT services partner. We keep your business secure, supported, and moving forward."}
            </p>
            <div className="flex gap-3">
              {[
                { icon: Linkedin, href: '#' },
                { icon: Facebook, href: '#' },
                { icon: Twitter, href: '#' },
              ].map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
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

          <div>
            <h4 className="font-semibold text-sm mb-5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>Services</h4>
            <ul className="flex flex-col gap-3">
              {serviceLinks.map((item) => (
                <li key={item}>
                  <button
                    onClick={() => scrollTo('#services')}
                    className="text-sm transition-colors"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>Company</h4>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((item) => (
                <li key={item}>
                  <button
                    onClick={() => scrollTo('#about')}
                    className="text-sm transition-colors"
                    style={{ color: 'rgba(255,255,255,0.45)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>Contact</h4>
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
            <a
              href={c.privacy_url || '#'}
              className="text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              Privacy Policy
            </a>
            <a
              href={c.terms_url || '#'}
              className="text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
