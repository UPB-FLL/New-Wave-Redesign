import { ArrowRight, Stethoscope, Lock, Activity, Users, Zap, FileText } from 'lucide-react';
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
  id: 'healthcare',
  slug: 'healthcare',
  name: 'Healthcare',
  description: 'HIPAA-compliant IT infrastructure and healthcare-specific technology solutions for medical practices and health systems.',
  details:
    'Secure patient data management, regulatory compliance, and seamless integration with EHR systems while maintaining the highest standards of healthcare IT.',
  highlights: [
    'HIPAA-compliant infrastructure',
    'EHR/EMR system integration',
    'Patient data encryption & backup',
    'Telehealth platform support',
    'Medical device networking',
    'Secure communication tools',
    'Audit trail & compliance reporting',
    'Healthcare-specific disaster recovery',
  ],
  seo_link: '/l/healthcare-guide',
};

export default function HealthcareServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Healthcare IT Services | HIPAA Compliance & EHR Support',
    description:
      'HIPAA-compliant IT services for medical practices and health systems. EHR integration, patient data security, and healthcare-specific technology solutions.',
    keywords: 'healthcare IT, HIPAA compliance, EHR support, medical practice IT, telehealth technology',
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
          <div className="flex items-start gap-6 mb-8">
            <div className="p-4 rounded-2xl" style={{ background: 'rgba(57,204,204,0.15)', border: '1px solid rgba(57,204,204,0.3)' }}>
              <Stethoscope size={48} style={{ color: '#39CCCC' }} />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Healthcare IT That
                <br />
                <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Puts Patients First
                </span>
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
                HIPAA-compliant systems that keep patient data secure while enabling efficient healthcare delivery.
              </p>
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
              <Stethoscope size={18} />
              <span>Schedule Healthcare IT Consultation</span>
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Healthcare IT Solutions</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Lock size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">HIPAA Compliance</h3>
              <p className="text-slate-600 mb-4">
                Comprehensive compliance framework ensuring your practice meets all HIPAA requirements for patient privacy and data security.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Compliance audits & assessments</li>
                <li>✓ Access controls & encryption</li>
                <li>✓ Breach notification protocols</li>
                <li>✓ Business associate agreements</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Activity size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">EHR Integration & Support</h3>
              <p className="text-slate-600 mb-4">
                Seamless integration with Epic, Cerner, athenahealth, and other EHR systems with ongoing optimization and support.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ EHR implementation & migration</li>
                <li>✓ System optimization & training</li>
                <li>✓ Interface management</li>
                <li>✓ Reporting & analytics</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Zap size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Telehealth & Remote Care</h3>
              <p className="text-slate-600 mb-4">
                Secure telehealth platforms and remote monitoring solutions that expand care delivery while protecting patient privacy.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Telehealth platform setup</li>
                <li>✓ Encrypted communications</li>
                <li>✓ Remote monitoring integration</li>
                <li>✓ HIPAA-compliant file sharing</li>
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
                  <Stethoscope size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Clinical & Operational Excellence</h2>
          <div className="space-y-6">
            {[
              {
                title: 'Secure Medical Device Networking',
                desc: 'Connect imaging systems, diagnostic equipment, and monitoring devices while maintaining security and HIPAA compliance across your network.',
              },
              {
                title: 'Staff Access & Training',
                desc: 'Implement role-based access controls for clinicians and administrative staff with ongoing training to ensure proper data handling.',
              },
              {
                title: 'Data Backup & Disaster Recovery',
                desc: 'Healthcare-specific backup and recovery procedures ensure continuity of care even during system failures or disasters.',
              },
              {
                title: 'Meaningful Use & Quality Reporting',
                desc: 'Support for meaningful use compliance, quality measures reporting, and integration with government and insurance reporting requirements.',
              },
              {
                title: 'Regulatory Updates & Compliance',
                desc: 'Stay current with changing regulations including OCR guidance, state-specific requirements, and emerging healthcare IT standards.',
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
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Why Healthcare Providers Choose Us</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Healthcare Industry Knowledge</h3>
              <p className="text-slate-600 leading-relaxed">
                Our team understands clinical workflows, regulatory pressures, and the critical importance of system reliability in healthcare delivery.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Patient-Centric Security</h3>
              <p className="text-slate-600 leading-relaxed">
                We implement security as an enabler of care, not a barrier. Secure systems that enable clinicians to focus on what matters—patient outcomes.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Strengthen Your Healthcare IT?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Let's discuss how compliant, integrated IT infrastructure can support clinical excellence and operational efficiency in your practice.
          </p>
          <button
            onClick={() => navigate('/#contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Start Your Assessment <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
