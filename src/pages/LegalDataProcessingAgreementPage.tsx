import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/data-processing-agreement');

export default function LegalDataProcessingAgreementPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Data Processing Agreement ("DPA") is part of the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink> and
        governs personal data New Wave IT LLC processes on a customer’s behalf in delivering the Services.
        It controls over the other agreement documents for that subject.
      </AgreementSetNote>

      <LegalSection id="roles" title="1. Roles and Scope">
        <LegalList
          items={[
            '"Personal Data" is information in Customer Data that identifies or could reasonably be linked to an individual. "Processing" is any operation performed on it. Customer determines why and how Personal Data is processed; New Wave IT processes it only on Customer’s behalf, as Customer’s processor or, under United States state privacy laws, its service provider or contractor.',
            'This DPA covers Personal Data New Wave IT accesses, stores, transmits, or otherwise processes in performing the Services, including data on systems it manages, in backups it operates, in tickets and documentation, and in platforms it administers for Customer. It does not cover Customer’s own business contact information that New Wave IT uses for its own relationship with Customer, which the Privacy Policy covers.',
            'The nature of the processing is the technical support, administration, monitoring, security, backup, migration, and related services the Order describes; its duration is the Order’s term plus the retention periods below; the categories of individuals and data are those present in the Customer Environment, which Customer will identify to New Wave IT where they include sensitive categories.',
          ]}
        />
      </LegalSection>

      <LegalSection id="instructions" title="2. Processing on Instructions">
        <p>
          New Wave IT will process Personal Data only on Customer’s documented instructions, which are the
          Agreement, the Order, and reasonable written instructions consistent with them, and will tell
          Customer if it believes an instruction violates applicable privacy law. New Wave IT will not sell
          Personal Data, share it for cross-context behavioral advertising, retain, use, or disclose it for
          any purpose other than the Services or outside the direct business relationship with Customer, or
          combine it with Personal Data from other sources except as the Services require or law allows.
          New Wave IT will tell Customer if it can no longer meet these obligations, and Customer may then
          take reasonable steps to stop and remediate unauthorized processing.
        </p>
      </LegalSection>

      <LegalSection id="confidentiality-security" title="3. Confidentiality and Security">
        <LegalList
          items={[
            'New Wave IT limits access to Personal Data to personnel and subcontractors who need it for the Services and who are bound by confidentiality obligations and trained in data protection.',
            'New Wave IT maintains administrative, technical, and physical safeguards appropriate to the risk, including: multi-factor authentication and role-based access for its own systems and for the administrative access it holds to Customer systems; encryption in transit for remote access and data transfer, and at rest where its tools and platforms support it; logging of administrative activity in its management platforms; secure credential storage; endpoint protection and patching on its own devices; background screening of personnel with privileged access as law allows; and documented procedures for incident response and for revoking access when personnel leave.',
            'Customer is responsible for the security of the Customer Environment except to the extent an Order assigns a security service to New Wave IT, and for the configuration choices it makes or declines.',
          ]}
        />
      </LegalSection>

      <LegalSection id="subprocessors" title="4. Subcontractors and Subprocessors">
        <p>
          Customer authorizes New Wave IT to use the subcontractors and platforms listed in the{' '}
          <LegalLink to="/legal/schedule-of-third-party-services">Schedule of Third-Party Services</LegalLink>{' '}
          and any named in the Order. New Wave IT will impose data protection obligations on them
          consistent with this DPA and remains responsible for their performance. New Wave IT will give
          Customer at least 30 days’ notice before adding a subprocessor that will process Customer’s
          Personal Data, by updating that Schedule and notifying Customer’s designated contact; Customer may
          object in writing on reasonable data protection grounds, and if the parties cannot resolve the
          objection, Customer may terminate the affected Services without penalty. Vendors Customer itself
          selects, contracts with, or directs New Wave IT to use are Customer’s vendors, not New Wave IT’s
          subprocessors.
        </p>
      </LegalSection>

      <LegalSection id="incidents" title="5. Security Incidents">
        <p>
          New Wave IT will notify Customer’s designated contact without undue delay, and in any event
          within 72 hours, after confirming a breach of security leading to the accidental or unlawful
          destruction, loss, alteration, unauthorized disclosure of, or access to Personal Data in New Wave
          IT’s possession or in a system it manages that it becomes aware of through the Services. The
          notice will describe what is known about the nature of the incident, the data and individuals
          affected, the likely consequences, and the measures taken or proposed, and will be supplemented
          as information becomes available. New Wave IT will cooperate reasonably with Customer’s
          investigation and remediation. Customer is responsible for determining whether and how to notify
          individuals, regulators, insurers, and others, and New Wave IT will not make those notifications
          on Customer’s behalf unless an Order or law requires it. Reasonable incident-response work beyond
          the Services in the Order is billed as the Cybersecurity attachment provides, unless the incident
          was caused by New Wave IT’s breach of this DPA.
        </p>
      </LegalSection>

      <LegalSection id="assistance" title="6. Assistance with Rights and Assessments">
        <p>
          Taking into account the nature of the processing, New Wave IT will assist Customer, by
          appropriate technical and organizational measures and at Customer’s reasonable cost where the work
          is substantial, in responding to requests from individuals to exercise their privacy rights, and
          in meeting Customer’s obligations for security, incident notification, and data protection
          assessments. New Wave IT will forward to Customer, without responding, any request it receives
          directly from an individual about Customer’s Personal Data.
        </p>
      </LegalSection>

      <LegalSection id="audits" title="7. Audits and Compliance Information">
        <p>
          New Wave IT will make available the information reasonably necessary to demonstrate its
          compliance with this DPA, including summaries of its security practices and its subcontractors,
          and will complete Customer’s reasonable security questionnaires once per year. Where that is not
          sufficient to meet a legal obligation, Customer may conduct, or have an independent auditor bound
          by confidentiality conduct, an audit of New Wave IT’s relevant practices once per year on at least
          30 days’ notice, during Business Hours, without disrupting New Wave IT’s operations or exposing
          other customers’ data, and at Customer’s cost. Customer may also take reasonable and appropriate
          steps to ensure New Wave IT uses Personal Data consistently with Customer’s obligations.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="8. Location of Processing">
        <p>
          New Wave IT processes Personal Data in the United States. Platforms listed in the Schedule of
          Third-Party Services process data where their terms provide. New Wave IT will not transfer
          Personal Data outside the United States on its own initiative; where Customer’s own platforms
          do, Customer is responsible for the lawfulness of the transfer.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="9. Return and Deletion">
        <p>
          During the Order, New Wave IT retains Personal Data only as long as the Services require.
          At termination, on Customer’s request made within 30 days, New Wave IT will return Personal Data
          in its possession in a commonly used format, and will then delete the Personal Data it holds,
          including in its backups as they cycle out, within 90 days, unless law requires longer retention
          or the data is in a platform Customer continues to control. Ticket histories and engagement
          records that contain incidental Personal Data are retained under New Wave IT’s record-keeping
          practices and protected under section 3. New Wave IT will confirm deletion in writing on request.
        </p>
      </LegalSection>

      <LegalSection id="health-information" title="10. Protected Health Information">
        <p>
          Where the Services involve protected health information under HIPAA, the parties will sign a
          business associate agreement before New Wave IT handles that information, and that agreement
          controls over this DPA for that information.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="11. Liability">
        <p>
          Each party’s liability under this DPA is subject to the limitations of liability in the Master
          Services Agreement, except to the extent applicable law does not allow it to be limited.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
