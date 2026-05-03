import { useState, useEffect } from 'react';
import { ArrowUp, Menu, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function FloatingNav() {
  const [showScroll, setShowScroll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setShowScroll(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNav = (link: { label: string; path: string; hash?: string }) => {
    setIsOpen(false);

    if (link.hash) {
      // Hash-based: scroll to section if on home, otherwise nav home + scroll
      if (location.pathname === '/') {
        const el = document.querySelector(link.hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/');
        setTimeout(() => {
          const el = document.querySelector(link.hash!);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      return;
    }

    if (link.path === '/' && location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    navigate(link.path);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const links = [
    { label: 'Home', path: '/' },
    { label: 'Services', path: '/services' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Cybersecurity', path: '/cybersecurity' },
    { label: 'Why Us', path: '/why-us' },
    { label: 'About', path: '/about' },
    { label: 'Support', path: '/support' },
    { label: 'Contact', path: '/', hash: '#contact' },
  ];

  return (
    <>
      {/* Floating Back to Top Button */}
      {showScroll && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-lg group"
          style={{
            background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
            animation: 'slideInUp 0.3s ease-out',
          }}
          title="Back to top"
        >
          <ArrowUp
            size={24}
            className="text-white transition-transform duration-300 group-hover:-translate-y-1"
          />
        </button>
      )}

      {/* Quick Navigation Menu */}
      <div className="fixed bottom-8 left-8 z-40 flex flex-col gap-3">
        {/* Menu Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, #5EBC67 0%, #4da856 100%)',
          }}
          title="Quick navigation"
        >
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <Menu size={24} className="text-white" />
          )}
        </button>

        {/* Quick Links Menu */}
        {isOpen && (
          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {links.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNav(link)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:translate-x-1 hover:shadow-lg backdrop-blur-md text-left"
                style={{
                  background: 'rgba(57, 204, 204, 0.9)',
                  border: '1px solid rgba(57, 204, 204, 0.3)',
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Smooth Scroll Behavior */}
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
