import { ArrowRight, Briefcase, Lock, Shield, TrendingUp, Users, Zap } from 'lucide-react';
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
  id: 'family-offices',
  slug: 'family-offices',
  name: 'Family Offices',
  description: 'Secure, compliant IT infrastructure and wealth management technology for multi-generational family enterprises.',
  details:
    'Protect sensitive financial data, ensure regulatory compliance, and leverage technology for efficient family office operations with dedicated support.',
  highlights: [
    'Privacy-first network architecture',
    'Secure document & asset management',
    'Multi-generational access controls',
    'Tax compliance & audit readiness',
    'Wealth management system integration',
    'Confidentiality & discretion protocols',
    'Financial data encryption & backup',
    '24/7 dedicated support & monitoring',
  ],
  seo_link: '/l/family-offices-guide',
};

export default function FamilyOfficesServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Family Office IT Services | Secure Wealth Management Technology',
    description:
      'Secure IT infrastructure for family offices. Privacy-focused, compliant technology solutions for multi-generational wealth management and operations.',
    keywords: 'family office IT, wealth management technology, private network security, family enterprise IT',
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
              <Briefcase size={48} style={{ color: '#39CCCC' }} />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Family Office
                <br />
                <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  IT Excellence
                </span>
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Privacy-first technology infrastructure for managing multi-generational wealth with confidence and compliance.
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
              <Briefcase size={18} />
              <span>Schedule Family Office Consultation</span>
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Our Family Office Services</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Lock size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Data Security & Privacy</h3>
              <p className="text-slate-600 mb-4">
                Vault-level protection for sensitive financial and personal information with encryption, access controls, and audit trails.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ End-to-end encryption</li>
                <li>✓ Role-based access control</li>
                <li>✓ Comprehensive audit logs</li>
                <li>✓ Secure document vault</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Shield size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Compliance & Governance</h3>
              <p className="text-slate-600 mb-4">
                Maintain regulatory compliance across tax codes, estate planning, and anti-money laundering requirements with ease.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Multi-jurisdiction compliance</li>
                <li>✓ Audit-ready documentation</li>
                <li>✓ Regulatory reporting tools</li>
                <li>✓ Policy enforcement</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Users size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Multi-Generational Access</h3>
              <p className="text-slate-600 mb-4">
                Seamlessly manage permissions and succession planning as family leadership transitions across generations.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Flexible permission tiers</li>
                <li>✓ Succession workflows</li>
                <li>✓ Knowledge transfer tools</li>
                <li>✓ Guardian oversight controls</li>
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
                  <Briefcase size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Family Office Operations Support</h2>
          <div className="space-y-6">
            {[
              {
                title: 'Wealth Management Integration',
                desc: 'Connect banking platforms, investment systems, and accounting software in a unified, secure ecosystem for comprehensive wealth visibility.',
              },
              {
                title: 'Governance & Succession',
                desc: 'Implement documented governance structures, clear decision-making protocols, and succession plans supported by secure technology.',
              },
              {
                title: 'Confidential Communications',
                desc: 'Private networks, encrypted messaging, and secure conferencing that maintain family discretion and professional standards.',
              },
              {
                title: 'Continuous Monitoring & Support',
                desc: '24/7 proactive monitoring, regular security assessments, and dedicated support from advisors who understand family office complexity.',
              },
              {
                title: 'Disaster Recovery & Business Continuity',
                desc: 'Redundant systems and proven recovery procedures ensure family office operations continue during any crisis.',
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
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Why Families Choose Us</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Discretion & Confidentiality</h3>
              <p className="text-slate-600 leading-relaxed">
                We operate under strict confidentiality agreements and understand the sensitivity required when managing family wealth. Your privacy is paramount.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Industry Expertise</h3>
              <p className="text-slate-600 leading-relaxed">
                Deep experience with family office workflows, tax planning integration, wealth reporting requirements, and multi-generational governance structures.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Elevate Your Family Office Technology?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Let's discuss how secure, tailored IT infrastructure can support your family's wealth management and operational goals.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Schedule Consultation <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
