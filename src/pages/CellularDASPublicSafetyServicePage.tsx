import { ArrowRight, Radio, Signal, AlertTriangle, Wifi, Users, Zap } from 'lucide-react';
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
  id: 'cellular-das-public-safety',
  slug: 'cellular-das-public-safety',
  name: 'Cellular DAS & Public Safety',
  description: 'Distributed antenna systems and critical communications infrastructure for emergency services, large venues, and public safety agencies.',
  details:
    'Deploy reliable cellular coverage, FirstNet integration, and redundant communications systems that emergency responders and public safety agencies depend on.',
  highlights: [
    'DAS design & installation',
    'FirstNet responder network',
    'In-building cellular coverage',
    'Large venue connectivity',
    'Redundant communication systems',
    'Emergency response support',
    'Network monitoring & maintenance',
    'Compliance & certification',
  ],
  seo_link: '/l/cellular-das-public-safety-guide',
};

export default function CellularDASPublicSafetyServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Cellular DAS & Public Safety Communications | FirstNet Solutions',
    description:
      'Distributed antenna systems for emergency responders, public safety agencies, and large venues. FirstNet integration, in-building coverage, and critical communications.',
    keywords: 'cellular DAS, public safety networks, FirstNet, in-building coverage, emergency communications, responder networks',
    canonical: 'https://www.newwaveitfl.com/service-category/cellular-das-and-public-safety',
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
              <Signal size={48} style={{ color: '#39CCCC' }} />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Reliable Communications
                <br />
                <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  When It Matters
                </span>
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Cellular coverage and communications infrastructure that emergency responders and public safety agencies can depend on.
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
              <Radio size={18} />
              <span>Schedule Assessment</span>
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Communications Solutions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Signal size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Distributed Antenna Systems</h3>
              <p className="text-slate-600 mb-4">
                Custom-designed DAS networks for buildings, stadiums, and large venues ensuring comprehensive cellular coverage in areas with poor reception.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Coverage assessment & design</li>
                <li>✓ Multi-carrier integration</li>
                <li>✓ Installation & commissioning</li>
                <li>✓ Performance optimization</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Radio size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">FirstNet & Responder Networks</h3>
              <p className="text-slate-600 mb-4">
                FirstNet-compliant systems prioritized for emergency responders with redundancy and reliability built for life-safety operations.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ FirstNet integration</li>
                <li>✓ Responder priority access</li>
                <li>✓ Reliable in-building coverage</li>
                <li>✓ Redundant systems</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <AlertTriangle size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Emergency Response Ready</h3>
              <p className="text-slate-600 mb-4">
                Systems designed and maintained to support emergency operations with 24/7 monitoring and rapid response to any issues.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Critical infrastructure monitoring</li>
                <li>✓ Rapid response protocols</li>
                <li>✓ Backup power systems</li>
                <li>✓ Emergency support procedures</li>
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
                  <Signal size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Building Reliable Coverage</h2>
          <div className="space-y-6">
            {[
              {
                title: 'Site Assessment & Planning',
                desc: 'Comprehensive RF survey and coverage analysis to identify gaps and design optimal DAS architecture for your specific building or facility.',
              },
              {
                title: 'System Design & Engineering',
                desc: 'Custom-engineered solutions that meet FirstNet requirements, building codes, and aesthetic standards while maximizing coverage.',
              },
              {
                title: 'Installation & Integration',
                desc: 'Professional installation with minimal disruption, integration with existing building systems, and full multi-carrier testing.',
              },
              {
                title: 'Commissioning & Optimization',
                desc: 'Performance testing, optimization for all carriers, and documentation to ensure system meets design specifications.',
              },
              {
                title: 'Ongoing Maintenance & Support',
                desc: '24/7 monitoring, scheduled maintenance, performance audits, and rapid response to keep your communications always available.',
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
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Applications & Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Public Safety & Government</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Emergency dispatch centers, police/fire stations, government buildings, and public facilities requiring FirstNet compliance and reliable responder communications.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Emergency operations centers</li>
                <li>✓ First responder facilities</li>
                <li>✓ Government buildings</li>
                <li>✓ Critical infrastructure</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Large Venues & Facilities</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                Stadiums, arenas, transit hubs, hotels, hospitals, and large commercial buildings where building materials or size creates dead zones.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Sports venues</li>
                <li>✓ Transportation centers</li>
                <li>✓ Large commercial buildings</li>
                <li>✓ Healthcare facilities</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ensure Critical Coverage
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Let's assess your facility's coverage needs and design a system that ensures reliable communications when every second counts.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Get Coverage Assessment <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
