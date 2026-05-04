import { ArrowRight, Monitor, BarChart3, Zap, Lock, TrendingUp, AlertCircle } from 'lucide-react';
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
  id: 'managed-it-services',
  slug: 'managed-it-services',
  name: 'Managed IT Services',
  description: 'Proactive monitoring, maintenance, and optimization of your entire IT infrastructure.',
  details:
    'Our managed services team monitors your systems 24/7, applies patches, manages backups, and provides strategic planning for IT growth.',
  highlights: [
    'Continuous infrastructure monitoring',
    'Strategic planning & roadmapping',
    'Patch management & updates',
    'Backup & disaster recovery',
    'Cloud integration & management',
    'Performance optimization',
    'Transparent billing',
    'Quarterly business reviews',
  ],
  seo_link: '/l/managed-it-guide',
};

export default function ManagedITServicePage() {
  const [service, setService] = useState<ServiceCategory | null>(null);
  const navigate = useNavigate();

  usePageMeta({
    title: 'Managed IT Services | New Wave IT',
    description:
      '24/7 proactive IT management with monitoring, patch management, backup, and disaster recovery. Predictable costs with transparent billing.',
    keywords: 'managed IT services, managed IT services provider, IT outsourcing, managed services',
  });

  useEffect(() => {
    void (async () => {
      const data = await getServiceCategory('managed-it-services');
      setService(data || defaultService);
    })();
  }, []);

  if (!service) return null;

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0f1923 0%, #1e3a4c 50%, #0f1923 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(57,204,204,0.2) 0%, transparent 50%)' }} />

        <div className="relative max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Proactive IT
            <br />
            <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Management
            </span>
          </h1>
          <p className="text-xl max-w-3xl mb-12" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Stop fighting fires and start building for the future. Our managed IT services handle day-to-day operations so your team can focus on business strategy.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <Monitor size={24} style={{ color: '#39CCCC' }} className="mb-3" />
              <div className="text-2xl font-bold text-white mb-2">24/7</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Monitoring</p>
            </div>
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <TrendingUp size={24} style={{ color: '#39CCCC' }} className="mb-3" />
              <div className="text-2xl font-bold text-white mb-2">Predictable</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Fixed Costs</p>
            </div>
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <Lock size={24} style={{ color: '#39CCCC' }} className="mb-3" />
              <div className="text-2xl font-bold text-white mb-2">Always</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Protected</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/#contact')}
            className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            <div className="flex items-center gap-2">
              <span>Schedule Consultation</span>
              <ArrowRight size={18} />
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">What Managed IT Services Include</h2>
          <p className="text-lg text-slate-600 mb-12">
            Complete coverage for your IT infrastructure—from monitoring to backup to strategic planning.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Daily Operations</h3>
              <ul className="space-y-4">
                {[
                  'Real-time system monitoring & alerting',
                  'Automated patch management',
                  'User account administration',
                  'Email & collaboration support',
                  'Device management across all platforms',
                  'Performance optimization',
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span style={{ color: '#39CCCC' }}>✓</span>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Protection & Recovery</h3>
              <ul className="space-y-4">
                {[
                  'Automated daily backups with testing',
                  'Disaster recovery planning & drills',
                  'Business continuity measures',
                  'Security monitoring & threat response',
                  'Compliance management',
                  'Data retention policies',
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span style={{ color: '#39CCCC' }}>✓</span>
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
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
                  <Monitor size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">The Transition Process</h2>
          <div className="space-y-6">
            {[
              {
                title: 'Assessment Phase',
                desc: 'We audit your current infrastructure, identify pain points, and create a transition plan tailored to your business.',
              },
              {
                title: 'Integration',
                desc: 'Our team integrates with your workflows, establishes monitoring, and sets up backup systems with zero downtime.',
              },
              {
                title: 'Optimization',
                desc: 'We identify and implement quick wins that improve performance and security immediately.',
              },
              {
                title: 'Strategic Planning',
                desc: 'Quarterly reviews to plan upgrades, discuss roadmap items, and align IT with business goals.',
              },
            ].map((phase, idx) => (
              <div key={idx} className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="flex gap-4 items-start">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)' }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{phase.title}</h3>
                    <p className="text-slate-600">{phase.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Strategic Planning & Roadmapping</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Technology Planning</h3>
                <p className="text-slate-600">
                  Don't let technology decisions happen reactively when servers fail. We plan upgrades, assess emerging technologies, and ensure your infrastructure supports business growth.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Capacity Management</h3>
                <p className="text-slate-600">
                  Trending analysis ensures you have capacity for growth while eliminating over-provisioning. We right-size your infrastructure.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Risk Mitigation</h3>
                <p className="text-slate-600">
                  Identify risks before they become incidents. Our team assesses security posture, compliance gaps, and recovery capabilities.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <BarChart3 size={64} style={{ color: '#39CCCC', opacity: 0.15 }} className="mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-4">Quarterly Business Reviews</h3>
              <p className="text-slate-600 leading-relaxed">
                Sit down with your account manager every quarter to review performance metrics, discuss planned changes, and align IT investments with business objectives.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Transparent, Predictable Billing</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Fixed Monthly Fee</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                One price covers all monitoring, patching, backups, and support. No surprise bills when something breaks. Budget IT costs like you budget electricity.
              </p>
              <p className="text-sm text-slate-500">
                Includes unlimited support tickets and service requests within your plan.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">What's Not Included</h3>
              <p className="text-slate-600 leading-relaxed mb-4">
                We're transparent about scope. Hardware replacement, new software licenses, and major infrastructure projects are separately estimated and approved.
              </p>
              <p className="text-sm text-slate-500">
                Clear estimates provided before any additional work begins.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stop Being Reactive. Start Being Strategic.
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Let us handle the daily grind. You focus on growing your business. Request a consultation to discuss your infrastructure needs.
          </p>
          <button
            onClick={() => navigate('/#contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Get Started <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
