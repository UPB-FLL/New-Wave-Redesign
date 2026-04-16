import { ArrowRight, Lock, AlertTriangle, Zap } from 'lucide-react';

export default function CybersecurityHero() {
  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full opacity-[0.08]" style={{ background: '#39CCCC' }} />
        <div className="absolute bottom-0 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.06]" style={{ background: '#5EBC67' }} />
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #152232 1px, transparent 0)',
        backgroundSize: '40px 40px',
        opacity: 0.03,
      }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-12 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-sm font-medium"
              style={{ background: 'rgba(57,204,204,0.1)', border: '1px solid rgba(57,204,204,0.3)', color: '#39CCCC' }}
            >
              <Lock size={16} />
              Enterprise-Grade Security Solutions
            </div>

            <h1
              className="text-6xl lg:text-7xl leading-[0.95] tracking-tight mb-6"
              style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
            >
              Cybersecurity{' '}
              <span style={{ color: '#39CCCC' }}>You Can Trust</span>
            </h1>

            <p
              className="text-lg lg:text-xl leading-relaxed mb-10 max-w-xl"
              style={{ color: 'rgba(21,34,50,0.65)' }}
            >
              Protect your business from evolving cyber threats with industry-leading security solutions, threat detection, and 24/7 monitoring.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleScroll('#cta')}
                className="group flex items-center justify-center gap-2.5 font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-white"
                style={{ background: '#39CCCC', boxShadow: '0 8px 32px rgba(57,204,204,0.35)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2db8b8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#39CCCC')}
              >
                Security Assessment
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => handleScroll('#services')}
                className="flex items-center justify-center gap-2.5 font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ border: '1.5px solid rgba(21,34,50,0.15)', color: '#152232', background: 'transparent' }}
              >
                Learn More
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-14">
              {[
                { icon: Lock, label: 'Military-Grade Encryption' },
                { icon: AlertTriangle, label: '24/7 Threat Detection' },
                { icon: Zap, label: 'Instant Incident Response' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(57,204,204,0.15)' }}>
                    <item.icon size={20} style={{ color: '#39CCCC' }} />
                  </div>
                  <span className="font-medium" style={{ color: '#152232' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block relative h-full">
            <div
              className="relative rounded-3xl overflow-hidden h-full"
              style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(94,188,103,0.06) 100%)', border: '1px solid rgba(57,204,204,0.15)' }}
            >
              <div className="p-8 space-y-4 flex flex-col justify-start h-full">
                {[
                  { title: 'Threat Detection', desc: 'Real-time monitoring and instant alerts' },
                  { title: 'Data Protection', desc: 'Encryption and secure backup systems' },
                  { title: 'Compliance', desc: 'HIPAA, PCI-DSS, SOC 2 certified' },
                  { title: 'Incident Response', desc: 'Expert team ready 24/7' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: 'white', boxShadow: '0 2px 16px rgba(21,34,50,0.07)', border: '1px solid rgba(21,34,50,0.06)' }}
                  >
                    <div className="font-semibold text-sm" style={{ color: '#152232' }}>{item.title}</div>
                    <div className="text-xs mt-1" style={{ color: 'rgba(21,34,50,0.55)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
