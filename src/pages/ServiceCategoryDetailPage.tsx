import { useParams, Link } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowRight, ExternalLink } from 'lucide-react';

interface ServiceCategory {
  title: string;
  slug: string;
  description: string;
  details: string;
  highlights: string[];
  seo_link: string;
}

const defaultServices: ServiceCategory[] = [
  {
    title: 'Cybersecurity',
    slug: 'cybersecurity',
    description: 'Comprehensive threat protection with enterprise-grade security architecture that safeguards your organization against sophisticated cyber threats and compliance violations.',
    details: 'Cybersecurity is not merely a technology investment—it\'s a strategic imperative. In today\'s threat landscape, breaches are not a matter of if, but when. Our comprehensive cybersecurity framework combines cutting-edge threat intelligence, behavioral analytics, and continuous monitoring to provide layered defense across your entire infrastructure.\n\nWe employ a zero-trust architecture approach, implementing strict access controls, multi-factor authentication, and endpoint protection that adapts to emerging threats in real time. Our Security Operations Center (SOC) provides round-the-clock vigilance, with certified analysts who respond to threats within minutes, not hours.\n\nBeyond detection and response, we architect a complete security posture assessment, identifying vulnerabilities before adversaries do. We then develop a strategic security roadmap aligned with regulatory requirements—whether HIPAA, PCI-DSS, SOC 2, or industry-specific compliance—ensuring your business operates confidently within all regulatory frameworks.',
    highlights: ['24/7 Security Operations Center (SOC) monitoring', 'Zero-trust architecture implementation', 'Advanced threat detection & behavioral analysis', 'Comprehensive vulnerability assessment & penetration testing', 'Regulatory compliance management (HIPAA, PCI-DSS, SOC 2)', 'Incident response & forensic investigation', 'Employee security awareness training programs', 'Multi-layer endpoint & network protection'],
    seo_link: '/l/cybersecurity-guide',
  },
  {
    title: 'Live IT Support',
    slug: 'live-it-support',
    description: 'Human-centric IT support with certified technicians available 24/7, delivering rapid resolution and proactive assistance without the frustration of automated systems.',
    details: 'Technology failures disrupt business operations and erode team morale. Our Live IT Support service ensures your organization always has access to experienced, certified technicians who understand your unique environment and priorities.\n\nUnlike impersonal ticketing systems, our support model emphasizes direct relationships and accountability. When you contact us, you reach a skilled human within minutes—not an automated queue. Our technicians are trained across infrastructure, applications, and user support, giving them the breadth of knowledge to resolve issues at first contact whenever possible.\n\nWe provide both remote assistance for immediate diagnostics and on-site support for hardware interventions. Our response time commitments are measured in minutes, not hours. We track every interaction through our integrated ticketing system, ensuring nothing falls through the cracks and providing you with complete transparency into your IT environment\'s health and reliability.',
    highlights: ['Dedicated account management & priority routing', 'Sub-hour response times for critical issues', 'Remote & on-site technical support', 'Advanced ticket tracking with real-time updates', 'Comprehensive knowledge base & self-service portal', 'Escalation management & executive reporting', 'Phone, email, chat & in-person support channels', 'Technician training & continuous skill development'],
    seo_link: '/l/it-support-guide',
  },
  {
    title: 'IT Repair & Upgrades',
    slug: 'it-repair-upgrades',
    description: 'Strategic hardware management combining rapid repairs with intelligent upgrades that extend system life, improve performance, and reduce total cost of ownership.',
    details: 'Aging IT infrastructure becomes a hidden cost drain—underperforming systems frustrate users, consume excessive power, require frequent repairs, and create security vulnerabilities. Our IT Repair & Upgrades service provides a sophisticated alternative to equipment replacement.\n\nWe employ advanced diagnostic techniques to pinpoint hardware failures with precision, whether it\'s memory degradation, storage subsystem faults, power delivery issues, or environmental factors. Once diagnosed, we implement repairs using genuine components and industry-standard procedures, with thorough testing ensuring components function at specification.\n\nBeyond repair, we design strategic upgrade paths that revitalize aging systems. Whether adding RAM to eliminate bottlenecks, upgrading to SSDs for dramatic performance gains, or improving thermal management for reliability, our engineers calculate ROI for each upgrade recommendation. This approach extends useful system life by years while maintaining manufacturer warranties and protecting your data through careful backup procedures.',
    highlights: ['Professional hardware diagnostics & root cause analysis', 'Genuine component sourcing & installation', 'Strategic performance upgrade planning', 'Data preservation & backup procedures', 'Comprehensive system testing & validation', 'Extended warranty coverage on repairs', 'Environmental assessment (cooling, power delivery)', 'Lifecycle management & refresh planning'],
    seo_link: '/l/it-repair-guide',
  },
  {
    title: 'Managed IT Services',
    slug: 'managed-it-services',
    description: 'Outsourced IT management that transforms technology from a reactive cost center into a strategic asset driving competitive advantage and operational excellence.',
    details: 'Managed IT Services represents a fundamental shift in how organizations approach technology. Rather than managing infrastructure reactively—responding only when systems fail—we proactively monitor, optimize, and evolve your entire technology environment in alignment with business objectives.\n\nOur managed approach provides several critical advantages: predictable monthly costs replace unpredictable emergency expenses, proactive patch management eliminates vulnerability windows, performance optimization extends infrastructure lifespan, and strategic planning ensures technology investments align with growth initiatives.\n\nWe assume responsibility for your complete IT infrastructure—from network availability and server health to workstation management, backup integrity, and security posture. Our team includes engineers, security specialists, and architects who bring enterprise-grade expertise to organizations of any size. You gain the benefit of a complete IT department without the overhead, recruiting challenges, or need to maintain deep technical expertise on every platform and technology in your environment.',
    highlights: ['Proactive 24/7 monitoring & preventive maintenance', 'Strategic IT planning & roadmap development', 'Patch management & security updates', 'Backup & disaster recovery solutions', 'Cloud integration & migration support', 'Performance optimization & capacity planning', 'Consolidated billing & predictable budgeting', 'Technology refresh planning & lifecycle management'],
    seo_link: '/l/managed-it-guide',
  },
  {
    title: 'Cloud Solutions',
    slug: 'cloud-solutions',
    description: 'Cloud architecture services that modernize infrastructure, enable scalability, and provide flexibility while maintaining security, compliance, and cost efficiency.',
    details: 'Cloud computing has evolved from an emerging technology to a business imperative. However, successful cloud adoption requires more than simply lifting existing applications and moving them to the cloud. Effective cloud strategy demands architectural expertise, security discipline, and careful cost management.\n\nWe architect comprehensive cloud solutions across leading platforms—Microsoft Azure, Amazon Web Services, and Google Cloud—tailoring each environment to your specific requirements. For organizations migrating applications, we develop detailed migration strategies that minimize disruption, preserve data integrity, and optimize performance. For businesses building cloud-native applications, we provide guidance on microservices, containerization, and serverless architecture patterns.\n\nCloud environments demand specialized security approaches. We implement identity management, data encryption, access controls, and compliance configurations aligned with industry standards. We also optimize cloud spending through reserved capacity planning, resource right-sizing, and architectural efficiency—many organizations reduce cloud costs by 30-40% through proper optimization.',
    highlights: ['Multi-cloud architecture & strategy', 'Application migration planning & execution', 'Microsoft 365 deployment & management', 'Hybrid cloud environment integration', 'Cloud security & compliance configuration', 'Cost optimization & resource efficiency', 'Backup & disaster recovery in cloud', 'Performance monitoring & optimization'],
    seo_link: '/l/cloud-solutions-guide',
  },
  {
    title: 'Network Infrastructure',
    slug: 'network-infrastructure',
    description: 'Enterprise network engineering delivering reliability, security, and performance—the foundational infrastructure enabling business continuity and growth.',
    details: 'Your network is far more than a utility—it\'s the circulatory system of your organization. A poorly designed or inadequately managed network creates bottlenecks that frustrate users, exposes vulnerabilities that attackers exploit, and becomes a drag on organizational productivity.\n\nOur network engineering practice encompasses design, installation, and continuous optimization of complete network infrastructures. We employ a defense-in-depth approach, layering security controls throughout the network—from firewalls and intrusion prevention systems to network segmentation and advanced threat detection. We design for resilience, implementing redundancy, failover mechanisms, and load balancing that ensure critical services remain available even during component failures.\n\nWe optimize performance through careful capacity planning, quality-of-service configuration, and traffic engineering. We provide wireless solutions that deliver coverage and speed to every location, implement secure remote access for distributed workforces, and architect networks that scale as your organization grows. Our approach to network management emphasizes proactive monitoring, rapid issue detection, and continuous optimization—turning your network from a source of frustration into a competitive asset.',
    highlights: ['Network design & architecture services', 'Fiber optic & structured cabling installation', 'Enterprise-grade WiFi & coverage optimization', 'Firewall & perimeter security deployment', 'Network segmentation & micro-segmentation', 'VPN & secure remote access solutions', 'Redundancy, failover & business continuity', 'Network monitoring & performance optimization'],
    seo_link: '/l/network-infrastructure-guide',
  },
];

export default function ServiceCategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = useContent('services-categories');

  let service: ServiceCategory | null = null;
  try {
    if (c.services_list) {
      const services = JSON.parse(c.services_list) as ServiceCategory[];
      service = services.find(s => s.slug === slug) || null;
    }
  } catch {
    // use default
  }

  if (!service) {
    service = defaultServices.find(s => s.slug === slug) || null;
  }

  if (!service) {
    return (
      <div className="min-h-screen" style={{ background: 'white' }}>
        <Navbar />
        <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Service not found</h1>
          <p className="text-slate-600 mb-6">This service page is not available.</p>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Back to services <ArrowRight size={14} />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      {/* Hero Section */}
      <header
        className="relative pt-32 pb-20 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: '#39CCCC', filter: 'blur(100px)' }}></div>
        </div>
        <div className="relative max-w-5xl mx-auto text-white">
          <Link
            to="/services"
            className="inline-flex items-center gap-1 text-sm mb-6"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            ← Back to Services
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 tracking-tight">{service.title}</h1>
          {service.description && (
            <p className="text-xl md:text-2xl max-w-3xl mb-8 font-light" style={{ color: 'rgba(255,255,255,0.9)' }}>
              {service.description}
            </p>
          )}
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: '#39CCCC' }}
            >
              Schedule Consultation <ArrowRight size={16} />
            </Link>
            {service.seo_link && (
              <Link
                to={service.seo_link}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
              >
                Read Complete Guide <ExternalLink size={16} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {/* Full Details */}
        {service.details && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Comprehensive Service Overview</h2>
            <div className="prose prose-lg max-w-none">
              {service.details.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-slate-700 leading-relaxed mb-4 text-base">
                  {para}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        {service.highlights.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Comprehensive Capabilities</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {service.highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl flex gap-4 transition-all duration-200 hover:shadow-lg"
                  style={{ background: 'rgba(57, 204, 204, 0.08)', border: '1px solid rgba(57, 204, 204, 0.2)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: '#39CCCC' }}
                  >
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <p className="text-slate-700 leading-snug">{highlight}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Benefits Section */}
        <section className="py-8">
          <div className="rounded-2xl p-8 md:p-12" style={{ background: 'linear-gradient(135deg, rgba(57, 204, 204, 0.08) 0%, rgba(57, 204, 204, 0.04) 100%)', border: '1px solid rgba(57, 204, 204, 0.15)' }}>
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Strategic Benefits</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg" style={{ background: '#39CCCC' }}>
                      <span className="text-white font-bold text-sm">✓</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Reduced Risk & Compliance</h3>
                    <p className="text-slate-600 text-sm">Minimize security vulnerabilities, maintain regulatory compliance, and avoid costly breaches and penalties.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg" style={{ background: '#39CCCC' }}>
                      <span className="text-white font-bold text-sm">✓</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Predictable Costs</h3>
                    <p className="text-slate-600 text-sm">Eliminate unpredictable emergency expenses with fixed, budgetable service costs.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg" style={{ background: '#39CCCC' }}>
                      <span className="text-white font-bold text-sm">✓</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Improved Performance</h3>
                    <p className="text-slate-600 text-sm">Experience increased uptime, faster systems, and improved user productivity across your organization.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg" style={{ background: '#39CCCC' }}>
                      <span className="text-white font-bold text-sm">✓</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Strategic Focus</h3>
                    <p className="text-slate-600 text-sm">Free your team to focus on core business initiatives instead of managing technology infrastructure.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Blog Link */}
        {service.seo_link && (
          <section
            className="p-8 rounded-2xl"
            style={{
              background: 'rgba(57, 204, 204, 0.08)',
              border: '1px solid rgba(57, 204, 204, 0.2)',
            }}
          >
            <div className="flex items-start gap-4">
              <ExternalLink size={24} style={{ color: '#39CCCC', flexShrink: 0 }} />
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Deep Dive Guide</h2>
                <p className="text-slate-700 mb-4">
                  Explore our comprehensive guide to {service.title.toLowerCase()} with detailed best practices, implementation strategies, and real-world insights from our certified engineers.
                </p>
                <Link
                  to={service.seo_link}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#39CCCC' }}
                >
                  Read the full guide <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-12">
          <div className="rounded-2xl p-12 md:p-16 text-center" style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', boxShadow: '0 20px 40px rgba(57, 204, 204, 0.15)' }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Transform Your {service.title.toLowerCase()}?</h2>
            <p className="text-lg text-white max-w-2xl mx-auto mb-8" style={{ opacity: 0.95 }}>
              Let our team of certified experts develop a customized strategy aligned with your business goals and budget requirements.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              Schedule Your Consultation <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
