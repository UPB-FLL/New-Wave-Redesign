import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/schedule-of-services');

export default function LegalScheduleOfServicesPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Schedule defines the service lines and standard terms an Order refers to. It is part of the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink>; the Service
        Attachment for each line adds its specific terms.
      </AgreementSetNote>

      <LegalSection id="standard-terms" title="1. Standard Terms">
        <LegalList
          items={[
            <><strong>Business Hours</strong> are 8:00 a.m. to 6:00 p.m. Eastern Time, Monday through Friday, excluding the United States federal holidays New Wave IT observes, which it publishes to customers each year.</>,
            <><strong>24/7 coverage</strong> means Business Hours plus after-hours, weekend, and holiday coverage for the priorities the Order and the Service Level Objectives state. Plans without 24/7 coverage handle after-hours requests on the next business day unless the Order adds after-hours support.</>,
            <><strong>A User</strong> is a person with an account on Customer’s systems that the Services cover. <strong>A Device</strong> is a workstation, laptop, server, or network device with a management agent or a configuration New Wave IT maintains. <strong>A Site</strong> is a physical location the Order lists.</>,
            <><strong>Hourly rates</strong> apply to work outside a plan or statement of work, in 15-minute increments after the first hour, at the rates in the Order. After-hours, weekend, holiday, and emergency rates are stated in the Order where they differ.</>,
            <><strong>Project work</strong> is any change that adds, replaces, or redesigns a system rather than maintaining it, including migrations, new sites, new servers, network redesigns, major version upgrades, and deployments of more than ten Devices at once. It is quoted separately.</>,
            <><strong>Baseline</strong> means the minimum condition a Covered Item must meet to be managed: a vendor-supported operating system with current patches, a licensed and supported endpoint protection agent, multi-factor authentication on administrative and remote access, and a working backup for data the Order designates.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="managed-it" title="2. Managed IT Services and Live IT Support">
        <p>
          Ongoing monitoring, maintenance, and support of Covered Items, with help desk support for their
          Users. Plan components an Order may include: remote monitoring and management; patch management
          (operating systems monthly, critical security patches within the window the Service Level
          Objectives state, supported third-party applications monthly); endpoint protection management;
          help desk during Business Hours or 24/7; on-site support hours per month; user administration;
          backup monitoring for designated data; asset documentation; vendor liaison; and periodic business
          reviews. Governed by the{' '}
          <LegalLink to="/legal/managed-it-services-attachment">Service Attachment for Managed IT Services</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="cybersecurity" title="3. Cybersecurity Services">
        <p>
          Managed detection and response, endpoint protection, email security, identity protection and
          multi-factor authentication rollout, vulnerability scanning, security awareness training and
          phishing simulation, log collection and review, security assessments, policy assistance,
          compliance assistance for named frameworks, incident response, and authorized penetration testing
          under written rules of engagement. Incident response outside a plan is billed at the incident
          response rate in the Order. Governed by the{' '}
          <LegalLink to="/legal/cybersecurity-services-attachment">Service Attachment for Cybersecurity Services</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="cloud" title="4. Cloud Services">
        <p>
          Cloud readiness planning, migration to productivity, email, file, identity, and server platforms,
          tenant administration and security baseline, subscription provisioning and license management,
          cloud backup for designated services with stated frequency and retention, and support for cloud
          applications within the vendor’s capabilities. Governed by the{' '}
          <LegalLink to="/legal/cloud-services-attachment">Service Attachment for Cloud Services</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="projects" title="5. Projects, Network Infrastructure, and Repairs">
        <p>
          Network design and builds, structured cabling, wireless surveys and deployments, cellular
          distributed antenna systems and public-safety radio coverage, server and storage deployments,
          office moves and build-outs, hardware procurement and installation, and the diagnosis and repair of
          computers, servers, and devices. Diagnostic fees, shop rates, and parts markup are stated in the
          Order. Governed by the{' '}
          <LegalLink to="/legal/project-services-attachment">Service Attachment for Projects, Network Infrastructure, and Repairs</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="marketing" title="6. Marketing and Digital Services (New Wave: Social Engineering)">
        <p>
          Social media management (content calendars, creation, publishing, community management, and
          reporting), brand development (identity, guidelines, and assets), website design and development
          with optional care plans, marketing (search, paid social, email, SMS where lawful, and event
          marketing, with advertising spend paid by Customer), systems integration between Customer’s
          platforms, and digital oversight (analytics configuration and reporting). Delivered as monthly
          retainers or statements of work. Governed by the{' '}
          <LegalLink to="/legal/marketing-services-attachment">Service Attachment for Marketing and Digital Services</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="specialized" title="7. Specialized Environments">
        <p>
          Services for healthcare practices, family offices, luxury properties, and public-safety agencies
          are delivered under the service lines above with the additional requirements an Order states,
          such as a business associate agreement for protected health information, enhanced confidentiality
          and discretion terms, or compliance with an authority having jurisdiction’s coverage requirements.
          Those additional requirements are stated in the Order and take precedence over this Schedule.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
