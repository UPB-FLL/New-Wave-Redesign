import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/cloud-services-attachment');

export default function LegalCloudServicesAttachmentPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Service Attachment adds terms for Cloud Services to the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink>, which
        applies to everything it does not address.
      </AgreementSetNote>

      <LegalSection id="scope" title="1. Scope">
        <p>
          Cloud Services are the planning, migration, provisioning, administration, backup, and support of
          cloud platforms and subscriptions an Order names, such as productivity suites, email, file
          storage, identity, virtual servers, hosted applications, and cloud backup. The{' '}
          <LegalLink to="/legal/schedule-of-services">Schedule of Services</LegalLink> defines each
          component. The cloud platforms themselves are Third-Party Services.
        </p>
      </LegalSection>

      <LegalSection id="subscriptions" title="2. Subscriptions New Wave IT Provisions">
        <LegalList
          items={[
            'Where New Wave IT resells or provisions a subscription for Customer, Customer accepts the vendor’s terms listed in the Schedule of Third-Party Services, and the subscription’s features, availability, security, data location, and support are the vendor’s responsibility.',
            'Subscription fees, quantities, commitment terms, and renewal rules are those the vendor applies to the plan the Order names. Some vendor plans are annual commitments that cannot be reduced mid-term; the Order identifies these, and Customer remains responsible for them for their term even if the Order ends.',
            'Vendor price changes pass through on the date the vendor applies them. New Wave IT will give Customer the notice the vendor gives it.',
            'Customer is the owner of its tenant, data, and domain names. New Wave IT will register tenants and domains in Customer’s name wherever the vendor allows and will transfer administrative control to Customer or its new provider at termination as the Master Services Agreement provides.',
          ]}
        />
      </LegalSection>

      <LegalSection id="migration" title="3. Migrations">
        <LegalList
          items={[
            'A migration is project work under a statement of work that states the source, the destination, the data in scope, the cutover approach, and Customer’s responsibilities. Data outside the stated scope, including archived mailboxes, shared drives not listed, and third-party integrations, is not migrated.',
            'Customer will verify migrated data within the acceptance period the statement of work states, or 10 business days where it is silent, and will keep the source system available and backed up until acceptance. New Wave IT is not responsible for data that was corrupt, inaccessible, or missing in the source.',
            'Migrations involve downtime and user disruption that New Wave IT will plan with Customer; dates can move when vendor throttling, data volume, or discovered issues require it.',
          ]}
        />
      </LegalSection>

      <LegalSection id="administration" title="4. Administration and Security">
        <p>
          Where the Order includes tenant administration, New Wave IT manages users, licenses, policies,
          security settings, and configuration within the vendor’s capabilities, following the baseline
          in the Schedule of Services. Customer approves changes that affect users broadly. Customer will
          keep at least one emergency administrator account of its own. New Wave IT does not control the
          vendor’s platform, its outages, its feature changes, or its retention and deletion behavior.
        </p>
      </LegalSection>

      <LegalSection id="backup" title="5. Cloud Backup and Recovery">
        <LegalList
          items={[
            'Cloud backup covers only the services, accounts, and data types the Order lists, at the frequency and retention it states. Data outside that scope is not backed up by New Wave IT.',
            'New Wave IT monitors backup jobs and will investigate failures during coverage hours. A backup is verified by the platform’s own job reports and by periodic restore tests at the frequency the Order states.',
            'Recovery objectives, where the Order states them, are targets, not guarantees; recovery time depends on data volume, vendor throughput, and the state of the destination.',
            'Restores at Customer’s request that are not caused by a failure of the Services are billed at hourly rates unless the Order includes them.',
          ]}
        />
      </LegalSection>

      <LegalSection id="data-location" title="6. Data Location and Handling">
        <p>
          Customer Data in a cloud platform is stored where the vendor stores it, as the vendor’s terms
          and settings provide; New Wave IT will configure a data-residency option where the vendor offers
          one and the Order requires it. Personal data New Wave IT processes in delivering Cloud Services
          is governed by the Data Processing Agreement.
        </p>
      </LegalSection>

      <LegalSection id="customer-responsibilities" title="7. Customer Responsibilities">
        <LegalList
          items={[
            'provide accurate user lists, data inventories, and license requirements, and approve the plan quantities the Order will provision;',
            'pay vendor fees for the quantities in use, including users Customer adds directly in the tenant;',
            'maintain the internet connectivity, endpoints, and identity hygiene the cloud platform needs, including multi-factor authentication for every user;',
            'comply with the vendor’s acceptable-use policies and licensing rules; and',
            'tell New Wave IT before adding integrations, applications, or administrators to a managed tenant.',
          ]}
        />
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
