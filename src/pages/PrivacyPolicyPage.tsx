import { Link } from 'react-router-dom';
import LegalPageLayout from '../components/legal/LegalPageLayout';
import { usePageMeta } from '../lib/usePageMeta';

const SECTION_CLASS = 'space-y-3';
const HEADING_CLASS = 'text-2xl font-semibold tracking-tight text-slate-900';
const LIST_CLASS = 'list-disc space-y-2 pl-6';
const LINK_CLASS = 'font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900';

export default function PrivacyPolicyPage() {
  usePageMeta({
    title: 'Privacy Policy — New Wave IT',
    description: 'How New Wave IT LLC collects, uses, discloses, and protects personal information.',
    canonical: 'https://www.newwaveitfl.com/privacy-policy',
  });

  return (
    <LegalPageLayout title="Privacy Policy" effectiveDate="August 11, 2026">
      <section className={SECTION_CLASS} aria-labelledby="scope">
        <h2 id="scope" className={HEADING_CLASS}>Scope</h2>
        <p>
          This Privacy Policy explains how New Wave IT LLC ("New Wave IT," "we," "us," or "our")
          handles personal information through our website and IT services. Our website and services
          are offered only in the United States. This Policy applies to website visitors, prospective
          and current customers, customer personnel, portal users, and people who communicate with us.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="information-we-collect">
        <h2 id="information-we-collect" className={HEADING_CLASS}>Information We Collect</h2>
        <p>The information we collect depends on how you interact with us and may include:</p>
        <ul className={LIST_CLASS}>
          <li>
            <strong>Contact, quote, and support information,</strong> such as your name, business name,
            email address, phone number, location, requested services, message, and files or details you submit.
          </li>
          <li>
            <strong>Customer and service records,</strong> such as agreements, proposals, invoices,
            service history, assets, configurations, contacts, and communications.
          </li>
          <li>
            <strong>Portal and account data,</strong> such as authentication identifiers, session data,
            account roles, and administrative account activity.
          </li>
          <li>
            <strong>Communications,</strong> including chat messages, SMS or text content, email, call
            details, support requests, and related operational records.
          </li>
          <li>
            <strong>Device and usage data,</strong> such as IP address, device and browser type, referrer,
            pages viewed, interaction events, performance information, and approximate location derived
            from an IP address.
          </li>
          <li>
            <strong>Authorized vendor records,</strong> including service and ticket information from{' '}
            <span>Super<span>Ops</span></span> and records from vendors a customer authorizes us to access.
          </li>
        </ul>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="how-we-use-information">
        <h2 id="how-we-use-information" className={HEADING_CLASS}>How We Use Information</h2>
        <p>We use information as reasonably necessary to:</p>
        <ul className={LIST_CLASS}>
          <li>respond to questions, support requests, and requests for quotes;</li>
          <li>plan, deliver, administer, and support services;</li>
          <li>authenticate users and manage accounts, permissions, and sessions;</li>
          <li>send operational, service, security, billing, and permitted marketing communications;</li>
          <li>secure, monitor, troubleshoot, and debug our website, systems, and services;</li>
          <li>analyze performance and usage and improve our website, offerings, and support;</li>
          <li>meet legal, tax, accounting, contractual, and recordkeeping obligations;</li>
          <li>enforce agreements and protect rights, property, safety, and service integrity; and</li>
          <li>detect, investigate, and prevent fraud, abuse, unauthorized access, and other misuse.</li>
        </ul>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="how-we-disclose-information">
        <h2 id="how-we-disclose-information" className={HEADING_CLASS}>How We Disclose Information</h2>
        <p>We may disclose information as reasonably necessary to:</p>
        <ul className={LIST_CLASS}>
          <li>
            service providers that support our operations, including Supabase, Resend, SuperOps,
            Twilio, Elfsight, and Vercel, subject to their services, terms, and data practices;
          </li>
          <li>vendors and systems a customer authorizes or directs us to use;</li>
          <li>lawyers, accountants, insurers, auditors, and other professional advisers;</li>
          <li>participants in a financing, merger, acquisition, reorganization, sale, or similar corporate transaction;</li>
          <li>government authorities or other parties when required by law or reasonably necessary to protect rights, safety, or security; and</li>
          <li>other recipients at your direction or with your consent.</li>
        </ul>
        <p>
          Providers may handle information under their own terms and policies where they act for their
          own purposes. This Policy does not make a blanket promise that every vendor is prohibited from
          using data under its own applicable terms.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="sale-sharing-and-targeted-advertising">
        <h2 id="sale-sharing-and-targeted-advertising" className={HEADING_CLASS}>Sale, Sharing, and Targeted Advertising</h2>
        <p>
          New Wave IT LLC does not currently sell personal information for money or use personal
          information for cross-context behavioral advertising. Embedded and analytics providers may
          nevertheless receive technical usage data when their tools operate on the website. Where an
          applicable privacy law gives you a right to opt out of a covered sale, sharing, or targeted
          advertising activity, email <a className={LINK_CLASS} href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>
          {' '}to submit the request.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="cookies-and-similar-technologies">
        <h2 id="cookies-and-similar-technologies" className={HEADING_CLASS}>Cookies and Similar Technologies</h2>
        <p>
          We use cookies and related technologies as described in our{' '}
          <Link className={LINK_CLASS} to="/cookie-policy">Cookie Policy</Link>. Vercel Analytics and{' '}
          <span>Elf<span>sight</span></span> are active on the website for usage and performance insights
          and embedded chat functionality, respectively. Google Analytics is planned but remains disabled.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="retention">
        <h2 id="retention" className={HEADING_CLASS}>Retention</h2>
        <p>
          We retain personal information only for as long as reasonably necessary for the purposes
          described in this Policy. The period depends on the nature and sensitivity of the information,
          our service and customer-record needs, the duration of the relationship, dispute and enforcement
          needs, security requirements, and applicable legal, tax, accounting, and regulatory obligations.
          When those purposes end, we delete or anonymize the information unless a law requires continued
          retention or deletion cannot be completed immediately because of backup or system constraints.
          In those limited cases, we restrict further use and delete or anonymize the information when the
          legal requirement or technical constraint ends.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="security">
        <h2 id="security" className={HEADING_CLASS}>Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational safeguards designed to protect
          information. No transmission, system, or storage method can be guaranteed absolutely secure.
          Please do not submit passwords, private keys, full payment-card details, or other sensitive
          credentials through public website forms.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="us-processing">
        <h2 id="us-processing" className={HEADING_CLASS}>U.S. Processing</h2>
        <p>
          Our website and services are offered only in the United States. Information is processed and
          stored in the United States and in other locations used by our service providers. Those locations
          may have privacy laws different from the law where you live.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="your-privacy-choices-and-state-rights">
        <h2 id="your-privacy-choices-and-state-rights" className={HEADING_CLASS}>Your Privacy Choices and State Rights</h2>
        <p>
          Depending on your state of residence, the statutory scope of the applicable law, and relevant
          exemptions, you may have rights to access, correct, delete, or obtain a portable copy of certain
          personal information, or to opt out of, restrict, or appeal certain processing. These rights do
          not apply in every circumstance.
        </p>
        <p>
          To make a request, email <a className={LINK_CLASS} href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>
          {' '}and describe the right you wish to exercise. We may request information reasonably necessary
          to verify your identity, authority, and the applicability of the request. An authorized agent may
          submit a request where allowed by law, but we may require proof of authorization and direct identity
          verification. We will not unlawfully discriminate against you for exercising an applicable right.
        </p>
        <p>
          If an applicable state law gives you a right to appeal our decision, use the same email address
          with the subject line "Privacy Appeal" and explain why you believe the decision should be reconsidered.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="global-privacy-control">
        <h2 id="global-privacy-control" className={HEADING_CLASS}>Global Privacy Control</h2>
        <p>
          Our current practices described in this Policy do not involve the sale or sharing of personal
          information for cross-context behavioral advertising, so a Global Privacy Control signal does not
          presently change how this website behaves. If those practices change, New Wave IT LLC will implement
          controls required by applicable law and update this Policy before that change. You may continue to
          submit applicable privacy-rights requests through the process described above or by emailing{' '}
          <a className={LINK_CLASS} href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="childrens-privacy">
        <h2 id="childrens-privacy" className={HEADING_CLASS}>Children's Privacy</h2>
        <p>
          The website and services are not directed to children under 13, and we do not knowingly collect
          personal information from children under 13. If you believe a child has provided personal information,
          contact us so we can investigate and delete it as appropriate.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="third-party-sites-and-services">
        <h2 id="third-party-sites-and-services" className={HEADING_CLASS}>Third-Party Sites and Services</h2>
        <p>
          Our website and services may link to or integrate third-party sites, products, and services. Their
          separate privacy policies and terms govern their practices, and we encourage you to review them.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="changes-to-this-policy">
        <h2 id="changes-to-this-policy" className={HEADING_CLASS}>Changes to This Policy</h2>
        <p>
          We may update this Policy by posting a revised version with a new effective date. When appropriate,
          we will provide additional or prominent notice of a material change before it takes effect.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="contact-us">
        <h2 id="contact-us" className={HEADING_CLASS}>Contact Us</h2>
        <p>For privacy questions or requests, contact:</p>
        <address className="not-italic">
          New Wave IT LLC<br />
          710 NW 5th Ave, Suite 1072<br />
          Fort Lauderdale, FL 33311<br />
          <a className={LINK_CLASS} href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>
        </address>
      </section>
    </LegalPageLayout>
  );
}
