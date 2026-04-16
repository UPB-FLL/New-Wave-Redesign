import { useState, useEffect } from 'react';
import { ArrowUp, Menu, X } from 'lucide-react';

export default function FloatingNav() {
  const [showScroll, setShowScroll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  const sections = [
    { label: 'Home', id: 'hero' },
    { label: 'Services', id: 'services' },
    { label: 'Why Us', id: 'why-us' },
    { label: 'About', id: 'about' },
    { label: 'Contact', id: 'contact' },
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
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 hover:translate-x-1 hover:shadow-lg backdrop-blur-md"
                style={{
                  background: 'rgba(57, 204, 204, 0.9)',
                  border: '1px solid rgba(57, 204, 204, 0.3)',
                }}
              >
                {section.label}
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
