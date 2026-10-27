import type { DivisionServiceContent } from '../types';
import { brandDevelopment } from './brand-development';
import { contactUsContent } from './contact-us';
import { appsContent, customersContent, divisionApps, divisionCustomers } from './customers';
import { digitalOversight } from './digital-oversight';
import { hubContent } from './hub';
import { integration } from './integration';
import { auditConnectors, auditContent, auditReports, auditSample } from './groundswell';
import { findGroundswellMetricGroup, groundswellMetricGroups, groundswellMetricsContent } from './groundswellMetrics';
import { headwayContent, headwayServices, headwaySetupItems } from './headway';
import { marketing } from './marketing';
import { socialMedia } from './social-media';
import { websiteDesign } from './website-design';

export { auditConnectors, auditContent, auditReports, auditSample };
export { findGroundswellMetricGroup, groundswellMetricGroups, groundswellMetricsContent };
export type { GroundswellMetric, GroundswellMetricGroup } from './groundswellMetrics';
export { appsContent, contactUsContent, customersContent, divisionApps, divisionCustomers, hubContent };
export { headwayContent, headwayServices, headwaySetupItems };

/** Display order for navigation, the hub's service grid, and the sitemap. */
export const divisionServices: readonly DivisionServiceContent[] = [
  socialMedia,
  brandDevelopment,
  websiteDesign,
  marketing,
  integration,
  digitalOversight,
];

export function findDivisionService(slug: string | undefined): DivisionServiceContent | undefined {
  return divisionServices.find((service) => service.slug === slug);
}

export const contactContent = {
  metaTitle: 'Book a discovery call | New Wave: Social Engineering',
  metaDescription:
    'Book a discovery call with New Wave: Social Engineering, the growth division of New Wave IT, about growing your sales with data, integrations, and ads.',
  keywords:
    'book a discovery call, small business growth marketing consultation, marketing audit for small business, paid advertising consultation, new wave it',
  kicker: 'Start with discovery',
  headline: 'Book a discovery call',
  summary:
    'Before we recommend anything, we’d like to understand the business: where you want to be in 12 months, how customers find and buy from you today, and what is in place to measure it.',
} as const;
