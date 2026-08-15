# New Wave IT Brand Package QA

Date: August 14, 2026

## Scope

This record covers the final local brand-package build and the public New Wave IT website refresh. It does not change the authenticated `src/admin/**` experience, backend integrations, CMS data, analytics, customer portal, or deployment settings.

## Deliverable Package

- Built with `scripts/build_brand_package.py` and verified with `scripts/verify_brand_package.py`.
- The package directory and ZIP each contain 255 validated files.
- Archive SHA-256: `6995AC37615913CF504C164E1ECA2A462E0222FD08C37DE734C9AF9D7C101892`.
- Package validation, safe-area validation, and contrast validation passed. Recorded contrast ratios are 16.07 for Current Navy on Cloud White, 16.86 for Pure White on Current Navy, and 5.99 for Slate on Cloud White.
- The current artifact output is [new-wave-it-brand-package.zip](/C:/Users/JoshBreault/.codex/visualizations/2026/08/13/019ffc55-e276-71b3-a89f-5d66e62ffa7b/New-Wave-Redesign/output/new-wave-it-brand-package.zip).
- Final visual review covered the brand preview, 13-page guide contact sheet, document-template contact sheet, social feed and platform crops, presentation contact sheet, print-card renders, favicon contact sheet, and email-signature render. No new visual issue was found after the final rebuild.

## Website Verification

- `pytest -q`: 81 passed. The five warnings are third-party PyMuPDF/Swig deprecations.
- `vitest run`: 9 files and 19 tests passed.
- Production Vite build passed with 2,001 transformed modules. The existing Browserlist freshness and JavaScript chunk-size notices are nonblocking.
- Focused ESLint for the rebrand components, generated brand primitives, and preview Supabase fallback passed with no findings.
- Repository-wide ESLint remains nonzero with 73 existing errors and one warning in API and authenticated admin code; no public rebrand source file is listed.
- `tsc --noEmit -p tsconfig.app.json` still reports three existing diagnostics in `src/admin/editors/PricingEditor.tsx` and `src/admin/editors/ServicesEditor.tsx`; no rebrand file is listed.

## Responsive and Visual QA

- Reviewed 36 generated screenshots covering home, services, cybersecurity, pricing, support, status, contact, privacy policy, and terms at 375, 768, 1280, and 1440 pixel widths.
- A follow-up desktop/mobile smoke review verified the restored compact proof strip and Cybersecurity-led services layout at 1440 and 375 pixel widths, with no page errors.
- A focused 1440/390 pixel carousel review verified that all three "What we do" slides hold a stable 500/660 pixel viewport (620 pixels at the small-tablet breakpoint), with readable equal-height cards, no clipped content, and no page errors. Cybersecurity remains featured above the five supporting service cards, which form a 3/2 desktop grid.
- Every matrix page returned HTTP 200, rendered an H1, retained the shared navigation and footer, and had no page JavaScript errors.
- The review fixed two mobile issues found during QA: the floating utility navigation is desktop-only, and the Elfsight welcome panel stays hidden on narrow screens while its launcher remains available.
- The external Elfsight launcher was separately checked. Third-party chat and analytics requests were deliberately blocked during the screenshot matrix so they could not make a page result nondeterministic.
- One 1440px support screenshot recorded an intermittent 404 from an obsolete Google Fonts `fonts.gstatic.com` Inter URL. The URL is not referenced by the current Google Fonts stylesheet, fresh no-cache smoke checks were clean, and `font-display: swap` preserves readable fallback text. This is documented as an external-provider cache anomaly, not an application error.

## Source Hygiene

- A legacy-reference scan is empty for the public source, `public`, `index.html`, and Tailwind configuration when `src/admin/**` is excluded.
- The remaining legacy color references are confined to the intentionally out-of-scope authenticated admin interface.
- The public source scan found no `linear-gradient`, `radial-gradient`, `backdropFilter`, or `backdrop-filter` references.
- The placeholder scan found only the phrase "lorem ipsum" in the quick-usage guide's prohibited-content rule; it is not a placeholder in delivered copy.
- `git diff --check` passed. Windows line-ending notices are informational only.

## Residual Risk and Release State

- Fixed-epoch byte-for-byte reproducibility of generated PDF, DOCX, and PPTX internals remains unproven, as recorded in the Task 12 review. Package content, checksums, and final archive validation pass.
- No Git commit, push, Vercel deployment, or production release was performed. A preview deployment requires explicit user authorization.
