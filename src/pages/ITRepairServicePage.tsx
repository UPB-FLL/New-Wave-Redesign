import { ArrowRight, Wrench, HardDrive, Zap, TrendingUp, Shield, Cpu } from 'lucide-react';
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
  id: 'it-repair-upgrades',
  slug: 'it-repair-upgrades',
  name: 'IT Repair & Upgrades',
  description: 'Expert hardware repair and strategic upgrades to extend equipment lifespan.',
  details:
    'From laptop repairs to server upgrades, we diagnose issues, replace failed components, and optimize your hardware for peak performance.',
  highlights: [
    'Comprehensive hardware diagnostics',
    'Component replacement & repair',
    'Data preservation & recovery',
    'Performance testing & validation',
    'Warranty & support coverage',
    'Environmental assessment',
    'Lifecycle management',
    'Emergency on-site repair',
  ],
  seo_link: '/l/it-repair-guide',
};

export default function ITRepairServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'IT Hardware Repair & Upgrades | New Wave IT',
    description:
      'Expert laptop, desktop, and server repair with data protection. Strategic hardware upgrades to extend equipment life and boost performance.',
    keywords: 'hardware repair, computer repair, laptop repair, server repair, hardware upgrades, SSD upgrade',
    canonical: 'https://www.newwaveitfl.com/service-category/it-repair-upgrades',
  });

  const service = defaultService;

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a2942 0%, #0a1f2e 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(57,204,204,0.15) 0%, transparent 60%)' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-8">
            <div className="p-4 rounded-2xl shrink-0" style={{ background: 'rgba(57,204,204,0.15)', border: '1px solid rgba(57,204,204,0.3)' }}>
              <Wrench size={48} style={{ color: '#39CCCC' }} />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Expert Hardware
                <br />
                <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Repair & Upgrades
                </span>
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Extend the life of your hardware with strategic upgrades. Our technicians repair broken equipment and boost performance with precision.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-12">
            <button
              onClick={() => navigate('/contact')}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
              }}
            >
              Schedule Diagnostic
            </button>
            <a
              href={service.seo_link}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              Read Our Guide
            </a>
            <button
              onClick={() => navigate('/contact')}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              Check Inventory
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">The Right Time to Repair vs Replace</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Repair When</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-lg" style={{ color: '#39CCCC' }}>✓</span>
                  <div>
                    <p className="font-semibold text-slate-900">Equipment is under 50% of replacement cost</p>
                    <p className="text-sm text-slate-600">Repair ROI is strong</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg" style={{ color: '#39CCCC' }}>✓</span>
                  <div>
                    <p className="font-semibold text-slate-900">Single component failure</p>
                    <p className="text-sm text-slate-600">Isolated issue, rest of equipment sound</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg" style={{ color: '#39CCCC' }}>✓</span>
                  <div>
                    <p className="font-semibold text-slate-900">Data recovery is needed</p>
                    <p className="text-sm text-slate-600">Critical files stored on the device</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #fef8f0 0%, #faf8f0 100%)', border: '1px solid rgba(255,150,0,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Replace When</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <span className="text-lg" style={{ color: '#FF9600' }}>⚠</span>
                  <div>
                    <p className="font-semibold text-slate-900">Multiple component failures</p>
                    <p className="text-sm text-slate-600">Signs of cascading hardware age</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg" style={{ color: '#FF9600' }}>⚠</span>
                  <div>
                    <p className="font-semibold text-slate-900">Repairs exceed 50% of new cost</p>
                    <p className="text-sm text-slate-600">Better to start fresh</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-lg" style={{ color: '#FF9600' }}>⚠</span>
                  <div>
                    <p className="font-semibold text-slate-900">Need performance upgrade</p>
                    <p className="text-sm text-slate-600">Newer hardware matches needs better</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-12 rounded-3xl px-8 md:px-12" style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(57,204,204,0.03) 100%)', border: '1px solid rgba(57,204,204,0.15)' }}>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Service Capabilities</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {service.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="p-2 rounded mt-1" style={{ background: 'rgba(57,204,204,0.2)' }}>
                  <Wrench size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">High-Impact Upgrades</h2>
          <div className="space-y-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex items-start gap-6">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(57,204,204,0.15)' }}>
                  <HardDrive size={32} style={{ color: '#39CCCC' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">SSD Upgrade (Most Impactful)</h3>
                  <p className="text-slate-600 mb-4">
                    Replacing a mechanical hard drive with an SSD is the single most effective upgrade. Boot times drop from minutes to seconds, applications launch instantly, and overall responsiveness improves dramatically.
                  </p>
                  <p className="text-sm text-slate-500">
                    Investment: $100-300 per machine | Performance gain: 10x faster boot and load times
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex items-start gap-6">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(57,204,204,0.15)' }}>
                  <Cpu size={32} style={{ color: '#39CCCC' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">RAM Expansion</h3>
                  <p className="text-slate-600 mb-4">
                    Insufficient RAM causes constant disk thrashing. Upgrade to 16GB or more to eliminate slowdowns when running multiple applications, virtual machines, or handling large files.
                  </p>
                  <p className="text-sm text-slate-500">
                    Investment: $60-150 per 8GB module | Performance gain: Smoother multitasking and reduced stuttering
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex items-start gap-6">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(57,204,204,0.15)' }}>
                  <Zap size={32} style={{ color: '#39CCCC' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Battery Replacement (Laptops)</h3>
                  <p className="text-slate-600 mb-4">
                    A laptop that can't run unplugged is tethered to a desk. Replace aging batteries to restore the mobility and convenience your laptop was designed for.
                  </p>
                  <p className="text-sm text-slate-500">
                    Investment: $80-200 | Performance gain: All-day portability restored
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Our Repair Process</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              {[
                { num: '1', title: 'Comprehensive Diagnostics', desc: 'Identify all issues with precision testing' },
                { num: '2', title: 'Data Backup', desc: 'Secure all user data before any repairs' },
                { num: '3', title: 'Component Replacement', desc: 'Replace failed parts with quality components' },
                { num: '4', title: 'Software Restoration', desc: 'Reinstall and configure operating systems' },
                { num: '5', title: 'Full Testing', desc: 'Validate all systems before handoff' },
                { num: '6', title: 'Documentation', desc: 'Provide detailed repair report and recommendations' },
              ].map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)' }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{step.title}</h4>
                    <p className="text-sm text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <Shield size={64} style={{ color: '#39CCCC', opacity: 0.15 }} className="mb-6" />
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Data Safety Guarantee</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                We understand your data is irreplaceable. Every repair includes secure data backup and recovery procedures following industry standards. We use isolated testing environments to prevent cross-contamination.
              </p>
              <p className="text-sm text-slate-500">
                RAID recovery, encrypted file systems, and complex multi-drive scenarios handled by certified specialists.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get Your Hardware Running Again
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Same-day diagnostics for most devices. We'll tell you exactly what's wrong and the best path forward.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Schedule Diagnostics <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
