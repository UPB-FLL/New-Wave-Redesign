import { ArrowRight, Crown, Home, Lock, Wifi, Zap, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string;
  highlights: string[];
  seo_link: string;
}

const defaultService: ServiceCategory = {
  id: 'luxury',
  slug: 'luxury',
  name: 'Luxury',
  description: 'Premium technology solutions for luxury properties, resorts, and high-end hospitality with bespoke automation and security.',
  details:
    'White-glove IT services designed for luxury residential properties, resorts, and exclusive hospitality venues with seamless guest experience and operational elegance.',
  highlights: [
    'Smart home & building automation',
    'Premium guest WiFi & networking',
    'Concierge technology platforms',
    'Integrated entertainment systems',
    'Luxury brand security solutions',
    'Seamless guest connectivity',
    'Discreet 24/7 technical support',
    'Custom automation & integration',
  ],
  seo_link: '/l/luxury-guide',
};

export default function LuxuryServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Luxury Property IT Services | High-End Smart Home & Automation',
    description:
      'Premium IT solutions for luxury properties, resorts, and high-end hospitality. Smart home automation, guest WiFi, and white-glove technical support.',
    keywords: 'luxury property IT, smart home automation, high-end WiFi, concierge technology, resort IT services',
    canonical: 'https://www.newwaveitfl.com/service-category/luxury',
  });

  const service = defaultService;

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0f1923 0%, #0a3f52 50%, #1a2e3e 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(57,204,204,0.15) 0%, transparent 60%)' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-8">
            <div className="p-4 rounded-2xl shrink-0" style={{ background: 'rgba(57,204,204,0.15)', border: '1px solid rgba(57,204,204,0.3)' }}>
              <Crown size={48} style={{ color: '#39CCCC' }} />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Luxury Living
                <br />
                <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Redefined
                </span>
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Premium technology that enhances the luxury experience while remaining invisible to guests and residents.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/contact')}
            className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            <div className="flex items-center gap-2">
              <Crown size={18} />
              <span>Discuss Your Property Needs</span>
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Luxury Technology Solutions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Home size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Automation</h3>
              <p className="text-slate-600 mb-4">
                Integrated systems for lighting, climate, entertainment, and security that operate seamlessly and intuitively for guests and residents.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Voice & app control systems</li>
                <li>✓ Automated lighting & climate</li>
                <li>✓ Entertainment integration</li>
                <li>✓ Customizable guest experiences</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Wifi size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Premium Guest Connectivity</h3>
              <p className="text-slate-600 mb-4">
                Ultra-fast, seamless WiFi throughout properties with guest management, speed guarantees, and zero dropouts.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Mesh WiFi 6+ networks</li>
                <li>✓ Guest portal & analytics</li>
                <li>✓ Bandwidth management</li>
                <li>✓ Premium QoS guarantees</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Lock size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Discrete Security</h3>
              <p className="text-slate-600 mb-4">
                Sophisticated security infrastructure that protects without being seen—from access control to monitoring.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Smart access control</li>
                <li>✓ CCTV & monitoring</li>
                <li>✓ Intrusion detection</li>
                <li>✓ Privacy-first design</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-12 rounded-3xl px-8 md:px-12" style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(57,204,204,0.03) 100%)', border: '1px solid rgba(57,204,204,0.15)' }}>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Service Highlights</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {service.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="p-2 rounded mt-1" style={{ background: 'rgba(57,204,204,0.2)' }}>
                  <Crown size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Elevating the Guest Experience</h2>
          <div className="space-y-6">
            {[
              {
                title: 'Bespoke Concierge Technology',
                desc: 'Custom platforms for guest requests, services, entertainment, and dining recommendations integrated with property management systems.',
              },
              {
                title: 'Integrated Entertainment',
                desc: 'Seamless audio/video systems, streaming services, and digital concierge throughout the property with intuitive guest controls.',
              },
              {
                title: 'Operational Efficiency',
                desc: 'Staff dashboards for monitoring, maintenance alerts, housekeeping coordination, and guest service requests in real-time.',
              },
              {
                title: 'Advanced Access Management',
                desc: 'Keyless entry, time-limited guest codes, mobile access, and seamless transitions that eliminate friction and enhance security.',
              },
              {
                title: 'Premium Support 24/7',
                desc: 'Dedicated technical teams available around the clock for immediate issue resolution without disrupting guest experiences.',
              },
            ].map((step, idx) => (
              <div key={idx} className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="flex gap-4 items-start">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)' }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-600">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Why Luxury Properties Choose Us</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Invisible Excellence</h3>
              <p className="text-slate-600 leading-relaxed">
                Technology that works flawlessly in the background, enhancing experiences without requiring guest awareness or interaction.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Proven Luxury Track Record</h3>
              <p className="text-slate-600 leading-relaxed">
                Experience managing high-end properties where downtime is unacceptable and premium experiences are non-negotiable.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Transform Your Property Experience
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Let's design technology that elevates every moment for your guests and streamlines operations for your team.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Schedule Property Assessment <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
