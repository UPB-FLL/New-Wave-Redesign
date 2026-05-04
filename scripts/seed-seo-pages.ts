import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultSeoPages = [
  {
    slug: 'cybersecurity-guide',
    title: 'Complete Cybersecurity Guide for Small & Medium Businesses',
    meta_description: 'Enterprise-grade cybersecurity solutions for businesses in Fort Lauderdale. Protect your business from threats with 24/7 monitoring and threat detection.',
    meta_keywords: 'cybersecurity, network security, threat detection, security compliance, Fort Lauderdale',
    canonical_url: 'https://www.newwaveitfl.com/l/cybersecurity-guide',
    og_image: 'https://images.unsplash.com/photo-1563986768609-322da13e493a?w=1200&h=630&fit=crop',
    hero_image: 'https://images.unsplash.com/photo-1563986768609-322da13e493a?w=1600&h=900&fit=crop',
    h1: 'Complete Cybersecurity Guide for South Florida Businesses',
    intro: 'Learn how to build a comprehensive defense strategy that protects your critical assets from evolving threats.',
    content: 'Cybersecurity is not just about installing software - it\'s about building a comprehensive defense strategy that protects your critical assets. This guide covers everything businesses need to know about protecting themselves in today\'s threat landscape.\n\nOur approach combines advanced threat detection, behavioral analysis, and 24/7 monitoring to identify and neutralize threats before they impact your business.',
    sections: [
      {
        heading: 'Why Cybersecurity Matters',
        body: 'Cyber threats are evolving faster than ever. From ransomware to phishing attacks, businesses face constant challenges. A single security breach can cost thousands in downtime, data loss, and recovery efforts.\n\nProactive security measures protect your customers, your data, and your reputation. An effective cybersecurity strategy identifies vulnerabilities before attackers exploit them.',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f70504504?w=800&h=600&fit=crop',
      },
      {
        heading: 'Key Security Pillars',
        body: 'Effective cybersecurity relies on multiple layers of defense. Each pillar works together to create comprehensive protection.\n\nThese include network security with firewalls and intrusion prevention, endpoint protection across all devices, identity and access management, continuous monitoring and threat detection, regular security assessments, and employee security training.',
      },
    ],
    faq: [
      {
        question: 'How much does cybersecurity cost?',
        answer: 'Costs vary based on your business size, infrastructure complexity, and security requirements. Small businesses might invest $500-2000/month, while larger enterprises spend significantly more. The cost of a breach far exceeds preventive security investment.',
      },
      {
        question: 'Is my small business a target?',
        answer: 'Yes. Small businesses are often targeted because they have fewer defenses than enterprises. Attackers see small businesses as easier targets with valuable data and customer information.',
      },
      {
        question: 'What is ransomware and why is it dangerous?',
        answer: 'Ransomware is malicious software that encrypts your files and demands payment for the decryption key. It\'s dangerous because it can shut down your entire operation and there\'s no guarantee paying will recover your data.',
      },
    ],
    images: [],
    competitors: [
      { name: 'Local IT Shop', location: 'Fort Lauderdale', strengths: 'Local presence', notes: 'Limited 24/7 support' },
      { name: 'National Provider', location: 'Multiple locations', strengths: 'Large team', notes: 'Less personalized service' },
    ],
    backlinks: [
      { url: 'https://www.nist.gov/cyberframework', anchor: 'NIST Cybersecurity Framework' },
      { url: 'https://www.cisa.gov/', anchor: 'CISA - Cybersecurity & Infrastructure Security Agency' },
    ],
    target_location: 'Fort Lauderdale, FL',
    target_keyword: 'cybersecurity services',
    published: true,
  },
  {
    slug: 'it-support-guide',
    title: 'IT Support Guide: How to Choose 24/7 IT Support',
    meta_description: 'Find the right 24/7 IT support for your business. Learn what to look for in managed IT support providers in Fort Lauderdale.',
    meta_keywords: 'IT support, 24/7 support, helpdesk, IT services, Fort Lauderdale',
    canonical_url: 'https://www.newwaveitfl.com/l/it-support-guide',
    og_image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=630&fit=crop',
    hero_image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&h=900&fit=crop',
    h1: 'The Complete Guide to 24/7 IT Support',
    intro: 'Real humans, real solutions. Learn how professional IT support keeps your business running smoothly.',
    content: 'When IT issues happen, they can bring your business to a standstill. That\'s why 24/7 IT support is essential. This guide explains what good IT support looks like and how to choose the right provider.\n\nOur certified technicians are available around the clock to troubleshoot problems, answer questions, and get your systems back online fast.',
    sections: [
      {
        heading: 'What Good IT Support Looks Like',
        body: 'Good IT support means your team can focus on their work while experts handle technical issues. Response times matter - critical issues should be addressed within minutes, not hours.\n\nThe best IT support is proactive, not reactive. They monitor your systems to prevent problems before they occur.',
        image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop',
      },
    ],
    faq: [
      {
        question: 'What\'s the difference between break-fix and managed IT support?',
        answer: 'Break-fix means you pay per incident when something breaks. Managed IT support is a monthly service that includes monitoring, maintenance, and support. Managed IT is usually more cost-effective because it prevents problems.',
      },
      {
        question: 'Do I need 24/7 support if my business is 9-5?',
        answer: 'It depends on your critical systems. Even 9-5 businesses benefit from after-hours support in case of emergencies. Many also appreciate knowing help is available if issues arise early morning or late evening.',
      },
    ],
    images: [],
    competitors: [
      { name: 'Local IT Consultant', location: 'Fort Lauderdale' },
      { name: 'National IT Company', location: 'Multiple locations' },
    ],
    backlinks: [
      { url: 'https://www.CompTIA.org', anchor: 'CompTIA - IT Certification Standards' },
    ],
    target_location: 'Fort Lauderdale, FL',
    target_keyword: 'IT support services',
    published: true,
  },
  {
    slug: 'it-repair-guide',
    title: 'IT Repair & Hardware Upgrades Guide',
    meta_description: 'Complete guide to IT hardware repair and upgrades. Fast, reliable repairs for businesses in Fort Lauderdale.',
    meta_keywords: 'IT repair, hardware repair, computer repair, upgrades, Fort Lauderdale',
    canonical_url: 'https://www.newwaveitfl.com/l/it-repair-guide',
    og_image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=630&fit=crop',
    hero_image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&h=900&fit=crop',
    h1: 'Hardware Repair & Upgrades for Businesses',
    intro: 'Fast, reliable repairs and strategic upgrades to keep your technology working smoothly.',
    content: 'Aging hardware and system failures cost money in lost productivity and data risk. Quick diagnosis and repair of hardware issues is critical to business continuity.',
    sections: [
      {
        heading: 'When to Repair vs Replace',
        body: 'Not every hardware failure means buying new equipment. Our technicians assess whether repair or replacement makes financial sense for your situation.',
      },
    ],
    faq: [
      {
        question: 'How long does hardware repair take?',
        answer: 'Simple repairs like hard drive replacement usually take 1-2 hours. Complex issues may require diagnostic time. We provide estimates upfront.',
      },
    ],
    images: [],
    competitors: [],
    backlinks: [],
    target_location: 'Fort Lauderdale, FL',
    target_keyword: 'hardware repair',
    published: true,
  },
  {
    slug: 'managed-it-guide',
    title: 'Managed IT Services: A Complete Guide',
    meta_description: 'Complete guide to managed IT services. Learn how managed IT helps businesses in Fort Lauderdale reduce costs and downtime.',
    meta_keywords: 'managed IT services, IT management, monitoring, maintenance, Fort Lauderdale',
    canonical_url: 'https://www.newwaveitfl.com/l/managed-it-guide',
    og_image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    hero_image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=900&fit=crop',
    h1: 'Managed IT Services: The Smart Choice for Growing Businesses',
    intro: 'Stop paying for IT only when things break. Learn how managed IT services improve reliability and reduce costs.',
    content: 'Managed IT Services is like having a complete IT department working for your business 24/7. This guide explains how managed services work and why they\'re a smart investment.',
    sections: [
      {
        heading: 'How Managed IT Services Work',
        body: 'Managed IT providers proactively monitor your systems, apply patches, plan upgrades, and provide 24/7 support. You get predictable costs and fewer problems.',
      },
    ],
    faq: [
      {
        question: 'What\'s included in managed IT services?',
        answer: 'Typical services include monitoring, patch management, backup management, security updates, helpdesk support, IT planning, and hardware support.',
      },
    ],
    images: [],
    competitors: [],
    backlinks: [],
    target_location: 'Fort Lauderdale, FL',
    target_keyword: 'managed IT services',
    published: true,
  },
  {
    slug: 'cloud-solutions-guide',
    title: 'Cloud Solutions for Business: Migration & Management',
    meta_description: 'Complete guide to cloud solutions and migration. Learn how businesses in Fort Lauderdale leverage cloud computing.',
    meta_keywords: 'cloud solutions, cloud migration, Microsoft 365, AWS, Azure, Fort Lauderdale',
    canonical_url: 'https://www.newwaveitfl.com/l/cloud-solutions-guide',
    og_image: 'https://images.unsplash.com/photo-1560264357-8d9766f55851?w=1200&h=630&fit=crop',
    hero_image: 'https://images.unsplash.com/photo-1560264357-8d9766f55851?w=1600&h=900&fit=crop',
    h1: 'Cloud Solutions Guide: Modernizing Your Infrastructure',
    intro: 'Modernize your infrastructure with scalable, secure cloud environments built for your needs.',
    content: 'Cloud computing offers flexibility, scalability, and cost efficiency. This guide explains cloud options and helps you plan a successful migration.',
    sections: [
      {
        heading: 'Cloud Benefits for Businesses',
        body: 'Cloud solutions provide automatic backups, disaster recovery, scalability, and reduced capital expenses. You pay only for what you use.',
      },
    ],
    faq: [
      {
        question: 'Is cloud secure?',
        answer: 'Major cloud providers use enterprise-grade security. Your data may be more secure in the cloud than on premises, if properly configured.',
      },
    ],
    images: [],
    competitors: [],
    backlinks: [],
    target_location: 'Fort Lauderdale, FL',
    target_keyword: 'cloud solutions',
    published: true,
  },
  {
    slug: 'network-infrastructure-guide',
    title: 'Network Infrastructure: Design & Optimization Guide',
    meta_description: 'Complete guide to network infrastructure design and optimization. Build reliable, high-performance networks in Fort Lauderdale.',
    meta_keywords: 'network infrastructure, WiFi, network design, VPN, firewalls, Fort Lauderdale',
    canonical_url: 'https://www.newwaveitfl.com/l/network-infrastructure-guide',
    og_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop',
    hero_image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=900&fit=crop',
    h1: 'Network Infrastructure: Building the Right Foundation',
    intro: 'Your network is the backbone of your business. Learn how to design and maintain networks for reliability, speed, and security.',
    content: 'A slow, unreliable network impacts productivity, security, and customer experience. A well-designed network is the foundation for growth.',
    sections: [
      {
        heading: 'Network Design Principles',
        body: 'Good network design considers current needs and future growth. It balances performance, security, cost, and reliability.',
      },
    ],
    faq: [
      {
        question: 'What speed should my network be?',
        answer: 'It depends on your needs. Most businesses need at least 100 Mbps. Larger organizations may need 1 Gbps or more.',
      },
    ],
    images: [],
    competitors: [],
    backlinks: [],
    target_location: 'Fort Lauderdale, FL',
    target_keyword: 'network infrastructure',
    published: true,
  },
];

async function seedSeoPages() {
  try {
    console.log('Seeding SEO pages...');

    for (const page of defaultSeoPages) {
      const { error } = await supabase
        .from('seo_pages')
        .upsert(
          {
            ...page,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'slug' }
        );

      if (error) {
        console.error(`Error seeding page "${page.slug}":`, error);
      } else {
        console.log(`✓ Seeded ${page.slug}`);
      }
    }

    console.log('✓ SEO pages seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

seedSeoPages();
