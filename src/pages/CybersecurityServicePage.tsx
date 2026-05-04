import { ArrowRight, Shield, Lock, Eye, AlertTriangle, BarChart3, Users } from 'lucide-react';
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
  id: 'cybersecurity',
  slug: 'cybersecurity',
  name: 'Cybersecurity',
  description: 'Enterprise-grade security solutions to protect your business from evolving cyber threats.',
  details:
    'Our comprehensive cybersecurity program provides 24/7 threat monitoring, advanced detection capabilities, and rapid response protocols to keep your business protected.',
  highlights: [
    '24/7 SOC monitoring',
    'Zero-trust architecture',
    'Advanced threat detection & behavioral analysis',
    'Comprehensive vulnerability assessment & penetration testing',
    'Regulatory compliance management',
    'Incident response & forensic investigation',
    'Employee security awareness training',
    'Multi-layer endpoint & network protection',
  ],
  seo_link: '/l/cybersecurity-guide',
};

export default function CybersecurityServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Enterprise Cybersecurity Solutions | New Wave IT',
    description:
      'Protect your business with 24/7 threat monitoring, penetration testing, compliance management, and incident response. Enterprise-grade security for South Florida businesses.',
    keywords: 'cybersecurity, threat detection, compliance, penetration testing, SOC monitoring',
  });

  const service = defaultService;

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0f1923 0%, #1a2942 50%, #0f1923 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(57,204,204,0.2) 0%, transparent 50%)' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-start gap-6 mb-8">
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(57,204,204,0.15)', border: '1px solid rgba(57,204,204,0.3)' }}>
              <Shield size={48} style={{ color: '#39CCCC' }} />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Enterprise-Grade
                <br />
                <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Security Defense
                </span>
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Protect your organization from evolving cyber threats with 24/7 monitoring, advanced threat detection, and incident response.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <button
              onClick={() => navigate('/#contact')}
              className="px-6 py-4 rounded-xl font-semibold text-white text-left transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
              }}
            >
              <div className="flex items-center justify-between">
                <span>Schedule Security Assessment</span>
                <ArrowRight size={20} />
              </div>
            </button>
            <a
              href={service.seo_link}
              className="px-6 py-4 rounded-xl font-semibold text-left transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div className="flex items-center justify-between">
                <span>Read Complete Guide</span>
                <ArrowRight size={20} />
              </div>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Security Framework</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Lock size={24} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Zero-Trust Architecture</h3>
              <p className="text-slate-600">
                Never trust, always verify. Our zero-trust model eliminates implicit trust, requiring continuous authentication and authorization for all users and devices.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Eye size={24} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Threat Detection & Response</h3>
              <p className="text-slate-600">
                24/7 SOC monitoring with advanced behavioral analysis and behavioral threat detection to identify and respond to incidents in real-time.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <BarChart3 size={24} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Compliance & Governance</h3>
              <p className="text-slate-600">
                Stay compliant with HIPAA, PCI-DSS, SOC 2, and other regulatory requirements. We manage your compliance roadmap and documentation.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 rounded-3xl px-8 md:px-12" style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(57,204,204,0.03) 100%)', border: '1px solid rgba(57,204,204,0.15)' }}>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Core Security Capabilities</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {service.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="p-2 rounded mt-1" style={{ background: 'rgba(57,204,204,0.2)' }}>
                  <Shield size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Attack Surface Management</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Vulnerability Assessment & Penetration Testing</h3>
                <p className="text-slate-600">
                  Regular assessments identify security gaps before attackers do. Our penetration testing simulates real-world attacks to evaluate your defenses.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Endpoint Protection</h3>
                <p className="text-slate-600">
                  Multi-layer endpoint protection with behavior-based detection, sandboxing, and automatic response to threats across all devices.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Network Segmentation</h3>
                <p className="text-slate-600">
                  Isolate critical systems and sensitive data. Network segmentation limits lateral movement and contains breaches before they spread.
                </p>
              </div>
            </div>
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <AlertTriangle size={64} style={{ color: '#39CCCC', opacity: 0.15 }} className="mb-4" />
              <p className="text-slate-700 leading-relaxed">
                The average breach costs organizations <span className="font-bold">$4.45 million</span>. Proactive security investments pay for themselves many times over through breach prevention.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Incident Response & Forensics</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <Users size={64} style={{ color: '#39CCCC', opacity: 0.15 }} className="mb-4" />
              <p className="text-slate-700 leading-relaxed">
                Our incident response team is available 24/7 to respond to security events. We contain, investigate, and recover from incidents while preserving forensic evidence.
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Rapid Response</h3>
                <p className="text-slate-600">
                  Minutes matter in a breach. Our team activates containment procedures immediately to limit damage and prevent data exfiltration.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Digital Forensics</h3>
                <p className="text-slate-600">
                  Preserve evidence for regulatory compliance and potential legal action. Our forensic team documents the full scope of the incident.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Recovery & Hardening</h3>
                <p className="text-slate-600">
                  Beyond recovery, we identify root causes and implement fixes to prevent similar incidents. Each incident becomes a learning opportunity.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Strengthen Your Security Posture?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Schedule a confidential security assessment with our team to identify vulnerabilities and develop a comprehensive security roadmap.
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
