import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Shield, Headphones, Wrench, Monitor, Cloud, Network, Briefcase, Stethoscope, Crown, Signal, ArrowRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';

const serviceGroups = [
  {
    heading: 'Core Services',
    accent: '#39CCCC',
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
    heading: 'Industry Solutions',
    accent: '#5EBC67',
    items: [
      { label: 'Family Offices', href: '/service-category/family-offices', icon: Briefcase },
      { label: 'Healthcare', href: '/service-category/healthcare', icon: Stethoscope },
      { label: 'Luxury', href: '/service-category/luxury', icon: Crown },
      { label: 'Cellular DAS & Public Safety', href: '/service-category/cellular-das-and-public-safety', icon: Signal },
    ],
  },
];

const navLinks = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Why Us', href: '/why-us' },
  { label: 'About', href: '/about' },
  { label: 'Support', href: '/support' },
  { label: 'Status', href: '/status' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsOpen(false);
    if (href.startsWith('#')) {
      if (location.pathname === '/') {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/');
        setTimeout(() => {
          const el = document.querySelector(href);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    } else {
      navigate(href);
      window.scrollTo({ top: 0 });
    }
  };

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
      window.scrollTo({ top: 0 });
    }
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
            aria-label="New Wave IT home"
          >
            <Logo tone="onLight" />
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
                aria-haspopup="true"
                aria-expanded={servicesDropdownOpen}
              >
                Services
                <ChevronDown size={16} className={`transition-transform duration-200 ${servicesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {servicesDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50">
                  <div
                    className="w-[600px] rounded-2xl bg-white overflow-hidden"
                    style={{ border: '1px solid rgba(21,34,50,0.08)', boxShadow: '0 24px 60px -12px rgba(21,34,50,0.22)' }}
                  >
                    <div className="grid grid-cols-2">
                      {serviceGroups.map((group, gi) => (
                        <div
                          key={group.heading}
                          className="p-3.5"
                          style={gi === 1 ? { borderLeft: '1px solid rgba(21,34,50,0.06)', background: 'rgba(21,34,50,0.025)' } : undefined}
                        >
                          <p className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: group.accent }}>
                            {group.heading}
                          </p>
                          <div className="flex flex-col gap-0.5">
                            {group.items.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <button
                                  key={item.href}
                                  onClick={() => {
                                    navigate(item.href);
                                    setServicesDropdownOpen(false);
                                  }}
                                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150"
                                  onMouseEnter={(e) => (e.currentTarget.style.background = `${group.accent}14`)}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${group.accent}1A` }}>
                                    <ItemIcon size={17} style={{ color: group.accent }} />
                                  </span>
                                  <span className="text-[15px] font-medium leading-snug" style={{ color: '#152232' }}>
                                    {item.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        navigate('/services');
                        setServicesDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-7 py-3.5 transition-colors duration-150"
                      style={{ background: 'rgba(57,204,204,0.07)', borderTop: '1px solid rgba(21,34,50,0.06)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(57,204,204,0.14)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(57,204,204,0.07)')}
                    >
                      <span className="text-sm font-medium" style={{ color: 'rgba(21,34,50,0.65)' }}>
                        Not sure where to start?
                      </span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#2db8b8' }}>
                        View all services
                        <ArrowRight size={15} />
                      </span>
                    </button>
                  </div>
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
            className="md:hidden p-2 text-brand-navy"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="mobile-nav-menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div id="mobile-nav-menu" className="md:hidden bg-white border-t border-gray-100">
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
                <div className="mt-2 ml-2 flex flex-col gap-1">
                  {serviceGroups.map((group) => (
                    <div key={group.heading}>
                      <p className="px-1 pt-2 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: group.accent }}>
                        {group.heading}
                      </p>
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <button
                            key={item.href}
                            onClick={() => {
                              navigate(item.href);
                              setIsOpen(false);
                              setServicesDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-1 py-2 text-left"
                          >
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${group.accent}1A` }}>
                              <ItemIcon size={14} style={{ color: group.accent }} />
                            </span>
                            <span className="text-base" style={{ color: 'rgba(21,34,50,0.75)' }}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      navigate('/services');
                      setIsOpen(false);
                      setServicesDropdownOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-1 py-2 text-base font-semibold text-left"
                    style={{ color: '#2db8b8' }}
                  >
                    View all services
                    <ArrowRight size={15} />
                  </button>
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
              onClick={() => handleNavClick('/contact')}
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
