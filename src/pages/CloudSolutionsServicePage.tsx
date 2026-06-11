import { ArrowRight, Cloud, Globe, Lock, TrendingUp, Database, Zap } from 'lucide-react';
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
  id: 'cloud-solutions',
  slug: 'cloud-solutions',
  name: 'Cloud Solutions',
  description: 'Strategic cloud adoption with migration, optimization, and multi-cloud management.',
  details:
    'Leverage Azure, AWS, and Google Cloud for scalability, cost savings, and business agility. We handle migration, optimization, and ongoing management.',
  highlights: [
    'Multi-cloud architecture design',
    'Cloud migration planning & execution',
    'Microsoft 365 & productivity tools',
    'Hybrid cloud environments',
    'Cloud security & compliance',
    'Cost optimization & FinOps',
    'Backup & disaster recovery',
    'Continuous monitoring & optimization',
  ],
  seo_link: '/l/cloud-solutions-guide',
};

export default function CloudSolutionsServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Cloud Solutions & Migration Fort Lauderdale — Azure, Microsoft 365',
    description:
      'Cloud migration and management for Fort Lauderdale businesses. Azure, Microsoft 365, AWS, hybrid cloud strategy, and cost optimization. Zero-downtime migrations by New Wave IT.',
    keywords: 'cloud migration Fort Lauderdale, cloud solutions South Florida, Microsoft 365 setup Fort Lauderdale, Azure migration, cloud consulting Fort Lauderdale, hybrid cloud South Florida, cloud services MSP',
    canonical: 'https://www.newwaveitfl.com/service-category/cloud-solutions',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      'provider': { '@id': 'https://www.newwaveitfl.com/#business' },
      'name': 'Cloud Solutions & Migration',
      'description': 'Expert cloud migration to Azure, Microsoft 365, and AWS with zero-downtime transitions, cost optimization, and hybrid cloud management for South Florida businesses.',
      'areaServed': { '@type': 'City', 'name': 'Fort Lauderdale' },
      'serviceType': 'Cloud Computing',
      'url': 'https://www.newwaveitfl.com/service-category/cloud-solutions',
    },
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
              <Cloud size={48} style={{ color: '#39CCCC' }} />
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                Cloud-Native
                <br />
                <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Business Solutions
                </span>
              </h1>
              <p className="text-xl max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
                Scale your infrastructure elastically. Reduce CapEx, improve agility, and access enterprise tools at a fraction of the cost.
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
              <Cloud size={18} />
              <span>Plan Cloud Migration</span>
            </div>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Cloud Platforms & Services</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Globe size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Microsoft Azure</h3>
              <p className="text-slate-600 mb-4">
                Enterprise-grade cloud with deep Windows integration, hybrid capabilities, and Microsoft 365 bundles.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Virtual Machines & Scale Sets</li>
                <li>✓ App Services & Containers</li>
                <li>✓ SQL Database & Data Analytics</li>
                <li>✓ Azure AI & Machine Learning</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Database size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Amazon Web Services</h3>
              <p className="text-slate-600 mb-4">
                Broadest cloud platform with unmatched service breadth for every workload type and industry.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ EC2, RDS & DynamoDB</li>
                <li>✓ S3 Storage & CloudFront CDN</li>
                <li>✓ Lambda & Container Services</li>
                <li>✓ SageMaker & Analytics</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Zap size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Google Cloud</h3>
              <p className="text-slate-600 mb-4">
                Data-first cloud with powerful analytics, AI, and containerization capabilities.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>✓ Compute Engine & App Engine</li>
                <li>✓ BigQuery & Cloud Storage</li>
                <li>✓ Kubernetes Engine (GKE)</li>
                <li>✓ Vertex AI & Analytics</li>
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
                  <Cloud size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Migration Planning & Execution</h2>
          <div className="space-y-6">
            {[
              {
                title: 'Discovery & Assessment',
                desc: 'We audit your current environment, identify migration candidates, and prioritize workloads based on complexity and business value.',
              },
              {
                title: 'Architecture Design',
                desc: 'Design cloud architecture that aligns with your workloads, compliance needs, and cost targets. Consider hybrid scenarios if needed.',
              },
              {
                title: 'Pilot Migration',
                desc: 'Start with non-critical workloads to refine processes and gain team experience before migrating business-critical systems.',
              },
              {
                title: 'Production Migration',
                desc: 'Orchestrate migration with minimal downtime using cutover procedures, validation, and rollback capabilities.',
              },
              {
                title: 'Optimization',
                desc: 'Post-migration, right-size instances, optimize storage, and configure auto-scaling for cost and performance.',
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
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Cost Optimization & FinOps</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Right-Sizing</h3>
                <p className="text-slate-600">
                  Many organizations overprovision cloud resources out of caution. We analyze actual usage patterns and right-size to match real demand, cutting costs 20-40%.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Reserved Instances</h3>
                <p className="text-slate-600">
                  Use savings plans for predictable workloads. 1-3 year commitments provide 30-50% discounts vs. on-demand pricing.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Continuous Monitoring</h3>
                <p className="text-slate-600">
                  Cloud costs creep up silently with unused resources. We monitor usage, track trends, and alert on anomalies monthly.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <TrendingUp size={64} style={{ color: '#39CCCC', opacity: 0.15 }} className="mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-4">Cloud Economics</h3>
              <p className="text-slate-600 leading-relaxed">
                Cloud isn't automatically cheaper—it's cheaper when designed and managed properly. We apply FinOps principles to ensure cloud spending drives business value.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Hybrid & Multi-Cloud Strategy</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Hybrid Environments</h3>
              <p className="text-slate-600 leading-relaxed">
                Keep on-premises infrastructure where it makes sense while extending to cloud. Azure Stack, AWS Outposts, and similar solutions provide seamless integration.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Multi-Cloud Resilience</h3>
              <p className="text-slate-600 leading-relaxed">
                Distribute critical workloads across providers for vendor independence and higher availability. We manage complexity transparently.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Move to the Cloud?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Let's discuss your migration strategy. We'll assess your current environment and create a roadmap for successful cloud adoption.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Start Migration Planning <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
