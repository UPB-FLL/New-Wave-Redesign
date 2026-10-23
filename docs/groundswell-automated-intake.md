# GroundSwell automatic intake and evidence quality

The staff Run queue and partner Add a prospect forms look up a business after a website, Instagram handle, or Facebook Page is entered. Name, location, social links, logo, palette, and up to six local competitor suggestions stay editable. A lookup never creates a customer or starts an audit; submission waits for the latest lookup. Correcting the name or city refreshes automatic competitor suggestions without overwriting manual edits.

`POST /api/groundswell/discover` uses the existing staff or partner session. Results are cached per partner and normalized seed for ten minutes, with in-flight deduplication and a 40-lookups/hour limit. Provider failures are not cached. Website reads reject nonpublic destinations, pin validated DNS addresses, recheck redirects, and bound time and response size. Identity and branding come from observed schema, metadata, page assets, and same-origin stylesheets; missing values stay empty.

Public profiles, Google listings, query-specific Google results, Ahrefs estimates, Keyword Planner, Google Ads Transparency, and Meta Ad Library run through the existing Composio public-research connection. Failed Instagram posts do not discard a readable profile. Facebook can support a Facebook-only business. Each source retains its scope and unavailable data stays distinct from zero. Local competitor selection uses category, area, and available listing evidence; review count is not a search-ranking claim. The benchmark still compares the business with its first two selected competitors.

Public ad-library checks now precede the write-up. Tracking tags and Ahrefs paid keywords do not establish campaign activity or performance. Missing search volume does not establish low demand and prevents unsupported spend/return modeling. Public ad records cannot establish spend, leads, revenue, or competitors' private account performance. Keyword Planner uses the configured `GROUNDSWELL_GEO_TARGETS` (existing default `geoTargetConstants/200528`); its source geography is printed and must be checked against the intended service market during live validation. A city string in a keyword seed does not select a Planner geography.

New reports require substantive findings with evidence, business impact, an action, and a verification measure. Failed website reads or multiple unavailable public-research families hold delivery for review. Deterministic checks remove unsupported absence/activity claims before review and rendering; source coverage and limitations appear in reports. Client and partner report identities remain white-label. Reverse/light wordmarks receive a dark backing in the brand preview and PDFs.

## Schema and rollout

`20261030120000_groundswell_discovery_inputs.sql` adds nullable `facebook` text columns to `marketing_audits` and `groundswell_customers`, preserving existing policies and rows. Applied to the NEW WAVE Supabase project on 2026-10-23 as migration `20261023174915` (`groundswell_discovery_inputs`), ahead of the application deployment. Its repository filename follows the existing phase migrations for clean installs.

The connected Composio account returned wallet/credit errors during the October 23 live checks. Provider credit failures are actionable and pause repeated public reads within the function instance; client-owned linked-account reads remain separate. Live Google/social/ad-library validation and a complete current Wildly Primal rerun are pending credit restoration. No existing Wildly Primal reports or runs were overwritten or requeued. Corrected local review PDFs use saved evidence and explicitly mark incomplete public reads; historic private metrics from the supplied examples are not treated as current public data.

## Verification

- Full suite: 131 files, 1,643 tests passed with Chromium PDF/image rendering enabled.
- Application and transitive API TypeScript checks, changed-file ESLint, production build, and diff checks passed.
- Regular Playwright (Browser plugin unavailable): staff and partner intake at 1440, 390, and 320px, mocked authenticated lookup, editable competitor suggestions, colour selection, no automatic queue, and no overflow or runtime exceptions.
- Direct live website inspection verified Wildly Primal's name, Jacksonville Beach location, Instagram link, header wordmark, category, and palette. No paid provider reads were retried after the credit failure.
- Corrected Wildly Primal review draft: one-page summary and 16-page full review; PDF QA found no clipped sections or broken images.
- Repository-wide ESLint has existing errors outside this change; changed files pass.
