// Page metadata for every static New Wave IT route: the one copy both the page
// (via usePageMeta) and the build-time prerender (vite.config.ts) read, so the
// raw HTML a crawler sees and the head the app sets after hydration always
// match. Pages keep their JSON-LD inline; it stays runtime-only.
//
// '/' is deliberately absent: the homepage is served by the untouched
// index.html shell. Routes built from CMS/database data (/service/:slug,
// /threat/:slug, /blog/:slug) stay client-rendered.

import type { PageMetaOptions } from './pageMeta';
import { SERVICE_GUIDE_SUMMARIES, serviceGuideMeta, serviceGuidePath } from './serviceGuides';

type StaticPageMeta = Omit<PageMetaOptions, 'jsonLd'>;

export const IT_PAGE_META = {
  '/services': {
    title: 'IT Services Fort Lauderdale — Cybersecurity, Cloud & Managed IT',
    description: 'Full-service IT company in Fort Lauderdale: cybersecurity, 24/7 live support, cloud migration, network infrastructure, hardware repair, and fully managed IT for South Florida businesses.',
    keywords: 'IT services Fort Lauderdale, IT company South Florida, cybersecurity, cloud migration, managed IT, network infrastructure, IT support South Florida, technology services Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/services',
  },
  '/pricing': {
    title: 'IT Services Pricing Fort Lauderdale — Transparent Flat-Rate Plans',
    description: 'Transparent, flat-rate IT service pricing for South Florida businesses. Build a custom quote in seconds — no hidden fees, no long-term contracts. Get your estimate from New Wave IT.',
    keywords: 'IT services pricing Fort Lauderdale, managed IT cost South Florida, flat-rate IT services, MSP pricing, IT support cost, how much managed IT services cost',
    canonical: 'https://www.newwaveitfl.com/pricing',
  },
  '/contact': {
    title: 'Contact New Wave IT — Free IT Assessment Fort Lauderdale',
    description: 'Get a free IT assessment from New Wave IT in Fort Lauderdale. Contact us for managed IT, cybersecurity, cloud, and support. Response within one business day — or call us 24/7.',
    keywords: 'contact IT company Fort Lauderdale, free IT assessment South Florida, IT consultation Fort Lauderdale, managed IT services quote, New Wave IT contact',
    canonical: 'https://www.newwaveitfl.com/contact',
  },
  '/why-us': {
    title: 'Why Choose New Wave IT — Trusted MSP in Fort Lauderdale',
    description: 'Flat-rate pricing, no long-term contracts, 24/7 monitoring, sub-1-hour average response. See why South Florida businesses choose New Wave IT.',
    keywords: 'best MSP Fort Lauderdale, why choose New Wave IT, IT provider comparison South Florida, flat-rate IT services',
    canonical: 'https://www.newwaveitfl.com/why-us',
  },
  '/about': {
    title: 'About New Wave IT — Fort Lauderdale Managed IT Services',
    description: 'Meet New Wave IT: certified engineers, project managers, and technology advisors serving Fort Lauderdale and South Florida businesses since 2009.',
    keywords: 'about New Wave IT, IT company Fort Lauderdale, managed service provider South Florida, IT team Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/about',
  },
  '/support': {
    title: 'IT Support - Email, Customer Login & Live Chat',
    description: 'Reach New Wave IT support three ways: email support@newwaveitfl.com, sign in to view your SuperOps tickets, or start a live chat that texts an on-call technician.',
    keywords: 'IT support Fort Lauderdale, support ticket portal, SuperOps customer login, live IT chat, New Wave IT support',
    canonical: 'https://www.newwaveitfl.com/support',
  },
  '/status': {
    title: 'Service Status - New Wave IT',
    description: 'Real-time status of critical services and ISPs. Monitor uptime for cloud services your business depends on.',
    canonical: 'https://www.newwaveitfl.com/status',
  },
  '/cybersecurity': {
    title: 'Cybersecurity Threat Center — Attack Types, Defenses & Compliance',
    description: 'Explore the cyber threats targeting South Florida businesses — ransomware, phishing, insider risk — and how New Wave IT detects, defends, and keeps you compliant.',
    keywords: 'cyber threats South Florida, ransomware protection, phishing defense, threat intelligence, security compliance, cybersecurity threat center',
    canonical: 'https://www.newwaveitfl.com/cybersecurity',
  },
  '/codenest': {
    title: 'CodeNest - Launch Your Coding Career',
    description: 'CodeNest is a coding education program with project-based courses, real-world mentorship, and a career-ready curriculum taught by industry professionals.',
    includeSiteName: false,
    canonical: 'https://www.newwaveitfl.com/codenest',
  },
  '/blog': {
    title: 'IT Support Blog Fort Lauderdale - MSP Guides',
    description: 'New Wave IT blog with managed IT services, cybersecurity, cloud, Microsoft 365, network infrastructure, and IT support guidance for Fort Lauderdale businesses.',
    keywords: 'Fort Lauderdale MSP blog, IT support blog Fort Lauderdale, managed IT services guide, cybersecurity tips South Florida, Microsoft 365 support Fort Lauderdale, cloud backup planning',
    canonical: 'https://www.newwaveitfl.com/blog',
  },
  '/service-category/cybersecurity': {
    title: 'Cybersecurity Services Fort Lauderdale — Threat Protection & Compliance',
    description: 'Enterprise cybersecurity for South Florida businesses: 24/7 SOC monitoring, endpoint protection, SIEM, penetration testing, and HIPAA/SOC 2 compliance. Call New Wave IT today.',
    keywords: 'cybersecurity Fort Lauderdale, managed security services South Florida, threat detection Fort Lauderdale, SOC monitoring, SIEM, penetration testing South Florida, endpoint protection, HIPAA compliance IT, cybersecurity company Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/cybersecurity',
  },
  '/service-category/live-it-support': {
    title: '24/7 IT Support Fort Lauderdale — Live Help Desk South Florida',
    description: 'Round-the-clock IT support for Fort Lauderdale businesses. Response times under 1 hour — phone, remote, and on-site. Real technicians, real fast. New Wave IT.',
    keywords: 'IT support Fort Lauderdale, 24/7 IT help desk South Florida, technical support Fort Lauderdale, managed help desk, remote IT support, on-site IT support South Florida, IT support company Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/live-it-support',
  },
  '/service-category/it-repair-upgrades': {
    title: 'IT Hardware Repair & Upgrades | New Wave IT',
    description: 'Expert laptop, desktop, and server repair with data protection. Strategic hardware upgrades to extend equipment life and boost performance.',
    keywords: 'hardware repair, computer repair, laptop repair, server repair, hardware upgrades, SSD upgrade',
    canonical: 'https://www.newwaveitfl.com/service-category/it-repair-upgrades',
  },
  '/service-category/managed-it-services': {
    title: 'Managed IT Services Fort Lauderdale — MSP South Florida',
    description: 'Fully managed IT services for Fort Lauderdale and South Florida businesses. Flat-rate pricing, 24/7 monitoring, patch management, backup & disaster recovery. No long-term contracts.',
    keywords: 'managed IT services Fort Lauderdale, MSP South Florida, IT outsourcing Fort Lauderdale, managed services provider Florida, proactive IT monitoring, flat-rate IT support, IT management South Florida, outsourced IT department',
    canonical: 'https://www.newwaveitfl.com/service-category/managed-it-services',
  },
  '/service-category/cloud-solutions': {
    title: 'Cloud Solutions & Migration Fort Lauderdale — Azure, Microsoft 365',
    description: 'Cloud migration and management for Fort Lauderdale businesses. Azure, Microsoft 365, AWS, hybrid cloud strategy, and cost optimization from New Wave IT.',
    keywords: 'cloud migration Fort Lauderdale, cloud solutions South Florida, Microsoft 365 setup Fort Lauderdale, Azure migration, cloud consulting Fort Lauderdale, hybrid cloud South Florida, cloud services MSP',
    canonical: 'https://www.newwaveitfl.com/service-category/cloud-solutions',
  },
  '/service-category/network-infrastructure': {
    title: 'Network Infrastructure Fort Lauderdale — WiFi, Cabling & Firewalls',
    description: 'Business network design, structured cabling, WiFi 6, firewall deployment, and VPN for Fort Lauderdale and South Florida. Fast, secure, and redundant — built by New Wave IT.',
    keywords: 'network infrastructure Fort Lauderdale, business WiFi South Florida, structured cabling Fort Lauderdale, firewall installation, VPN setup, network design South Florida, network security Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/network-infrastructure',
  },
  '/service-category/family-offices': {
    title: 'Family Office IT Services | Secure Wealth Management Technology',
    description: 'Secure IT infrastructure for family offices. Privacy-focused, compliant technology solutions for multi-generational wealth management and operations.',
    keywords: 'family office IT, wealth management technology, private network security, family enterprise IT',
    canonical: 'https://www.newwaveitfl.com/service-category/family-offices',
  },
  '/service-category/healthcare': {
    title: 'Healthcare IT Services Fort Lauderdale — HIPAA Compliance & EHR',
    description: 'HIPAA-compliant IT services for medical practices in Fort Lauderdale and South Florida. EHR integration, patient data security, telehealth support, and 24/7 monitoring.',
    keywords: 'healthcare IT Fort Lauderdale, HIPAA compliance South Florida, EHR support Fort Lauderdale, medical practice IT, HIPAA IT services, telehealth technology, healthcare cybersecurity Florida',
    canonical: 'https://www.newwaveitfl.com/service-category/healthcare',
  },
  '/service-category/luxury': {
    title: 'Luxury Property IT Services | High-End Smart Home & Automation',
    description: 'Premium IT solutions for luxury properties, resorts, and high-end hospitality. Smart home automation, guest WiFi, and white-glove technical support.',
    keywords: 'luxury property IT, smart home automation, high-end WiFi, concierge technology, resort IT services',
    canonical: 'https://www.newwaveitfl.com/service-category/luxury',
  },
  '/service-category/cellular-das-and-public-safety': {
    title: 'Cellular DAS & Public Safety Communications | FirstNet Solutions',
    description: 'Distributed antenna systems for emergency responders, public safety agencies, and large venues. FirstNet integration, in-building coverage, and critical communications.',
    keywords: 'cellular DAS, public safety networks, FirstNet, in-building coverage, emergency communications, responder networks',
    canonical: 'https://www.newwaveitfl.com/service-category/cellular-das-and-public-safety',
  },
  '/privacy-policy': {
    title: 'Privacy Policy — New Wave IT',
    description: 'How New Wave IT LLC collects, uses, discloses, and protects personal information.',
    canonical: 'https://www.newwaveitfl.com/privacy-policy',
  },
  '/terms-and-conditions': {
    title: 'Terms and Conditions — New Wave IT',
    description: 'Terms governing the New Wave IT website and IT services provided by New Wave IT LLC.',
    canonical: 'https://www.newwaveitfl.com/terms-and-conditions',
  },
  '/cookie-policy': {
    title: 'Cookie Policy — New Wave IT',
    description: 'How New Wave IT uses cookies, storage, analytics, and embedded technologies on its website.',
    canonical: 'https://www.newwaveitfl.com/cookie-policy',
  },
} satisfies Record<string, StaticPageMeta>;

export type ItPagePath = keyof typeof IT_PAGE_META;

export interface PrerenderedRoute {
  path: string;
  meta: StaticPageMeta;
}

/** Every New Wave IT URL whose <head> is prerendered at build time. */
export function prerenderedItRoutes(): PrerenderedRoute[] {
  return [
    ...Object.entries(IT_PAGE_META).map(([path, meta]) => ({ path, meta })),
    ...Object.entries(SERVICE_GUIDE_SUMMARIES).map(([slug, guide]) => ({
      path: serviceGuidePath(slug),
      meta: serviceGuideMeta(slug, guide),
    })),
  ];
}
