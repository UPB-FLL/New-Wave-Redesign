import LegalPageLayout from '../components/legal/LegalPageLayout';
import { AgreementSetNote, LegalContact, LegalLink, LegalList, LegalSection } from '../components/legal/LegalDocument';
import { legalDocument } from '../lib/legalDocuments';
import { IT_PAGE_META, type ItPagePath } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

const DOC = legalDocument('/legal/master-services-agreement');

export default function LegalMasterServicesAgreementPage() {
  usePageMeta(IT_PAGE_META[DOC.path as ItPagePath]);

  return (
    <LegalPageLayout title={DOC.name} effectiveDate={DOC.effectiveDate}>
      <AgreementSetNote>
        This Master Services Agreement is the base agreement between New Wave IT LLC and each customer
        that signs an Order. The Service Attachments, the Schedule of Services, the Service Level
        Objectives, the Schedule of Third-Party Services, and the Data Processing Agreement are part of it.
      </AgreementSetNote>

      <LegalSection id="structure" title="1. The Agreement and Order of Precedence">
        <p>
          This Master Services Agreement ("MSA") is between New Wave IT LLC ("New Wave IT," "we," "us")
          and the customer named in an Order ("Customer," "you"). An "Order" is a proposal, quote, order
          form, statement of work, or similar document that describes services, fees, and term and that
          both parties sign or that Customer accepts in writing, including by email. Each Order incorporates
          this MSA and the documents listed on the <LegalLink to="/legal">Legal</LegalLink> page as they
          read on the Order's date (together, the "Agreement").
        </p>
        <p>If the documents conflict, the following order of precedence applies, highest first:</p>
        <LegalList
          ordered
          items={[
            'the signed Order, for the subject it expressly addresses;',
            'the Service Attachment for the service line concerned;',
            'this MSA;',
            <>the <LegalLink to="/legal/schedule-of-services">Schedule of Services</LegalLink>, the <LegalLink to="/legal/service-level-objectives">Service Level Objectives</LegalLink>, and the <LegalLink to="/legal/schedule-of-third-party-services">Schedule of Third-Party Services</LegalLink>; and</>,
            <>the website <LegalLink to="/terms-and-conditions">Terms and Conditions</LegalLink>, which fill any remaining gap.</>,
          ]}
        />
        <p>
          The <LegalLink to="/legal/data-processing-agreement">Data Processing Agreement</LegalLink> controls
          over all of the above for the handling of personal data. A business associate agreement signed
          for protected health information controls over the Agreement for that information.
        </p>
      </LegalSection>

      <LegalSection id="definitions" title="2. Definitions">
        <LegalList
          items={[
            <><strong>Services</strong> means the services described in an Order, as defined in the Schedule of Services and the applicable Service Attachment.</>,
            <><strong>Deliverables</strong> means reports, documentation, configurations, designs, and other work product that an Order says New Wave IT will deliver to Customer.</>,
            <><strong>Customer Environment</strong> means the systems, networks, devices, accounts, sites, and data that Customer owns or controls and that the Services cover or touch.</>,
            <><strong>Customer Data</strong> means data, content, and information Customer or its users provide to New Wave IT or that New Wave IT accesses in the Customer Environment to perform the Services.</>,
            <><strong>Third-Party Services</strong> means products, subscriptions, platforms, and services that someone other than New Wave IT provides, including those New Wave IT resells, provisions, or administers for Customer.</>,
            <><strong>Business Hours</strong> and the priority levels used in the Service Level Objectives have the meanings given there.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="orders" title="3. Orders and Changes">
        <p>
          New Wave IT will provide the Services described in each Order. Work outside an Order's scope,
          including additional users, sites, devices, hours, or deliverables, requires a change order or a
          new Order, and is otherwise billed at the hourly or unit rates stated in the Order, or in the
          Schedule of Services where the Order is silent. Either party may propose a change; neither is
          bound by it until both accept it in writing, including by email. New Wave IT may decline work
          that it considers unlawful, unsafe, or outside its expertise.
        </p>
      </LegalSection>

      <LegalSection id="term" title="4. Term and Renewal">
        <p>
          This MSA begins on the date of the first Order that incorporates it and continues while any Order
          is in effect. Each Order states its own start date and term. Where an Order for recurring Services
          does not state a term, the Services run month to month, and either party may end them on 30 days'
          written notice to take effect at the end of a billing month. An Order renews only if it says so,
          and for the renewal periods it states. A project Order ends when the work it describes is
          accepted or the Order is terminated under section 16.
        </p>
      </LegalSection>

      <LegalSection id="fees" title="5. Fees, Invoices, and Payment">
        <LegalList
          items={[
            <><strong>Fees.</strong> Customer will pay the fees in each Order. Recurring fees are invoiced monthly in advance; project fees are invoiced on the milestones the Order states, or on completion where it states none; hourly and unit-based work is invoiced in arrears.</>,
            <><strong>Payment.</strong> Invoices are due 15 days after the invoice date unless the Order states other terms. Customer will pay by the method the invoice names. Amounts not paid when due may accrue a late charge of 1.5% per month, or the highest rate applicable law allows if lower, and Customer will reimburse reasonable collection costs for undisputed amounts.</>,
            <><strong>Disputes.</strong> Customer must raise an invoice dispute in writing within 30 days of the invoice date, with the reason, and pay the undisputed part. The parties will work in good faith to resolve the dispute promptly.</>,
            <><strong>Suspension for nonpayment.</strong> If an undisputed amount is more than 15 days overdue, New Wave IT may suspend Services on 10 days' written notice until it is paid. Recurring fees continue to accrue during a suspension caused by nonpayment.</>,
            <><strong>Taxes.</strong> Fees exclude sales, use, and similar taxes, which Customer will pay unless it provides a valid exemption certificate. Each party is responsible for taxes on its own income.</>,
            <><strong>Expenses.</strong> Customer will reimburse travel and other expenses only where the Order provides for them or Customer approves them in advance in writing.</>,
            <><strong>Price changes.</strong> New Wave IT may change recurring fees on at least 30 days' written notice, to take effect no earlier than the end of the Order's then-current term. Third-Party Services are billed at the vendor's then-current price, and pass-through increases take effect when the vendor's do.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="customer-responsibilities" title="6. Customer Responsibilities">
        <p>Customer will, at its cost:</p>
        <LegalList
          items={[
            'give New Wave IT the timely access, information, credentials, and cooperation the Services reasonably require, including remote access and access to sites during agreed hours;',
            'designate at least one contact authorized to give instructions, approvals, and acceptance;',
            'keep its information accurate and tell New Wave IT promptly about changes in the Customer Environment that affect the Services;',
            'maintain the minimum software versions, licenses, hardware, internet service, and power the Order or the Schedule of Services requires, and replace unsupported or end-of-life equipment the Order does not cover;',
            'hold the licenses, consents, permits, and authorizations needed for New Wave IT to perform the Services, including from employees, landlords, and Third-Party Services;',
            'keep adequate backups of Customer Data unless an Order makes New Wave IT responsible for a backup service, and then only to the extent that Order describes;',
            'follow the reasonable security practices New Wave IT recommends, and accept that declining them may limit what the Services can achieve; and',
            'use the Services lawfully and only for its own business.',
          ]}
        />
        <p>
          New Wave IT is excused from a failure or delay to the extent Customer does not meet these
          responsibilities, and may bill time spent waiting or re-performing work as a result at its
          standard rates.
        </p>
      </LegalSection>

      <LegalSection id="access" title="7. Access and Authorization">
        <p>
          Customer authorizes New Wave IT to access, monitor, change, and manage the Customer Environment
          as the Services require, including by installing agents and tools, and represents that it has the
          right to give that authorization. New Wave IT will use administrative credentials only for the
          Services, will keep them confidential, and will return or disable its access when the Services end.
          Customer will not ask New Wave IT to access systems or data it is not entitled to access.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="8. Third-Party Services">
        <p>
          Third-Party Services are provided by their vendors under the vendor's own terms, which Customer
          accepts when New Wave IT provisions them on Customer's behalf. The{' '}
          <LegalLink to="/legal/schedule-of-third-party-services">Schedule of Third-Party Services</LegalLink>{' '}
          lists the ones commonly involved. New Wave IT is not the licensor or vendor of a Third-Party
          Service, does not warrant it, and is not responsible for its availability, security, price
          changes, or discontinuation, but will help Customer use the vendor's support and will tell
          Customer promptly about vendor changes that affect the Services.
        </p>
      </LegalSection>

      <LegalSection id="confidentiality" title="9. Confidentiality">
        <p>
          "Confidential Information" is nonpublic information one party discloses to the other in
          connection with the Agreement that is marked confidential or that a reasonable person would treat
          as confidential, including Customer Data, security information, pricing, and business plans. The
          receiving party will use Confidential Information only for the Agreement, protect it with at least
          reasonable care, and share it only with employees, contractors, and advisers who need it and are
          bound by comparable obligations. These obligations do not cover information that is or becomes
          public without breach, that the receiving party already had or independently develops, or that it
          lawfully receives from someone else without a duty of confidentiality. A party may disclose
          Confidential Information when law or a court requires it, after giving the other party notice
          where lawful so it can seek protection. These obligations last for three years after the Agreement
          ends, and for Customer Data and trade secrets for as long as they remain confidential.
        </p>
      </LegalSection>

      <LegalSection id="data" title="10. Customer Data and Security">
        <LegalList
          items={[
            'Customer owns Customer Data. New Wave IT will access and use it only to perform the Services, to protect the Customer Environment, and as the Agreement or law requires.',
            <>Personal data New Wave IT processes on Customer's behalf is governed by the <LegalLink to="/legal/data-processing-agreement">Data Processing Agreement</LegalLink>. Where the Services involve protected health information, the parties will sign a business associate agreement before that information is handled.</>,
            'New Wave IT will maintain reasonable administrative, technical, and physical safeguards for Customer Data in its possession, and will tell Customer without undue delay after confirming a security incident that affects it.',
            'No security measure prevents every incident. New Wave IT does not guarantee that the Customer Environment will be free of vulnerabilities, intrusions, malware, outages, or data loss, and the scope of any security, monitoring, backup, or recovery service is only what the Order and the applicable Service Attachment describe.',
          ]}
        />
      </LegalSection>

      <LegalSection id="intellectual-property" title="11. Intellectual Property">
        <LegalList
          items={[
            <><strong>Deliverables.</strong> On payment in full for the Order that produced them, Customer owns the Deliverables created specifically for Customer, except for New Wave IT Materials embedded in them.</>,
            <><strong>New Wave IT Materials.</strong> New Wave IT retains all rights in its tools, scripts, templates, configurations, methods, documentation, know-how, and anything it developed before or independently of the Order, including improvements to them. New Wave IT grants Customer a nonexclusive, perpetual license to use New Wave IT Materials embedded in a Deliverable, as part of that Deliverable, for Customer's internal business.</>,
            <><strong>Third-party and open-source components.</strong> These remain under their own licenses, which Customer accepts.</>,
            <><strong>Customer materials.</strong> Customer grants New Wave IT a license to use Customer's content, marks, data, and systems as needed to perform the Services.</>,
            <><strong>Feedback.</strong> New Wave IT may use suggestions about its services without restriction or compensation, without identifying Customer as the source.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="warranties" title="12. Warranties and Disclaimers">
        <p>
          New Wave IT warrants that it will perform the Services in a professional and workmanlike manner
          with reasonably qualified personnel. If Services do not meet this warranty, Customer's remedy is
          to tell New Wave IT in writing within 30 days of the work, and New Wave IT will re-perform the
          nonconforming Services at no extra charge, or, if it cannot, refund the fees paid for them. Each
          party warrants that it has authority to enter into the Agreement.
        </p>
        <p>
          Except as expressly stated in the Agreement, the Services, Deliverables, and Third-Party Services
          are provided "as is," and New Wave IT disclaims all other warranties, express or implied,
          including merchantability, fitness for a particular purpose, title, noninfringement, and any
          warranty that the Services will be uninterrupted, error-free, or will prevent every security
          incident, outage, or data loss. Advice about regulatory or compliance frameworks is technical
          assistance, not legal advice, and Customer remains responsible for its own compliance.
        </p>
      </LegalSection>

      <LegalSection id="limitation-of-liability" title="13. Limitation of Liability">
        <LegalList
          items={[
            'Neither party is liable to the other for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, goodwill, or business interruption, arising from the Agreement, however caused and under any theory of liability, even if advised of their possibility.',
            "Each party's total liability arising from the Agreement, in aggregate, will not exceed the fees Customer paid to New Wave IT under the Order giving rise to the claim in the 12 months before the event that gave rise to it.",
            "These limits do not apply to Customer's payment obligations, a party's breach of section 9 (Confidentiality), a party's indemnification obligations, or a party's gross negligence, willful misconduct, or fraud, or to liability that applicable law does not allow to be limited.",
            'The parties agree these limits are a reasonable allocation of risk reflected in the fees.',
          ]}
        />
      </LegalSection>

      <LegalSection id="indemnification" title="14. Indemnification">
        <LegalList
          items={[
            <><strong>By New Wave IT.</strong> New Wave IT will defend Customer against a third-party claim that a Deliverable, as delivered, infringes a United States patent, copyright, or trademark or misappropriates a trade secret, and will pay the damages and costs a court finally awards or a settlement New Wave IT approves. New Wave IT has no obligation for claims arising from Customer's materials, Third-Party Services, modifications New Wave IT did not make, use contrary to the documentation, or combinations with things New Wave IT did not provide. If a Deliverable is or may be enjoined, New Wave IT may procure the right to continue using it, replace or modify it to be noninfringing, or refund the fees paid for it and end the license.</>,
            <><strong>By Customer.</strong> Customer will defend New Wave IT and its personnel against a third-party claim arising from Customer Data or Customer's materials, Customer's instructions, Customer's use of the Services or the Customer Environment in breach of the Agreement or the law, or Customer's failure to hold a required license, consent, or authorization, and will pay the damages and costs a court finally awards or a settlement Customer approves.</>,
            <><strong>Process.</strong> The indemnified party must give prompt written notice of the claim, allow the indemnifying party to control the defense and settlement, and cooperate reasonably at the indemnifying party's expense. A settlement that admits fault or imposes an obligation on the indemnified party requires its consent, which it will not unreasonably withhold.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="insurance" title="15. Insurance">
        <p>
          New Wave IT maintains commercial general liability, technology errors and omissions, and cyber
          liability insurance in commercially reasonable amounts, and will provide certificates of
          insurance on request. Coverage amounts stated in an Order control over this section.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="16. Suspension, Termination, and Transition">
        <LegalList
          items={[
            <><strong>For cause.</strong> Either party may terminate an Order, or the Agreement, if the other party materially breaches it and does not cure within 30 days of written notice describing the breach, or immediately if the breach cannot be cured. Nonpayment of undisputed amounts for 30 days after notice is a material breach.</>,
            <><strong>Suspension.</strong> New Wave IT may suspend Services immediately, with notice as soon as practical, to the extent reasonably necessary to address a security risk, unlawful use, or a risk to New Wave IT's systems, personnel, or other customers, and will restore them once the cause is resolved.</>,
            <><strong>Insolvency.</strong> Either party may terminate if the other becomes insolvent, makes an assignment for the benefit of creditors, or is the subject of bankruptcy proceedings not dismissed within 60 days.</>,
            <><strong>Effect.</strong> Customer will pay for Services performed and non-cancellable Third-Party Services committed through the effective date of termination. Fees prepaid for recurring Services beyond that date are refunded pro rata when Customer terminates for New Wave IT's uncured breach, and are otherwise not refundable unless the Order says so.</>,
            <><strong>Transition.</strong> On request made before or within 30 days after termination, New Wave IT will provide reasonable transition assistance at its then-current hourly rates, including returning administrative credentials, documentation it holds for the Customer Environment, and Customer Data in its possession in a commonly used format. New Wave IT may delete Customer Data it holds 30 days after termination, subject to the Data Processing Agreement and law.</>,
            <><strong>Survival.</strong> Sections that by their nature should survive, including fees owed, confidentiality, intellectual property, warranties and disclaimers, limitation of liability, indemnification, and this section, survive termination.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="personnel" title="17. Personnel, Subcontractors, and Non-Solicitation">
        <p>
          New Wave IT is an independent contractor and controls how it performs the Services. It may use
          qualified subcontractors and remains responsible for their work. Nothing in the Agreement creates
          a partnership, joint venture, agency, or employment relationship, or an exclusive arrangement.
          During the term and for 12 months afterward, neither party will knowingly solicit for employment or
          engagement an employee of the other who worked on the Services, without the other's written consent;
          general advertisements and responses to them are not solicitation.
        </p>
      </LegalSection>

      <LegalSection id="publicity" title="18. Publicity">
        <p>
          New Wave IT may identify Customer by name as a customer, without describing the work, only with
          Customer's prior written consent, which Customer may withdraw at any time. Neither party will
          issue a press release about the Agreement without the other's approval.
        </p>
      </LegalSection>

      <LegalSection id="compliance" title="19. Compliance with Laws">
        <p>
          Each party will comply with the laws that apply to it in performing and receiving the Services.
          Customer is responsible for determining whether the Services meet its regulatory obligations and
          for its own policies, notices, and consents. New Wave IT will cooperate reasonably with Customer's
          compliance assessments as the Order provides. Neither party will export or allow access to the
          other's technology in violation of United States export laws.
        </p>
      </LegalSection>

      <LegalSection id="force-majeure" title="20. Force Majeure">
        <p>
          Neither party is liable for a delay or failure caused by events beyond its reasonable control,
          including natural disasters, severe weather, utility or internet failures, vendor or carrier
          outages, epidemics, labor disputes, government action, and attacks on systems that reasonable
          security would not have prevented, for as long as the event continues, provided it uses
          reasonable efforts to mitigate the effect. This does not excuse payment for Services performed.
          If the event continues for more than 60 days, either party may terminate the affected Order on
          written notice.
        </p>
      </LegalSection>

      <LegalSection id="notices" title="21. Notices">
        <p>
          Legal notices must be in writing and delivered by hand, courier, certified mail, or email with
          confirmation of receipt, to New Wave IT at the address in section 24 or at{' '}
          <a className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900" href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>,
          and to Customer at the address or email in the Order. Day-to-day operational communications may
          use the support channels and contacts the parties designate.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="22. Governing Law and Venue">
        <p>
          Florida law governs the Agreement without regard to its conflict-of-laws rules. The state and
          federal courts serving Broward County, Florida have exclusive jurisdiction and venue over disputes
          arising from or relating to the Agreement, and each party submits to them. Before filing suit,
          other than for injunctive relief or collection of undisputed fees, the parties will have senior
          representatives meet, in person or by video, within 30 days of a written request, to try to resolve
          the dispute.
        </p>
      </LegalSection>

      <LegalSection id="general" title="23. General Terms">
        <LegalList
          items={[
            <><strong>Entire agreement.</strong> The Agreement is the parties' entire agreement for its subject and replaces prior proposals and discussions. Terms on a Customer purchase order or portal that add to or differ from the Agreement have no effect, even if New Wave IT acknowledges the purchase order.</>,
            <><strong>Amendments.</strong> Changes to an Order or this MSA as applied to Customer require a writing signed or expressly accepted by both parties. New Wave IT may revise the documents on the Legal page for future Orders; an existing Order keeps the versions in force on its date unless Customer accepts the new ones.</>,
            <><strong>Assignment.</strong> Neither party may assign the Agreement without the other's consent, not to be unreasonably withheld, except to a successor in a merger, acquisition, or sale of substantially all its assets, on notice. The Agreement binds permitted successors and assigns.</>,
            <><strong>Severability and waiver.</strong> An unenforceable provision will be adjusted only as necessary and the rest remains effective. A failure to enforce a provision is not a waiver.</>,
            <><strong>Electronic signatures and counterparts.</strong> Orders may be signed electronically and in counterparts, and acceptance by email is binding.</>,
            <><strong>Interpretation.</strong> Headings are for convenience; "including" means "including without limitation"; days are calendar days unless stated as business days.</>,
          ]}
        />
      </LegalSection>

      <LegalContact />
    </LegalPageLayout>
  );
}
