import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/service-level-objectives');

const TH_CLASS = 'border-b border-slate-300 px-3 py-2 text-left align-top font-semibold text-slate-900';
const TD_CLASS = 'border-b border-slate-200 px-3 py-2 align-top';

const PRIORITIES = [
  {
    level: 'P1 Critical',
    definition: 'A site, a server, a core network, email, or a line-of-business system is down or unusable for most users, or a security incident is in progress.',
    response: '30 minutes, 24/7 on plans with 24/7 coverage; otherwise 30 minutes during Business Hours',
    update: 'Every 60 minutes until resolved or downgraded',
    resolution: '4 hours',
  },
  {
    level: 'P2 High',
    definition: 'A significant function is degraded or a group of users cannot work, with a workaround available or impact limited to part of the business.',
    response: '1 hour during coverage hours',
    update: 'Every 4 hours',
    resolution: '1 business day',
  },
  {
    level: 'P3 Normal',
    definition: 'A single user or a non-critical function is affected, or a request that does not block work: a how-to question, a software install, a permission change.',
    response: '4 Business Hours',
    update: 'On change of status',
    resolution: '3 business days',
  },
  {
    level: 'P4 Low',
    definition: 'A scheduled request, a planned change, onboarding or offboarding with notice, or a cosmetic issue.',
    response: '1 business day',
    update: 'On change of status',
    resolution: 'As scheduled with Customer',
  },
];

export default function LegalServiceLevelObjectivesPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        These Service Level Objectives ("SLOs") are part of the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink> and apply
        to Managed IT, Cybersecurity, and Cloud Services plans. An Order may state different targets, which
        control.
      </AgreementSetNote>

      <LegalSection id="objectives" title="1. Objectives, Not Guarantees">
        <p>
          SLOs are the targets New Wave IT manages its service desk to. They are measured and reported, and
          New Wave IT will review any period in which they are missed and tell Customer what it is changing.
          They are not warranties, and missing one does not by itself entitle Customer to credits,
          refunds, or termination unless the Order expressly provides service credits or a termination
          right tied to them. "Response" means a technician has acknowledged the ticket and begun work.
          "Resolution" means service is restored or a workaround is in place; a permanent fix may follow.
        </p>
      </LegalSection>

      <LegalSection id="priorities" title="2. Priority Levels and Targets">
        <p>
          New Wave IT assigns a priority when a ticket is opened, using Customer’s description and the
          definitions below, and may adjust it as facts emerge. Customer may ask for a higher priority
          with a business reason. Coverage hours are those in the Order; Business Hours are defined in the
          Schedule of Services.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-sm leading-6">
            <caption className="sr-only">Priority levels with their response, update, and resolution targets</caption>
            <thead>
              <tr>
                <th scope="col" className={TH_CLASS}>Priority</th>
                <th scope="col" className={TH_CLASS}>Definition</th>
                <th scope="col" className={TH_CLASS}>Response target</th>
                <th scope="col" className={TH_CLASS}>Updates</th>
                <th scope="col" className={TH_CLASS}>Resolution target</th>
              </tr>
            </thead>
            <tbody>
              {PRIORITIES.map((row) => (
                <tr key={row.level}>
                  <th scope="row" className={`${TD_CLASS} font-medium text-slate-900`}>{row.level}</th>
                  <td className={TD_CLASS}>{row.definition}</td>
                  <td className={TD_CLASS}>{row.response}</td>
                  <td className={TD_CLASS}>{row.update}</td>
                  <td className={TD_CLASS}>{row.resolution}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Targets are measured over each calendar month across all tickets of a priority; the objective is
          to meet the response target for at least 90% of tickets and to keep the average response time
          for P1 and P2 tickets under one hour.
        </p>
      </LegalSection>

      <LegalSection id="requests" title="3. How to Open a Request">
        <p>
          Requests are opened through the support portal, by email to the support address, by phone to the
          support line, or through the live chat on the Support page, and get a ticket number. P1 issues
          should be reported by phone, or by chat after hours on 24/7 plans, so they are not held in an
          email queue. Targets run from the time the ticket is created in New Wave IT’s system, or, for a
          phone call, from the call.
        </p>
      </LegalSection>

      <LegalSection id="patching" title="4. Patching and Maintenance Windows">
        <LegalList
          items={[
            'Operating system and supported application patches are applied monthly in the maintenance window agreed with Customer. Patches the vendor rates critical for an actively exploited vulnerability are scheduled within 72 hours of release, outside the normal window where needed, with notice.',
            'Planned maintenance that may interrupt service is scheduled outside Business Hours where practical and announced at least 2 business days in advance, except for emergency security maintenance, which is announced as soon as practical.',
            'Time in an announced maintenance window, and outages caused by a vendor’s own maintenance or incident, do not count against the SLOs.',
          ]}
        />
      </LegalSection>

      <LegalSection id="monitoring" title="5. Monitoring">
        <p>
          Monitored Covered Items are checked at the intervals New Wave IT’s tools support, and alerts for
          conditions New Wave IT has configured as critical open a ticket automatically at the priority the
          condition implies. Monitoring confirms a condition exists; it does not promise detection of every
          failure, and alert routing depends on the device and its agent being reachable.
        </p>
      </LegalSection>

      <LegalSection id="exclusions" title="6. Exclusions">
        <p>The SLOs do not apply to:</p>
        <LegalList
          items={[
            'items that are not Covered Items, or that do not meet the Baseline in the Schedule of Services;',
            'project work, change requests, and work awaiting Customer approval, information, access, or a decision;',
            'problems caused by Third-Party Services, carriers, utilities, or vendor outages beyond New Wave IT’s control, or by changes made by someone other than New Wave IT;',
            'periods during which Services are suspended under the Master Services Agreement, or Customer is more than 15 days overdue on undisputed amounts;',
            'force majeure events as the Master Services Agreement describes; and',
            'recovery from a security incident or data loss beyond what an Order covers, which is scoped separately.',
          ]}
        />
      </LegalSection>

      <LegalSection id="reporting" title="7. Reporting and Review">
        <p>
          New Wave IT reports ticket volumes and SLO performance in the business reviews the Order
          provides, and on request. Customer may escalate concerns about service to the escalation contact
          New Wave IT designates, and the parties will meet within 10 business days of a written request to
          agree on a remediation plan for any sustained shortfall.
        </p>
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
