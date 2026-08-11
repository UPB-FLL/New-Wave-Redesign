# Legal Policies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish accurate U.S.-focused Terms and Conditions, Privacy Policy, and Cookie Policy pages for New Wave IT LLC and connect them to the site's existing legal navigation.

**Architecture:** Add three static React Router pages backed by a shared semantic `LegalPageLayout` component. Keep reviewed legal copy in source-controlled page modules, register canonical metadata and routes in the existing Vite/React application, and make the Footer's legal links unconditional first-party routes.

**Tech Stack:** React 18, TypeScript 5.5, React Router 7, Vite 5, Tailwind CSS 3, Vitest, React Testing Library.

## Global Constraints

- The operator name is exactly **New Wave IT LLC**.
- The published address is exactly **710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311**.
- The primary legal/privacy contact is **support@newwaveitfl.com**.
- The site and services are offered only in the United States.
- The Terms cover both website use and paid IT services, but signed MSAs, proposals, statements of work, order forms, and similar service documents control over conflicts.
- Do not invent cancellation periods, SLAs, refund promises, payment deadlines, late fees, or service credits.
- Do not add mandatory arbitration or a class-action waiver.
- Google Analytics is planned and inactive. Do not add a Google tag, Measurement ID, Tag Manager, Consent Mode, or consent banner.
- Describe Vercel Analytics and Elfsight as active; describe Google Analytics only as planned.
- Keep legal content in source control, not the Supabase content editor.
- Treat the documents as attorney-review drafts; do not claim guaranteed compliance.
- Git commits remain optional execution checkpoints and require explicit user authorization before running.

## File Map

- Create `src/components/legal/LegalPageLayout.tsx`: shared page chrome and semantic legal-document layout.
- Create `src/pages/TermsAndConditionsPage.tsx`: website and paid-services terms.
- Create `src/pages/PrivacyPolicyPage.tsx`: privacy disclosures and U.S. state-rights process.
- Create `src/pages/CookiePolicyPage.tsx`: active storage/analytics disclosures and planned GA4 disclosure.
- Create `src/test/setup.ts`: DOM cleanup and jest-dom matchers.
- Create `src/components/legal/LegalPageLayout.test.tsx`: shared layout semantics.
- Create `src/pages/LegalPages.test.tsx`: policy identity, active/planned technology language, and route-link assertions.
- Modify `vite.config.ts`: Vitest jsdom configuration.
- Modify `tsconfig.app.json`: include Vitest/jest-dom types if not inferred from setup.
- Modify `package.json` and `package-lock.json`: add the test script and test-only dependencies.
- Modify `src/App.tsx`: register three routes and imports.
- Modify `src/components/Footer.tsx`: use unconditional internal links for all policies.
- Modify `public/sitemap.xml`: add three canonical URLs.

---

### Task 1: Legal Layout and Test Harness

**Files:**
- Create: `src/components/legal/LegalPageLayout.tsx`
- Create: `src/components/legal/LegalPageLayout.test.tsx`
- Create: `src/test/setup.ts`
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: existing `Navbar`, `Footer`, and React `ReactNode`.
- Produces: `LegalPageLayout({ title, effectiveDate, children }: LegalPageLayoutProps): JSX.Element`.

- [ ] **Step 1: Install the test-only dependencies and add the test script**

Run:

```powershell
npm.cmd install --save-dev vitest@^2.1.9 jsdom@^25.0.1 @testing-library/react@^16.1.0 @testing-library/jest-dom@^6.6.3
```

Add this exact script to `package.json`:

```json
"test": "vitest run"
```

- [ ] **Step 2: Configure Vitest and the DOM setup**

Merge this test block into the existing `defineConfig` object in `vite.config.ts` and add the `/// <reference types="vitest/config" />` directive if TypeScript requires it:

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
},
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());
```

Add `"vitest/globals"` and `"@testing-library/jest-dom"` to `compilerOptions.types` in `tsconfig.app.json` only if the first test run reports missing matcher or Vitest types.

- [ ] **Step 3: Write the failing layout test**

Create `src/components/legal/LegalPageLayout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LegalPageLayout from './LegalPageLayout';

vi.mock('../Navbar', () => ({ default: () => <nav aria-label="Primary">Navigation</nav> }));
vi.mock('../Footer', () => ({ default: () => <footer>Footer</footer> }));

describe('LegalPageLayout', () => {
  it('renders site chrome and a semantic legal document', () => {
    render(
      <MemoryRouter>
        <LegalPageLayout title="Privacy Policy" effectiveDate="August 11, 2026">
          <section aria-labelledby="collection"><h2 id="collection">Information We Collect</h2></section>
        </LegalPageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Effective date: August 11, 2026')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 2 }));
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- src/components/legal/LegalPageLayout.test.tsx
```

Expected: FAIL because `LegalPageLayout.tsx` does not exist.

- [ ] **Step 5: Implement the shared layout**

Create `src/components/legal/LegalPageLayout.tsx` with this interface and structure:

```tsx
import type { ReactNode } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

export default function LegalPageLayout({ title, effectiveDate, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen relative bg-white">
      <Navbar />
      <main className="relative z-10 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-12 lg:px-14">
          <header className="mb-10 border-b border-slate-200 pb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Legal</p>
            <h1 className="text-4xl tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
            <p className="mt-4 text-sm text-slate-500">Effective date: {effectiveDate}</p>
          </header>
          <div className="legal-document space-y-8 text-base leading-7 text-slate-700">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
```

Add narrowly scoped `.legal-document` heading, paragraph, list, link, and `scroll-margin-top` rules to `src/index.css` only if Tailwind utilities inside the three policy pages would otherwise be repeated excessively.

- [ ] **Step 6: Run the focused test and type check**

Run:

```powershell
npm.cmd test -- src/components/legal/LegalPageLayout.test.tsx
npm.cmd run typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Optional authorized commit checkpoint**

Only after explicit user authorization:

```powershell
git add -- package.json package-lock.json vite.config.ts tsconfig.app.json src/test/setup.ts src/components/legal/LegalPageLayout.tsx src/components/legal/LegalPageLayout.test.tsx src/index.css
git commit -m "test: add legal page layout harness"
```

---

### Task 2: Terms, Privacy, and Cookie Pages

**Files:**
- Create: `src/pages/TermsAndConditionsPage.tsx`
- Create: `src/pages/PrivacyPolicyPage.tsx`
- Create: `src/pages/CookiePolicyPage.tsx`
- Create: `src/pages/LegalPages.test.tsx`

**Interfaces:**
- Consumes: `LegalPageLayout` and existing `usePageMeta`.
- Produces: default-exported zero-argument React page components for the three routes.

- [ ] **Step 1: Write failing policy-content tests**

Create `src/pages/LegalPages.test.tsx`. Mock `usePageMeta`, Navbar, and Footer, then render each page inside `MemoryRouter`. Include these exact assertions:

```tsx
expect(screen.getByRole('heading', { level: 1, name: 'Terms and Conditions' })).toBeInTheDocument();
expect(screen.getByText(/New Wave IT LLC/)).toBeInTheDocument();
expect(screen.getByRole('heading', { name: /Paid Services and Service Agreements/i })).toBeInTheDocument();
expect(screen.getByText(/signed.*service agreement.*control/i)).toBeInTheDocument();
expect(screen.getByText(/Broward County, Florida/i)).toBeInTheDocument();

expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
expect(screen.getByRole('heading', { name: /Information We Collect/i })).toBeInTheDocument();
expect(screen.getByText(/Vercel Analytics/i)).toBeInTheDocument();
expect(screen.getByText(/Elfsight/i)).toBeInTheDocument();
expect(screen.getByText(/Twilio/i)).toBeInTheDocument();
expect(screen.getByText(/SuperOps/i)).toBeInTheDocument();

expect(screen.getByRole('heading', { level: 1, name: 'Cookie Policy' })).toBeInTheDocument();
expect(screen.getByText(/Google Analytics is not currently active/i)).toBeInTheDocument();
expect(screen.getByText(/support@newwaveitfl\.com/i)).toBeInTheDocument();
```

Use separate `describe`/`it` blocks or call `cleanup()` between renders so queries never see multiple page headings.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
npm.cmd test -- src/pages/LegalPages.test.tsx
```

Expected: FAIL because the three page modules do not exist.

- [ ] **Step 3: Draft and implement `TermsAndConditionsPage.tsx`**

Use `usePageMeta` with:

```ts
{
  title: 'Terms and Conditions — New Wave IT',
  description: 'Terms governing the New Wave IT website and IT services provided by New Wave IT LLC.',
  canonical: 'https://www.newwaveitfl.com/terms-and-conditions',
}
```

Render `LegalPageLayout` with `effectiveDate="August 11, 2026"`. Write complete prose under these headings, in this order:

1. `Agreement to These Terms` — identify New Wave IT LLC; acceptance applies through access, forms, or services; users must be able to contract for their organization.
2. `Website Information and Permitted Use` — informational content may change; grant a limited revocable personal/business-use license; prohibit interference, scraping that burdens systems, malware, impersonation, unlawful use, and security testing without written authorization.
3. `Quotes and Service Requests` — form submissions and website estimates are invitations to discuss services, not binding offers or guaranteed prices.
4. `Paid Services and Service Agreements` — services may be governed by an MSA, SOW, proposal, order form, invoice, or other written service document; expressly state that signed service agreements control conflicts; these Terms fill gaps only.
5. `Fees, Invoices, and Taxes` — customer pays amounts and taxes under controlling documents/invoices; do not supply a net period, late fee, refund promise, or cancellation window.
6. `Customer Responsibilities` — timely access, accurate information, required licenses/consents, authorized contacts, maintained backups unless contracted otherwise, cooperation, and notification of relevant risks.
7. `Third-Party Products and Services` — vendor terms, availability, licensing, price changes, outages, and data handling may apply; New Wave IT is not the vendor unless expressly stated.
8. `Security and Backups` — reasonable care but no system is invulnerable; no guarantee against every incident, outage, loss, or attack; contracted security/backup scope controls.
9. `Confidentiality` — protect nonpublic business information with reasonable care, subject to service agreements, lawful disclosure, and information independently known/publicly available.
10. `Intellectual Property` — New Wave IT/site ownership; customer retains its data; third parties retain their property; feedback may be used without restriction or identification.
11. `Suspension and Termination` — permit suspension for security risk, unlawful use, nonpayment when authorized by governing documents, or material breach; controlling documents govern termination and transition.
12. `Disclaimers` — website is provided as-is/as-available; professional IT services are limited to agreed scope; exclude warranties to the maximum lawful extent without disclaiming express written promises.
13. `Limitation of Liability` — exclude indirect, special, incidental, consequential, exemplary, lost-profit, lost-revenue, lost-data, and business-interruption damages to the maximum lawful extent; cap aggregate liability at fees paid for the affected services during the six months before the event, or $100 for website-only claims, except where prohibited and except controlling agreements.
14. `Indemnification` — customer indemnifies for unlawful misuse, supplied content/data that infringes rights, and material breach, subject to prompt notice and reasonable defense control.
15. `Privacy and Electronic Communications` — incorporate the Privacy and Cookie Policies with internal links; allow operational electronic communications; marketing texts/emails only as permitted by law and consent.
16. `Governing Law and Venue` — Florida law without conflict rules; exclusive state/federal courts serving Broward County, Florida; no arbitration or class waiver.
17. `Changes to These Terms` — post revised effective date; material changes apply prospectively unless law or agreement requires otherwise.
18. `General Terms` — severability, waiver, assignment, force majeure, headings, entire agreement hierarchy.
19. `Contact Us` — exact entity, address, and email from Global Constraints.

- [ ] **Step 4: Draft and implement `PrivacyPolicyPage.tsx`**

Use `usePageMeta` with canonical `https://www.newwaveitfl.com/privacy-policy`, title `Privacy Policy — New Wave IT`, and a description identifying New Wave IT LLC. Render the shared layout with the same effective date and these complete sections:

1. `Scope` — U.S. website and services; identify New Wave IT LLC.
2. `Information We Collect` — direct contact/quote/support fields; customer/service records; portal authentication and session data; chat/SMS content; admin account data; device/browser/IP/referrer/pages/interaction/approximate-location analytics; records from SuperOps and customer-authorized vendors.
3. `How We Use Information` — respond, quote, deliver/support services, authenticate, communicate, secure/debug, analyze/improve, meet obligations, enforce agreements, prevent misuse.
4. `How We Disclose Information` — service providers including Supabase, Resend, SuperOps, Twilio, Elfsight, Vercel; customer-authorized vendors; advisers; corporate transactions; authorities/safety; no blanket promise that vendors never use data under their own terms.
5. `Sale, Sharing, and Targeted Advertising` — state that New Wave IT LLC does not currently sell personal information for money or use it for cross-context behavioral advertising; qualify that embedded/analytics providers may receive technical data; provide the request email for legally applicable opt-outs.
6. `Cookies and Similar Technologies` — link to `/cookie-policy`; state Vercel Analytics and Elfsight are active; state Google Analytics is planned and inactive.
7. `Retention` — retain only as reasonably necessary for stated purposes, service/customer records, disputes, security, and law; criteria-based language only.
8. `Security` — reasonable administrative, technical, and organizational safeguards; no absolute security guarantee; users should avoid submitting sensitive credentials through public forms.
9. `U.S. Processing` — data processed/stored in the U.S. and other locations used by providers; services are U.S.-only.
10. `Your Privacy Choices and State Rights` — access, correction, deletion, portability, opt-out, restriction/appeal where applicable; rights depend on residence and statutory scope; request by email; identity verification; authorized agents; non-discrimination; appeal through same email with `Privacy Appeal` subject.
11. `Global Privacy Control` — honor recognized opt-out signals where legally required and technically applicable; do not imply the site currently participates in optional signal programs.
12. `Children's Privacy` — not directed to children under 13; no knowing collection; deletion contact.
13. `Third-Party Sites and Services` — separate policies apply.
14. `Changes to This Policy` — effective-date updates and prominent notice when appropriate.
15. `Contact Us` — exact entity, address, and email.

- [ ] **Step 5: Draft and implement `CookiePolicyPage.tsx`**

Use `usePageMeta` with canonical `https://www.newwaveitfl.com/cookie-policy`, title `Cookie Policy — New Wave IT`, and a concise description. Render the shared layout and these sections:

1. `What Cookies and Similar Technologies Are` — include cookies, local storage, session storage, pixels/tags, and embedded scripts.
2. `Technologies We Use Now` — functional local storage for content caching; session storage for support/portal tokens; Supabase authentication/storage where applicable; Vercel Analytics for site usage/performance; Elfsight for the embedded chatbot; explain vendors may use their own technologies under their policies.
3. `Planned Google Analytics` — exact sentence `Google Analytics is not currently active on this website.` Explain that, if activated later, GA4 may use `_ga` and related identifiers and collect session, device/browser, approximate-location, page, referrer, and interaction data. State that the policy and visitor controls will be reviewed before activation.
4. `Why We Use These Technologies` — requested functionality, authentication/session continuity, security, support, performance, and aggregate site improvement.
5. `Your Choices` — browser blocking/deletion, loss of functionality, applicable opt-out requests to support email, and future Google controls if activated.
6. `Updates to This Cookie Policy` — effective-date revision.
7. `Contact Us` — exact entity, address, and email.

Do not invent a cookie inventory or retention duration. Avoid saying Vercel Analytics is always cookieless; describe only its purpose and potential receipt of technical usage data.

- [ ] **Step 6: Run focused tests and review the legal copy**

Run:

```powershell
npm.cmd test -- src/pages/LegalPages.test.tsx
npm.cmd run typecheck
rg -n -i "TBD|TODO|lorem|Google Analytics is currently|Google Analytics.*active|guarantee compliance" src/pages/*PolicyPage.tsx src/pages/TermsAndConditionsPage.tsx
```

Expected: tests and type check pass; the search returns only the intentionally negated sentence `Google Analytics is not currently active` and no placeholders.

- [ ] **Step 7: Optional authorized commit checkpoint**

Only after explicit user authorization:

```powershell
git add -- src/pages/TermsAndConditionsPage.tsx src/pages/PrivacyPolicyPage.tsx src/pages/CookiePolicyPage.tsx src/pages/LegalPages.test.tsx
git commit -m "feat: add legal policy pages"
```

---

### Task 3: Routes, Footer Links, and Sitemap

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/pages/LegalPages.test.tsx`
- Modify: `public/sitemap.xml`

**Interfaces:**
- Consumes: the three default-exported page components from Task 2.
- Produces: public routes `/terms-and-conditions`, `/privacy-policy`, `/cookie-policy` and unconditional Footer navigation to each route.

- [ ] **Step 1: Add failing footer-link tests**

In `src/pages/LegalPages.test.tsx`, mock `useContent` to return `{}` and render `Footer` inside `MemoryRouter`. Assert:

```tsx
expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
expect(screen.getByRole('link', { name: 'Terms and Conditions' })).toHaveAttribute('href', '/terms-and-conditions');
expect(screen.getByRole('link', { name: 'Cookie Policy' })).toHaveAttribute('href', '/cookie-policy');
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
npm.cmd test -- src/pages/LegalPages.test.tsx
```

Expected: FAIL because the current footer renders disabled spans when CMS URLs are absent and has no Cookie Policy link.

- [ ] **Step 3: Register the routes**

Add imports to `src/App.tsx`:

```ts
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
```

Add these routes with the other public static routes:

```tsx
<Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
<Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
<Route path="/cookie-policy" element={<CookiePolicyPage />} />
```

- [ ] **Step 4: Replace Footer legal controls with internal links**

Remove the `c.privacy_url` and `c.terms_url` conditional anchor/span branches from `src/components/Footer.tsx`. Render this exact link set using the existing subdued hover styling:

```tsx
{[
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms and Conditions', to: '/terms-and-conditions' },
  { label: 'Cookie Policy', to: '/cookie-policy' },
].map(({ label, to }) => (
  <Link key={to} to={to} className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>
    {label}
  </Link>
))}
```

Retain or reproduce the existing hover color behavior in a reusable CSS/Tailwind class; do not use CMS values as fallbacks. Change the container to `flex flex-wrap justify-center gap-x-6 gap-y-2` so three links wrap on small screens.

- [ ] **Step 5: Add sitemap entries**

Insert before `</urlset>` in `public/sitemap.xml`:

```xml
  <url>
    <loc>https://www.newwaveitfl.com/privacy-policy</loc>
  </url>
  <url>
    <loc>https://www.newwaveitfl.com/terms-and-conditions</loc>
  </url>
  <url>
    <loc>https://www.newwaveitfl.com/cookie-policy</loc>
  </url>
```

- [ ] **Step 6: Run tests, type check, and build**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Expected: all commands pass and Vite emits the production bundle.

- [ ] **Step 7: Optional authorized commit checkpoint**

Only after explicit user authorization:

```powershell
git add -- src/App.tsx src/components/Footer.tsx src/pages/LegalPages.test.tsx public/sitemap.xml
git commit -m "feat: link legal policies site-wide"
```

---

### Task 4: Full Legal and Browser Verification

**Files:**
- Modify only if verification reveals a defect: files from Tasks 1–3.

**Interfaces:**
- Consumes: the complete legal-page feature.
- Produces: evidence that copy, navigation, metadata, responsive layout, and production build agree with the approved design.

- [ ] **Step 1: Verify source claims against deployed integrations**

Run:

```powershell
rg -n -i "@vercel/analytics|elfsightcdn|Twilio|SuperOps|Resend|Supabase|localStorage|sessionStorage|Google Analytics|googletag|gtag|GTM-|G-[A-Z0-9]+" src api index.html package.json vercel.json
```

Expected: active vendor/storage statements map to code; no Google tag, GTM container, or GA4 Measurement ID exists.

- [ ] **Step 2: Run the complete automated verification suite**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: tests, type check, build, and diff check pass. If lint fails, document whether failures pre-existed by comparing affected paths with `git diff --name-only`; fix every lint issue introduced by this feature.

- [ ] **Step 3: Start the local production preview**

Run:

```powershell
npm.cmd run preview -- --host 127.0.0.1
```

Use the assigned local port for browser verification.

- [ ] **Step 4: Verify the three routes visually**

At 1440×900 and 390×844 viewports, inspect:

- `/terms-and-conditions`
- `/privacy-policy`
- `/cookie-policy`

Confirm one visible H1, readable line length, no horizontal overflow, clear section hierarchy, visible effective date, working Navbar/Footer, and consistent background/chrome.

- [ ] **Step 5: Verify navigation and metadata**

From `/` and `/support`, activate all three footer links and confirm the URL and page heading. Inspect the document head for the exact title, description, and canonical URL defined in Task 2. Confirm each URL occurs exactly once in `public/sitemap.xml`:

```powershell
rg -c "https://www.newwaveitfl.com/(privacy-policy|terms-and-conditions|cookie-policy)" public/sitemap.xml
```

Expected: each legal URL has one sitemap entry.

- [ ] **Step 6: Conduct final copy audit**

Read all three documents end-to-end and confirm:

- The entity, address, email, effective date, and U.S.-only scope are consistent.
- Signed service documents control conflicting service terms.
- No commercial periods, fees, SLAs, refunds, or cancellation rights were invented.
- No arbitration or class waiver appears.
- Google Analytics is clearly planned/inactive everywhere.
- Vercel Analytics and Elfsight are disclosed as active.
- Privacy-rights language is conditional on applicable law and statutory scope.
- Terms, Privacy Policy, and Cookie Policy cross-links resolve.

- [ ] **Step 7: Optional authorized final commit**

If the user has explicitly authorized committing and earlier checkpoints were skipped:

```powershell
git add -- package.json package-lock.json vite.config.ts tsconfig.app.json src/test/setup.ts src/components/legal/LegalPageLayout.tsx src/components/legal/LegalPageLayout.test.tsx src/index.css src/pages/TermsAndConditionsPage.tsx src/pages/PrivacyPolicyPage.tsx src/pages/CookiePolicyPage.tsx src/pages/LegalPages.test.tsx src/App.tsx src/components/Footer.tsx public/sitemap.xml docs/superpowers/specs/2026-08-11-legal-policies-design.md docs/superpowers/plans/2026-08-11-legal-policies.md
git commit -m "feat: publish legal policies"
```

Never stage unrelated files and never push without separate explicit authorization.
