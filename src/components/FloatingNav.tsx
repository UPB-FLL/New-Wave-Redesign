import { useEffect, useState } from 'react';
import { ArrowUp, Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const links = [
  { label: 'Home', path: '/' },
  { label: 'Services', path: '/services' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'About', path: '/about' },
  { label: 'Support', path: '/support' },
  { label: 'Contact', path: '/contact' },
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
        <nav
          id="floating-nav-menu"
          aria-label="Quick navigation"
          className="w-52 rounded-xl border p-1.5 shadow-xl"
          style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-slate)' }}
        >
          <ul className="flex flex-col gap-0.5">
            {links.map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={() => handleNav(link)}
                  aria-current={location.pathname === link.path ? 'page' : undefined}
                  className={`block w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--nw-deep-current)] hover:text-[var(--nw-signal-cyan)] ${
                    location.pathname === link.path
                      ? 'bg-[var(--nw-deep-current)] text-[var(--nw-signal-cyan)]'
                      : 'text-[var(--nw-cloud-white)]'
                  }`}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
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
