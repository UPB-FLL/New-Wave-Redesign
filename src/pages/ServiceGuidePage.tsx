import { useParams, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, AlertCircle, TrendingUp, Shield, Users, Zap, BarChart3 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface GuideSection {
  title: string;
  content: string[];
  icon?: React.ReactNode;
}

interface ServiceGuide {
  title: string;
  subtitle: string;
  overview: string;
  keyBenefits: { title: string; description: string }[];
  sections: GuideSection[];
  implementationSteps: string[];
  faq: { question: string; answer: string }[];
}

const guides: Record<string, ServiceGuide> = {
  'cybersecurity-guide': {
    title: 'Complete Cybersecurity Guide',
    subtitle: 'Building Enterprise-Grade Security Defense',
    overview: 'Modern cybersecurity requires a multi-layered approach that goes far beyond simple password policies. This comprehensive guide walks you through building a security program that protects your organization from sophisticated threats while maintaining compliance with industry regulations.',
    keyBenefits: [
      { title: 'Threat Prevention', description: 'Identify and neutralize threats before they impact your business' },
      { title: 'Regulatory Compliance', description: 'Meet HIPAA, PCI-DSS, SOC 2 and industry-specific requirements' },
      { title: 'Risk Reduction', description: 'Minimize the financial and operational impact of security incidents' },
      { title: 'Team Awareness', description: 'Create a security-conscious culture across your organization' },
    ],
    sections: [
      {
        title: 'Security Framework Fundamentals',
        icon: <Shield className="w-6 h-6" />,
        content: [
          'A security framework provides the structure for protecting your organization. The zero-trust model assumes no user or device is inherently trustworthy, requiring continuous verification for all access requests.',
          'The framework includes several critical layers: perimeter defense (firewalls), endpoint protection (antivirus/EDR), network segmentation (limiting lateral movement), identity management (controlling access), and data protection (encryption).',
          'Each layer serves a specific purpose. When one layer is compromised, others continue protecting your assets. This defense-in-depth approach ensures business continuity even during security incidents.',
        ],
      },
      {
        title: 'Threat Detection & Response',
        icon: <AlertCircle className="w-6 h-6" />,
        content: [
          'A Security Operations Center (SOC) provides 24/7 monitoring of your infrastructure. Analysts review millions of events daily, identifying patterns that indicate potential threats.',
          'Advanced threat detection uses behavioral analysis to spot unusual activity that might indicate a compromise. This goes beyond simple signature-based detection, catching novel attack methods.',
          'Response procedures must be documented and tested. An incident response plan that sits on a shelf is worthless. Regular drills ensure your team can execute the plan quickly when needed.',
        ],
      },
      {
        title: 'Compliance & Governance',
        icon: <TrendingUp className="w-6 h-6" />,
        content: [
          'Compliance isn\'t optional—it\'s often required by law or contractual obligations. HIPAA applies to healthcare, PCI-DSS to payment processing, GDPR to EU customer data, and SOC 2 to service providers.',
          'A compliance program documents your security controls, demonstrates their effectiveness, and proves you\'re meeting regulatory requirements. This involves policies, procedures, training, and regular audits.',
          'Security and compliance are inseparable. Controls that meet compliance requirements also protect your assets. Regular compliance audits provide third-party validation of your security posture.',
        ],
      },
    ],
    implementationSteps: [
      'Assess your current security posture through penetration testing and vulnerability assessments',
      'Identify compliance requirements specific to your industry and location',
      'Develop a security roadmap aligned with your business priorities and budget',
      'Implement foundational controls: firewalls, endpoint protection, access management',
      'Deploy monitoring and detection capabilities with a SOC or managed security service',
      'Create incident response procedures and train your team',
      'Conduct regular security awareness training for all employees',
      'Perform quarterly assessments and continuous improvement',
    ],
    faq: [
      {
        question: 'How much does a comprehensive security program cost?',
        answer: 'Costs vary based on your organization size, industry, and current maturity. A basic program for a small business might cost $5,000-$15,000 monthly. Enterprise programs can be significantly higher but often yield strong ROI through breach prevention.',
      },
      {
        question: 'What\'s the difference between a firewall and antivirus?',
        answer: 'Firewalls control traffic at the network level—deciding what\'s allowed in/out. Antivirus protects individual machines from malicious software. Both are necessary; they work at different layers.',
      },
      {
        question: 'How often should security assessments occur?',
        answer: 'Annual penetration tests and vulnerability assessments are standard. Ongoing vulnerability scanning should run continuously. After significant changes (new systems, compliance requirements), conduct immediate assessments.',
      },
      {
        question: 'Can we do security in-house or do we need external help?',
        answer: 'Most organizations benefit from a hybrid approach. Use a managed security provider for 24/7 monitoring and expertise, while your team handles internal policies and awareness training.',
      },
    ],
  },

  'it-support-guide': {
    title: 'IT Support Excellence Guide',
    subtitle: 'Delivering Responsive, Expert Technical Assistance',
    overview: 'Great IT support goes beyond quick fixes. This guide explains how to establish support that minimizes downtime, builds user confidence, and gives your team the tools they need to be productive.',
    keyBenefits: [
      { title: 'Reduced Downtime', description: 'Fast resolution times minimize productivity loss' },
      { title: 'User Satisfaction', description: 'Responsive support builds trust and improves morale' },
      { title: 'Predictable Costs', description: 'Shift from emergency expenses to budgeted support' },
      { title: 'Better Documentation', description: 'Knowledge sharing reduces repeat issues' },
    ],
    sections: [
      {
        title: 'Support Tiers & Response Times',
        icon: <Zap className="w-6 h-6" />,
        content: [
          'Most organizations use tiered support based on issue severity. Critical issues (systems down, data loss risk) get immediate response. Important issues get 1-2 hour response. Standard requests get 4-8 hour response.',
          'Response time is when support acknowledges the ticket. Resolution time is when the issue is fixed. Good support separates these—quick response with clear communication while working toward resolution.',
          'After-hours support should be available for critical issues. Whether through on-call staff or a managed provider, never leave a business-critical outage unaddressed.',
        ],
      },
      {
        title: 'Remote vs. On-Site Support',
        icon: <Users className="w-6 h-6" />,
        content: [
          'Remote support is faster for software issues—screen sharing and remote access let technicians diagnose and fix problems without travel time. Software updates, configuration changes, and troubleshooting work best remotely.',
          'Hardware issues often need on-site attention. Failed drives, network equipment, or printer problems require physical replacement or repair. A hybrid model provides the speed of remote support for software plus on-site capability for hardware.',
          'Good remote support tools include screen sharing, remote control, chat, and ticket tracking. Staff should have laptops, monitors, and proper ergonomics. Remote support becomes faster than on-site as your team improves their setup.',
        ],
      },
      {
        title: 'Knowledge Management & Documentation',
        icon: <BarChart3 className="w-6 h-6" />,
        content: [
          'Every issue your support team resolves should be documented. A knowledge base captures solutions, common workarounds, and how-tos. This reduces repeat issues and lets your team self-resolve many problems.',
          'Documentation should be searchable and written clearly. Include screenshots, step-by-step instructions, and common error messages. Update documentation as software versions change.',
          'Empower your team to update the knowledge base after every support ticket. This ensures documentation stays current and your team learns from each issue.',
        ],
      },
    ],
    implementationSteps: [
      'Define support tiers and response time commitments',
      'Select support tools (ticketing, remote access, knowledge base)',
      'Train support staff on your systems and applications',
      'Create response templates and escalation procedures',
      'Document common issues and solutions',
      'Monitor response times and customer satisfaction',
      'Review tickets weekly to identify patterns',
      'Update knowledge base and procedures continuously',
    ],
    faq: [
      {
        question: 'What\'s a reasonable response time for IT support?',
        answer: 'Critical issues should get response within 15-30 minutes. Important issues within 1-2 hours. Standard requests within 4-8 hours. After-hours emergencies should have on-call response procedures.',
      },
      {
        question: 'Should support handle software training or just troubleshooting?',
        answer: 'Good support includes basic training. If users repeatedly ask about the same features, it\'s a training issue. Proactive training reduces support tickets.',
      },
      {
        question: 'How do we prioritize between multiple support requests?',
        answer: 'Use severity (impact on business), urgency (how many users affected), and the support tier system. Document this in your ticketing system so prioritization is consistent.',
      },
      {
        question: 'What metrics should we track for IT support quality?',
        answer: 'Track response time, resolution time, first-contact resolution rate, customer satisfaction (CSAT), ticket volume by category, and repeat issues. These metrics guide improvement.',
      },
    ],
  },

  'it-repair-guide': {
    title: 'IT Repair & Upgrade Strategy Guide',
    subtitle: 'Extending Equipment Life and Optimizing Performance',
    overview: 'Equipment replacement represents a significant expense. Strategic repairs and upgrades can extend useful equipment life by years while improving performance. This guide covers the economics of repair vs. replacement.',
    keyBenefits: [
      { title: 'Extended Equipment Life', description: 'Strategic upgrades can add 2-3 years to system useful life' },
      { title: 'Cost Savings', description: 'Repairs often cost 30-50% less than replacement' },
      { title: 'Performance Improvement', description: 'Targeted upgrades can dramatically boost productivity' },
      { title: 'Environmental Benefits', description: 'Extending equipment life reduces e-waste' },
    ],
    sections: [
      {
        title: 'When to Repair vs. Replace',
        icon: <TrendingUp className="w-6 h-6" />,
        content: [
          'The 50% rule guides this decision: if repair cost exceeds 50% of replacement cost, and the equipment is over 50% through its useful life, replacement is often smarter. For a $1,000 laptop that\'s 5 years old, a $600 repair might not make sense.',
          'However, performance needs change what makes sense. A $400 RAM upgrade that makes a 6-year-old workstation perfectly adequate is a smart investment if replacement would cost $2,500.',
          'Consider the impact of downtime. If a repair means 3 days without a critical workstation, replacement might cost less in lost productivity. Factor downtime risk into the economics.',
        ],
      },
      {
        title: 'High-Impact Upgrades',
        icon: <Zap className="w-6 h-6" />,
        content: [
          'SSD upgrades provide dramatic performance improvements. Systems with aging hard drives feel sluggish even if other components are fine. A $100-200 SSD upgrade can make a 7-year-old system feel modern again.',
          'RAM upgrades solve performance problems for specific workloads. If users consistently hit memory limits (you\'ll see this in Task Manager), additional RAM often solves the problem for 30-50% of new system cost.',
          'Battery replacement for laptops extends useful life significantly. A $150 battery replacement can make a 5-year-old laptop portable again, extending its useful life by years.',
        ],
      },
      {
        title: 'Diagnostic Best Practices',
        icon: <AlertCircle className="w-6 h-6" />,
        content: [
          'Proper diagnosis prevents unnecessary repairs. Slow performance, crashes, and errors can have multiple causes. Run diagnostics before replacing components.',
          'Use disk utilities to check hard drive health, run memory tests for RAM issues, and monitor temperatures for cooling problems. These diagnostics help identify the actual problem.',
          'Document the diagnostic results. If you later need to return equipment or warranty a repair, documentation proves the issue and that it was properly addressed.',
        ],
      },
    ],
    implementationSteps: [
      'Inventory your equipment and document age, specs, and condition',
      'Establish criteria for repair vs. replacement decisions',
      'Identify high-impact upgrade opportunities (SSDs, RAM)',
      'Develop diagnostic procedures and tools',
      'Create repair/upgrade templates documenting typical procedures',
      'Track repair costs and equipment lifespan data',
      'Review equipment lifecycle data quarterly',
      'Adjust upgrade/replacement strategy based on findings',
    ],
    faq: [
      {
        question: 'How much longer will an SSD make my old computer last?',
        answer: 'Often 2-5 years. SSDs dramatically improve perceived performance and responsiveness. If other components are adequate, an SSD upgrade can make older systems feel modern.',
      },
      {
        question: 'Should we repair or replace equipment under warranty?',
        answer: 'If warranty covers it, repair. If warranty is expired and repair is expensive, sometimes replacement is smarter. Compare total cost of ownership over the next 2-3 years.',
      },
      {
        question: 'How do we know if equipment is worth repairing?',
        answer: 'Calculate repair cost vs. replacement cost and consider useful life remaining. Document equipment condition and costs for future decisions.',
      },
      {
        question: 'What about data recovery for failed drives?',
        answer: 'Professional data recovery costs $300-1500 but can be worthwhile for critical data on failed drives. Prevention through backups is much cheaper than recovery.',
      },
    ],
  },

  'managed-it-guide': {
    title: 'Managed IT Services Strategy Guide',
    subtitle: 'Transforming IT from Cost Center to Strategic Asset',
    overview: 'Managed IT Services represents a fundamental shift in how organizations approach technology. Instead of paying for support only when something breaks, managed services provide proactive oversight, strategic planning, and predictable costs.',
    keyBenefits: [
      { title: 'Predictable Costs', description: 'Fixed monthly fees replace emergency expenses' },
      { title: 'Proactive Management', description: 'Issues are prevented, not just reacted to' },
      { title: 'Strategic Planning', description: 'Technology aligns with business growth' },
      { title: 'Expert Access', description: 'Get enterprise-grade expertise at any organization size' },
    ],
    sections: [
      {
        title: 'Service Scope & Coverage',
        icon: <Shield className="w-6 h-6" />,
        content: [
          'Managed IT typically covers infrastructure monitoring, patch management, security updates, backup management, performance optimization, and help desk support. Define exactly what\'s included and excluded.',
          'Most providers offer service tiers. Bronze includes essential services. Silver adds optimization and strategic planning. Gold includes advanced security and compliance services. Choose based on your risk profile and budget.',
          'Network monitoring tracks availability 24/7. Automated alerts notify the team when issues occur. Proactive monitoring catches many problems before they impact users.',
        ],
      },
      {
        title: 'Transition to Managed Services',
        icon: <TrendingUp className="w-6 h-6" />,
        content: [
          'Moving to managed services requires planning. You\'ll need an inventory of all systems, documentation of configurations, and identification of any unsupported or legacy systems.',
          'The transition typically takes 2-4 weeks. Initial work focuses on baseline documentation, establishing monitoring, implementing backup procedures, and setting up ticketing systems.',
          'Expect initial discovery to surface issues your current team hasn\'t had time to address. This is normal. A good managed services provider prioritizes remediation based on business impact.',
        ],
      },
      {
        title: 'Strategic Planning & Roadmapping',
        icon: <BarChart3 className="w-6 h-6" />,
        content: [
          'Managed services provides the bandwidth for strategic planning. Regular business reviews discuss upcoming growth, technology changes, and capability improvements.',
          'Technology roadmaps align infrastructure with business strategy. If you\'re planning growth to 50 employees, the roadmap ensures infrastructure scales. If you\'re considering cloud migration, the roadmap guides implementation.',
          'Budget planning becomes predictable. Instead of surprise equipment failures and emergency support costs, you budget for managed services with planned technology refresh cycles.',
        ],
      },
    ],
    implementationSteps: [
      'Audit your current IT environment and document all systems',
      'Define the scope of services you need (help desk, monitoring, security, etc.)',
      'Select a managed services provider aligned with your needs',
      'Plan the transition (typically 2-4 weeks)',
      'Establish monitoring and baseline metrics',
      'Schedule monthly business review meetings',
      'Develop a 3-year technology roadmap',
      'Review service performance quarterly and adjust as needed',
    ],
    faq: [
      {
        question: 'How much does managed IT services cost?',
        answer: 'Typically $80-150 per user per month depending on service scope. Small businesses often pay $2,000-5,000 monthly. Enterprise costs vary based on complexity.',
      },
      {
        question: 'Will we still have an internal IT person with managed services?',
        answer: 'Many organizations retain one internal IT person to handle local issues and coordinate with the managed provider. This provides continuity and internal accountability.',
      },
      {
        question: 'What happens if the managed services provider doesn\'t meet SLAs?',
        answer: 'Good contracts include service credits if SLAs are missed. Define what metrics matter (uptime, response time, resolution time) and what credits apply.',
      },
      {
        question: 'Can we move to a different provider later?',
        answer: 'Yes, but plan it carefully. Good providers ensure smooth transitions. Avoid long-term contracts that make switching difficult.',
      },
    ],
  },

  'cloud-solutions-guide': {
    title: 'Cloud Solutions Strategy Guide',
    subtitle: 'Modernizing Infrastructure with Cloud Technology',
    overview: 'Cloud computing isn\'t a single product—it\'s a set of platforms and services. This guide covers cloud architecture, migration strategy, and cost optimization to help you make informed cloud decisions.',
    keyBenefits: [
      { title: 'Scalability', description: 'Grow infrastructure without large capital expenditures' },
      { title: 'Flexibility', description: 'Deploy services globally, support remote work, respond to changes' },
      { title: 'Cost Efficiency', description: 'Pay for what you use; avoid overprovisioning' },
      { title: 'Security & Compliance', description: 'Enterprise security without enterprise complexity' },
    ],
    sections: [
      {
        title: 'Cloud Platforms & Services',
        icon: <Zap className="w-6 h-6" />,
        content: [
          'Three major cloud providers dominate: Microsoft Azure (enterprise focus), Amazon Web Services (broadest services), and Google Cloud (data and analytics strength). Each has different strengths.',
          'Cloud services range from Infrastructure-as-a-Service (IaaS—manage your own servers) to Platform-as-a-Service (PaaS—manage applications, infrastructure provided) to Software-as-a-Service (SaaS—Microsoft 365, Salesforce).',
          'Most organizations use multiple services. A typical setup might use Azure for enterprise applications, AWS for specialized workloads, and SaaS for productivity and collaboration.',
        ],
      },
      {
        title: 'Migration Planning & Execution',
        icon: <TrendingUp className="w-6 h-6" />,
        content: [
          'Successful migration starts with assessment. Catalog your applications, databases, and dependencies. Identify which applications are suitable for cloud and which need on-premises infrastructure.',
          'Plan migration in waves. Move less-critical applications first to learn your process. Production systems migrate last, with detailed testing and rollback procedures.',
          'The "cloud readiness" assessment evaluates each application. Rehost (lift-and-shift) is fastest but may not optimize costs. Refactor optimizes for cloud but takes longer. Choose strategy based on application importance.',
        ],
      },
      {
        title: 'Cost Optimization & Management',
        icon: <BarChart3 className="w-6 h-6" />,
        content: [
          'Cloud cost management starts before deployment. Design for cloud—use managed services, auto-scaling, and reserved capacity. Over-provisioning in the cloud is easy and expensive.',
          'Right-sizing eliminates waste. Many organizations over-allocate resources out of caution. Regular reviews identify unused resources and over-sized instances that can be reduced.',
          'Reserved instances and commitment plans provide significant discounts—often 30-50% off on-demand pricing. These work best for predictable workloads.',
        ],
      },
    ],
    implementationSteps: [
      'Assess applications and dependencies for cloud readiness',
      'Select cloud platform(s) based on workload requirements',
      'Plan migration waves, starting with non-critical applications',
      'Design cloud architecture for scalability and cost efficiency',
      'Implement security and compliance controls',
      'Execute pilot migration and validate procedures',
      'Migrate remaining applications in planned waves',
      'Optimize costs and monitor performance continuously',
    ],
    faq: [
      {
        question: 'Is cloud always cheaper than on-premises infrastructure?',
        answer: 'For variable workloads and small organizations, yes. For large, predictable workloads, on-premises can be cheaper. The best approach depends on your usage patterns.',
      },
      {
        question: 'What about data security in the cloud?',
        answer: 'Major cloud providers have excellent security. The issue is usually configuration—ensuring your resources are properly secured and encrypted. Security is a shared responsibility.',
      },
      {
        question: 'Can we use multiple cloud providers?',
        answer: 'Yes, most organizations do. Use the best tool for each job. Avoid excessive fragmentation—2-3 providers is reasonable; 5+ becomes hard to manage.',
      },
      {
        question: 'What happens if we want to leave the cloud?',
        answer: 'Moving off cloud is complex but possible. Design for portability—avoid platform-specific services where practical. Most cloud migrations are between clouds, not back to on-premises.',
      },
    ],
  },

  'network-infrastructure-guide': {
    title: 'Network Infrastructure Design Guide',
    subtitle: 'Engineering Reliable, Secure, High-Performance Networks',
    overview: 'Your network is the foundation of everything. This guide covers network design principles, security architecture, and optimization strategies to build networks that support business growth while protecting against threats.',
    keyBenefits: [
      { title: 'Reliability & Uptime', description: 'Redundancy and failover ensure continuous availability' },
      { title: 'Security', description: 'Layered defenses protect against internal and external threats' },
      { title: 'Performance', description: 'Proper design eliminates bottlenecks and ensures responsiveness' },
      { title: 'Scalability', description: 'Network grows with business needs without redesign' },
    ],
    sections: [
      {
        title: 'Network Architecture & Design',
        icon: <Shield className="w-6 h-6" />,
        content: [
          'Modern networks use layered architecture: the access layer (user connections), distribution layer (aggregation and switching), and core layer (backbone connectivity). This design enables scalability and redundancy.',
          'Redundancy ensures no single point of failure. Dual internet connections from different providers ensure connectivity even if one fails. Redundant switches and routers prevent equipment failure from causing outages.',
          'Network segmentation divides the network into isolated segments. This prevents a compromised segment from accessing the entire network. Guest networks, IoT devices, and production systems should be separated.',
        ],
      },
      {
        title: 'Security Implementation',
        icon: <AlertCircle className="w-6 h-6" />,
        content: [
          'Firewalls at the perimeter control inbound and outbound traffic. Next-generation firewalls add application awareness, threat detection, and VPN capabilities.',
          'Intrusion Prevention Systems detect and block attack traffic. These use signatures and behavioral analysis to identify threats in real-time.',
          'Network segmentation and Access Control Lists limit where users and devices can access. A guest shouldn\'t access production systems. An IoT device shouldn\'t access financial data.',
        ],
      },
      {
        title: 'Wireless & Remote Access',
        icon: <Users className="w-6 h-6" />,
        content: [
          'Modern organizations need wireless everywhere. WiFi 6 (802.11ax) provides speed and efficiency. Enterprise-grade access points with centralized management ensure security and performance.',
          'Remote access requirements have grown. VPNs encrypt remote connections. Zero-trust access verifies every connection regardless of location. Choose based on your security requirements.',
          'Guest networks isolate guests from production infrastructure. Captive portals provide registration and acceptable use policies. Guest networks should be separate from corporate networks.',
        ],
      },
    ],
    implementationSteps: [
      'Document your current network topology and usage patterns',
      'Identify bottlenecks and underutilized resources',
      'Design redundancy and failover mechanisms',
      'Plan network segmentation and security boundaries',
      'Implement WiFi infrastructure with coverage planning',
      'Configure firewalls and security appliances',
      'Establish monitoring and alerting for network health',
      'Document network architecture and maintain current diagrams',
    ],
    faq: [
      {
        question: 'How much network bandwidth do we need?',
        answer: 'Depends on your applications and user count. A rule of thumb: 10-25 Mbps per concurrent user, plus overhead for servers and backups. Audit your current usage to establish baseline.',
      },
      {
        question: 'Should we use managed network services?',
        answer: 'Managed services provide 24/7 monitoring, support, and updates. For most organizations, this is more cost-effective than hiring specialized network staff.',
      },
      {
        question: 'What about WiFi 6 vs. older WiFi standards?',
        answer: 'WiFi 6 is significantly faster, more efficient, and more secure. If your access points are 5+ years old, upgrading is worthwhile. New deployments should use WiFi 6.',
      },
      {
        question: 'How do we ensure network security without limiting productivity?',
        answer: 'Segment networks so security policies apply only where needed. Guest networks have different policies than production. Balance security with usability.',
      },
    ],
  },
};

export default function ServiceGuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? guides[slug] : null;

  if (!guide) {
    return (
      <div className="min-h-screen" style={{ background: 'white' }}>
        <Navbar />
        <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Guide not found</h1>
          <p className="text-slate-600 mb-6">This service guide is not available.</p>
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

      {/* Hero */}
      <header className="relative pt-32 pb-20 px-6" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full" style={{ background: '#39CCCC', filter: 'blur(100px)' }}></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-white">
          <Link to="/services" className="inline-flex items-center gap-1 text-sm mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
            ← Back to Services
          </Link>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">{guide.title}</h1>
          <p className="text-2xl mb-8 font-light" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {guide.subtitle}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-16">
        {/* Overview */}
        <section>
          <p className="text-lg text-slate-700 leading-relaxed mb-8">{guide.overview}</p>

          {/* Key Benefits Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {guide.keyBenefits.map((benefit, i) => (
              <div key={i} className="p-6 rounded-xl" style={{ background: 'rgba(57, 204, 204, 0.08)', border: '1px solid rgba(57, 204, 204, 0.2)' }}>
                <h3 className="font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Sections */}
        {guide.sections.map((section, idx) => (
          <section key={idx} className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div style={{ color: '#39CCCC' }}>{section.icon}</div>
              <h2 className="text-3xl font-bold text-slate-900">{section.title}</h2>
            </div>
            <div className="space-y-4">
              {section.content.map((para, i) => (
                <p key={i} className="text-slate-700 leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}

        {/* Implementation Steps */}
        <section className="py-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Implementation Roadmap</h2>
          <div className="space-y-3">
            {guide.implementationSteps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start p-4 rounded-lg" style={{ background: 'rgba(57, 204, 204, 0.05)' }}>
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm" style={{ background: '#39CCCC', color: 'white' }}>
                  {i + 1}
                </div>
                <p className="text-slate-700 leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {guide.faq.map((item, i) => (
              <details key={i} className="group border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-gray-300 transition-colors">
                <summary className="flex items-start gap-3 font-semibold text-slate-900">
                  <span className="flex-shrink-0 pt-1">
                    <ChevronDownIcon />
                  </span>
                  {item.question}
                </summary>
                <p className="text-slate-600 mt-4 ml-7 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-12">
          <div className="rounded-2xl p-12 md:p-16 text-center" style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', boxShadow: '0 20px 40px rgba(57, 204, 204, 0.15)' }}>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to implement these strategies?</h2>
            <p className="text-lg text-white max-w-2xl mx-auto mb-8" style={{ opacity: 0.95 }}>
              Our team of certified experts can help you develop and execute a customized implementation plan.
            </p>
            <Link
              to="/#contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              Schedule a Consultation <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-5 h-5 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}
