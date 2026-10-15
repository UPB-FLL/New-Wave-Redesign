import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/project-services-attachment');

export default function LegalProjectServicesAttachmentPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Service Attachment adds terms for project work, network infrastructure, cellular DAS and
        public-safety systems, installations, and equipment repair to the{' '}
        <LegalLink to="/legal/master-services-agreement">Master Services Agreement</LegalLink>, which
        applies to everything it does not address.
      </AgreementSetNote>

      <LegalSection id="scope" title="1. Scope">
        <p>
          Project Services are fixed-scope engagements under a statement of work ("SOW"): network design
          and builds, structured cabling, wireless, cellular distributed antenna systems and public-safety
          radio coverage, server and infrastructure deployments, office moves and build-outs, hardware
          installation, and similar work. Repair Services are the diagnosis and repair of computers,
          servers, and devices, on site or in New Wave IT’s shop, whether or not under a managed plan.
          The <LegalLink to="/legal/schedule-of-services">Schedule of Services</LegalLink> defines each.
        </p>
      </LegalSection>

      <LegalSection id="sow" title="2. Statements of Work">
        <LegalList
          items={[
            'Each SOW states the scope, deliverables, assumptions, exclusions, site conditions relied on, schedule, fees (fixed, milestone, or time and materials with an estimate), and acceptance criteria. Work outside the SOW requires a change order before it starts, except for work needed to protect safety or prevent imminent loss, which New Wave IT may perform and bill at the SOW’s rates.',
            'Estimates for time-and-materials work are good-faith estimates, not caps, unless the SOW says they are caps. New Wave IT will tell Customer when work is expected to exceed an estimate by more than 10% and will not proceed beyond that without approval.',
            'Schedules depend on Customer access, decisions, permits, utility and carrier lead times, and equipment availability. Dates in a SOW are targets unless it states a guaranteed date and the consequences of missing it.',
            'Acceptance: Customer will test deliverables against the SOW’s acceptance criteria within 10 business days of New Wave IT’s notice of completion, and either accept them or give a written list of material nonconformities. Deliverables are accepted when Customer says so, when the period passes without a written list, or when Customer puts them into productive use.',
          ]}
        />
      </LegalSection>

      <LegalSection id="site" title="3. Site Conditions, Permits, and Safety">
        <LegalList
          items={[
            'Customer will provide safe access to the sites, pathways, ceilings, risers, telecom rooms, roofs, and electrical panels the work requires, during the hours the SOW states, and will tell New Wave IT about asbestos, hazardous materials, structural limits, and other site hazards it knows of before work starts.',
            'Customer is responsible for obtaining landlord consent and for any permits, inspections, and approvals from the authority having jurisdiction that the SOW does not assign to New Wave IT. Where a SOW assigns them to New Wave IT, permit fees and inspection scheduling are passed through and delays caused by the authority are excused.',
            'Public-safety radio coverage, cellular DAS, and life-safety systems must meet the codes and the authority having jurisdiction’s requirements in force at the site. New Wave IT designs and installs to the specification in the SOW and the test criteria it states; the authority’s acceptance and any carrier’s approval are outside New Wave IT’s control and their timing is excused. Changes the authority or carrier requires after design approval are change orders.',
            'Work that law requires to be performed by a licensed contractor is performed by, or under, an appropriately licensed contractor or subcontractor, which New Wave IT will identify on request.',
            'Concealed conditions discovered during work, such as unusable pathways, undocumented wiring, failed infrastructure, or code violations, are not within the SOW’s scope; New Wave IT will stop, document them, and propose a change order.',
          ]}
        />
      </LegalSection>

      <LegalSection id="equipment" title="4. Equipment and Materials">
        <LegalList
          items={[
            'Equipment and materials New Wave IT supplies are billed as the SOW states, are Third-Party Services under the Master Services Agreement, and carry only the manufacturer’s warranty, which New Wave IT will help Customer invoke. Title passes to Customer on payment; risk of loss passes on delivery to Customer’s site.',
            'Special-order equipment that cannot be returned is non-cancellable once ordered, and Customer will pay for it even if the SOW is later terminated.',
            'Equipment Customer supplies must be new or in known-good condition, with valid licenses; New Wave IT may charge for time spent diagnosing or working around Customer-supplied equipment that is not.',
            'Installed cabling is warranted against defects in New Wave IT’s workmanship for 12 months after acceptance, and to the test results delivered at acceptance. Manufacturer performance warranties for certified cabling systems apply as the manufacturer provides them.',
          ]}
        />
      </LegalSection>

      <LegalSection id="repair" title="5. Repair Services">
        <LegalList
          items={[
            'Diagnosis is billed at the diagnostic fee in the Order or the Schedule of Services and is credited against the repair if Customer approves it. New Wave IT will give a repair estimate before proceeding; approval may be given by email.',
            'Repair carries the risk of data loss. Customer will back up its data before handing over equipment, or request a paid backup, and New Wave IT is not responsible for data lost during diagnosis or repair except to the extent caused by its gross negligence.',
            'New Wave IT may use new, refurbished, or compatible parts that meet or exceed the original specification. Repair labor is warranted for 30 days; parts carry their supplier’s warranty.',
            'Equipment that is unrepairable, or whose repair Customer declines, is returned on payment of the diagnostic fee. Equipment not collected within 30 days after New Wave IT notifies Customer it is ready, and after a second notice, may be treated as abandoned and recycled or disposed of in a manner that protects data, at Customer’s cost.',
            'New Wave IT does not repair devices whose repair would violate a manufacturer’s terms in a way that creates liability for New Wave IT, nor devices containing content it is unlawful to possess; it will report unlawful content as law requires.',
          ]}
        />
      </LegalSection>

      <LegalSection id="customer-responsibilities" title="6. Customer Responsibilities">
        <LegalList
          items={[
            'designate a project contact with authority to make decisions and approve change orders;',
            'provide drawings, specifications, existing documentation, and vendor contacts it has;',
            'secure the site and Customer’s property; New Wave IT is responsible for its own tools and for damage its personnel cause through negligence;',
            'move or protect furniture, inventory, and sensitive equipment in work areas, or authorize New Wave IT to do so at hourly rates; and',
            'make payment on milestones when due; New Wave IT may pause work while a milestone payment is more than 15 days overdue.',
          ]}
        />
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
