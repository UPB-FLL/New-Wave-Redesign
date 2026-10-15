import { Link } from 'react-router-dom';
import LegalPageLayout from '../components/legal/LegalPageLayout';
import { LEGAL_HEADING_CLASS, LEGAL_LINK_CLASS, LEGAL_SECTION_CLASS } from '../components/legal/LegalDocument';
import { SERVICE_DOCUMENTS, WEBSITE_POLICIES, type LegalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

function DocumentList({ documents }: { documents: readonly LegalDocument[] }) {
  return (
    <ul className="divide-y" style={{ borderColor: 'var(--nw-mist-gray)' }}>
      {documents.map((document) => (
        <li key={document.path} className="py-4 first:pt-0 last:pb-0">
          <Link to={document.path} className={`${LEGAL_LINK_CLASS} text-lg`}>
            {document.name}
          </Link>
          <p className="mt-1 text-[var(--nw-slate)]">{document.summary}</p>
          <p className="mt-1 text-sm text-[var(--nw-slate)]">Effective {document.effectiveDate}</p>
        </li>
      ))}
    </ul>
  );
}

export default function LegalHubPage() {
  usePageMeta(IT_PAGE_META['/legal']);

  return (
    <LegalPageLayout title="Legal" effectiveDate="October 15, 2026">
      <p>
        The current terms that govern the New Wave IT LLC website and the services New Wave IT
        provides, including those of its New Wave: Social Engineering division. A signed Order
        (a proposal, quote, order form, or statement of work) incorporates the service agreement
        documents below as they read on the day it is signed, unless the Order says otherwise.
        Each document carries its own effective date; earlier versions are available on request.
      </p>

      <section className={LEGAL_SECTION_CLASS} aria-labelledby="current-terms-and-conditions">
        <h2 id="current-terms-and-conditions" className={LEGAL_HEADING_CLASS}>Current Terms and Conditions</h2>
        <p>
          The service agreement set. The Master Services Agreement applies to every paid service; a
          Service Attachment adds the terms for each service line; the schedules define the services,
          the service level objectives, the third-party products involved, and how personal data is handled.
        </p>
        <DocumentList documents={SERVICE_DOCUMENTS} />
      </section>

      <section className={LEGAL_SECTION_CLASS} aria-labelledby="website-policies">
        <h2 id="website-policies" className={LEGAL_HEADING_CLASS}>Website Policies</h2>
        <p>These apply to everyone who uses the website or communicates with New Wave IT.</p>
        <DocumentList documents={WEBSITE_POLICIES} />
      </section>

      <section className={LEGAL_SECTION_CLASS} aria-labelledby="questions">
        <h2 id="questions" className={LEGAL_HEADING_CLASS}>Questions</h2>
        <p>
          For a signed copy of any document, an earlier version, or a question about how these terms
          apply to your Order, email{' '}
          <a className={LEGAL_LINK_CLASS} href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>.
        </p>
        <address className="not-italic">
          New Wave IT LLC<br />
          710 NW 5th Ave, Suite 1072<br />
          Fort Lauderdale, FL 33311
        </address>
      </section>
    </LegalPageLayout>
  );
}
