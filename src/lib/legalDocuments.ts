/**
 * The New Wave IT legal document set: the website policies and the service
 * agreement documents that a signed Order incorporates. The /legal hub, the
 * footer, the sitemap, and the tests all read this list, so a document is
 * added in one place (plus its page, route, rewrite, and IT_PAGE_META entry;
 * the tests fail until they agree).
 */

export const LEGAL_HUB_PATH = '/legal';

/** Every service agreement document carries this effective date until it is revised. */
export const SERVICE_DOCUMENTS_EFFECTIVE = 'October 15, 2026';

export interface LegalDocument {
  path: string;
  /** The document's full name, used as its H1 and link text. */
  name: string;
  /** One sentence for the hub listing. */
  summary: string;
  effectiveDate: string;
}

/** Policies that govern the website and every relationship with New Wave IT. */
export const WEBSITE_POLICIES: readonly LegalDocument[] = [
  {
    path: '/terms-and-conditions',
    name: 'Terms and Conditions',
    summary: 'The terms for using the website and for IT services where no signed agreement governs.',
    effectiveDate: 'August 11, 2026',
  },
  {
    path: '/privacy-policy',
    name: 'Privacy Policy',
    summary: 'What personal information New Wave IT collects, how it is used and disclosed, and your choices.',
    effectiveDate: 'October 15, 2026',
  },
  {
    path: '/cookie-policy',
    name: 'Cookie Policy',
    summary: 'The cookies, browser storage, analytics, and third-party content the website uses, from a live scan.',
    effectiveDate: 'October 15, 2026',
  },
];

/** The agreement set a signed Order incorporates, in order of precedence after the Order itself. */
export const SERVICE_DOCUMENTS: readonly LegalDocument[] = [
  {
    path: '/legal/master-services-agreement',
    name: 'Master Services Agreement',
    summary: 'The base agreement for every paid service: Orders, fees, confidentiality, warranties, liability, term, and termination.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/managed-it-services-attachment',
    name: 'Service Attachment for Managed IT Services',
    summary: 'Scope, inclusions, and responsibilities for managed IT and 24/7 live support plans.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/cybersecurity-services-attachment',
    name: 'Service Attachment for Cybersecurity Services',
    summary: 'Terms for managed security, monitoring, awareness training, compliance assistance, and authorized security testing.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/cloud-services-attachment',
    name: 'Service Attachment for Cloud Services',
    summary: 'Terms for cloud migration, administration, backup, and subscriptions New Wave IT provisions on your behalf.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/project-services-attachment',
    name: 'Service Attachment for Projects, Network Infrastructure, and Repairs',
    summary: 'Terms for statements of work: cabling, networks, cellular DAS and public-safety systems, installations, and equipment repair.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/marketing-services-attachment',
    name: 'Service Attachment for Marketing and Digital Services',
    summary: 'Terms for New Wave: Social Engineering engagements: social media, brand, website design, marketing, integration, and digital oversight.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/schedule-of-services',
    name: 'Schedule of Services',
    summary: 'Definitions of each service line and the standard terms, hours, and units an Order refers to.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/data-processing-agreement',
    name: 'Data Processing Agreement',
    summary: 'How New Wave IT handles personal data on your behalf: instructions, security, subprocessors, incidents, and deletion.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/service-level-objectives',
    name: 'Service Level Objectives',
    summary: 'Priority definitions, response targets, hours of coverage, maintenance windows, and what the objectives do not cover.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
  {
    path: '/legal/schedule-of-third-party-services',
    name: 'Schedule of Third-Party Services',
    summary: 'The third-party platforms, subscriptions, and tools New Wave IT uses or provisions, and whose terms apply to them.',
    effectiveDate: SERVICE_DOCUMENTS_EFFECTIVE,
  },
];

export const ALL_LEGAL_DOCUMENTS: readonly LegalDocument[] = [...WEBSITE_POLICIES, ...SERVICE_DOCUMENTS];

export function legalDocument(path: string): LegalDocument {
  const document = ALL_LEGAL_DOCUMENTS.find((entry) => entry.path === path);
  if (!document) throw new Error(`Unknown legal document: ${path}`);
  return document;
}
