import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOGO_URL =
  'https://images.squarespace-cdn.com/content/v1/64c044f11baf2d14ebb899c6/fb59af7c-4a76-48a9-ab9d-88a58a54496e/new-wave-it-high-resolution-logo-transparent.png?format=500w';

const serviceCategories = [
  { label: 'Overview', href: '/services', isOverview: true },
  { label: 'Cybersecurity', href: '/service-category/cybersecurity' },
  { label: 'Live IT Support', href: '/service-category/live-it-support' },
  { label: 'IT Repair & Upgrades', href: '/service-category/it-repair-upgrades' },
  { label: 'Managed IT Services', href: '/service-category/managed-it-services' },
  { label: 'Cloud Solutions', href: '/service-category/cloud-solutions' },
  { label: 'Network Infrastructure', href: '/service-category/network-infrastructure' },
  { label: '— Industry Solutions —', href: '#', isSection: true, disabled: true },
  { label: 'Family Offices', href: '/service-category/family-offices' },
  { label: 'Healthcare', href: '/service-category/healthcare' },
  { label: 'Luxury', href: '/service-category/luxury' },
  { label: 'Cellular DAS & Public Safety', href: '/service-category/cellular-das-and-public-safety' },
];

const navLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Why Us', href: '/why-us' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
  { label: 'Status', href: '/status' },
  { label: 'Contact', href: '#contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.startsWith('#')) {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(href);
    }
  };

  const handleLogoClick = () => {
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white shadow-md shadow-black/5 border-b border-gray-100'
          : 'bg-white border-b border-gray-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <button
            onClick={handleLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <img
              src={LOGO_URL}
              alt="New Wave IT"
              className="h-14 w-auto object-contain"
              style={{ mixBlendMode: 'multiply' }}
            />
          </button>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => navigate('/')}
              className="text-lg font-medium transition-colors duration-200"
              style={{ color: 'rgba(21,34,50,0.7)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#152232')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(21,34,50,0.7)')}
            >
              Home
            </button>

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => {
                if (dropdownTimeout) clearTimeout(dropdownTimeout);
                setServicesDropdownOpen(true);
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => setServicesDropdownOpen(false), 300);
                setDropdownTimeout(timeout);
              }}
            >
              <button
                className="text-lg font-medium transition-colors duration-200 flex items-center gap-1"
                style={{ color: 'rgba(21,34,50,0.7)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#152232')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(21,34,50,0.7)')}
              >
                Services
                <ChevronDown size={16} className={`transition-transform duration-200 ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {servicesDropdownOpen && (
                <div className="absolute top-full left-0 mt-0 pt-2 w-52 rounded-lg shadow-lg py-1 z-50" style={{ background: 'white', border: '1px solid rgba(21,34,50,0.1)' }}>
                  {serviceCategories.map((cat, idx) => (
                    <button
                      key={cat.href}
                      onClick={() => {
                        if (!cat.disabled) {
                          navigate(cat.href);
                          setServicesDropdownOpen(false);
                        }
                      }}
                      disabled={cat.disabled}
                      className="w-full px-4 text-lg text-left transition-colors duration-200"
                      style={{
                        color: cat.isOverview ? '#39CCCC' : cat.disabled ? 'rgba(21,34,50,0.4)' : 'rgba(21,34,50,0.7)',
                        paddingTop: cat.isOverview || cat.isSection ? '10px' : '10px',
                        paddingBottom: '10px',
                        fontWeight: cat.isOverview || cat.isSection ? '600' : '400',
                        borderBottom: cat.isOverview || cat.isSection ? '1px solid rgba(21,34,50,0.1)' : 'none',
                        cursor: cat.disabled ? 'default' : 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!cat.isOverview && !cat.disabled) {
                          e.currentTarget.style.background = 'rgba(57,204,204,0.08)';
                          e.currentTarget.style.color = '#152232';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!cat.isOverview && !cat.disabled) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(21,34,50,0.7)';
                        }
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {navLinks.filter(link => link.label !== 'Support').map((link) => {
              const isExternal = 'isExternal' in link && link.isExternal;

              if (isExternal) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium transition-colors duration-200"
                    style={{ color: 'rgba(21,34,50,0.7)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#152232')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(21,34,50,0.7)')}
                  >
                    {link.label}
                  </a>
                );
              }

              return (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-lg font-medium transition-colors duration-200"
                  style={{ color: 'rgba(21,34,50,0.7)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#152232')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(21,34,50,0.7)')}
                >
                  {link.label}
                </button>
              );
            })}
            <button
              onClick={() => handleNavClick('/support')}
              className="ml-auto px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 text-white text-lg"
              style={{
                background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                boxShadow: '0 4px 12px rgba(57,204,204,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(57,204,204,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(57,204,204,0.3)';
              }}
            >
              Support
            </button>
          </div>

          <button
            className="md:hidden p-2"
            style={{ color: '#152232' }}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-6 py-4 flex flex-col gap-4">
            <button
              onClick={() => {
                navigate('/');
                setIsOpen(false);
              }}
              className="text-base font-medium text-left transition-colors"
              style={{ color: 'rgba(21,34,50,0.7)' }}
            >
              Home
            </button>

            {/* Mobile Services Dropdown */}
            <div>
              <button
                onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                className="text-base font-medium text-left transition-colors flex items-center justify-between w-full"
                style={{ color: 'rgba(21,34,50,0.7)' }}
              >
                Services
                <ChevronDown size={16} className={`transition-transform duration-200 ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {servicesDropdownOpen && (
                <div className="mt-2 ml-4 flex flex-col gap-3 border-l-2 pl-3" style={{ borderColor: 'rgba(57,204,204,0.3)' }}>
                  {serviceCategories.map((cat) => (
                    <button
                      key={cat.href}
                      onClick={() => {
                        if (!cat.disabled) {
                          navigate(cat.href);
                          setIsOpen(false);
                          setServicesDropdownOpen(false);
                        }
                      }}
                      disabled={cat.disabled}
                      className="text-base text-left transition-colors"
                      style={{
                        color: cat.isOverview ? '#39CCCC' : cat.disabled ? 'rgba(21,34,50,0.4)' : 'rgba(21,34,50,0.7)',
                        fontWeight: cat.isOverview || cat.isSection ? '600' : '400',
                        cursor: cat.disabled ? 'default' : 'pointer',
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {navLinks.map((link) => {
              const isExternal = 'isExternal' in link && link.isExternal;
              const isSupport = link.label === 'Support';

              if (isExternal) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-base font-medium text-left transition-colors"
                    style={{ color: 'rgba(21,34,50,0.7)' }}
                  >
                    {link.label}
                  </a>
                );
              }

              if (isSupport) {
                return (
                  <button
                    key={link.href}
                    onClick={() => {
                      handleNavClick(link.href);
                      setIsOpen(false);
                    }}
                    className="px-4 py-3 rounded-lg font-medium text-white text-left"
                    style={{
                      background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                      boxShadow: '0 4px 12px rgba(57,204,204,0.3)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {link.label}
                  </button>
                );
              }

              return (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-base font-medium text-left transition-colors"
                  style={{ color: 'rgba(21,34,50,0.7)' }}
                >
                  {link.label}
                </button>
              );
            })}
            <button
              onClick={() => handleNavClick('#contact')}
              className="text-white font-semibold px-5 py-3 rounded-lg transition-all duration-200 text-center"
              style={{ background: '#39CCCC' }}
            >
              Free Assessment
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
