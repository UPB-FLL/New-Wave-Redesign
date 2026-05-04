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
    description: 'Enterprise-grade security solutions to protect your business from evolving threats and cyber attacks.',
    details: 'Cybersecurity is not just about installing software - it\'s about building a comprehensive defense strategy that protects your critical assets.\n\nOur cybersecurity approach combines advanced threat detection, behavioral analysis, and 24/7 monitoring to identify and neutralize threats before they impact your business.\n\nWe work with you to assess your current security posture, identify vulnerabilities, and implement a customized security roadmap that aligns with your business goals and compliance requirements.',
    highlights: ['24/7 threat monitoring', 'Vulnerability assessments', 'Incident response planning', 'Security compliance audits', 'Employee security training', 'Network penetration testing'],
    seo_link: '/l/cybersecurity-guide',
  },
  {
    title: 'Live IT Support',
    slug: 'live-it-support',
    description: 'Real humans, real solutions - available 24/7 for any IT issue, big or small.',
    details: 'When IT issues happen, they can bring your business to a standstill. That\'s why we provide live, human IT support around the clock - no chatbots, no wait queues.\n\nOur certified technicians are available 24/7/365 to troubleshoot problems, answer questions, and get your systems back online fast. Whether it\'s a printer issue or a critical server problem, we handle it with the same level of expertise and urgency.\n\nWe offer both remote support for quick fixes and on-site support for hardware issues, with response times that meet your business needs.',
    highlights: ['24/7 help desk access', 'Remote & on-site support', 'Fast resolution times', 'Ticket tracking system', 'Priority escalation', 'Knowledge base access'],
    seo_link: '/l/it-support-guide',
  },
  {
    title: 'IT Repair & Upgrades',
    slug: 'it-repair-upgrades',
    description: 'Hardware failures and slow systems don\'t wait - neither do we. Fast, reliable repairs and strategic upgrades.',
    details: 'Aging hardware and system failures don\'t just inconvenience your team - they cost you money in lost productivity and data risk.\n\nWe diagnose and repair hardware issues quickly, whether it\'s a failed hard drive, memory problems, or motherboard failures. We also specialize in strategic upgrades that breathe new life into aging systems without the expense of complete replacement.\n\nOur technicians use genuine parts and industry-standard repair procedures, and we stand behind our work with comprehensive warranties.',
    highlights: ['Hardware repair & diagnostics', 'Component upgrades', 'Data recovery services', 'System optimization', 'Genuine parts used', 'Warranty protection'],
    seo_link: '/l/it-repair-guide',
  },
  {
    title: 'Managed IT Services',
    slug: 'managed-it-services',
    description: 'Fully managed IT so you can focus on growing your business, not troubleshooting it.',
    details: 'Managed IT Services is like having a complete IT department that works for your business 24/7. We proactively monitor your systems, apply patches before problems occur, and plan strategic upgrades that align with your business growth.\n\nRather than paying for IT support only when something breaks, managed services let you budget predictably while reducing downtime and extending the life of your technology investments.\n\nWe handle everything from network monitoring and security updates to backup management and hardware replacements - freeing your team to focus on what matters most: growing your business.',
    highlights: ['Proactive monitoring 24/7', 'Patch management', 'IT roadmap & strategy', 'Backup & disaster recovery', 'Performance optimization', 'Technology planning'],
    seo_link: '/l/managed-it-guide',
  },
  {
    title: 'Cloud Solutions',
    slug: 'cloud-solutions',
    description: 'Modernize your infrastructure with scalable, secure cloud environments built for your needs.',
    details: 'Cloud computing isn\'t just for tech companies anymore. Whether you\'re looking to migrate existing applications, build new cloud-native solutions, or adopt Microsoft 365, cloud technology offers flexibility, scalability, and cost efficiency.\n\nWe help you navigate cloud options, plan migrations safely, and manage hybrid environments that blend on-premises and cloud resources. Our experience spans major platforms including Microsoft Azure, AWS, and Google Cloud.\n\nWe ensure your cloud environment is secure, properly configured for compliance, and optimized for performance and cost.',
    highlights: ['Cloud migration planning', 'Microsoft 365 management', 'Hybrid environment support', 'Cloud security configuration', 'Cost optimization', 'Disaster recovery in cloud'],
    seo_link: '/l/cloud-solutions-guide',
  },
  {
    title: 'Network Infrastructure',
    slug: 'network-infrastructure',
    description: 'Reliable, high-performance networks engineered for uptime and business continuity.',
    details: 'Your network is the backbone of your business. A slow, unreliable network impacts productivity, security, and customer experience. A well-designed network is the foundation for growth.\n\nWe design, install, and manage networks that deliver reliability, speed, and security. From network design and cabling installation to WiFi optimization and remote access solutions, we handle the complete network lifecycle.\n\nWhether you need to upgrade aging infrastructure, add redundancy for critical applications, or optimize performance, we engineer solutions that match your business needs and budget.',
    highlights: ['Network design & installation', 'WiFi solutions & optimization', 'VPN & remote access', 'Network security & firewalls', 'Redundancy & failover', 'Performance optimization'],
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
        className="relative pt-32 pb-16 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}
      >
        <div className="relative max-w-5xl mx-auto text-white">
          <Link
            to="/services"
            className="inline-flex items-center gap-1 text-sm mb-4"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            ← Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">{service.title}</h1>
          {service.description && (
            <p className="text-lg md:text-xl max-w-3xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {service.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/#contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#39CCCC' }}
            >
              Get in touch <ArrowRight size={14} />
            </Link>
            {service.seo_link && (
              <Link
                to={service.seo_link}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Read blog post <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {/* Full Details */}
        {service.details && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Service Overview</h2>
            <div className="prose prose-lg max-w-none">
              {service.details.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-slate-700 leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        {service.highlights.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">What We Provide</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {service.highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl flex gap-3"
                  style={{ background: 'rgba(57, 204, 204, 0.08)', border: '1px solid rgba(57, 204, 204, 0.2)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: '#39CCCC' }}
                  >
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <p className="text-slate-700">{highlight}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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
        <section className="text-center py-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to get started?</h2>
          <p className="text-slate-600 mb-6">Let's discuss how we can help with {service.title.toLowerCase()}.</p>
          <Link
            to="/#contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Schedule a consultation <ArrowRight size={14} />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
