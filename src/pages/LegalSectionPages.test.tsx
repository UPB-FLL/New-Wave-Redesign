import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_LEGAL_DOCUMENTS, LEGAL_HUB_PATH, SERVICE_DOCUMENTS, WEBSITE_POLICIES } from '../lib/legalDocuments';
import { IT_PAGE_META, LEGAL_CRUMB } from '../lib/routeMeta';
import { useContent } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';
import LegalHubPage from './LegalHubPage';
import LegalCloudServicesAttachmentPage from './LegalCloudServicesAttachmentPage';
import LegalCybersecurityServicesAttachmentPage from './LegalCybersecurityServicesAttachmentPage';
import LegalDataProcessingAgreementPage from './LegalDataProcessingAgreementPage';
import LegalManagedItServicesAttachmentPage from './LegalManagedItServicesAttachmentPage';
import LegalMarketingServicesAttachmentPage from './LegalMarketingServicesAttachmentPage';
import LegalMasterServicesAgreementPage from './LegalMasterServicesAgreementPage';
import LegalProjectServicesAttachmentPage from './LegalProjectServicesAttachmentPage';
import LegalScheduleOfServicesPage from './LegalScheduleOfServicesPage';
import LegalScheduleOfThirdPartyServicesPage from './LegalScheduleOfThirdPartyServicesPage';
import LegalServiceLevelObjectivesPage from './LegalServiceLevelObjectivesPage';

vi.mock('../lib/usePageMeta', () => ({ usePageMeta: vi.fn() }));
vi.mock('../lib/useContent', () => ({ useContent: vi.fn() }));
vi.mock('../components/Navbar', () => ({ default: () => <nav aria-label="Primary">Navigation</nav> }));
vi.mock('../components/Footer', () => ({ default: () => <footer>Footer</footer> }));

const DOCUMENT_PAGES: Record<string, () => JSX.Element> = {
  '/legal/master-services-agreement': LegalMasterServicesAgreementPage,
  '/legal/managed-it-services-attachment': LegalManagedItServicesAttachmentPage,
  '/legal/cybersecurity-services-attachment': LegalCybersecurityServicesAttachmentPage,
  '/legal/cloud-services-attachment': LegalCloudServicesAttachmentPage,
  '/legal/project-services-attachment': LegalProjectServicesAttachmentPage,
  '/legal/marketing-services-attachment': LegalMarketingServicesAttachmentPage,
  '/legal/schedule-of-services': LegalScheduleOfServicesPage,
  '/legal/data-processing-agreement': LegalDataProcessingAgreementPage,
  '/legal/service-level-objectives': LegalServiceLevelObjectivesPage,
  '/legal/schedule-of-third-party-services': LegalScheduleOfThirdPartyServicesPage,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useContent).mockReturnValue({});
});

function renderPage(Page: () => JSX.Element) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>,
  );
}

describe('the legal document registry', () => {
  it('has a page, registry entry, rewrite, sitemap URL, and route for every service document', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const rewrites = (JSON.parse(readFileSync('vercel.json', 'utf8')) as { rewrites: { source: string }[] }).rewrites.map((r) => r.source);
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');
    [LEGAL_HUB_PATH, ...SERVICE_DOCUMENTS.map((d) => d.path)].forEach((p) => {
      expect(IT_PAGE_META, p).toHaveProperty(p);
      expect(rewrites, p).toContain(p);
      expect(sitemap, p).toContain(`<loc>https://www.newwaveitfl.com${p}</loc>`);
      expect(app, p).toContain(`<Route path="${p}" element={<`);
    });
    expect(Object.keys(DOCUMENT_PAGES).sort()).toEqual(SERVICE_DOCUMENTS.map((d) => d.path).sort());
  });

  it('nests every service document under the Legal crumb and keeps the hub at the top level', () => {
    SERVICE_DOCUMENTS.forEach((d) => expect(IT_PAGE_META[d.path as keyof typeof IT_PAGE_META].breadcrumbs?.[0]).toEqual(LEGAL_CRUMB));
    expect(IT_PAGE_META['/legal'].breadcrumbs).toEqual([LEGAL_CRUMB]);
  });

  it('lists the three website policies with their own paths and dates', () => {
    expect(WEBSITE_POLICIES.map((d) => d.path)).toEqual(['/terms-and-conditions', '/privacy-policy', '/cookie-policy']);
    ALL_LEGAL_DOCUMENTS.forEach((d) => expect(d.effectiveDate).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/));
  });
});

describe('LegalHubPage', () => {
  it('links every document in both groups and sets its own meta', () => {
    renderPage(LegalHubPage);
    expect(screen.getByRole('heading', { level: 1, name: 'Legal' })).toBeInTheDocument();
    const agreements = screen.getByRole('heading', { name: 'Current Terms and Conditions' }).closest('section')!;
    SERVICE_DOCUMENTS.forEach((d) => expect(within(agreements).getByRole('link', { name: d.name })).toHaveAttribute('href', d.path));
    const policies = screen.getByRole('heading', { name: 'Website Policies' }).closest('section')!;
    WEBSITE_POLICIES.forEach((d) => expect(within(policies).getByRole('link', { name: d.name })).toHaveAttribute('href', d.path));
    expect(vi.mocked(usePageMeta)).toHaveBeenCalledWith(IT_PAGE_META['/legal']);
  });
});

describe('service agreement documents', () => {
  it.each(SERVICE_DOCUMENTS.map((d) => [d.path, d] as const))('%s renders its title, date, place in the set, and contact', (docPath, doc) => {
    renderPage(DOCUMENT_PAGES[docPath]);
    expect(screen.getByRole('heading', { level: 1, name: doc.name })).toBeInTheDocument();
    expect(screen.getByText(`Effective date: ${doc.effectiveDate}`)).toBeInTheDocument();
    // Every document says where it sits and links back to the hub.
    expect(screen.getAllByRole('link', { name: 'Legal' })[0]).toHaveAttribute('href', LEGAL_HUB_PATH);
    if (docPath !== '/legal/master-services-agreement') {
      expect(screen.getAllByRole('link', { name: 'Master Services Agreement' })[0]).toHaveAttribute('href', '/legal/master-services-agreement');
    }
    expect(screen.getByText(/710 NW 5th Ave, Suite 1072/)).toBeInTheDocument();
    expect(vi.mocked(usePageMeta)).toHaveBeenCalledWith(IT_PAGE_META[docPath as keyof typeof IT_PAGE_META]);
    // Drafts for the owner's attorney: no placeholders left to fill in, and no promise of a result.
    expect(document.body.textContent).not.toMatch(/\[[A-Z ]+\]|TBD|lorem ipsum/i);
    // A document may say what is not guaranteed; it never promises a guarantee.
    expect(document.body.textContent).not.toMatch(/\b(New Wave IT|we) (will )?guarantees?\b(?! that)/i);
    expect(document.body.textContent).not.toMatch(/\bis guaranteed\b/i);
  });

  it('keeps the agreement consistent with the website: month to month by default, Florida venue, no sale of data', () => {
    renderPage(LegalMasterServicesAgreementPage);
    expect(screen.getByText(/run month to month/)).toBeInTheDocument();
    expect(screen.getByText(/Broward County, Florida/)).toBeInTheDocument();
    renderPage(LegalDataProcessingAgreementPage);
    expect(screen.getByText(/will not sell\s+Personal Data/)).toBeInTheDocument();
    renderPage(LegalServiceLevelObjectivesPage);
    expect(screen.getByRole('rowheader', { name: 'P1 Critical' })).toBeInTheDocument();
    expect(screen.getByText(/average response time\s+for P1 and P2 tickets under one hour/)).toBeInTheDocument();
  });
});
