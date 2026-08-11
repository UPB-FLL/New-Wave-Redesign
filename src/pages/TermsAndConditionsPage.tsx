import { Link } from 'react-router-dom';
import LegalPageLayout from '../components/legal/LegalPageLayout';
import { usePageMeta } from '../lib/usePageMeta';

const SECTION_CLASS = 'space-y-3';
const HEADING_CLASS = 'text-2xl font-semibold tracking-tight text-slate-900';
const LIST_CLASS = 'list-disc space-y-2 pl-6';
const LINK_CLASS = 'font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900';

export default function TermsAndConditionsPage() {
  usePageMeta({
    title: 'Terms and Conditions — New Wave IT',
    description: 'Terms governing the New Wave IT website and IT services provided by New Wave IT LLC.',
    canonical: 'https://www.newwaveitfl.com/terms-and-conditions',
  });

  return (
    <LegalPageLayout title="Terms and Conditions" effectiveDate="August 11, 2026">
      <section className={SECTION_CLASS} aria-labelledby="agreement-to-these-terms">
        <h2 id="agreement-to-these-terms" className={HEADING_CLASS}>Agreement to These Terms</h2>
        <p>
          These Terms and Conditions ("Terms") are an agreement between you and New Wave IT LLC
          ("New Wave IT," "we," "us," or "our") governing your access to and use of our United
          States website and our IT services. By accessing the website, submitting a form, or
          requesting or receiving services, you accept these Terms.
        </p>
        <p>
          You must have the legal capacity to enter into these Terms. If you act for a business or
          other organization, you represent that you have authority to bind that organization.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="website-information-and-permitted-use">
        <h2 id="website-information-and-permitted-use" className={HEADING_CLASS}>Website Information and Permitted Use</h2>
        <p>
          Website content is provided for general information and may be corrected, updated, or
          removed without notice. Subject to these Terms, we grant you a limited, revocable,
          nonexclusive license to use the website for your personal or internal business purposes.
        </p>
        <p>You may not:</p>
        <ul className={LIST_CLASS}>
          <li>interfere with the website, its networks, or another person's use of them;</li>
          <li>scrape, crawl, or automate access in a way that burdens or disrupts our systems;</li>
          <li>introduce malware, harmful code, or destructive content;</li>
          <li>impersonate another person or misrepresent your identity or authority;</li>
          <li>use the website for an unlawful purpose; or</li>
          <li>test or probe security without our prior written authorization.</li>
        </ul>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="quotes-and-service-requests">
        <h2 id="quotes-and-service-requests" className={HEADING_CLASS}>Quotes and Service Requests</h2>
        <p>
          A form submission, request for service, or estimate displayed or discussed through the
          website is an invitation to discuss possible services. It is not a binding offer,
          acceptance, commitment to perform, or guarantee of availability, scope, timing, or price.
          A service commitment is formed only as stated in the applicable written service document.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="paid-services-and-service-agreements">
        <h2 id="paid-services-and-service-agreements" className={HEADING_CLASS}>Paid Services and Service Agreements</h2>
        <p>
          Paid services may be governed by a master services agreement (MSA), statement of work
          (SOW), proposal, order form, invoice, or another written service document. If a signed
          service agreement conflicts with these Terms, the signed service agreement will control
          to the extent of the conflict. These Terms fill gaps only where a controlling service
          document does not address the subject.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="fees-invoices-and-taxes">
        <h2 id="fees-invoices-and-taxes" className={HEADING_CLASS}>Fees, Invoices, and Taxes</h2>
        <p>
          Customers must pay the amounts stated in the controlling service documents and invoices,
          together with applicable taxes for which the customer is responsible. Billing, payment,
          credit, refund, and cancellation matters are governed by those documents and applicable law.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="customer-responsibilities">
        <h2 id="customer-responsibilities" className={HEADING_CLASS}>Customer Responsibilities</h2>
        <p>To allow us to perform agreed services, the customer is responsible for:</p>
        <ul className={LIST_CLASS}>
          <li>providing timely access to systems, facilities, personnel, accounts, and information;</li>
          <li>providing accurate and complete information and keeping it reasonably current;</li>
          <li>obtaining required licenses, permissions, notices, and consents;</li>
          <li>designating contacts authorized to provide instructions and approvals;</li>
          <li>maintaining appropriate backups unless a controlling service document assigns that responsibility to us;</li>
          <li>cooperating with reasonable requests related to the services; and</li>
          <li>promptly notifying us of known security, safety, legal, or operational risks relevant to our work.</li>
        </ul>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="third-party-products-and-services">
        <h2 id="third-party-products-and-services" className={HEADING_CLASS}>Third-Party Products and Services</h2>
        <p>
          Third-party hardware, software, platforms, telecommunications, cloud services, and other
          vendor offerings may be subject to the vendor's terms, licensing, availability, price
          changes, outages, and data practices. New Wave IT is not the vendor of a third-party
          product or service unless a controlling service document expressly states otherwise.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="security-and-backups">
        <h2 id="security-and-backups" className={HEADING_CLASS}>Security and Backups</h2>
        <p>
          We use reasonable care in performing agreed services, but no system, security measure,
          transmission, or backup is invulnerable. We do not guarantee prevention of every security
          incident, outage, loss, or attack. The scope and responsibilities for any contracted
          security, monitoring, disaster-recovery, or backup service are controlled by the applicable
          service documents.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="confidentiality">
        <h2 id="confidentiality" className={HEADING_CLASS}>Confidentiality</h2>
        <p>
          Each party will use reasonable care to protect the other's nonpublic business information
          and will use it only for the relationship, subject to any controlling service agreement.
          Confidentiality obligations do not cover information that is lawfully disclosed, already
          and independently known without a duty of confidentiality, independently developed, or
          publicly available through no breach. A party may disclose information when required by law.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="intellectual-property">
        <h2 id="intellectual-property" className={HEADING_CLASS}>Intellectual Property</h2>
        <p>
          New Wave IT and its licensors retain ownership of the website, its design and content, and
          New Wave IT technology and materials, except as a controlling service document expressly
          provides. Customers retain ownership of their data. Third parties retain ownership of
          their products, services, and materials. You may provide feedback, and we may use it without
          restriction or compensation, provided we do not identify you as its source without permission.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="suspension-and-termination">
        <h2 id="suspension-and-termination" className={HEADING_CLASS}>Suspension and Termination</h2>
        <p>
          We may suspend access or services when reasonably necessary to address a security risk,
          unlawful use, a material breach, or nonpayment where suspension is authorized by the
          governing service documents. Controlling service documents govern termination, data return,
          transition assistance, and any continuing obligations for paid services.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="disclaimers">
        <h2 id="disclaimers" className={HEADING_CLASS}>Disclaimers</h2>
        <p>
          The website is provided "as is" and "as available." Professional IT services are limited
          to the scope agreed in the controlling service documents. To the maximum extent permitted
          by law, we disclaim implied warranties, including merchantability, fitness for a particular
          purpose, title, and noninfringement. This disclaimer does not limit an express written promise
          in a controlling service document or a warranty that applicable law does not permit us to exclude.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="limitation-of-liability">
        <h2 id="limitation-of-liability" className={HEADING_CLASS}>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, New Wave IT will not be liable for indirect, special,
          incidental, consequential, or exemplary damages, or for lost profits, lost revenue, lost data,
          or business interruption, arising from or related to the website, services, or these Terms.
        </p>
        <p>
          Except where prohibited by law or where a controlling service agreement provides otherwise,
          New Wave IT's aggregate liability arising from affected services will not exceed the fees the
          customer paid to New Wave IT for those affected services during the six months immediately
          before the event giving rise to the claim. For a claim based only on use of the website, the
          aggregate limit is $100.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="indemnification">
        <h2 id="indemnification" className={HEADING_CLASS}>Indemnification</h2>
        <p>
          You will defend, indemnify, and hold harmless New Wave IT and its personnel from third-party
          claims, damages, and reasonable costs arising from your unlawful misuse of the website or
          services, content or data you supply that infringes another person's rights, or your material
          breach of these Terms. This obligation is subject to prompt notice of the claim and your
          reasonable control of the defense and settlement, with our reasonable cooperation. You may
          not settle a claim in a way that admits fault or imposes an obligation on us without our consent.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="privacy-and-electronic-communications">
        <h2 id="privacy-and-electronic-communications" className={HEADING_CLASS}>Privacy and Electronic Communications</h2>
        <p>
          Our <Link className={LINK_CLASS} to="/privacy-policy">Privacy Policy</Link> and{' '}
          <Link className={LINK_CLASS} to="/cookie-policy">Cookie Policy</Link> are incorporated into
          these Terms and explain how we handle information and related technologies. You agree that
          we may send operational communications about requests, accounts, security, projects, invoices,
          and services electronically. We send marketing email or text messages only as permitted by law
          and, where required, with consent; applicable opt-out instructions remain available.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="governing-law-and-venue">
        <h2 id="governing-law-and-venue" className={HEADING_CLASS}>Governing Law and Venue</h2>
        <p>
          Florida law governs these Terms without regard to its conflict-of-laws rules. Subject to any
          controlling service agreement and applicable law, the state and federal courts serving
          Broward County, Florida have exclusive jurisdiction and venue over disputes arising from or
          relating to these Terms or the website.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="changes-to-these-terms">
        <h2 id="changes-to-these-terms" className={HEADING_CLASS}>Changes to These Terms</h2>
        <p>
          We may revise these Terms by posting the updated version with a revised effective date.
          Material changes apply prospectively unless applicable law or a controlling agreement requires
          otherwise. Your continued use after an updated version takes effect constitutes acceptance of
          that version where permitted by law.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="general-terms">
        <h2 id="general-terms" className={HEADING_CLASS}>General Terms</h2>
        <p>
          If a provision is unenforceable, it will be adjusted only as necessary and the remaining
          provisions will remain effective. A failure to enforce a provision is not a waiver. Assignment
          is subject to applicable law and any controlling service document. Neither party is responsible
          for delay caused by events beyond its reasonable control, except for obligations that cannot be
          excused by law or agreement. Headings are for convenience only.
        </p>
        <p>
          These Terms, the Privacy Policy, the Cookie Policy, and the applicable service documents form
          the entire agreement for their respective subjects. For paid services, controlling signed
          service documents have priority over these Terms; these Terms then apply to gaps, followed by
          the incorporated policies for their stated subjects.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="contact-us">
        <h2 id="contact-us" className={HEADING_CLASS}>Contact Us</h2>
        <address className="not-italic">
          <span>New Wave IT <span>LLC</span></span><br />
          710 NW 5th Ave, Suite 1072<br />
          Fort Lauderdale, FL 33311<br />
          <a className={LINK_CLASS} href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>
        </address>
      </section>
    </LegalPageLayout>
  );
}
