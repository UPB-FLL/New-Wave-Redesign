import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/cybersecurity-services-attachment');

export default function LegalCybersecurityServicesAttachmentPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Service Attachment adds terms for Cybersecurity Services to the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink>, which
        applies to everything it does not address.
      </AgreementSetNote>

      <LegalSection id="scope" title="1. Scope">
        <p>
          Cybersecurity Services are the security monitoring, protection, assessment, training, and
          compliance-assistance services an Order lists, delivered to the covered items it names. The{' '}
          <LegalLink to="/legal/schedule-of-services">Schedule of Services</LegalLink> defines each
          component. Services may include managed detection and response, endpoint protection, email
          security, multi-factor authentication rollout, vulnerability scanning, security awareness
          training, phishing simulation for Customer’s own workforce, log collection and review,
          security assessments, policy assistance, and authorized security testing.
        </p>
      </LegalSection>

      <LegalSection id="no-guarantee" title="2. No Guarantee of Security">
        <p>
          Security services reduce risk; they do not eliminate it. New Wave IT does not warrant that the
          Services will detect or prevent every threat, vulnerability, intrusion, malware infection, data
          loss, or business interruption, or that the Customer Environment will meet any standard other
          than those an Order expressly names as deliverables. Threats change faster than any control, and
          detection depends on the telemetry Customer’s systems can provide. Customer remains responsible
          for its security program, its risk decisions, and its own compliance.
        </p>
      </LegalSection>

      <LegalSection id="monitoring" title="3. Monitoring, Detection, and Response">
        <LegalList
          items={[
            'Monitoring covers the sources and the hours the Order states. Alerts are triaged by New Wave IT or by the managed detection partner named in the Schedule of Third-Party Services.',
            'For a confirmed or suspected incident on a covered item, New Wave IT will take the containment actions the Order authorizes in advance, which may include isolating a device, disabling an account, or blocking traffic, and will notify Customer’s designated contact without undue delay. Customer accepts that containment can interrupt business operations.',
            'Incident response beyond containment, including investigation, eradication, recovery, forensics, and reporting, is scoped and billed as stated in the Order or, where the Order is silent, at the incident response rates in the Schedule of Services.',
            'New Wave IT does not provide legal advice about breach notification obligations, ransom payments, law enforcement, insurers, or regulators, and will not negotiate with threat actors. It will cooperate with Customer’s counsel, insurer, and forensic firm as Customer directs.',
          ]}
        />
      </LegalSection>

      <LegalSection id="testing" title="4. Authorized Security Testing">
        <p>Vulnerability scanning, penetration testing, and phishing simulation are performed only under these conditions:</p>
        <LegalList
          items={[
            'Customer signs written rules of engagement that list the systems, addresses, domains, accounts, dates, hours, methods, and exclusions, and warrants that it owns or has the right to authorize testing of each target, including hosted and third-party systems whose providers require notice or consent.',
            'Testing is limited to the agreed targets and methods and stops on Customer’s instruction. New Wave IT will avoid denial-of-service techniques and destructive actions unless the rules of engagement expressly allow them.',
            'Testing can disrupt systems, trigger alerts, and expose fragile configurations. Customer will keep current backups before testing and accepts that New Wave IT is not liable for disruption that results from testing performed within the rules of engagement.',
            'Findings are Confidential Information of Customer. New Wave IT keeps a copy as part of its engagement records under the Master Services Agreement and may use anonymized, aggregated learnings that cannot identify Customer.',
            'Phishing simulation targets only Customer’s workforce, uses content Customer approves, and is disclosed to Customer’s management. Customer is responsible for any employee communications, policies, and consents its jurisdiction requires.',
          ]}
        />
      </LegalSection>

      <LegalSection id="compliance" title="5. Compliance Assistance">
        <p>
          Where an Order includes assistance with a framework such as HIPAA, PCI DSS, SOC 2, CMMC, NIST,
          or a cyber-insurance questionnaire, New Wave IT provides technical controls, documentation
          support, gap assessments, and remediation work as the Order describes. It does not certify,
          attest, audit, or warrant Customer’s compliance, does not act as Customer’s compliance or
          privacy officer, and does not provide legal advice. Assessments reflect the environment as
          observed on the assessment dates. Where the Services involve protected health information, the
          parties will sign a business associate agreement first.
        </p>
      </LegalSection>

      <LegalSection id="training" title="6. Security Awareness Training">
        <p>
          Training content is licensed from the platform named in the Schedule of Third-Party Services or
          prepared by New Wave IT. Customer is responsible for requiring its workforce to complete training
          and for the accuracy of the user lists it provides. Completion and phishing-simulation results are
          reported to Customer’s designated contacts and are not used by New Wave IT for any other purpose.
        </p>
      </LegalSection>

      <LegalSection id="customer-responsibilities" title="7. Customer Responsibilities">
        <LegalList
          items={[
            'name an incident contact reachable during the coverage hours, and an escalation contact;',
            'deploy and keep the security agents and configurations New Wave IT requires on covered items, and apply the remediations New Wave IT identifies as critical within the time the Service Level Objectives state, or accept the risk in writing;',
            'maintain multi-factor authentication, backups, and the baseline controls the Schedule of Services lists, which the Services assume are in place;',
            'tell New Wave IT promptly about suspected incidents, lost devices, departing users with privileged access, and changes to covered systems; and',
            'hold any consents and give any notices its laws and contracts require for monitoring, logging, and testing of its systems and workforce.',
          ]}
        />
      </LegalSection>

      <LegalSection id="data" title="8. Security Data">
        <p>
          Security telemetry, logs, alerts, and findings collected under the Order are Customer Data and
          are handled under the Data Processing Agreement. Platforms named in the Schedule of Third-Party
          Services process them under the vendor’s terms. New Wave IT retains logs for the period the
          Order or the platform provides, and does not guarantee the availability of logs beyond that
          period or logs that Customer’s systems did not generate.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
