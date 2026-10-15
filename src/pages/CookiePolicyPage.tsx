import { Link } from 'react-router-dom';
import LegalPageLayout from '../components/legal/LegalPageLayout';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const SECTION_CLASS = 'space-y-3';
const HEADING_CLASS = 'text-2xl font-semibold tracking-tight text-slate-900';
const LIST_CLASS = 'list-disc space-y-2 pl-6';
const LINK_CLASS = 'font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900';
const CODE_CLASS = 'rounded bg-slate-100 px-1.5 py-0.5 text-sm';
const TH_CLASS = 'border-b border-slate-300 px-3 py-2 text-left align-top font-semibold text-slate-900';
const TD_CLASS = 'border-b border-slate-200 px-3 py-2 align-top';

/**
 * The date the live website was last scanned (headless browser, unauthenticated,
 * homepage, /contact, /support, /social-engineering, and this page) to produce
 * the inventory below. Re-scan and update the table whenever a third-party
 * script, embed, or media source is added or removed.
 */
export const COOKIE_INVENTORY_REVIEWED = 'October 15, 2026';

interface InventoryRow {
  technology: string;
  provider: string;
  kind: string;
  purpose: string;
  duration: string;
}

const FIRST_PARTY_STORAGE: InventoryRow[] = [
  {
    technology: 'nw_content_v2:*',
    provider: 'New Wave IT',
    kind: 'Local storage',
    purpose: 'Caches the page text and settings we publish from our content system so pages render without waiting on a network request.',
    duration: 'Until replaced by newer content or cleared by you.',
  },
  {
    technology: 'nwit.support.portal, nwit.support.chat',
    provider: 'New Wave IT',
    kind: 'Session storage',
    purpose: 'Holds the sign-in token for the customer support portal and the live support chat on the Support page, only after you start one.',
    duration: 'Until you close the tab or end the session.',
  },
  {
    technology: 'nw-chunk-reload-at',
    provider: 'New Wave IT',
    kind: 'Session storage',
    purpose: 'Records that the page reloaded once after a new version of the website was published, so it does not reload again.',
    duration: 'Until you close the tab.',
  },
  {
    technology: 'Supabase sign-in token',
    provider: 'Supabase',
    kind: 'Local storage',
    purpose: 'Keeps a New Wave IT staff member signed in to the website’s administration screens. It is not created for visitors.',
    duration: 'Until the staff member signs out.',
  },
];

const THIRD_PARTY_SERVICES: InventoryRow[] = [
  {
    technology: 'Vercel Web Analytics',
    provider: 'Vercel',
    kind: 'Script (no cookies)',
    purpose: 'Counts page views and reports the page, referrer, country, region and city, device type, operating system, and browser in aggregate. Visitors are identified by a hash of the request, which Vercel discards after 24 hours, not by a cookie or persistent identifier.',
    duration: 'No cookie or stored identifier.',
  },
  {
    technology: 'Elfsight chat widget',
    provider: 'Elfsight',
    kind: 'Third-party script',
    purpose: 'Provides the chat window in the corner of the page. When the widget loads, Elfsight may use its own cookies or storage to keep the conversation open and may receive technical data and whatever you type into it.',
    duration: 'Set by Elfsight under its own policy.',
  },
  {
    technology: '__cf_bm, _cfuvid',
    provider: 'Pexels (delivered through Cloudflare)',
    kind: 'Third-party cookies',
    purpose: 'The homepage background video and its poster images are loaded from Pexels. Cloudflare, which delivers Pexels’ media, sets these cookies on the pexels.com domain to tell browsers from automated traffic. They are not readable by, or shared with, New Wave IT.',
    duration: '__cf_bm about 30 minutes; _cfuvid for the browser session.',
  },
  {
    technology: 'Google Fonts',
    provider: 'Google',
    kind: 'Font files',
    purpose: 'The typefaces on the New Wave IT pages are loaded from Google’s font servers, which receive your IP address and browser details with the request. Our scan found no cookies set by these requests.',
    duration: 'No cookie observed.',
  },
  {
    technology: 'Supabase',
    provider: 'Supabase',
    kind: 'API requests',
    purpose: 'Our database host. The website reads published content from it and sends form submissions, support tickets, and blog posts through it. It sets no cookies for visitors.',
    duration: 'No cookie.',
  },
];

function InventoryTable({ caption, rows }: { caption: string; rows: InventoryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm leading-6">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={TH_CLASS}>Technology</th>
            <th scope="col" className={TH_CLASS}>Provider</th>
            <th scope="col" className={TH_CLASS}>Type</th>
            <th scope="col" className={TH_CLASS}>What it does</th>
            <th scope="col" className={TH_CLASS}>How long it lasts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.technology}>
              <th scope="row" className={`${TD_CLASS} font-medium text-slate-900`}>
                <code className={CODE_CLASS}>{row.technology}</code>
              </th>
              <td className={TD_CLASS}>{row.provider}</td>
              <td className={TD_CLASS}>{row.kind}</td>
              <td className={TD_CLASS}>{row.purpose}</td>
              <td className={TD_CLASS}>{row.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicyPage() {
  usePageMeta(IT_PAGE_META['/cookie-policy']);

  return (
    <LegalPageLayout title="Cookie Policy" effectiveDate="October 15, 2026">
      <p>
        This Cookie Policy explains the cookies, browser storage, and similar technologies used on the
        New Wave IT LLC website, including the New Wave: Social Engineering pages. Our website and
        services are offered only in the United States. The privacy rights and choices described below
        are subject to applicable U.S. law. It is part of our{' '}
        <Link className={LINK_CLASS} to="/privacy-policy">Privacy Policy</Link>.
      </p>

      <section className={SECTION_CLASS} aria-labelledby="in-short">
        <h2 id="in-short" className={HEADING_CLASS}>In Short</h2>
        <ul className={LIST_CLASS}>
          <li>The New Wave IT website sets <strong>no cookies of its own</strong>.</li>
          <li>It uses your browser's local and session storage for functional purposes only: caching page content and holding a support session you start.</li>
          <li>Our analytics service does not use cookies and does not track you across other websites.</li>
          <li>Some content is loaded from third parties (the homepage video, the chat widget, and fonts). Two cookies set by Pexels' content-delivery provider are the only cookies our scan found.</li>
          <li>We do not use advertising, retargeting, or cross-site tracking cookies, and we do not sell or share personal information, so we do not show a cookie consent banner. We will add visitor controls before activating any technology that calls for them.</li>
        </ul>
      </section>

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
        <p>
          The tables below list what we found when we last scanned the live website on{' '}
          {COOKIE_INVENTORY_REVIEWED}. Durations are what we observed; vendors can change their own
          cookies and storage, and the behavior you see may depend on your browser, its settings, and
          the features you use.
        </p>
        <h3 className="text-lg font-semibold text-slate-900">Storage set by this website</h3>
        <InventoryTable caption="Browser storage set by the New Wave IT website" rows={FIRST_PARTY_STORAGE} />
        <h3 className="text-lg font-semibold text-slate-900">Third-party services and their cookies</h3>
        <InventoryTable caption="Third-party services loaded by the New Wave IT website and the cookies they set" rows={THIRD_PARTY_SERVICES} />
        <p>
          These vendors handle the data they receive under their own policies and terms. We do not
          authorize any of them to track you across other websites on our behalf.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="planned-google-analytics">
        <h2 id="planned-google-analytics" className={HEADING_CLASS}>Planned Google Analytics</h2>
        <p>Google Analytics is not currently active on this website.</p>
        <p>
          If Google Analytics 4 (GA4) is activated later, it may use <code className={CODE_CLASS}>_ga</code>
          {' '}and related identifiers and collect session, device and browser, approximate-location,
          page, referrer, and interaction data. Before any activation we will update this Policy with
          the verified cookie names, purposes, and retention periods, and put in place the visitor
          controls that applicable law requires.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="why-we-use-these-technologies">
        <h2 id="why-we-use-these-technologies" className={HEADING_CLASS}>Why We Use These Technologies</h2>
        <p>We use these technologies as reasonably necessary to:</p>
        <ul className={LIST_CLASS}>
          <li>provide functionality you request;</li>
          <li>authenticate users and maintain session continuity;</li>
          <li>protect the website, accounts, and services, including from automated abuse;</li>
          <li>operate support and embedded communication features;</li>
          <li>measure and troubleshoot performance; and</li>
          <li>understand aggregate site usage and improve the website.</li>
        </ul>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="your-choices">
        <h2 id="your-choices" className={HEADING_CLASS}>Your Choices</h2>
        <p>
          Most browsers let you block or delete cookies and clear local or session storage, and let you
          block third-party cookies on their own. Blocking or deleting these technologies may interrupt a
          support session, remove cached content, stop the chat widget or homepage video from loading, or
          cause other website features not to function as intended. Consult your browser's settings and
          documentation for available controls.
        </p>
        <p>
          If your browser's data-saver setting is on, the homepage does not load the background video, so
          no request is made to Pexels.
        </p>
        <p>
          Because the website does not track you across other sites or sell or share personal
          information, a browser <strong>Do Not Track</strong> or <strong>Global Privacy Control</strong>{' '}
          signal does not change how it behaves. If that changes, we will honor those signals as
          applicable law requires and update this Policy first.
        </p>
        <p>
          Where applicable law gives you an opt-out right, you may{' '}
          <a className={LINK_CLASS} href="mailto:support@newwaveitfl.com">email our support team</a>.
        </p>
      </section>

      <section className={SECTION_CLASS} aria-labelledby="updates-to-this-cookie-policy">
        <h2 id="updates-to-this-cookie-policy" className={HEADING_CLASS}>Updates to This Cookie Policy</h2>
        <p>
          We may revise this Cookie Policy to reflect changes in the technologies we use, our practices,
          or applicable requirements. We will post the updated version with a revised effective date and
          re-scan the website whenever we add or remove a third-party script, embed, or media source.
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
