# Service agreement documents (October 15, 2026)

The `/legal` section publishes New Wave IT LLC's service agreement set, modeled
on the document structure MSPs commonly publish (a master agreement, a service
attachment per service line, and schedules). The pages are first-party routes
(`src/pages/Legal*.tsx`), registered in `src/lib/legalDocuments.ts`, and listed
on `/legal` (`LegalHubPage.tsx`). They are drafts for the owner's attorney; they
are not legal advice and the site must not describe them as reviewed by counsel
until they are.

| Path | Document |
| --- | --- |
| `/legal` | Hub: current terms and conditions, website policies |
| `/legal/master-services-agreement` | Master Services Agreement (MSA) |
| `/legal/managed-it-services-attachment` | Service Attachment for Managed IT Services |
| `/legal/cybersecurity-services-attachment` | Service Attachment for Cybersecurity Services |
| `/legal/cloud-services-attachment` | Service Attachment for Cloud Services |
| `/legal/project-services-attachment` | Service Attachment for Projects, Network Infrastructure, and Repairs |
| `/legal/marketing-services-attachment` | Service Attachment for Marketing and Digital Services (New Wave: Social Engineering) |
| `/legal/schedule-of-services` | Schedule of Services |
| `/legal/data-processing-agreement` | Data Processing Agreement |
| `/legal/service-level-objectives` | Service Level Objectives |
| `/legal/schedule-of-third-party-services` | Schedule of Third-Party Services |

## Drafting rules followed

- Commercial specifics live in the signed Order (proposal, quote, order form,
  SOW). The documents fill gaps with a stated default only where an agreement
  that said nothing would be unworkable; every such default is listed below
  for the owner to confirm or change.
- Consistent with the website's claims: "no long-term contracts" (month to
  month by default, renewal only if the Order says so), "sub-1-hour average
  response" (the SLO objective), Florida law and Broward County venue (as in
  the Terms), no sale of personal data (as in the Privacy Policy), and the
  Customers page's rule that New Wave IT names a customer only with consent.
- No guarantees of security, uptime, or marketing results; compliance help is
  technical assistance, not legal advice; a BAA is signed before PHI is
  handled.
- Third parties are named only where the repository shows them (SuperOps,
  Supabase, Vercel, Resend, Twilio) or where they are generic categories the
  Order fills in.

## Defaults the owner should confirm

Each of these is a judgment call written into the documents. Change the text
and the effective date together.

| Document | Default chosen | Where |
| --- | --- | --- |
| MSA 4 | Recurring services run month to month when the Order is silent; 30 days' notice to end | Term and Renewal |
| MSA 5 | Invoices due in 15 days; late charge 1.5% per month or the legal maximum; suspension after 15 days overdue on 10 days' notice; disputes within 30 days; price changes on 30 days' notice at term end | Fees |
| MSA 9 | Confidentiality lasts 3 years after the Agreement ends (longer for Customer Data and trade secrets) | Confidentiality |
| MSA 12 | Warranty remedy: re-performance if reported within 30 days, else refund | Warranties |
| MSA 13 | Liability cap: fees paid under the Order in the prior 12 months; carve-outs for payment, confidentiality, indemnities, gross negligence, willful misconduct, fraud | Limitation of Liability |
| MSA 15 | Insurance named by type only (GL, tech E&O, cyber), no amounts | Insurance |
| MSA 16 | Cure period 30 days; transition assistance at hourly rates; data deleted 30 days after termination | Termination |
| MSA 17 | Mutual non-solicitation of employees for 12 months, no liquidated damages | Personnel |
| MSA 22 | Executive meeting within 30 days before suit; no arbitration, no class waiver, no jury waiver (left for the attorney) | Governing Law |
| Managed IT 5 | Monthly fee adjusts to audited counts from the next billing month | Changes |
| Cloud 3 | Migration acceptance window 10 business days | Migrations |
| Projects 2, 4, 5 | Change orders above 10% of an estimate; acceptance 10 business days; cabling workmanship warranty 12 months; repair labor warranty 30 days; abandoned equipment after 30 days and a second notice | SOW, Equipment, Repair |
| Marketing 2, 4 | Two review rounds per phase; content not rejected in the review period may be published | Approvals, Websites |
| Marketing 7 | Portfolio use of public work, naming the customer, unless the customer opts out | Portfolio |
| Schedule 1 | Business Hours 8 a.m. to 6 p.m. Eastern, Monday to Friday; 15-minute billing increments after the first hour | Standard Terms |
| DPA 4, 5, 7, 9 | 30 days' notice of new subprocessors; incident notice within 72 hours of confirmation; one audit per year on 30 days' notice at the customer's cost; deletion within 90 days of termination | Subprocessors, Incidents, Audits, Deletion |
| SLO 2 | P1 30 min / P2 1 hr / P3 4 business hours / P4 1 business day response; 90% attainment; no service credits unless the Order grants them | Priorities |
| SLO 4 | Critical patches within 72 hours; maintenance announced 2 business days ahead | Patching |

## Attorney review points

- Whether to add arbitration, a class-action waiver, or a jury-trial waiver.
- Insurance amounts, and whether customers may require additional insured status.
- Whether the liability cap should have a floor (a fixed dollar amount) for small Orders.
- The abandoned-equipment and lien language in the repair terms against Florida law.
- The public-safety and DAS terms against the licensing rules that apply to the specific work performed.
- The DPA against the state privacy laws of the customers the firm actually serves, and the BAA template to pair with it.
- Whether the marketing attachment's "deemed approved after the review period" clause fits the firm's clients.

## How the pages are wired

`src/lib/legalDocuments.ts` is the registry (paths, names, summaries, dates).
Each page spreads its `IT_PAGE_META` entry (`src/lib/routeMeta.ts`; documents
under `/legal/` get the Legal breadcrumb), has a `<Route>` in `App.tsx`, a
`vercel.json` rewrite, and a sitemap `<url>` with `lastmod`.
`src/pages/LegalSectionPages.test.tsx` fails until all of them agree and checks
each page renders; the SEO suites prerender and parity-check them like every
other static route. The footer's legal links start with "Legal".
