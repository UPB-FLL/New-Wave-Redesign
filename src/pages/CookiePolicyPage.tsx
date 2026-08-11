import LegalPageLayout from '../components/legal/LegalPageLayout';
import { usePageMeta } from '../lib/usePageMeta';

const SECTION_CLASS = 'space-y-3';
const HEADING_CLASS = 'text-2xl font-semibold tracking-tight text-slate-900';
const LIST_CLASS = 'list-disc space-y-2 pl-6';
const LINK_CLASS = 'font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900';

export default function CookiePolicyPage() {
  usePageMeta({
    title: 'Cookie Policy — New Wave IT',
    description: 'How New Wave IT uses cookies, storage, analytics, and embedded technologies on its website.',
    canonical: 'https://www.newwaveitfl.com/cookie-policy',
  });

  return (
    <LegalPageLayout title="Cookie Policy" effectiveDate="August 11, 2026">
      <p>
        This Cookie Policy explains technologies used by New Wave IT LLC. Our website and services are
        offered only in the United States. The privacy rights and choices described below are subject
        to applicable U.S. law.
      </p>

      <section className={SECTION_CLASS} aria-labelledby="what-cookies-and-similar-technologies-are">
        <h2 id="what-cookies-and-similar-technologies-are" className={HEADING_CLASS}>What Cookies and Similar Technologies Are</h2>
        <p>
          Cookies are small data files a website or provider may place on a browser or device. Similar
          technologies include local storage, session storage, pixels or tags, and embedded scripts.
          They can remember information, maintain a session, enable a feature, or report technical and
          interaction data to the website operator or a provider.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="technologies-we-use-now">
        <h2 id="technologies-we-use-now" className={HEADING_CLASS}>Technologies We Use Now</h2>
        <p>Our website currently uses the following technologies where applicable:</p>
        <ul className={LIST_CLASS}>
          <li><strong>Functional local storage</strong> to cache website content and improve continuity and performance.</li>
          <li><strong>Session storage</strong> to hold temporary support or portal tokens during a browser session.</li>
          <li><strong>Supabase authentication and storage</strong> to support sign-in, sessions, and related portal data where those features are used.</li>
          <li><strong>Vercel Analytics</strong> to understand site usage and performance; it may receive technical usage and interaction data.</li>
          <li><strong>Elfsight</strong> to provide the embedded chatbot; the widget may receive technical data and information you submit through it.</li>
        </ul>
        <p>
          These vendors may use their own cookies, storage, scripts, or similar technologies under their
          respective policies and terms. Availability and behavior may depend on your browser, settings,
          and the particular feature you use.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="planned-google-analytics">
        <h2 id="planned-google-analytics" className={HEADING_CLASS}>Planned Google Analytics</h2>
        <p>Google Analytics is not currently active on this website.</p>
        <p>
          If Google Analytics 4 (GA4) is activated later, it may use <code className="rounded bg-slate-100 px-1.5 py-0.5">_ga</code>
          {' '}and related identifiers and collect session, device and browser, approximate-location,
          page, referrer, and interaction data. We will review this Policy and the visitor controls
          available on the website before any activation.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="why-we-use-these-technologies">
        <h2 id="why-we-use-these-technologies" className={HEADING_CLASS}>Why We Use These Technologies</h2>
        <p>We use these technologies as reasonably necessary to:</p>
        <ul className={LIST_CLASS}>
          <li>provide functionality you request;</li>
          <li>authenticate users and maintain session continuity;</li>
          <li>protect the website, accounts, and services;</li>
          <li>operate support and embedded communication features;</li>
          <li>measure and troubleshoot performance; and</li>
          <li>understand aggregate site usage and improve the website.</li>
        </ul>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="your-choices">
        <h2 id="your-choices" className={HEADING_CLASS}>Your Choices</h2>
        <p>
          Most browsers let you block or delete cookies and clear local or session storage. Blocking or
          deleting these technologies may prevent sign-in, interrupt a support session, remove cached
          content, or cause other website features not to function as intended. Consult your browser's
          settings and documentation for available controls.
        </p>
        <p>
          Where applicable law gives you an opt-out right, you may{' '}
          <a className={LINK_CLASS} href="mailto:support@newwaveitfl.com">email our support team</a>.
          If Google Analytics is activated in the future, we will describe the Google controls and any
          additional website choices that apply before activation.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="updates-to-this-cookie-policy">
        <h2 id="updates-to-this-cookie-policy" className={HEADING_CLASS}>Updates to This Cookie Policy</h2>
        <p>
          We may revise this Cookie Policy to reflect changes in the technologies we use, our practices,
          or applicable requirements. We will post the updated version with a revised effective date.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="contact-us">
        <h2 id="contact-us" className={HEADING_CLASS}>Contact Us</h2>
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
