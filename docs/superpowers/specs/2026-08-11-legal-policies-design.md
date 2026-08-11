# Legal Policies Design

**Date:** August 11, 2026
**Owner:** New Wave IT LLC
**Site:** https://www.newwaveitfl.com

## Purpose

Add business-ready U.S.-focused Terms and Conditions, Privacy Policy, and Cookie Policy pages to the New Wave IT website. Connect the existing disabled footer labels to the new pages and add a Cookie Policy link. The documents must reflect the website's actual data flows and distinguish website activity from paid managed IT services.

The documents are operational drafts for review by New Wave IT LLC's licensed attorney. They must not claim guaranteed legal compliance or replace contract-specific legal advice.

## Scope and Assumptions

- The site and services are offered only in the United States, primarily from Fort Lauderdale, Florida.
- The operator is **New Wave IT LLC**.
- The published business address is **710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311**.
- The primary published email is **support@newwaveitfl.com**. The privacy contact will use this address unless the business supplies a dedicated privacy address.
- The Terms cover public website use and paid IT services when no separate agreement governs.
- Any signed master services agreement, statement of work, order form, proposal, or similar service agreement controls over conflicting website Terms.
- Google Analytics is planned but is not currently implemented. The policies must not represent it as active.
- This project does not activate Google Analytics or add a cookie-consent platform.

## Chosen Approach

Create three first-party routes:

- `/terms-and-conditions`
- `/privacy-policy`
- `/cookie-policy`

Standalone pages are preferable to one combined legal page because each document has a distinct purpose, can be linked directly, and can be revised independently. First-party pages preserve site navigation, branding, accessibility, and user trust better than externally hosted documents.

## Information Practices Reflected in the Drafts

The policies will cover only practices supported by the repository or explicitly described as planned:

- Contact forms: name, email, phone, company, and message; delivered through Resend and also stored in Supabase.
- Quote requests: contact details, selected services, estimates, and messages; delivered through Resend.
- Support email forms: name, email, subject, and message; delivered through Resend.
- Customer portal login: email address, one-time codes, session tokens, and customer ticket information through SuperOps and Supabase.
- Support chat/SMS: visitor contact details, chat messages, session details, and technician replies through Supabase and Twilio.
- Website analytics: Vercel Analytics currently runs.
- Embedded chatbot functionality: Elfsight currently loads as a third-party script.
- Browser storage: local storage for content caching and session storage for portal/chat tokens.
- Administration: Supabase authentication and content-management records.
- Planned analytics: Google Analytics may be added later, but is not active as of the effective date.

The policies will not claim that New Wave IT LLC sells personal information, uses targeted advertising, or supports privacy signals unless those statements are accurate and supported by the implementation. The Privacy Policy will state present practices conservatively and provide a method for submitting applicable state-law requests.

## Terms and Conditions Content

The Terms will contain:

1. Acceptance and eligibility.
2. Website informational use and changes.
3. Quotes and inquiries not constituting binding service orders.
4. Paid services and the precedence of signed service documents.
5. Fees, invoicing, taxes, and payment obligations as stated in the applicable service document or invoice, without inventing deadlines or late-fee percentages.
6. Customer responsibilities, access, backups, permissions, cooperation, and lawful use.
7. Third-party products, licenses, cloud services, telecommunications, and vendor terms.
8. Acceptable-use restrictions.
9. Intellectual-property ownership and limited website license.
10. Confidentiality and security responsibilities, subject to separate agreements where applicable.
11. Service changes, suspension, and termination subject to controlling service documents.
12. Disclaimers, including that cybersecurity and availability cannot be guaranteed.
13. A commercially cautious limitation of liability, subject to applicable law and any controlling service agreement.
14. Indemnification tied to misuse, unlawful content, and customer breach.
15. Privacy and electronic communications.
16. Florida governing law and venue in Broward County, without adding mandatory arbitration or a class-action waiver.
17. Changes, severability, assignment, waiver, entire agreement, and contact information.

## Privacy Policy Content

The Privacy Policy will contain:

1. Scope and operator identity.
2. Categories of information collected directly, automatically, and from service partners.
3. Purposes for collection and use.
4. Disclosure to service providers, professional advisers, transaction parties, authorities, and at the user's direction.
5. A clear statement of current practices concerning sale, sharing, and targeted advertising.
6. Retention based on operational, contractual, security, and legal needs rather than unsupported fixed periods.
7. Security safeguards and a no-guarantee statement.
8. U.S. processing and U.S.-only service scope.
9. State privacy rights that apply based on residency and statutory thresholds, plus identity verification and authorized-agent handling.
10. Browser privacy controls and Global Privacy Control treatment where legally required.
11. Children's privacy; services are not directed to children under 13.
12. Third-party links and services.
13. Policy updates and contact information.

The policy will avoid implying that every state privacy statute applies to New Wave IT LLC regardless of statutory thresholds. It will provide a general rights-request channel and explain that rights vary by jurisdiction.

## Cookie Policy Content

The Cookie Policy will explain cookies and comparable technologies, then describe:

- Strictly necessary or functional storage used for content caching, support sessions, authentication, security, and user-requested features.
- Vercel Analytics as currently active analytics technology, using language consistent with its deployed behavior and current vendor documentation.
- Elfsight as an active embedded third-party chatbot that may use its own storage or tracking technologies.
- Google Analytics as planned and inactive. A dedicated section will say that, if enabled, Google Analytics may use identifiers such as `_ga` and collect usage, device, browser, approximate-location, and session information.
- Browser controls and the limitations of disabling storage.
- A requirement to update the policy and implement appropriate user controls before Google Analytics is activated.

The page will not display a cookie table with guessed cookie names, providers, or retention periods. Exact details must be added after a production cookie scan when Google Analytics is configured.

## Application Architecture

### Shared legal-page component

Create a focused reusable legal-page layout that provides:

- Existing site Navbar and Footer.
- A readable constrained text column with semantic headings and lists.
- Page title, effective date, and optional review notice.
- Accessible skip/anchor behavior using standard document structure.
- Responsive typography consistent with the current visual system.

The legal copy will live in three dedicated page components so it remains reviewable in source control. It will not be stored in the editable Supabase content system in this iteration because legal text should not be casually modified through the general content editor.

### Routing and metadata

Register all three static routes in `src/App.tsx`. Each page will use the existing `usePageMeta` helper with a unique title, description, and canonical URL.

### Footer links

Replace disabled/external-anchor behavior with React Router links to the three internal routes. The links must work even when optional footer content has not loaded from Supabase. Admin-configured `privacy_url` and `terms_url` will no longer determine whether the legal labels are active; the first-party policies are canonical.

### Sitemap

Add all three canonical URLs to `public/sitemap.xml`.

## Error and Edge-Case Handling

- Legal routes are static and must render without Supabase content.
- Footer legal navigation must remain active if footer content fetches fail.
- No Google tag or Google cookie description may be presented as currently active.
- No consent banner will be shown solely for a planned integration. Google Analytics activation is a separate future task that must include a production assessment of consent and opt-out requirements.
- Third-party service descriptions will use qualified language because vendors can change their exact storage behavior.

## Verification

1. Run the TypeScript type check.
2. Run ESLint and distinguish pre-existing failures from changes introduced here.
3. Run the production build.
4. Render each legal route at desktop and mobile widths.
5. Verify Navbar and Footer navigation on each legal page.
6. Verify all three footer legal links from the home page and an interior page.
7. Confirm canonical metadata and page titles.
8. Confirm sitemap entries.
9. Search the built source to verify no Google Analytics tag or measurement ID was added.
10. Review policy statements against current deployed code and authoritative regulatory/vendor guidance immediately before completion.

## Out of Scope

- Attorney approval or a legal-compliance guarantee.
- Drafting a full customer-specific MSA, BAA, SLA, DPA, or statement of work.
- Activating Google Analytics, Google Ads, Google Tag Manager, or consent mode.
- Adding a consent-management platform or cookie banner.
- Creating fixed commercial terms that New Wave IT LLC has not approved, including cancellation windows, refund policies, SLA credits, late fees, or payment deadlines.
- Changing data retention or vendor configurations.

## Future Activation Gate for Google Analytics

Before Google Analytics goes live, New Wave IT LLC must:

1. Supply the production GA4 Measurement ID.
2. Decide whether Google Ads, Signals, enhanced measurement, cross-domain measurement, or advertising features will be enabled.
3. Review consent and opt-out requirements for the actual visitor population and applicable state laws.
4. Implement a consent/control mechanism appropriate to those decisions.
5. Perform a production cookie and network-request scan.
6. Update the Privacy and Cookie Policies with the verified configuration, cookie names, purposes, and retention.
7. Verify that the Google tag honors the selected consent behavior before deployment.
