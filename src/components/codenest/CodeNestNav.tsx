import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'PROJECTS', href: '#projects' },
  { label: 'BLOG', href: '#blog' },
  { label: 'ABOUT', href: '#about' },
  { label: 'RESUME', href: '#resume' },
];

const GREEN = '#5ed29c';

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2.5 text-white" aria-label="CodeNest home">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="24" height="24" rx="7" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
        <path
          d="M10.5 9.5 7 13l3.5 3.5M15.5 9.5 19 13l-3.5 3.5"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-inter text-lg font-extrabold tracking-tight">
        Code<span className="font-light text-white/80">Nest</span>
      </span>
    </a>
  );
}

export default function CodeNestNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll and wire up Escape-to-close while the overlay is open.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Logo />

        {/* Desktop menu */}
        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-inter text-base font-medium text-white/85 transition-colors duration-200"
              style={{ fontSize: '16px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = GREEN)}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="text-white md:hidden"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="codenest-mobile-menu"
        >
          <Menu size={26} />
        </button>
      </nav>

      {/* Full-screen mobile overlay */}
      {open && (
        <div
          id="codenest-mobile-menu"
          className="fixed inset-0 z-50 flex flex-col md:hidden"
          style={{ background: 'rgba(7,11,10,0.97)', backdropFilter: 'blur(8px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-6">
            <Logo />
            <button
              type="button"
              className="text-white"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={26} />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-inter text-3xl font-semibold text-white transition-colors duration-200"
                onMouseEnter={(e) => (e.currentTarget.style.color = GREEN)}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#ffffff')}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
