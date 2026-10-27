# New Wave IT — fact sheet

The one list of facts the site, its schema, `llms.txt` and meta tags may
state. Every row cites the file or table it came from. A fact without a row
here stays out of the copy. Status values: **source-backed** (a system of
record says it), **site-only** (the site asserts it and nothing else does;
needs owner confirmation), **contradicted** (two sources disagree),
**owner-confirmed, <date>** (the owner answered).

Built 2026-10-26 in Phase 1 of the GEO audit from: Supabase `site_content`
(project `edtwdybotkatgsglqrpw`), `pricing_units`, `blog_posts`, the shell
JSON-LD in `index.html`, the code fallbacks in `src/`, `CLAUDE.md`'s change
log, and the Google Business Profile as returned by a Google Maps search on
2026-10-26. No fact below has been changed on the site yet.

## 1. Identity

| Fact | Value | Source | Status |
|---|---|---|---|
| Legal / trading name | New Wave IT | `index.html` JSON-LD `name`; CMS `footer.tagline` | source-backed (site + Google listing title "New Wave IT") |
| Alternate name | New Wave IT FL | `index.html` JSON-LD `alternateName` | site-only |
| What it is | Managed service provider (MSP): managed IT, cybersecurity, cloud, 24/7 support, network infrastructure for South Florida businesses | `index.html` JSON-LD descriptions; CMS `services.cards` | source-backed (site) |
| Google category | Computer support and services | Google listing (SearchAPI google_maps, 2026-10-26) | source-backed (GBP) |
| Website | https://www.newwaveitfl.com | canonical on every page | source-backed; the Google listing links the apex `https://newwaveitfl.com/`, which 307s to www (works, but not identical) |
| Founding year | 2022 | `index.html` JSON-LD `foundingDate` (was 2009, unsourced) | owner-confirmed, 2026-10-26 |
| Employees | 5–10 | `index.html` JSON-LD `numberOfEmployees` (was 10–50, unsourced) | owner-confirmed, 2026-10-26 |
| Divisions | "New Wave: Social Engineering" (growth marketing), GroundSwell (its research engine) | `src/divisions/socialEngineering/` | source-backed (site) |

## 2. Contact (NAP)

| Fact | Value | Source | Status |
|---|---|---|---|
| Street address | 710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311 | CMS `contact.address` + `contact.address_city`, `footer.address`; `index.html` JSON-LD; code fallbacks in `Footer.tsx`, `Contact.tsx`, `contactDetails.ts` | owner-confirmed, 2026-10-26 (a staffed office). The Google listing still shows no street address and a pin at 26.9412, −81.4974 (Highlands County); the owner is updating the profile |
| Phone | (561) 564-1846 / +1 561-564-1846 | CMS `contact.phone`, `footer.phone`, `hero.phone`; Google listing; `CLAUDE.md` 2026-10-21 ("the Google Business Profile's") | owner-confirmed, 2026-10-26 |
| Email | support@newwaveitfl.com | CMS `contact.email`, `footer.email`; JSON-LD | source-backed (site) |
| Geo coordinates | 26.1224, −80.1373 | `index.html` JSON-LD | site-only; GBP pin differs (see address) |
| Stale phone fallback | (954) 372-5100 | `src/pages/SupportPage.tsx:60` code fallback (masked by CMS) | not a fact; code defect, parked |
| Fictional placeholder | (954) 555-0100 | `Contact.tsx` input placeholder; `contactDetails.ts` `PLACEHOLDER_PHONE` | not a fact; by design |

## 3. Hours

| Statement | Where | Status |
|---|---|---|
| Open 00:00–23:59, Monday–Sunday | `index.html` JSON-LD `openingHoursSpecification` | contradicted |
| "Mon–Fri, 8am–6pm" (under the address) | CMS `contact.address_sub` | contradicted |
| "24/7 for emergencies" (under the phone) | CMS `contact.phone_sub` | contradicted |
| "24/7 IT Support — Always On, Always Ready"; "24/7 Service and monitoring" | CMS `hero.badge`, `hero.stats`, `whyus.feature_cards[0]`, `services.cards` | contradicted (consistent with each other; the question is what "24/7" covers: monitoring, emergency line, or office) |
| Mon 8 AM–6 PM, Tue 8 AM–6 PM, Wed 8 PM–12 AM, Thu 12 AM–6 PM & 8 PM–12 AM, Fri 12 AM–6 PM, Sat 8 PM–12 AM, Sun 12 AM–6 PM | Google Business Profile (2026-10-26) | contradicted; looks mis-entered |
| Support tiers: "8am-5pm M-F" (Standard), "7am-9pm M-F" (Priority), "24/7/365" (Premium) | CMS `pricing.tiers` | contradicted with the 8am–6pm line |

**Settled, owner-confirmed 2026-10-26**: office hours Mon–Fri 8am–6pm; a 24/7
emergency line. The CMS lines already say this. The schema's
`openingHoursSpecification` now reads Mon–Fri 08:00–18:00 and a `contactPoint`
of type "emergency" carries the 24/7 line. The Google Business Profile's
schedule still has to be corrected by the owner in the profile itself.

## 4. Services and service area

| Fact | Value | Source | Status |
|---|---|---|---|
| Services | Cybersecurity; Live IT Support; IT Repair & Upgrades; Managed IT Services; Cloud Solutions (incl. Microsoft 365); Network Infrastructure | CMS `services.cards`; `index.html` `hasOfferCatalog` (adds "Healthcare IT & HIPAA Compliance") | source-backed (site) |
| Industry pages | Healthcare, Family offices, Luxury, Cellular DAS & public safety | `public/sitemap.xml`, `src/pages/*ServicePage.tsx` | source-backed (site) |
| Service area | Fort Lauderdale, Miami, Boca Raton, Pompano Beach, Hollywood, South Florida | `index.html` JSON-LD `areaServed` | site-only |
| "Remote & on-site support" | CMS `services.cards[1]` | site-only |

## 5. Pricing

Two independent price lists exist and neither cites the other.

| Fact | Value | Source | Status |
|---|---|---|---|
| Per-unit rates (cents → dollars/month) | Employees (user accounts) $5.00 · Server $175.00 · Computers $105.00 · Location network monitoring $50.00 · Office 365 licensing only $32.00 · Office 365 licensing and email $38.00 | table `pricing_units` (all `active`, updated 2026-08-15); the same four figures are written into `src/pages/ITSupportFortLauderdalePage.tsx:41-43` and `ManagedITFortLauderdalePage.tsx:40-42` as "from our published price list" | source-backed (DB = landing pages). The repo's seed migration `20260503000000_create_pricing_units.sql` holds older values ($50 computers, $20 locations, no server); the live table is the truth. |
| Tiers | SaaS Starter $199/mo (≤5 users), Professional $599 (≤25), Enterprise $1,299 (unlimited); HaaS Basic $299 (≤10 devices), Professional $699 (≤50), Enterprise $1,499; Support Standard $85–150/hr (8am–5pm M–F), Priority $125–200/hr (7am–9pm M–F), 24/7 Premium $175–300/hr | CMS `pricing.tiers` (updated 2026-05-03); **never rendered**: `PricingPage.tsx` reads only the pricing headline keys and shows the quote builder | **retired, owner-confirmed 2026-10-26**: migration `20261101120000` deletes the row (guarded on its md5; snapshot and exact-restore SQL in `docs/geo/evidence/2026-10-26/` and `supabase/rollbacks/`), and the admin editor's Tiers block is gone |
| "Flat-rate transparent pricing"; "Published per-device rates"; "No long-term contracts required" | CMS `trustbar.items`, `whyus.proof_points`, `hero.stats` | site-only |

## 6. Partnerships, credentials, claims

| Claim | Source | Status |
|---|---|---|
| Huntress partner, Microsoft partner, Cisco partner | CMS `trustbar.items`, `whyus.feature_cards[1]`; `CLAUDE.md` 2026-10-21: "only documented partnerships are claimed" | owner-confirmed, 2026-10-21 (per CLAUDE.md; the documents themselves are not in the repo) |
| "Certified engineers" / "Industry-certified technicians" / "Certified engineers on standby 24/7" | CMS `about.paragraph1`, `hero.subheadline`, `about.team_sub` | owner-confirmed, 2026-10-27 (kept as a general description; no certification is named, and none may be added without a document) |
| "Dedicated project manager" on every engagement; "Dedicated account manager for every client" | CMS `whyus.feature_cards[2]`, `whyus.proof_points[3]` | owner-confirmed, 2026-10-27 |
| "We respond within one business day" (contact form) | CMS `contact.email_sub`, `contact.subheadline`, `contact.success_body`; code fallbacks in `Contact.tsx`; `routeMeta.ts` /contact description; `ITSupportFortLauderdalePage.tsx` CTA | **dropped, owner-confirmed 2026-10-26**: migration `20261102120000` rewrites the three rows (guarded on their md5; snapshot and restore SQL kept), the code says "will reach out" / "will contact you" with no time, and `src/test/copy/response-time-claims.test.ts` forbids a promise coming back |
| "Trusted by businesses across South Florida" | CMS `trustbar.heading` | site-only |
| "Enterprise-grade" security; "Compliance audits"; "HIPAA readiness", "SOC 2 audit prep" | CMS `services.cards`, cybersecurity hero (code) | site-only; `CLAUDE.md` 2026-10-21 removed certification claims (no SOC 2 Type II, "HIPAA Compliant" etc.), so only *work offered* is claimed |
| Industries served: healthcare, legal, finance | CMS `about.paragraph3` | site-only |
| Ratings, review counts, testimonials, awards, "voted best" | none on the live IT site (removed 2026-10-15); `seo_pages` rows (not routed) contain "40% decrease in downtime", "within one hour", "case studies", "customer testimonials" | absent from live copy; the unrouted rows must not be published as they stand |

## 7. Profiles (for `sameAs`)

| Profile | URL | Source | Status |
|---|---|---|---|
| LinkedIn | https://www.linkedin.com/company/new-wave-it | `index.html` JSON-LD | **404 to an anonymous fetch**; ownership unconfirmed |
| Facebook | https://www.facebook.com/newwaveitfl | `index.html` JSON-LD | redirects to login; ownership unconfirmed |
| Google Business Profile | place id `ChIJm5g0rvtBWA0R5GAmemjZwh0`, kgmid `/g/11zxq1dhz3` | Google Maps search 2026-10-26 | exists; no address shown; not in `sameAs` |
| Instagram, YouTube, Yelp, X | none listed | — | owner question |

## 8. Blog

| Fact | Value | Source | Status |
|---|---|---|---|
| Posts | 8, all published, author "New Wave IT Team", 2026-09-24 → 2026-10-25, weekly | `blog_posts` | source-backed (DB) |
| Byline in schema | `BlogPosting.author` = Organization `#organization` | live JSON-LD | source-backed; already a brand byline |
| Generator | Weekly `pg_cron` → `/api/blog/generate-post` with `reviewDraft` quality gate (no statistics, no cited studies, no external links) | `CLAUDE.md` 2026-09-24; `api/_lib/blogQuality.ts` | source-backed (code) — an automation owns this table |

## 9. Contradictions in the live copy (summary)

1. **Hours** (settled 2026-10-26): office Mon–Fri 8am–6pm with a 24/7 emergency line. Schema corrected in this PR; the CMS already said so; the Google Business Profile schedule is the owner's to fix.
2. **Address / location** (settled 2026-10-26): the suite is a staffed office; the site is right. The Google listing (no address, pin ~100 miles away, apex website URL) is being corrected by the owner in the profile.
3. **Website on GBP**: apex `newwaveitfl.com` vs the site's canonical `www.`.
4. **Pricing** (settled 2026-10-26): `pricing_units` is the published price list and feeds the quote builder on `/pricing`; the CMS `pricing.tiers` row was a dormant list the page never rendered, and is retired by migration `20261101120000`. `pricing.subheadline` takes the code default ("Select the services you need and get an instant estimate. Our team will follow up with a customized proposal.") by migration `20261102120000`.
5. **Response times** (settled 2026-10-26): every promise is dropped; the tiers that carried the hourly ones are retired.
6. **Service list**: schema `hasOfferCatalog` has seven offers (adds Healthcare IT & HIPAA Compliance); the CMS shows six cards; the sitemap has ten category pages.


## 10. Claims that live only in code constants (live pages)

From a file-by-file sweep of `src/pages` and `src/components` (division,
admin and API excluded). Each is site-only unless noted. Line numbers are at
commit `00eb73e`.

| Claim | Where | Note |
|---|---|---|
| "Real-time service status … Updated every 5 minutes"; a table of named SaaS and ISP services with uptime figures (Microsoft 365 99.95 %, Google Workspace 99.98 %, AWS 99.99 %, … Spectrum 99.45 % "degraded") and "2 min ago" / "5 min ago" check times | `src/pages/StatusPage.tsx:16-28, 60-66` | **Hard-coded fallbacks with no data source**; the CMS has no `status` rows, so this is what `/status` shows. The page presents invented figures as live monitoring. |
| "99.7 % detection rate", "15M+ emails scanned daily", "10 Tbps mitigation capacity", "<60s mean detection time", "5M+ packets inspected/sec", "100 % audit readiness" | `src/components/cybersecurity/ThreatProtection.tsx:17-24` (rendered on `/cybersecurity`) | Unsourced figures. |
| "The average breach costs organizations $4.45 million." | `src/pages/CybersecurityServicePage.tsx:31` | Matches IBM's 2023 Cost of a Data Breach global average, but no citation is given and the figure is now out of date. |
| "dedicated engineers responding in minutes"; "Sub-hour response times" | `src/pages/LiveITSupportServicePage.tsx:10, 13` | **dropped 2026-10-26** ("from dedicated engineers"; "Priority handling for critical issues", which the page's own details already state) |
| "Results in 5 days"; "90-Day Roadmap"; "from certified analysts" | `src/components/cybersecurity/CyberSecurityCTA.tsx:7, 20, 26` | |
| "Week 1", "Week 1-2", "Week 2-4"; "Certified engineers handle implementation" | `src/components/cybersecurity/SecurityProcess.tsx:5-8` | |
| HIPAA, PCI-DSS, SOC 2 (Type I & II audit prep), GDPR ("72-hour breach notification"), ISO 27001 ("Annual surveillance audits"), NIST CSF; "Audit-ready from day one." | `src/components/cybersecurity/ComplianceFrameworks.tsx:5-20` | Framework *work offered*, not certifications held; consistent with the 2026-10-21 rule. |
| "Support for HIPAA, PCI-DSS, SOC 2"; "24/7 SOC monitoring", "penetration testing", "forensic investigation" | `src/pages/CybersecurityServicePage.tsx:13, 21, 54` | |
| "HIPAA-compliant IT infrastructure" | `src/pages/HealthcareServicePage.tsx:10, 13, 52`; `src/components/Services.tsx:359` | "HIPAA-compliant" describes the systems built; the site no longer claims a certification. |
| "Azure, AWS, and Google Cloud" | `src/pages/CloudSolutionsServicePage.tsx:12, 57` | |
| "Fiber cabling & installation", "WiFi 6 mesh deployment" | `src/pages/NetworkInfrastructureServicePage.tsx:13` | |
| "Tax compliance & audit readiness", "24/7 dedicated support" | `src/pages/FamilyOfficesServicePage.tsx:13` | |
| "FirstNet integration"; "Compliance & certification" | `src/pages/CellularDASPublicSafetyServicePage.tsx:11-13` | |
| "Discreet 24/7 technical support"; "white-glove" | `src/pages/LuxuryServicePage.tsx:12-13` | |
| "Transparent billing", "Quarterly business reviews", "Fixed Monthly Fee" | `src/pages/ManagedITServicePage.tsx:13, 40` | |
| "Warranty & support coverage", "Emergency on-site repair" | `src/pages/ITRepairServicePage.tsx:13` | |
| "supports offices across Fort Lauderdale and Broward County from 710 NW 5th Ave"; "on-site visits across Broward County and South Florida"; "A technician will reply within one business day" | `src/pages/ITSupportFortLauderdalePage.tsx:18, 58, 63` | |
| Managed stack logos and names: Microsoft 365, Azure & Entra ID, Google Workspace, SentinelOne "Managed EDR", Huntress, Cloudflare, NinjaOne, ConnectWise | `src/components/TrustBar.tsx` | owner-confirmed, 2026-10-27: tools the team runs, not partnerships. The slide's kicker now reads "Partners and tools" and the logo strip is captioned "Tools we run"; the partner cards (Huntress, Microsoft, Cisco) are unchanged. |
| "Business down? Call us 24/7." "A real technician picks up, day or night."; "texts an on-call technician"; "live SuperOps tickets" | `src/pages/SupportPage.tsx:32-39, 89-90`; `SupportChatCard.tsx:157` | SuperOps is connected (CLAUDE.md 2026-10-23); on-call texting depends on Twilio settings "waiting in Vercel". |
| Legal entity "New Wave IT LLC"; Florida law, Broward County venue; Terms effective August 11, 2026; Privacy and Cookie policies effective October 15, 2026 | `src/pages/TermsAndConditionsPage.tsx:15, 19, 197-237`; `PrivacyPolicyPage.tsx:16`; `CookiePolicyPage.tsx:21` | Legal pages are off-limits for edits; listed as sources only. |
| "career-ready curriculum shaped by working engineers" (CodeNest) | `src/pages/CodeNestPage.tsx:14`, `CodeNestHero.tsx:21` | A separate programme; owner to say whether it is current. |
| Route descriptions: "best MSP Fort Lauderdale" keyword, "Trusted MSP in Fort Lauderdale", "call us 24/7", "Flat-Rate Plans … no hidden fees" | `src/lib/routeMeta.ts:51-67, 135-149` | Meta descriptions only. |
| Guides' industry figures ("$80-150 per user per month", "15-30 minutes", "add 2-3 years", …) | `src/pages/ServiceGuidePage.tsx` | Generic industry numbers, not New Wave claims; unsourced. |
| Unrouted: `ServiceCategoryDetailPage.tsx` ("respond to threats within minutes", "reduce cloud costs by 30-40%"), `SeoLandingPage.tsx`, `QuoteModal.tsx` | not in `App.tsx` routes | Dead code; carries stronger claims than the live pages. |

Not live but present in the repo: the CMS seed
`supabase/migrations/20260409152113_create_site_content_and_admin.sql` still
holds "500+ Clients Served", "99.9% Uptime Guarantee", "15+ Years
Experience", "<1hr Avg Response Time", "CompTIA certified", "since 2009",
"Mon–Fri, 8am–6pm" and the fictional phone. The live `site_content` rows
read on 2026-10-26 no longer carry the first five (removed 2026-10-21); the
hours line and the "since 2009" founding claim survive as `contact.address_sub`
and the schema `foundingDate`.

## 11. Owner-confirmed answers

| Date | Question | Answer |
|---|---|---|
| 2026-10-26 | A1 business and site | New Wave IT, www.newwaveitfl.com |
| 2026-10-26 | Contact number | 561-564-1846 |
| 2026-10-26 | Q2 price list | `pricing_units` is current; drop the SaaS/HaaS/Support tiers (CMS `pricing.tiers`) |
| 2026-10-26 | Q3 hours | Office Mon–Fri 8am–6pm; a 24/7 emergency line |
| 2026-10-26 | Q4 address | 710 NW 5th Ave, Suite 1072 is a staffed office; the Google listing is to be updated to show it (owner's action in the profile; no tool in this session can edit a Business Profile) |
| 2026-10-26 | Q5 founding and size | Founded 2022; 5–10 employees |
| 2026-10-26 | Q6 response times | Drop every response-time promise (no SLA backs them); the pricing subheadline takes the code default |
| 2026-10-27 | Q7 credentials and managers | Keep both: "certified engineers" and the dedicated project manager / account manager claims. No specific certification named; none is added without a document |
| 2026-10-27 | Q8 logos | Microsoft 365, SentinelOne, Huntress, NinjaOne, ConnectWise, Cloudflare are tools the team runs, not partnerships; partners stay Huntress, Microsoft, Cisco |
