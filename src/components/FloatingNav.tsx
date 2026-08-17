import { useEffect, useState } from 'react';
import { ArrowUp, Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const links = [
  { label: 'Home', path: '/' },
  { label: 'Services', path: '/services' },
  { label: 'Blog', path: '/blog' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Cybersecurity', path: '/cybersecurity' },
  { label: 'Why Us', path: '/why-us' },
  { label: 'About', path: '/about' },
  { label: 'Support', path: '/support' },
  { label: 'Contact', path: '/contact' },
  { label: 'Industry solutions', path: '#', disabled: true },
  { label: 'Family Offices', path: '/service-category/family-offices' },
  { label: 'Healthcare', path: '/service-category/healthcare' },
  { label: 'Luxury', path: '/service-category/luxury' },
  { label: 'Cellular DAS & Public Safety', path: '/service-category/cellular-das-and-public-safety' },
];

export default function FloatingNav() {
  const [showScroll, setShowScroll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setShowScroll(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const handleNav = (link: (typeof links)[number]) => {
    if (link.disabled) return;
    setIsOpen(false);

    if (link.path === '/' && location.pathname === '/') {
      scrollToTop();
      return;
    }

    navigate(link.path);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  return (
    <div className="fixed bottom-8 left-8 z-50 hidden flex-col gap-2 lg:flex" style={{ color: 'var(--nw-current-navy)' }}>
      {showScroll ? (
        <button
          type="button"
          onClick={scrollToTop}
          className="flex h-12 w-12 items-center justify-center rounded-full border transition-colors hover:border-[var(--nw-signal-cyan)] sm:h-14 sm:w-14"
          style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-slate)', color: 'var(--nw-cloud-white)' }}
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp size={20} />
        </button>
      ) : null}

      {isOpen ? (
        <div
          id="floating-nav-menu"
          className="max-h-[60vh] w-56 overflow-y-auto rounded-lg border p-2 shadow-lg"
          style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-slate)' }}
        >
          {links.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleNav(link)}
              disabled={link.disabled}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                link.disabled
                  ? 'cursor-default text-[var(--nw-slate)]'
                  : 'text-[var(--nw-cloud-white)] hover:bg-[var(--nw-deep-current)] hover:text-[var(--nw-signal-cyan)]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-12 w-12 items-center justify-center rounded-full border transition-colors hover:bg-[var(--nw-tide-blue)] sm:h-14 sm:w-14"
        style={{ background: 'var(--nw-signal-cyan)', borderColor: 'var(--nw-signal-cyan)', color: 'var(--nw-deep-current)' }}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="floating-nav-menu"
        title={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  );
}
