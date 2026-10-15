import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/schedule-of-third-party-services');

const TH_CLASS = 'border-b border-slate-300 px-3 py-2 text-left align-top font-semibold text-slate-900';
const TD_CLASS = 'border-b border-slate-200 px-3 py-2 align-top';

interface ThirdParty {
  category: string;
  examples: string;
  role: string;
  data: string;
}

/** Platforms New Wave IT itself uses to deliver and support the Services. */
const DELIVERY_PLATFORMS: ThirdParty[] = [
  {
    category: 'Professional services automation and remote monitoring',
    examples: 'SuperOps',
    role: 'Ticketing, asset documentation, monitoring agents, remote access, and patch management for Covered Items; the customer support portal reads ticket data from it.',
    data: 'Contact details of Customer’s users, device inventory and telemetry, ticket content, and remote sessions.',
  },
  {
    category: 'Customer portal, website, and notifications',
    examples: 'Supabase (database and authentication), Vercel (hosting), Resend (transactional email), Twilio (SMS to on-call technicians)',
    role: 'Run the New Wave IT website, the support portal sign-in, the live support chat, and the emails and texts those features send.',
    data: 'Sign-in email addresses and one-time codes, chat transcripts, form submissions, and notification content.',
  },
  {
    category: 'Endpoint protection and managed detection',
    examples: 'The endpoint protection and detection platforms named in the Order',
    role: 'Protect and monitor Covered Items; alert and, where authorized, contain threats.',
    data: 'Device identifiers, process and network telemetry, file metadata, and alerts.',
  },
  {
    category: 'Backup and recovery',
    examples: 'The backup platforms named in the Order',
    role: 'Back up designated servers, endpoints, and cloud services; store and restore copies.',
    data: 'Copies of the designated Customer Data, encrypted in transit and at rest.',
  },
  {
    category: 'Security awareness and testing',
    examples: 'The training and simulation platforms named in the Order',
    role: 'Deliver training content, phishing simulations, and completion reporting.',
    data: 'User names, email addresses, completion records, and simulation results.',
  },
  {
    category: 'Documentation and credential management',
    examples: 'The documentation and password-management platforms New Wave IT uses',
    role: 'Store configuration documentation and administrative credentials for the Customer Environment.',
    data: 'System documentation, credentials, and network details, encrypted and access-controlled.',
  },
];

/** Subscriptions New Wave IT may resell, provision, or administer for a customer. */
const PROVISIONED_SUBSCRIPTIONS: ThirdParty[] = [
  {
    category: 'Productivity, email, identity, and file platforms',
    examples: 'Microsoft 365, Google Workspace, and their identity services',
    role: 'Customer’s own tenant, owned by Customer; New Wave IT provisions licenses and administers it where the Order includes administration.',
    data: 'All data Customer’s users put in the platform, under the vendor’s terms and data location.',
  },
  {
    category: 'Cloud infrastructure and hosting',
    examples: 'Microsoft Azure, Amazon Web Services, and the web hosts named in a statement of work',
    role: 'Host servers, applications, and websites New Wave IT builds or migrates; billed by the vendor or passed through as the Order states.',
    data: 'The workloads and data Customer places on them.',
  },
  {
    category: 'Network, cellular, and public-safety equipment',
    examples: 'The manufacturers named in a statement of work, and carriers for cellular DAS',
    role: 'Supply equipment with the manufacturer’s warranty and cloud management where applicable; carriers approve and provide signal sources.',
    data: 'Device configuration and management telemetry, where the manufacturer’s cloud management is used.',
  },
  {
    category: 'Marketing, social, advertising, analytics, and web platforms',
    examples: 'Meta, Google (Ads, Analytics, Business Profile), LinkedIn, TikTok, email and SMS marketing platforms, domain registrars, content management systems, and the plugins and themes named in a statement of work',
    role: 'Customer-owned accounts New Wave: Social Engineering administers; advertising spend is paid by Customer to the platform.',
    data: 'Customer’s audiences, campaign data, website visitor data, and content, under each platform’s terms and privacy settings.',
  },
];

function ThirdPartyTable({ caption, rows }: { caption: string; rows: ThirdParty[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[46rem] border-collapse text-sm leading-6">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={TH_CLASS}>Category</th>
            <th scope="col" className={TH_CLASS}>Providers</th>
            <th scope="col" className={TH_CLASS}>Role in the Services</th>
            <th scope="col" className={TH_CLASS}>Data involved</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category}>
              <th scope="row" className={`${TD_CLASS} font-medium text-slate-900`}>{row.category}</th>
              <td className={TD_CLASS}>{row.examples}</td>
              <td className={TD_CLASS}>{row.role}</td>
              <td className={TD_CLASS}>{row.data}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LegalScheduleOfThirdPartyServicesPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Schedule is part of the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink> and the{' '}
        <LegalLink to="/legal/data-processing-agreement">Data Processing Agreement</LegalLink>. It lists
        the categories of third-party platforms New Wave IT uses to deliver the Services, and the
        subscriptions it may provision for a customer, so an Order can refer to them.
      </AgreementSetNote>

      <LegalSection id="how-to-read" title="1. How This Schedule Works">
        <LegalList
          items={[
            'Each Order names the specific platforms it involves. Where an Order names a platform in a category below, this Schedule’s description of the category applies to it. A platform not named in an Order or in this Schedule is added by change order, or, for New Wave IT’s own delivery platforms, by the notice process in the Data Processing Agreement.',
            'Third-Party Services are provided under the vendor’s own terms, which Customer accepts when the Order names the platform or when New Wave IT provisions it on Customer’s behalf. New Wave IT is not the vendor and does not warrant them, as the Master Services Agreement provides.',
            'New Wave IT may change the delivery platforms it uses for its own operations on notice, provided the replacement offers comparable protection for Customer Data.',
          ]}
        />
      </LegalSection>

      <LegalSection id="delivery-platforms" title="2. Platforms New Wave IT Uses to Deliver the Services">
        <p>
          These process Customer Data as New Wave IT’s subprocessors under the Data Processing Agreement.
        </p>
        <ThirdPartyTable caption="Platforms New Wave IT uses to deliver the Services" rows={DELIVERY_PLATFORMS} />
      </LegalSection>

      <LegalSection id="provisioned" title="3. Subscriptions Provisioned or Administered for Customers">
        <p>
          These are Customer’s own accounts and vendors. New Wave IT administers them as Customer’s agent
          where the Order includes administration; they are not New Wave IT’s subprocessors.
        </p>
        <ThirdPartyTable caption="Subscriptions New Wave IT provisions or administers for customers" rows={PROVISIONED_SUBSCRIPTIONS} />
      </LegalSection>

      <LegalSection id="commitments" title="4. Commitments, Pricing, and Renewals">
        <p>
          Vendor commitment terms, minimums, renewal rules, and price changes are the vendor’s and pass
          through to Customer as the Cloud Services attachment and the Master Services Agreement describe.
          An Order identifies subscriptions with annual or multi-year commitments. Customer remains
          responsible for committed subscriptions for their term even if New Wave IT’s Services end, and
          New Wave IT will transfer their administration to Customer or its new provider where the vendor
          allows.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
