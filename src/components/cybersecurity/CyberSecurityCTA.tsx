import { ArrowRight, Shield } from 'lucide-react';

export default function CyberSecurityCTA() {
  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="cta" className="bg-white py-20 relative overflow-hidden" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.08]" style={{ background: '#39CCCC' }} />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.08]" style={{ background: '#5EBC67' }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 lg:px-8">
        <div className="rounded-3xl p-12 lg:p-16 text-center" style={{
          background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(94,188,103,0.08) 100%)',
          border: '1px solid rgba(57,204,204,0.2)'
        }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 mx-auto" style={{ background: 'rgba(57,204,204,0.15)' }}>
            <Shield size={32} style={{ color: '#39CCCC' }} />
          </div>

          <h2
            className="text-4xl lg:text-5xl leading-tight mb-5"
            style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
          >
            Ready to Secure Your{' '}
            <span style={{ color: '#39CCCC' }}>Infrastructure?</span>
          </h2>

          <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.65)' }}>
            Get a comprehensive security assessment from our expert team. Identify vulnerabilities, strengthen your defenses, and sleep better at night knowing your business is protected.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="group flex items-center justify-center gap-2.5 font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-white"
              style={{ background: '#39CCCC', boxShadow: '0 8px 32px rgba(57,204,204,0.35)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2db8b8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#39CCCC')}
            >
              Schedule Security Assessment
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => handleScroll('#contact')}
              className="font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{ border: '1.5px solid rgba(21,34,50,0.15)', color: '#152232', background: 'transparent' }}
            >
              Contact Our Team
            </button>
          </div>

          <p className="text-sm mt-8" style={{ color: 'rgba(21,34,50,0.5)' }}>
            No obligation. Free initial consultation with our security experts.
          </p>
        </div>
      </div>
    </section>
  );
}
