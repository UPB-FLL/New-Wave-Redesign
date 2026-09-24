// Title, subtitle, and overview for each /l/<slug> service guide — the fields
// its page metadata is built from. Kept free of JSX so vite.config.ts can read
// them at build time to prerender each guide's <head>; the guide page spreads
// these into its full content, so there is one copy of each.

import type { PageMetaOptions } from './pageMeta';

export interface ServiceGuideSummary {
  title: string;
  subtitle: string;
  overview: string;
}

export const SERVICE_GUIDE_SUMMARIES = {
  'cybersecurity-guide': {
    title: 'Complete Cybersecurity Guide',
    subtitle: 'Building Enterprise-Grade Security Defense',
    overview: 'Modern cybersecurity requires a multi-layered approach that goes far beyond simple password policies. This comprehensive guide walks you through building a security program that protects your organization from sophisticated threats while maintaining compliance with industry regulations.',
  },
  'it-support-guide': {
    title: 'IT Support Excellence Guide',
    subtitle: 'Delivering Responsive, Expert Technical Assistance',
    overview: 'Great IT support goes beyond quick fixes. This guide explains how to establish support that minimizes downtime, builds user confidence, and gives your team the tools they need to be productive.',
  },
  'it-repair-guide': {
    title: 'IT Repair & Upgrade Strategy Guide',
    subtitle: 'Extending Equipment Life and Optimizing Performance',
    overview: 'Equipment replacement represents a significant expense. Strategic repairs and upgrades can extend useful equipment life by years while improving performance. This guide covers the economics of repair vs. replacement.',
  },
  'managed-it-guide': {
    title: 'Managed IT Services Strategy Guide',
    subtitle: 'Transforming IT from Cost Center to Strategic Asset',
    overview: 'Managed IT Services represents a fundamental shift in how organizations approach technology. Instead of paying for support only when something breaks, managed services provide proactive oversight, strategic planning, and predictable costs.',
  },
  'cloud-solutions-guide': {
    title: 'Cloud Solutions Strategy Guide',
    subtitle: 'Modernizing Infrastructure with Cloud Technology',
    overview: 'Cloud computing isn\'t a single product—it\'s a set of platforms and services. This guide covers cloud architecture, migration strategy, and cost optimization to help you make informed cloud decisions.',
  },
  'network-infrastructure-guide': {
    title: 'Network Infrastructure Design Guide',
    subtitle: 'Engineering Reliable, Secure, High-Performance Networks',
    overview: 'Your network is the foundation of everything. This guide covers network design principles, security architecture, and optimization strategies to build networks that support business growth while protecting against threats.',
  },
} satisfies Record<string, ServiceGuideSummary>;

export type ServiceGuideSlug = keyof typeof SERVICE_GUIDE_SUMMARIES;

export const serviceGuidePath = (slug: string) => `/l/${slug}`;

/** Page metadata for a guide, identical at runtime and when prerendered. */
export function serviceGuideMeta(slug: string, guide: ServiceGuideSummary): Omit<PageMetaOptions, 'jsonLd'> {
  return {
    // The subtitle stays on the page; in the title it pushed every guide past what search results show.
    title: guide.title,
    description: guide.overview.slice(0, 155).replace(/\s+\S*$/, '') + '…',
    canonical: `https://www.newwaveitfl.com${serviceGuidePath(slug)}`,
    breadcrumbs: [
      { name: 'Services', path: '/services' },
      { name: guide.title, path: serviceGuidePath(slug) },
    ],
  };
}
