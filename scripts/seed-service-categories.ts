import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultServices = [
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

async function seedServiceCategories() {
  try {
    console.log('Seeding service categories...');

    const servicesJson = JSON.stringify(defaultServices);

    const { error } = await supabase
      .from('site_content')
      .upsert(
        {
          section: 'services-categories',
          key: 'services_list',
          value: servicesJson,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'section,key' }
      );

    if (error) {
      console.error('Error seeding service categories:', error);
      process.exit(1);
    }

    console.log('✓ Service categories seeded successfully');
    console.log(`Added ${defaultServices.length} service categories with comprehensive details`);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

seedServiceCategories();
