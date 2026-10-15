import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/managed-it-services-attachment');

export default function LegalManagedItServicesAttachmentPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Service Attachment adds terms for Managed IT Services and Live IT Support plans to the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink>, which
        applies to everything it does not address.
      </AgreementSetNote>

      <LegalSection id="scope" title="1. Scope">
        <p>
          Managed IT Services are the ongoing monitoring, maintenance, support, and administration of the
          covered items an Order lists ("Covered Items"): users, workstations, servers, network devices,
          cloud tenants, sites, and other assets, each at the plan level the Order states. The{' '}
          <LegalLink to="/legal/schedule-of-services">Schedule of Services</LegalLink> defines the service
          lines and plan components. Anything not listed as a Covered Item or plan component is out of scope
          and is handled as project work or at the hourly rates in the Order.
        </p>
      </LegalSection>

      <LegalSection id="included" title="2. What a Plan Includes">
        <p>Subject to the plan level in the Order, Managed IT Services include:</p>
        <LegalList
          items={[
            'remote monitoring and management agents on Covered Items, with alerting on the conditions New Wave IT configures;',
            'operating system and supported third-party application patching on the schedule in the Schedule of Services, with critical security patches expedited where the vendor rates them critical;',
            'help desk support for Covered Items and their users during the coverage hours the Order states, by ticket, email, portal, chat, and phone;',
            'endpoint protection management where the plan includes it, using the platform listed in the Schedule of Third-Party Services;',
            'user administration: onboarding, offboarding, password resets, permissions, and mailbox and license changes within the Covered Items;',
            'asset and configuration documentation for Covered Items, available to Customer on request and at termination;',
            'vendor liaison for Covered Items: opening and working tickets with Customer’s internet, software, and hardware vendors on Customer’s behalf;',
            'scheduled business reviews at the frequency the Order states, covering tickets, risks, lifecycle, and recommendations; and',
            'the response and resolution objectives in the Service Level Objectives for the plan’s coverage hours.',
          ]}
        />
      </LegalSection>

      <LegalSection id="excluded" title="3. What a Plan Does Not Include">
        <p>Unless an Order expressly adds them, Managed IT Services do not include:</p>
        <LegalList
          items={[
            'projects: migrations, new sites, new servers or network builds, major version upgrades, and anything the Schedule of Services lists as project work;',
            'hardware, software, subscriptions, licenses, parts, and shipping, which are billed separately or supplied by Customer;',
            'support for items not listed as Covered Items, for personally owned devices beyond basic connectivity to Customer resources, or for software the vendor no longer supports;',
            'on-site work beyond the hours the plan includes, after-hours work outside the plan’s coverage, and work at sites the Order does not list;',
            'recovery from a security incident, data loss, or disaster beyond restoring from a backup New Wave IT manages under the Order, which is scoped and billed as incident response;',
            'custom software development, application support beyond installation and configuration, and training beyond routine how-to questions;',
            'compliance audits, certifications, and attestations, which are separate engagements; and',
            'repair of damage caused by accident, misuse, power events, environmental conditions, or changes made by anyone other than New Wave IT.',
          ]}
        />
      </LegalSection>

      <LegalSection id="onboarding" title="4. Onboarding">
        <p>
          Services begin with an onboarding period the Order states, during which New Wave IT deploys
          agents, collects documentation, and brings Covered Items to the baseline the Schedule of Services
          describes. Items that do not meet the baseline, including unsupported operating systems, missing
          licenses, or unpatched or compromised systems, are flagged with a remediation proposal; New Wave IT
          may exclude them from the plan until they are remediated. Service Level Objectives apply from the
          end of onboarding. Onboarding fees, if any, are in the Order.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="5. Changes to Covered Items">
        <p>
          Customer will tell New Wave IT about users, devices, and sites it adds or removes. New Wave IT
          may audit Covered Items through its tools and will adjust the monthly fee from the next billing
          month to reflect the counts it finds, at the unit prices in the Order. Reductions take effect at
          the end of the billing month in which they are requested, subject to any minimum in the Order.
        </p>
      </LegalSection>

      <LegalSection id="customer-responsibilities" title="6. Customer Responsibilities">
        <LegalList
          items={[
            'keep the agents and tools New Wave IT deploys installed and running, and do not remove, disable, or interfere with them;',
            'give users a way to open tickets, and have users report problems through the support channels rather than to individual technicians;',
            'maintain supported, licensed operating systems and applications, and budget for lifecycle replacement when New Wave IT identifies end-of-life items;',
            'approve maintenance windows and reboots needed for patching, and accept that declined or deferred patches reduce the protection the plan provides;',
            'keep internet service, power, and physical security adequate for the Covered Items; and',
            'follow the security recommendations in business reviews or acknowledge the risk of not doing so in writing.',
          ]}
        />
      </LegalSection>

      <LegalSection id="tools" title="7. Tools and Access">
        <p>
          New Wave IT selects the monitoring, management, security, documentation, and ticketing platforms
          it uses to deliver the Services and may change them on notice. They remain New Wave IT’s or the
          vendor’s property. At termination New Wave IT will remove its agents from Covered Items on
          request and will hand over documentation and administrative credentials as the Master Services
          Agreement provides. Customer will keep a break-glass administrative account of its own at all times.
        </p>
      </LegalSection>

      <LegalSection id="limits" title="8. Limits of the Service">
        <p>
          Monitoring detects the conditions it is configured to detect, and support resolves issues within
          the capabilities of the Covered Items and their vendors. New Wave IT does not guarantee uptime,
          that patches will be free of vendor defects, or that every problem has a fix. Where a fix depends
          on a vendor, New Wave IT’s obligation is to pursue it diligently with that vendor.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
