import { ArrowRight, Shield, Phone, Calendar, CheckCircle2 } from 'lucide-react';

export default function CyberSecurityCTA() {
  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="cta"
      className="py-12 sm:py-16 relative overflow-hidden"
      style={{
        background: '#152232',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        zIndex: 10,
      }}
    >
      {/* Decorative gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(57,204,204,0.2) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(94,188,103,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="rounded-3xl p-5 sm:p-8 lg:p-12 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(94,188,103,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="grid lg:grid-cols-5 gap-6 sm:gap-8 items-center">
            <div className="lg:col-span-3">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
                style={{ background: 'rgba(57,204,204,0.12)', border: '1px solid rgba(57,204,204,0.3)' }}
              >
                <Shield size={12} style={{ color: '#39CCCC' }} />
                <span className="text-[11px] font-semibold" style={{ color: '#39CCCC' }}>
                  FREE 30-MINUTE CONSULTATION
                </span>
              </div>

              <h2
                className="text-2xl sm:text-3xl lg:text-4xl leading-tight mb-3"
                style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: 'white' }}
              >
                See your security gaps before{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  attackers do.
                </span>
              </h2>

              <p className="text-base mb-5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Get a comprehensive security posture assessment from our certified analysts.
                We'll identify vulnerabilities, prioritize remediation, and deliver an
                executive-ready roadmap — at zero cost.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <button
                  className="group flex items-center justify-center gap-2.5 font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-white"
                  style={{
                    background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                    boxShadow: '0 8px 32px rgba(57,204,204,0.4)',
                  }}
                >
                  <Calendar size={18} />
                  Schedule Assessment
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => handleScroll('#contact')}
                  className="font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  style={{
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Phone size={16} />
                  Talk to an Engineer
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {['No commitment required', 'Results in 5 days', 'Executive-ready report'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} style={{ color: '#5EBC67' }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: What you get */}
            <div className="lg:col-span-2">
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#39CCCC' }}>
                  What You'll Receive
                </h3>
                <ul className="space-y-2.5">
                  {[
                    { title: 'Vulnerability Report', desc: 'Prioritized list of security gaps' },
                    { title: 'Compliance Gap Analysis', desc: 'Mapped to your regulations' },
                    { title: '90-Day Roadmap', desc: 'Actionable remediation plan' },
                    { title: 'Executive Summary', desc: 'Board-ready presentation' },
                  ].map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(94,188,103,0.2)' }}
                      >
                        <CheckCircle2 size={12} style={{ color: '#5EBC67' }} />
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'white' }}>
                          {item.title}
                        </div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {item.desc}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
