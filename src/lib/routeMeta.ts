// Page metadata for every static New Wave IT route: the one copy both the page
// (via usePageMeta) and the build-time prerender (vite.config.ts) read, so the
// raw HTML a crawler sees and the head the app sets after hydration always
// match. Pages keep their JSON-LD inline; it stays runtime-only.
//
// '/' is not prerendered: the homepage is served by the index.html shell
// itself, whose head HOME_PAGE_META must match (a test compares them). Routes
// built from CMS/database data (/service/:slug, /threat/:slug, /blog/:slug)
// stay client-rendered.
//
// Each entry's `crumb` names the page in its breadcrumb trail; pages under
// /service-category/ sit below Services (itBreadcrumbs).

import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, SITE_URL, type Crumb, type PageMetaOptions } from './pageMeta';
import { SERVICE_GUIDE_SUMMARIES, serviceGuideMeta, serviceGuidePath } from './serviceGuides';

type StaticPageMeta = Omit<PageMetaOptions, 'jsonLd'>;
type StaticPageEntry = Omit<StaticPageMeta, 'breadcrumbs'> & { crumb: string };

/** The homepage head: exactly what index.html declares, so hydration never changes it. */
export const HOME_PAGE_META: StaticPageMeta = {
  title: 'New Wave IT — 24/7 Managed IT, Cybersecurity & Cloud in Fort Lauderdale',
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  includeSiteName: false,
  canonical: `${SITE_URL}/`,
};

export const SERVICES_CRUMB: Crumb = { name: 'Services', path: '/services' };

/** A static page's trail below Home: service categories sit under Services. */
export function itBreadcrumbs(path: string, name: string): Crumb[] {
  return path.startsWith('/service-category/') ? [SERVICES_CRUMB, { name, path }] : [{ name, path }];
}

function withBreadcrumbs<T extends Record<string, StaticPageEntry>>(pages: T): { [K in keyof T]: StaticPageMeta } {
  return Object.fromEntries(
    Object.entries(pages).map(([path, { crumb, ...meta }]) => [path, { ...meta, breadcrumbs: itBreadcrumbs(path, crumb) }]),
  ) as unknown as { [K in keyof T]: StaticPageMeta };
}

export const IT_PAGE_META = withBreadcrumbs({
  '/services': {
    title: 'IT Services Fort Lauderdale: Managed IT, Security & Cloud',
    description: 'Fort Lauderdale IT company for cybersecurity, 24/7 live support, cloud migration, networks, hardware repair, and fully managed IT for South Florida businesses.',
    keywords: 'IT services Fort Lauderdale, IT company South Florida, cybersecurity, cloud migration, managed IT, network infrastructure, IT support South Florida, technology services Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/services',
    crumb: 'Services',
  },
  '/pricing': {
    title: 'Managed IT Pricing Fort Lauderdale — Flat-Rate Plans',
    description: 'Flat-rate IT service pricing for South Florida businesses. Build a custom quote in seconds, with no hidden fees and no long-term contracts.',
    keywords: 'IT services pricing Fort Lauderdale, managed IT cost South Florida, flat-rate IT services, MSP pricing, IT support cost, how much managed IT services cost',
    canonical: 'https://www.newwaveitfl.com/pricing',
    crumb: 'Pricing',
  },
  '/contact': {
    title: 'Contact New Wave IT — Free IT Assessment Fort Lauderdale',
    description: 'Get a free IT assessment from New Wave IT in Fort Lauderdale for managed IT, cybersecurity, and cloud. We reply within one business day, or call us 24/7.',
    keywords: 'contact IT company Fort Lauderdale, free IT assessment South Florida, IT consultation Fort Lauderdale, managed IT services quote, New Wave IT contact',
    canonical: 'https://www.newwaveitfl.com/contact',
    crumb: 'Contact',
  },
  '/why-us': {
    title: 'Why Choose New Wave IT — Trusted MSP in Fort Lauderdale',
    description: 'Flat-rate pricing, no long-term contracts, 24/7 monitoring, sub-1-hour average response. See why South Florida businesses choose New Wave IT.',
    keywords: 'best MSP Fort Lauderdale, why choose New Wave IT, IT provider comparison South Florida, flat-rate IT services',
    canonical: 'https://www.newwaveitfl.com/why-us',
    crumb: 'Why Us',
  },
  '/about': {
    title: 'About New Wave IT — Fort Lauderdale Managed IT Services',
    description: 'Meet New Wave IT: certified engineers, project managers, and technology advisors serving Fort Lauderdale and South Florida businesses since 2009.',
    keywords: 'about New Wave IT, IT company Fort Lauderdale, managed service provider South Florida, IT team Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/about',
    crumb: 'About',
  },
  '/support': {
    title: 'IT Support - Email, Customer Login & Live Chat',
    description: 'Reach New Wave IT support by email at support@newwaveitfl.com, sign in to see your SuperOps tickets, or start a live chat that texts an on-call technician.',
    keywords: 'IT support Fort Lauderdale, support ticket portal, SuperOps customer login, live IT chat, New Wave IT support',
    canonical: 'https://www.newwaveitfl.com/support',
    crumb: 'Support',
  },
  '/status': {
    title: 'Service Status - New Wave IT',
    description: 'Real-time status of critical services and ISPs. Monitor uptime for cloud services your business depends on.',
    canonical: 'https://www.newwaveitfl.com/status',
    crumb: 'Status',
  },
  '/cybersecurity': {
    title: 'Cyber Threat Center — Ransomware, Phishing & Defenses',
    description: 'Ransomware, phishing, and insider risk: the cyber threats facing South Florida businesses, and how New Wave IT detects, defends, and keeps you compliant.',
    keywords: 'cyber threats South Florida, ransomware protection, phishing defense, threat intelligence, security compliance, cybersecurity threat center',
    canonical: 'https://www.newwaveitfl.com/cybersecurity',
    crumb: 'Threat Center',
  },
  '/codenest': {
    title: 'CodeNest - Launch Your Coding Career',
    description: 'CodeNest is a coding education program with project-based courses, real-world mentorship, and a career-ready curriculum taught by industry professionals.',
    includeSiteName: false,
    canonical: 'https://www.newwaveitfl.com/codenest',
    crumb: 'CodeNest',
  },
  '/blog': {
    title: 'IT Support Blog Fort Lauderdale - MSP Guides',
    description: 'New Wave IT blog with managed IT services, cybersecurity, cloud, Microsoft 365, network infrastructure, and IT support guidance for Fort Lauderdale businesses.',
    keywords: 'Fort Lauderdale MSP blog, IT support blog Fort Lauderdale, managed IT services guide, cybersecurity tips South Florida, Microsoft 365 support Fort Lauderdale, cloud backup planning',
    canonical: 'https://www.newwaveitfl.com/blog',
    crumb: 'Blog',
  },
  '/service-category/cybersecurity': {
    title: 'Cybersecurity Services Fort Lauderdale — SOC & Compliance',
    description: 'Enterprise cybersecurity for South Florida businesses: 24/7 SOC monitoring, endpoint protection, SIEM, penetration testing, and HIPAA/SOC 2 compliance.',
    keywords: 'cybersecurity Fort Lauderdale, managed security services South Florida, threat detection Fort Lauderdale, SOC monitoring, SIEM, penetration testing South Florida, endpoint protection, HIPAA compliance IT, cybersecurity company Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/cybersecurity',
    crumb: 'Cybersecurity',
  },
  '/service-category/live-it-support': {
    title: '24/7 IT Support & Help Desk in Fort Lauderdale',
    description: 'Round-the-clock IT support for Fort Lauderdale businesses. Response times under 1 hour — phone, remote, and on-site. Real technicians, real fast. New Wave IT.',
    keywords: 'IT support Fort Lauderdale, 24/7 IT help desk South Florida, technical support Fort Lauderdale, managed help desk, remote IT support, on-site IT support South Florida, IT support company Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/live-it-support',
    crumb: '24/7 IT Support',
  },
  '/service-category/it-repair-upgrades': {
    title: 'IT Hardware Repair & Upgrades in Fort Lauderdale',
    description: 'Expert laptop, desktop, and server repair with data protection. Strategic hardware upgrades to extend equipment life and boost performance.',
    keywords: 'hardware repair, computer repair, laptop repair, server repair, hardware upgrades, SSD upgrade',
    canonical: 'https://www.newwaveitfl.com/service-category/it-repair-upgrades',
    crumb: 'IT Repair & Upgrades',
  },
  '/service-category/managed-it-services': {
    title: 'Managed IT Services Fort Lauderdale — MSP South Florida',
    description: 'Fully managed IT for Fort Lauderdale businesses: flat-rate pricing, 24/7 monitoring, patching, and backup & disaster recovery. No long-term contracts.',
    keywords: 'managed IT services Fort Lauderdale, MSP South Florida, IT outsourcing Fort Lauderdale, managed services provider Florida, proactive IT monitoring, flat-rate IT support, IT management South Florida, outsourced IT department',
    canonical: 'https://www.newwaveitfl.com/service-category/managed-it-services',
    crumb: 'Managed IT Services',
  },
  '/service-category/cloud-solutions': {
    title: 'Cloud Migration & Microsoft 365 in Fort Lauderdale',
    description: 'Cloud migration and management for Fort Lauderdale businesses. Azure, Microsoft 365, AWS, hybrid cloud strategy, and cost optimization from New Wave IT.',
    keywords: 'cloud migration Fort Lauderdale, cloud solutions South Florida, Microsoft 365 setup Fort Lauderdale, Azure migration, cloud consulting Fort Lauderdale, hybrid cloud South Florida, cloud services MSP',
    canonical: 'https://www.newwaveitfl.com/service-category/cloud-solutions',
    crumb: 'Cloud Solutions',
  },
  '/service-category/network-infrastructure': {
    title: 'Network Infrastructure & WiFi in Fort Lauderdale',
    description: 'Business network design, structured cabling, WiFi 6, firewalls, and VPN for Fort Lauderdale and South Florida. Fast, secure, and redundant.',
    keywords: 'network infrastructure Fort Lauderdale, business WiFi South Florida, structured cabling Fort Lauderdale, firewall installation, VPN setup, network design South Florida, network security Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/service-category/network-infrastructure',
    crumb: 'Network Infrastructure',
  },
  '/service-category/family-offices': {
    title: 'Family Office IT Services in South Florida',
    description: 'Secure IT infrastructure for family offices. Privacy-focused, compliant technology solutions for multi-generational wealth management and operations.',
    keywords: 'family office IT, wealth management technology, private network security, family enterprise IT',
    canonical: 'https://www.newwaveitfl.com/service-category/family-offices',
    crumb: 'Family Offices',
  },
  '/service-category/healthcare': {
    title: 'Healthcare IT & HIPAA Compliance in Fort Lauderdale',
    description: 'HIPAA-compliant IT for medical practices in Fort Lauderdale and South Florida: EHR integration, patient data security, telehealth support, and 24/7 monitoring.',
    keywords: 'healthcare IT Fort Lauderdale, HIPAA compliance South Florida, EHR support Fort Lauderdale, medical practice IT, HIPAA IT services, telehealth technology, healthcare cybersecurity Florida',
    canonical: 'https://www.newwaveitfl.com/service-category/healthcare',
    crumb: 'Healthcare IT',
  },
  '/service-category/luxury': {
    title: 'Luxury Property IT & Smart Home Tech, South Florida',
    description: 'Premium IT solutions for luxury properties, resorts, and high-end hospitality. Smart home automation, guest WiFi, and white-glove technical support.',
    keywords: 'luxury property IT, smart home automation, high-end WiFi, concierge technology, resort IT services',
    canonical: 'https://www.newwaveitfl.com/service-category/luxury',
    crumb: 'Luxury Properties',
  },
  '/service-category/cellular-das-and-public-safety': {
    title: 'Cellular DAS & Public Safety Coverage in South Florida',
    description: 'Distributed antenna systems for public safety agencies, emergency responders, and large venues: FirstNet integration and in-building coverage.',
    keywords: 'cellular DAS, public safety networks, FirstNet, in-building coverage, emergency communications, responder networks',
    canonical: 'https://www.newwaveitfl.com/service-category/cellular-das-and-public-safety',
    crumb: 'Cellular DAS & Public Safety',
  },
  '/privacy-policy': {
    title: 'Privacy Policy — New Wave IT',
    description: 'How New Wave IT LLC collects, uses, discloses, and protects personal information.',
    canonical: 'https://www.newwaveitfl.com/privacy-policy',
    crumb: 'Privacy Policy',
  },
  '/terms-and-conditions': {
    title: 'Terms and Conditions — New Wave IT',
    description: 'Terms governing the New Wave IT website and IT services provided by New Wave IT LLC.',
    canonical: 'https://www.newwaveitfl.com/terms-and-conditions',
    crumb: 'Terms and Conditions',
  },
  '/cookie-policy': {
    title: 'Cookie Policy — New Wave IT',
    description: 'How New Wave IT uses cookies, storage, analytics, and embedded technologies on its website.',
    canonical: 'https://www.newwaveitfl.com/cookie-policy',
    crumb: 'Cookie Policy',
  },
} satisfies Record<string, StaticPageEntry>);

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
