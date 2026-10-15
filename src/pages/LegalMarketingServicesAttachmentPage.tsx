import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/marketing-services-attachment');

export default function LegalMarketingServicesAttachmentPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Service Attachment adds terms for the services of New Wave: Social Engineering, the social
        media, brand development, website design, marketing, integration, and digital oversight division of
        New Wave IT LLC, to the <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink>,
        which applies to everything it does not address.
      </AgreementSetNote>

      <LegalSection id="scope" title="1. Scope">
        <p>
          Marketing and Digital Services are the engagements an Order describes in these service lines:
          social media management, brand development, website design and development, marketing (including
          search, paid social, email, and event marketing), systems integration, and digital oversight
          (reporting and analytics). The <LegalLink to="/legal/schedule-of-services">Schedule of Services</LegalLink>{' '}
          defines each. Retainers cover the monthly deliverables the Order lists; projects run under a
          statement of work.
        </p>
      </LegalSection>

      <LegalSection id="approvals" title="2. Content, Approvals, and Brand">
        <LegalList
          items={[
            'New Wave IT prepares content, designs, and campaigns for Customer’s approval before publication, through the review process and turnaround times the Order states. Content Customer approves, or does not reject within the review period, may be published as approved.',
            'Customer is responsible for the accuracy and lawfulness of claims, offers, pricing, and representations about its business, products, and services, and for any disclosures its industry requires. New Wave IT will flag claims it considers risky but does not verify them.',
            'Customer warrants that it owns or has licensed the logos, marks, photographs, video, copy, testimonials, and other materials it supplies, and that their use as directed will not infringe anyone’s rights or violate any law.',
            'Stock media, fonts, music, and templates New Wave IT licenses for a deliverable are licensed for that deliverable’s stated use; broader use may require Customer to buy its own license, which New Wave IT will identify.',
          ]}
        />
      </LegalSection>

      <LegalSection id="accounts" title="3. Accounts, Platforms, and Advertising Spend">
        <LegalList
          items={[
            'Social, advertising, analytics, domain, hosting, and email platform accounts are opened in Customer’s name, owned by Customer, and administered by New Wave IT as Customer’s agent during the Order. Customer will keep its own administrative access and will not lock New Wave IT out without ending the Services.',
            'Customer accepts each platform’s terms and policies. Platforms change their rules, algorithms, reach, pricing, and availability without notice, may reject or remove content, and may suspend accounts; New Wave IT is not responsible for those actions and will help Customer respond to them.',
            'Advertising spend is Customer’s cost, paid directly to the platform from Customer’s payment method unless the Order states that New Wave IT will advance it, in which case it is invoiced at cost with the management fee the Order states. New Wave IT will not exceed the budget Customer sets in writing.',
            'Results, including reach, engagement, rankings, traffic, leads, conversions, and revenue, depend on platforms, competitors, markets, and Customer’s own offering and follow-up; they are not guaranteed. Projections are estimates for planning.',
          ]}
        />
      </LegalSection>

      <LegalSection id="websites" title="4. Website Design and Development">
        <LegalList
          items={[
            'A website project runs under a statement of work with a design phase, a build phase, Customer review rounds (two per phase unless it states otherwise), and acceptance as the Project Services attachment provides.',
            'On payment in full, Customer owns the site’s custom design, content, and code created for it. Themes, plugins, frameworks, libraries, and New Wave IT’s own tools remain under their own licenses, and New Wave IT retains the right to reuse general techniques and components.',
            'Hosting, domains, SSL certificates, plugins, and subscriptions are Third-Party Services, billed as the Order states. Ongoing maintenance, updates, backups, security, and uptime are included only where the Order includes a care plan, and then only as that plan describes.',
            'New Wave IT builds to current standards and tests in current versions of major browsers and devices; it does not warrant compatibility with future versions, or accessibility or legal conformance beyond what the statement of work specifies.',
          ]}
        />
      </LegalSection>

      <LegalSection id="integration-oversight" title="5. Integration and Digital Oversight">
        <LegalList
          items={[
            'Integration work connects Customer’s platforms through the vendors’ supported interfaces and depends on those interfaces remaining available; vendor changes that break an integration are addressed as new work unless a care plan covers them.',
            'Digital oversight reports draw on the analytics and platform data Customer makes available. New Wave IT configures tracking as the Order states and is not responsible for data gaps caused by platform limits, consent settings, ad blockers, or changes Customer or its other vendors make.',
            'Where tracking involves visitors’ personal data, Customer is responsible for its own privacy policy, cookie disclosures, and consents; New Wave IT will implement the configuration Customer approves and will advise on what the implementation collects.',
          ]}
        />
      </LegalSection>

      <LegalSection id="term" title="6. Retainers and Termination">
        <p>
          Retainers run month to month unless the Order states a term, and either party may end them on 30
          days’ written notice. Deliverables in progress at termination are completed and billed if
          Customer asks, or delivered as is. Scheduled posts and campaigns are paused at termination unless
          Customer directs otherwise, and administrative access is handed back as the Master Services
          Agreement provides. Unused retainer hours do not carry over unless the Order says so.
        </p>
      </LegalSection>

      <LegalSection id="portfolio" title="7. Portfolio Use">
        <p>
          New Wave IT may show work it created for Customer in its portfolio and proposals after it is
          public, naming Customer, unless Customer tells it in writing not to. New Wave IT will not disclose
          Customer’s performance data, budgets, or strategy.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
