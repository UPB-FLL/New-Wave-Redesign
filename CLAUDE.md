# New Wave IT Redesign Project

## Recent Changes

### Schema hours from the owner (2026-10-26)

GEO audit, fact sheet Q3: the office is open Mon–Fri 8am–6pm and there is a
24/7 emergency line. `index.html`'s LocalBusiness `openingHoursSpecification`
says Mon–Fri 08:00–18:00 (it claimed 24 hours a day), and two `contactPoint`s
carry the support line's hours and the emergency line's 24/7 availability;
the CMS `contact.address_sub` / `contact.phone_sub` lines already said this.
Pinned in `division-integration.test.ts`. The Google Business Profile's
schedule is the owner's to correct in the profile.

### Pricing tiers retired (2026-10-26)

Owner's answer in the GEO audit (`docs/geo/fact-sheet.md`, Q2): the
published price list is the `pricing_units` table (the quote builder on
`/pricing` and the two Fort Lauderdale landing pages); the SaaS / HaaS /
Support tiers in `site_content` (`pricing.tiers`) were never rendered by
`/pricing` and are retired. Migration `20261101120000` deletes the row,
guarded on the md5 of the snapshot
(`docs/geo/evidence/2026-10-26/site_content-pricing-tiers.snapshot.json`),
idempotent; the exact restore is `supabase/rollbacks/20261101120000_restore_pricing_tiers_row.sql`
(that folder is never applied on its own). The admin's `pricing` descriptor
keeps only the headline block ("Pricing page"); `PRICING_TIERS` and the nav
keywords for tiers are gone, and the "unreadable stored list" test uses the
service cards instead.

### Every New Wave IT page renders its body at build time (2026-10-26)

From the GEO audit baseline (`docs/geo/baseline-2026-10-26.md`): all 41 New
Wave IT pages and the 8 blog posts served an empty `<body>` to a reader
without JavaScript; only the GroundSwell pages carried copy.

- **Static routes**: `src/lib/prerenderBody.tsx` (`renderItBody`,
  `isPrerenderedItPath`) renders the real page component for every route in
  `prerenderedItRoutes()` plus the homepage with `StaticRouter`, the same way
  the GroundSwell prerender does; `vite.config.ts` loads it through the Vite
  SSR loader and `renderRouteHtml` (`injectRootBody`) puts the markup in
  `#root`. The homepage is `dist/index.html` itself (Vercel serves that file
  for `/` from the filesystem before any rewrite, checked on the preview), and
  the empty shell moves to `dist/_shell.html` (`SHELL_FILE`), which the
  `vercel.json` catch-all rewrites the SPA fallback routes to and
  `api/_lib/spaShell.ts` reads for blog posts; `robots.txt` disallows it.
  `/groundswell` (a lazy chunk) and `/status` (its figures have no source;
  owner decision pending) keep the shell.
- **CMS copy**: `readCmsContentForBuild` (`src/lib/prerenderContent.ts`)
  reads every `site_content` row with the anon key at build time and
  `seedContentCache` (`content.ts`) hands it to `useContent`, so the static
  HTML carries the saved copy, not the code fallbacks. Without credentials
  (a local build) the fallbacks render with a warning; with credentials a
  failed read fails the build. A CMS publish shows on the live page as
  before, but reaches the static HTML only at the next deploy.
- **Reveal animations**: `FadeIn` renders a plain div on the server, and
  `revealInitial` (`animation.ts`) starts `Hero`'s and `Services`'
  `motion.div`s from their visible state there, so no static copy sits at
  opacity 0.
- **Blog posts**: `api/_lib/blogPostBody.ts` renders the post's Markdown
  (react-markdown, `renderToStaticMarkup`) into `#root` from
  `blogPageHtml`; a missing post or an outage keeps the root empty.
- **Tests**: `src/lib/prerenderBody.test.tsx` (every literal `<Route>` in
  `App.tsx` has a row; one H1 per page; the seed shows), `prerenderContent.test.ts`,
  the body cases in `it-prerender.test.ts`, `blog-page.test.ts` and the
  homepage rewrite in `division-integration.test.ts`.

### Groundswell: a toolkit with several linked accounts (2026-10-26)

SerpApi was re-linked in Composio with a working key beside the old account
that answers 401, and a Composio call that names no account while two are
linked is refused ("Multiple serpapi accounts connected. Specify which to use
via the 'account' field"), so the engine treated SerpApi as failed and fell
through to SearchAPI. `executeConsumerTool` (`composioConsumer.ts`) now reads
that refusal, lists the toolkit's accounts once (`defaultAccount`:
`COMPOSIO_MANAGE_CONNECTIONS` `list`, the `is_default` account, else the first
active one), runs the call again naming it, and keeps the choice per toolkit
for the function instance (`chosenAccounts`, cleared with the session). The
old 401 account can stay or go; the default is the one that answers. Test:
the "several linked accounts" case in `groundswell-composio-consumer.test.ts`.

### Division pages: ledgers and rule columns in place of card grids (2026-10-24)

Owner's ask: the grids of identical bordered white cards (icon tile top-left,
arrow top-right, "Learn more") read as machine-made. Two editorial patterns
replace them across the division and the GroundSwell pages (`division.css`):

- **`.nwse-ledger`**: rows under hairlines, no fill or radius
  (`.nwse-ledger-dark` on navy). Used by the hub's services and a service
  page's related services (one `<ol>` each, `data-role="service-ledger"`:
  the service icon in its pillar's colour, the title, the summary,
  an arrow that steps on hover; the whole row is the link; two columns of
  rows from lg; no "Learn more"), `OutcomeList`, `FaqList`, the customers
  and apps lists, and GroundSwell's metric groups (`MetricsGrid`,
  `data-role="metric-group"`) and each metric page's metrics.
- **`.nwse-rule`**: an open column under a 2px rule in its colour role
  (`--nwse-rule`; `.nwse-rule-dark` for the light hairline on navy). Used by
  `PointGrid` (`variant` is kept for callers but ignored),
  `RoadmapGrid` (`CardLabel plain`: the icon uncontained), `PillarCards`,
  `PillarStrip` (the active pillar's rule in its colour), `MetricTiles`,
  GroundSwell's `ReportGrid`, today-vs-plan, the metric pages' feeds and
  example, and the navy `gs-growth-panel`s (`groundswell.css`).
- `GlanceStrip` sits between two hairlines; the hub's family band is an open
  two-column band under a hairline. `.nwse-card` keeps its shape (a test pins
  it) for what is a thing in itself: tables, the sample viewer, ad previews.
  `.nwse-soft`, `.nwse-tint` and `.nwse-glass` stay defined; nothing in the
  division uses `.nwse-soft` or `.nwse-glass` now. The `.gs-service-grid`
  rules are gone with the grid.
- **Tests**: the service-row, customer-row and metric-group pins in
  `responsive.test.tsx` and `pages.test.tsx` follow (no `.nwse-card` or
  `.nwse-icon` inside a service ledger; "Learn more" is gone).

### GroundSwell page: the metrics it gathers, each with why it matters (2026-10-24)

The public GroundSwell page (`/social-engineering/groundswell`) now opens on
the metrics the engine actually pulls, grouped the way the reports group them,
and each group has its own page.

- **Content** `content/groundswellMetrics.ts`: `groundswellMetricGroups`, one
  per group (search, google-listing, competitors, social, website, ads,
  your-accounts; the slugs live in `site.ts` as `GROUNDSWELL_METRIC_SLUGS`,
  with `groundswellMetricPath`, and a test holds the two in step). Each group
  has its headline, summary, the card's one-line `matters`, the page's `why`,
  what it `feeds` (which plan), its `metrics` (name, `what` is measured,
  `source`, `why`), `limits` (what is not measured, printed, never hidden),
  where it appears in the `reports`, the brewery's `example` only where the
  engine measures it, and its own meta. Every metric is one
  `api/_lib/groundswell` reads or models today; a test forbids sources the
  engine does not use (PageSpeed, the Wayback Machine, a Maps rank).
- **Main page**: a "What it measures" section (`#metrics`, first after the
  jump nav; `MetricsGrid`: one card per group with why it matters, its first
  three metrics and a link to its page). The Currents explorer names the
  engine's real sources (Keyword Planner, Ahrefs, a public Google search, the
  Places API, public Instagram and Facebook, the site's HTML and Firecrawl,
  the Ads Transparency Center and the Meta Ad Library) and gains an Accounts
  Current; the "Where does the data come from?" FAQ says the same. The
  header's section links take `sectionsAt` (`GroundswellMarketingLayout`), so
  they jump within the main page and lead back to it from a metric page.
- **Metric pages** `pages/SocialEngineeringGroundswellMetricPage.tsx`
  (`/social-engineering/groundswell/<slug>`): hero with the breadcrumb, why it
  matters with what it feeds and the example, every metric as a card, limits
  and where it appears on navy, links to the other groups, the CTA. Wired
  through `seo.ts` (`groundswellMetricPageSeo`, in `allDivisionPages` after
  the GroundSwell page), `routes.tsx`, `preload.ts`, `App.tsx`, `vercel.json`
  rewrites, the sitemap, and the build-time body render (`prerenderBody.tsx`:
  `renderGroundswellBody(path)`, `isGroundswellPublicPath`), so each page's
  HTML carries its content. `GroundswellSectionBand` is the shared band.
- **Tests**: the "GroundSwell metrics" cases in `pages.test.tsx`, the metric
  pages in `prerenderBody.test.tsx`, `preload.test.ts` and
  `division-integration.test.ts`; the positioning and icon sweeps include a
  metric page.

### Groundswell: competitors that compete, the site's pages, and the two plans (2026-10-24)

From the Wildly Primal run of 2026-10-23 (audit `40b49eba…`, held in
review): its Maps table listed SERVPRO and a plumber beside a health coach
(the nearby query ran on the listing label "Services"), and Instagram,
Facebook, the ad libraries and the later Ahrefs reads all came back with
"Composio public-data reads are paused because the credit balance is empty".
Checked live the same day: ScrapeCreators itself answers HTTP 402
"insufficient credits" (its balance, not Composio's), the SerpApi connection
answers 401 "Invalid API key", and Firecrawl answers (1,045 credits).

- **Credit pauses are scoped** (`providerBudget.ts`): a provider's own
  refusal (ScrapeCreators' 402, say) pauses only that toolkit for 30 s and
  the error names it with its words ("ScrapeCreators has run out of credits
  (…), so its reads are paused. Add credits at ScrapeCreators…"); only a
  message naming Composio's wallet pauses every read. `executeTool` and the
  consumer executor pass the slug through (`assertPublicReadBudget(slug)`,
  `pausePublicReadsForCredits(message, slug)`).
- **Business profile** (`api/_lib/groundswell/businessProfile.ts`): what the
  business does from its own site, through one OpenAI call held to the
  site's words (`checkProfile`: a category or service whose words are not on
  the site is dropped; the wording rules in `serp.ts` stand in without
  OpenAI). Relevance (`filterCompetitors`): a candidate must share the
  profile's category wording (`sharesCategory`; directories such as Yelp,
  Indeed and Facebook never pass), and the model then judges what passed,
  with a reason each; nothing the words dropped comes back.
- **Competitors step** (`currents/competitors.ts`): reads the business's own
  pages (Firecrawl, up to six, within a budget) for the profile; candidates
  from Places, from a public Google search of the profile's own queries
  (SerpApi: the local pack and the organic results, `fromSerp`) and from
  Firecrawl's web search when SerpApi cannot answer (`fromWebSearch`); one
  candidate per website; then the relevance check. Output gains `profile`,
  `pages`, `dropped` (name and reason, for staff and the reports) and each
  pick's `source` and `reason`. The intake's discovery shares the lookup.
  The Maps step keeps only nearby listings that share the category wording
  (`relevantNearby`).
- **Site pages step** `site_pages` (`currents/sitePages.ts`, Current Site,
  after `site`, optional): Firecrawl `map` lists the site's URLs,
  `choosePages` picks the ones that say what it sells (home, about, services,
  programs, pricing, FAQ, contact, the blog; never legal or account pages),
  each read as main-content markdown and summarised (`parseScrapedPage`:
  title, headings, word count, calls to action, prices seen, excerpt), plus
  each competitor's homepage. Pages the competitors step already read are
  reused. Facts gain `site_pages`, `profile` and `competitor_picks`; the
  write-up prompt sees `website_pages`, `business_profile` and
  `competitor_picks`; the full audit's website section gains "Pages read",
  the competitors section "Why it competes" and "Left out as not competing".
- **Plans step** `plans` (`api/_lib/groundswell/plans.ts`, after `adcopy`,
  optional; rules in `packages/groundswell/src/plans.ts`): one OpenAI call
  writes the **website optimization plan** (page-by-page changes with
  priority, reason and evidence; pages to add for measured searches; how to
  tell it worked) and the **social media plan with its first week of posts**
  (platforms and cadence, pillars, Monday to Sunday: platform, format, hook,
  caption ready to paste, call to action, visual, hashtags). `checkPlans`
  keeps only what the rules allow: a change names a page that was read (or
  "site-wide"); a sentence with a number not in the data is dropped, and an
  item left empty goes with it; a caption with an unsupported claim or a
  competitor's name is dropped; one post a day; what went is named in
  `dropped`. Reports: the full audit gains "Website optimization plan" and
  "Social media plan: the first week" (plus the posts, four to a page) after
  the 90-day plan, and the later sections move down (`next()` numbering);
  the slides gain `content_week` before next steps; the summary lists the
  week; the workspace gains `site_pages` and `plans` panels.
- **Social step**: each profile keeps `recent_captions` and `hashtags`
  (text only; a competitor's images are still never kept), and the output
  `hashtags_seen`. **SERP**: `questions` ("People also ask") beside
  `related_searches`. **Readiness**: a Firecrawl row. Gap lines and
  `STEP_LABELS` for both steps.
- **Three public search providers** (`serp.ts`: `SERP_PROVIDERS`,
  `serpSearchCall`, `mapsSearchCall`; `maps.ts`: `serpMapsSearch`,
  `mapsRowsFrom`, `serperPlaceRows`): SerpApi, then SearchAPI (Composio
  toolkit `search_api`, `SEARCH_API_SEARCH` with `engine: google` or
  `google_maps`), then Serper (Composio's instant account,
  `SERPER_SEARCH_WEB`, `SERPER_SEARCH_MAPS`), the first that answers; all
  three answer in SerpApi's shape, so `parseGoogleSerp` reads them, and
  Serper's `places[]` is mapped onto `local_results` keys. Only a refused
  Composio key stops the read; every provider's refusal is named in the
  error. `GoogleSerp.provider` records who answered. Readiness rows for
  `search_api` and `serper` (instant). Checked live on 2026-10-24 in the
  consumer account: SearchAPI (`search_api_drow-assman`, 100 credits) and
  Serper answer; SerpApi's active account still answers 401 and the new
  sign-in sits at "initiated".
- **Tests**: `groundswell-site-pages`, `groundswell-business-profile`,
  `groundswell-plans` in `src/test/api/`, `packages/groundswell/test/plans`,
  the relevance and search cases in `groundswell-competitors`, the scoped
  pause in `groundswell-composio`, the captions in `groundswell-social`,
  `relevantNearby` in `groundswell-maps`, the questions in
  `groundswell-public-research`; the step-order pins in the ad-copy and
  benchmark tests.
- **Live side on 2026-10-24, 14:40 UTC**: ScrapeCreators answers again
  (24,998 credits; Wildly Primal's profile and posts read); SearchAPI is
  linked and answers; SerpApi's default account still answers 401 "Invalid
  API key" and the re-added one never finished its sign-in (the engine now
  falls through to SearchAPI). Then "Run again" on Wildly Primal's workspace
  card. The held run itself is unchanged.

### Support: SuperOps connected, new-ticket alerts, branded reply template (2026-10-23)

- **SuperOps account**: subdomain `newwave` (`newwave.superops.ai`, US). The
  token goes in Vercel as `SUPEROPS_API_TOKEN` with `SUPEROPS_SUBDOMAIN=newwave`,
  never in the repo. The portal's ticket list (`getTicketsForRequester`) asked
  for `technician { name }`, which SuperOps refuses (requester, client, site
  and technician are JSON scalars), so it could never have loaded; it selects
  `technician` bare now.
- **Alerts** (`api/support/ticket-alerts.ts`, `api/_lib/ticketAlerts.ts`):
  SuperOps' `TICKET_CREATED` webhook (header `x-superops-webhook-secret` =
  `SUPEROPS_WEBHOOK_SECRET`) or `x-admin-key` runs a check: the 10 newest
  tickets (`getRecentTickets`, plus `getTicketById` for any id the delivery
  names), those under an hour old, each alerted once
  (`support_ticket_alerts`, migration `20261031120000`) by text through
  Twilio (`SUPPORT_ALERT_SMS_NUMBERS`, else `SUPPORT_AGENT_SMS_NUMBERS`) and
  email through Resend (`SUPPORT_ALERT_EMAIL`, default josh@newwaveitfl.com).
  The webhook is created through SuperOps' API (`createWebhookSubscription`);
  docs/support-page.md section 4 has the call.
- **Email templates**: `docs/superops/ticket-created-template.html` (the
  "New Ticket created" notice), `ticket-closed-template.html` (the closed
  notice) and `reply-base-template.html` (a SuperOps Reply Template the
  technician types above: SuperOps sends a reply as typed, with no notice
  wrapping it, so the old `#Reply` notice template was removed), plus four
  staff notices in `docs/superops/technician/` (new
  ticket, assigned, requester replied, SLA warning), pasted into SuperOps'
  Notification Center by hand (its API cannot edit templates); logo PNGs
  `public/brand/email/new-wave-it-logo-on-{dark,light}.png`.
- **Live on 2026-10-23**: webhook `8016098266579877888` (TICKET_CREATED);
  tickets #3265 and #3266 alerted by email. `SUPEROPS_API_URL` must stay
  unset (the portal host `newwave.superops.ai` answers 403). Texts wait on
  Twilio's settings in Vercel.
- **Portal links (2026-10-26)**: the client portal is `https://newwave.superops.ai`
  (requesters sign in there; SuperOps' own emails link there). The site's
  default `super-ops.newwaveitfl.com` had no DNS record, so `/support`'s portal
  link failed; `CustomerPortalCard` now defaults to the real portal. Template
  buttons link to it as a fixed address: a `#` placeholder cannot sit inside
  an `href`, and the pasted `#Ticket Link` button went out as a dead link.
- **Tests**: `src/test/api/support-ticket-alerts.test.ts`.

### Groundswell: age-gated Instagram profiles, the Facebook Page, and the public-sources plan (2026-10-22)

Uncommon Path's two live runs read nothing from Instagram: ScrapeCreators
answered "Instagram blocked access to this public profile" while the two
competitors read fine, and Instagram's own logged-out page for the handle is
an error page where a public profile redirects to sign-in. The account is
shown only to signed-in adults (Instagram's minimum-age control, which
alcohol brands set), so no logged-out scraper sees it; the Facebook Page is
gated the same way (hence "no Ad Library id" for every brewery).

- **Social step** (`currents/social.ts`): a profile blocked twice falls
  back to Apify (`APIFY_SCRAPE_INSTAGRAM_PROFILES`, `…_POSTS`, capped);
  `summarizeInstagram` reads Apify's field names; snapshots carry
  `read_via`, `restricted` and a `note` (`RESTRICTED_NOTE`) the full audit
  prints and the write-up prompt is told about. The business's Facebook
  Page (the site's link, `include_gated_profile: true`) is read with one
  page of posts, each competitor's without (`SocialOutput.facebook`,
  `facebook_competitors`; `summarizeFacebook` looks figures up by their
  usual names, the answer shape being unread yet). The audit's social
  section gains the Facebook table; `creative.ts` takes the Facebook posts'
  images before the website's share image (`origin: 'facebook'`); the
  ads-library step passes `include_gated_profile`. Readiness gains an Apify
  row; the step label is "Instagram and Facebook".
- **Plan** `docs/groundswell-public-sources-plan.md`: the diagnosis, what
  shipped, and the steps to come on the public scrape tools (Facebook in
  depth, Yelp and Untappd reviews, Reddit mentions and flair tags, Ahrefs
  Brand Radar AI visibility), how each feeds the plan, the ad sets and new
  posts, and the posting hooks the owner connects later (Meta Ads and
  Instagram publishing as a client's own account, from an approval).
- **Tests**: the Apify fallback, the note, the Facebook cases in
  `groundswell-social.test.ts`; the social section in
  `groundswell-reports.test.ts`; the Facebook images in
  `groundswell-adsets.test.ts`; the Apify row in the readiness test.
- **Field names** come from ScrapeCreators' documentation (the plan doc
  lists them): Facebook `followerCount`, `likeCount`, `rating`,
  `ratingCount`, `pageIntro`, `adLibrary.pageId`; posts `text`, `url`,
  `reactionCount`, `commentCount`, `publishTime`, `videoDetails.thumbnailUrl`.
  `refusal()` tells Instagram's refusals apart ("Profile is age restricted",
  "…restricted", "…private", Composio's "blocked access"): age and
  restricted go to Apify, private gets `PRIVATE_NOTE` and no paid read.
- **The owner's choice for the age gate: link the account.** Staff can now
  mark any customer a client and link its accounts (New Wave's own customers
  had no way): `api/groundswell/accounts.ts` (Groundswell admins via
  `resolveViewer`; GET/POST/DELETE as the partner route, PATCH `{ stage }`;
  the sign-in returns to `/groundswell/admin/customers/:id`; rows carry
  `linked_by: staff:<email>`), its answers shared with the partner route in
  `api/_lib/groundswell/accountLinking.ts`; `staffAccountsApi` and
  `setStaffCustomerStage` in `groundswellWorkspace.ts`; the staff customer
  page (`GroundswellCustomer.tsx`) shows the stage button and the
  `AccountsCard` (which takes an `api` prop now). The `social` step reads a
  linked client's Instagram first in every phase (`linkedInstagram`,
  `summarizeLinkedInstagram`, `mediaFromGraph`, `LINKED_MEDIA_FIELDS`;
  `read_via: 'linked'`, `SocialOutput.linked_note` for staff), the public
  reads being the fallback. Tests: `groundswell-accounts.test.ts`, the
  linked cases in `groundswell-social.test.ts` and the staff page cases in
  `CustomerWorkspace.test.tsx`.
- **Not verified live**: Composio's consumer executor refused every call on
  2026-10-22 ("SSRF guard blocked request"), so whether Apify reads a gated
  profile waits for the next run. A signed-in Chromium reader for gated
  profiles was not built (the permission classifier refused it; see the
  plan doc).

### Groundswell: three phases, ad sets, and a workspace per customer (2026-10-22)

Owner's choices: the runs through the Composio project were poor, while the
same tools under a consumer account (outside a project, with its own linked
accounts) ran well. So phases 1 and 2 run on the consumer account and only
phase 3 uses the project (the client's linked accounts). Each phase starts
the next on its own; no button, no prompt.

- **Consumer account** (`composioConsumer.ts`): Composio Connect's MCP
  endpoint (`COMPOSIO_CONSUMER_API_KEY`, the `ck_…` key from Composio's For
  You page; optional `COMPOSIO_CONSUMER_MCP_URL`), called as
  `COMPOSIO_MULTI_EXECUTE_TOOL`. Large answers are saved in Composio's
  sandbox and read back pruned (`prunerCode`). With the key set, `executeTool`
  (`composio.ts`) goes there; the project key stays for client accounts.
  Readiness checks the consumer's toolkits (`checkConsumer`); with it, the
  project key is no longer required. Keyword Planner retries without
  `customer_id` there.
- **Phases** (`phases.ts`, `PHASE_INFO` in `groundswellValidation.ts`): each
  is its own `marketing_audits` row (`phase` audit | competitors |
  integrated, `source_audit_id`); the engine reads the source chain's outputs
  first (`StepContext.inherited`). 1 Audit (`STEPS`), 2 Plan against
  competitors (`COMPETITOR_STEPS`: the benchmark data reused from phase 1
  when it read them, `creative`, `adsets`, the benchmark and ad-set PDFs), 3
  Integrated plan (`INTEGRATED_STEPS`: `linked`, `search_terms`, the required
  `integrated` step, `adsets` again). `deliver_finish` queues the next phase
  (`queueNextPhase`, never twice); phase 3 only for a client with an active
  linked account.
- **Starting runs** (`startQueuedRuns` in `engine.ts`): the app gives each
  queued run its phase's steps. It claims a run by setting `started_at`
  while it is still queued (queueing and requeue leave it empty; a claim
  older than `START_LEASE_MS` is taken over), replaces its old steps, then
  moves it to running only while `started_at` still holds its claim. Without
  the `phase` column it is `start_queued_audits` as before. Full auto: the
  heartbeat starts queued runs up to `MAX_RUNNING` (3);
  `GROUNDSWELL_AUTO_START=off` turns that off.
- **Ad sets** (`packages/groundswell/src/adsets.ts`, step `adsets`): from the
  ad plan, Meta and Google sets for three goals, each with its mechanism and
  KPI: leads, engagement (`engagement_share` of the spend boosting the
  business's best posts) and rankings (searches where Ahrefs has it at
  positions 4–20). Each set is priced at low / medium / high
  (`budget_multipliers` [0.5, 1, 2] × the plan's base case; search spend
  stops at the clicks the area supplies) with clicks, leads, revenue and
  return, and a conservative–upside range at the medium budget. Setup file
  section `adsets` (New Wave's rules, each with its basis).
- **Images** (`creative.ts`): the business's own Instagram posts (phase 1's
  media, ScrapeCreators, Apify, then the site's og:image), at least 500 px.
  `creativeRender.ts` renders 1080×1350 ads (the photo above, the words on a
  band of the brand colour) and carousel slides with a caption.
- **Exports** (`reportsAdsets.ts`, `files.ts`): a Meta bulk-import workbook
  (Ads in the example's 18 columns, paused; Ad sets; Forecast), a Google Ads
  Editor CSV, the ad images and carousel as zips, and the "Ad Sets" PDF.
  Stored in the private `groundswell-assets` bucket (`assetStore.ts`,
  `groundswell_assets` rows).
- **Phase 3** (`integrated.ts`, `packages/groundswell/src/actuals.ts`): the
  account's own cost per click (from 50 clicks) and cost per lead (from 5
  leads) replace the published ones within ±15%; the published Google
  conversion rate stays (an account counts whatever it counts). The write-up
  is held to the account's figures; "Integrated Plan" PDF.
- **Workspace** (`api/groundswell/workspace.ts`, `workspace.ts`, `viewer.ts`;
  files through `api/groundswell/asset.ts`, only paths recorded for the run):
  a partner sees only its own customers and their runs, never error text;
  staff on `GROUNDSWELL_ADMIN_EMAILS` see everything. Screens:
  `CustomerWorkspace` (one card per phase, Start or Run again or why not,
  progress, reports, downloads, ad images, carousel, photos, data panels,
  earlier runs; it polls while a run waits or runs) on the partner's
  customer page (Drive-era audits listed below it) and on the new staff
  pages `/groundswell/admin/customers` (`GroundswellCustomers`: search,
  partner and stage filters, each phase's state) and `…/customers/:id`. The
  staff nav's "Audits" is now "Run queue".
- **Migration** `20261029120000`: the two columns, the wider report kinds,
  `groundswell_assets` (RLS on, no access for anon or authenticated), the
  bucket, and the worker cron firing while a run is queued too. Applied to
  production on 2026-10-22 in three parts (`groundswell_phases_columns_assets`,
  `…_report_kinds`, `…_worker_cron`). Every statement can run again.
- **Tests**: `groundswell-composio-consumer`, `-phases`, `-adsets` (prints
  the PDF and renders the images when Chromium is there), `-integrated`,
  `-workspace` in `src/test/api/`; `packages/groundswell/test/adsets.test.ts`
  and `actuals.test.ts`; `src/groundswell/workspace/CustomerWorkspace.test.tsx`
  and the workspace cases in `portal.test.tsx`.
- **Not yet**: the Meta workbook and Google CSV follow the example and the
  importers' documented columns, not a live import; Keyword Planner on the
  consumer account needs a Google Ads customer id it can read.

### Groundswell: a client's runs read its linked accounts (2026-10-22)

PR 4 of the prospect/client plan. The same audit and the same four reports
for both stages: a client's run reads the accounts a partner linked, and a
prospect's reads public data. Linked figures outrank the public estimates
where they overlap; nothing linked ever stops a run.

- **Step** `linked` (`api/_lib/groundswell/currents/linked.ts`, Current
  "Accounts", after `ads`, before `model`, optional). `loadLinkedAccounts`
  reads the audit's `customer_id`, the customer's stage and its active
  `groundswell_client_accounts` rows (a missing column or table reads as a
  prospect; any other read error retries). A prospect, a customer moved back
  to prospects, or a client with nothing active gets `{ linked: false,
  services: [], note }`. Each active row is read as its own connected account
  (`executeToolAs` in `composio.ts`, never the shared lookup), in parallel and
  best-effort: GA4 (the property matching the website, channel totals and
  landing pages), Search Console (the domain property, exact totals from the
  daily rows, 28-day window ending 3 days back), Google Ads (the first
  non-manager customer, campaigns over `LAST_30_DAYS`, micros to dollars),
  Instagram (profile, account insights as totals, the recent posts) and Meta
  Ads (the active ad account, spend, leads and messages from `actions`). A
  service that fails carries `problem` (a plain sentence; a stale link says to
  link again) and `detail` (for staff, never printed). `findKey` looks
  through Composio's wrappers; rates are stored as whole percentages so the
  write-up can quote them. `WINDOW_DAYS` is 30.
- **Facts**: `Facts.linked` (the step's output when it tried anything;
  `isLinkedOutput`), `linkedForPrompt` as `client_accounts` in
  `factsForPrompt`, so the write-up and the reviewer see the figures and
  `allowedNumbers` allows them; the system prompt says they outrank the
  public estimates and are never listed under `cant_see`.
- **Reports**: the full audit gains "8 · Your accounts" ("From the business's
  own accounts": a table per service read, "Not read this time" for the
  rest) before the plan, and the later sections move down one; the sources
  list each service's `source` and the gaps list each `problem`. Every cover
  (audit, slides, summary) carries `linkedLine`: "Includes the business's own
  Google Analytics 4, …". No new slide. A prospect's reports are unchanged.
- `STEP_LABELS.linked` "Linked accounts"; `gaps.ts` names a skipped step.
- **Tests**: `groundswell-linked.test.ts` (every service against provider-
  shaped answers, failures, the loader's fallbacks, the facts), the account
  case in `groundswell-composio.test.ts`, and the "client's own accounts"
  cases in `groundswell-reports.test.ts`.
- **Not yet**: Keyword Planner still runs on New Wave's shared Google Ads
  connection, not the client's; a failed read does not update the row's
  status (the portal's refresh does); the benchmark steps and the ad plan do
  not read the linked data.

### Groundswell: a client's linked accounts (2026-10-22)

PR 3 of the prospect/client plan. Owner's choices: a partner links a client's
accounts in the portal, signing in with the client through Composio's hosted
connect flow; the accounts are Google Analytics 4, Google Search Console,
Google Ads, Instagram and Meta Ads (Google Business Profile has no Composio
toolkit and is dropped for now; the scraped Maps listing stays). Runs that
read the linked data are the next PR.

- **Catalogue** `CLIENT_SERVICES` (`groundswellValidation.ts`): key,
  Composio toolkit, label, what it brings; `isClientService`,
  `ClientAccountStatus`.
- **Composio** (`composio.ts`): a client's accounts live in New Wave's
  project under the user id `client:<customer id>` (`CLIENT_USER_PREFIX`,
  `clientUserId`); the shared lookup never picks one, and `clientConnection`
  finds a client's by that id. New calls: `authConfigFor(toolkit)` (an
  enabled auth config, Composio-managed first), `createConnectionLink`
  (`POST /connected_accounts/link` with `auth_config_id`, `user_id`,
  `callback_url`), `getConnectedAccount`, `deleteConnectedAccount`
  (`revoke_on_delete`); `composioJson` is the shared request.
- **Migration** `20261028120000`: `groundswell_client_accounts` (one row
  per customer and service: the Composio account id, auth config, user id,
  status pending | active | failed | expired | disabled, when linked and
  checked; RLS on, no policies). Additive: the route answers 503 without it.
- **Route** `api/groundswell/partner-accounts.ts` (partner session; the
  customer must be the partner's and a client): GET `?customer=` lists every
  service with its state after asking Composio about pending accounts and
  active ones not checked for `RECHECK_MS` (`refreshClientAccounts`,
  `statusFrom`, `accountsView` in `clientAccounts.ts`; a failed or expired
  link reads as a plain sentence, never Composio's text); POST
  `{ customer, service }` starts the sign-in (replacing an old link) and
  answers `redirect_url`, with Composio bringing the browser back to the
  client's page `?linked=<service>`; DELETE `?customer=&service=` removes
  the connection and forgets it.
- **Portal**: `AccountsCard` on a client's page (`GroundswellCustomerPage`):
  a row per service with its chip, Link / Link again / Unlink; back from a
  sign-in it polls for a couple of minutes. `listClientAccounts`,
  `linkClientAccount`, `unlinkClientAccount` in `groundswellPartner.ts`.
- **Readiness**: one `authconfig:<toolkit>` check per client service
  ("Client sign-in: …"): whether the Composio project has an auth config
  partners can link through; never counted against readiness.
- **Tests**: `groundswell-client-accounts.test.ts`, the connect-flow and
  client-lookup cases in `groundswell-composio.test.ts`, the sign-in rows in
  `groundswell-readiness.test.ts`, the accounts cases in `portal.test.tsx`.
- **Not yet**: New Wave's own clients (partner_id null) have no staff
  screen for linking; the engine does not read linked data.

### Groundswell: prospects and clients (2026-10-22)

Owner's choices: a prospect (a lead) is entered and its public data is read;
a client is a business the partner works for, whose own accounts get linked
(Google Business Profile, GA4 + Search Console, Google Ads, Meta: the next
PR); one record with two stages, so "Became a client" moves it over and
everything gathered as a prospect stays on its page; the same reports for
both, one from linked data and one from public data (the PR after).

- **Migration** `20261027120000`: `groundswell_customers.stage`
  ('prospect' | 'client', default prospect) and `became_client_at`. The
  customers migration is now `20261024130000`: it shared its version with
  the review-status migration, and Supabase's preview branch refused the
  duplicate on every PR that added a migration.
  Additive: the route reads them only where they exist (42703 fallback:
  every customer is a prospect; moving one answers 503).
- **Route** `partner-customers.ts`: `?stage=` filters the list; `?id=`
  adds `stages_available`; POST takes `stage: 'client'`; PATCH `?id=`
  with `{ stage }` moves a record (`became_client_at` set or cleared).
  `CUSTOMER_STAGES` / `isCustomerStage` in `groundswellValidation.ts`.
- **Portal**: `/groundswell/prospects` and `/groundswell/clients`
  (`GroundswellProspectsPage`, `GroundswellClientsPage` in
  `GroundswellCustomersPage.tsx`, one `Customers stage=` list; the branding
  panel stays with the prospects); `/groundswell/customers` redirects to
  the prospects; the record page keeps `/groundswell/customers/:id` and
  shows the stage chip, "Became a client" / "Move back to prospects"
  (`setPartnerCustomerStage`), a back link to its stage's list, and its
  audits under "Audits from public data". `CustomerForm mode="add"` takes
  `stage`. The partner navigation is Prospects, Clients.
- **Tests**: the stage cases in `groundswell-customers.test.ts` and
  `portal.test.tsx`.

### Groundswell: partner-ready prospect runs (2026-10-22)

Owner's choices: partners link nothing for a prospect's audit (New Wave's
shared Composio project runs every scrape); a data source that is missing
mid-run never stops the audit: the reports deliver and name the gap. (Clients
with linked accounts are the next step; see the Groundswell portal plan.)

- **Readiness** (`api/_lib/groundswell/readiness.ts`): `readinessChecks`
  asks every service to answer: the reports bucket, OpenAI (`GET /v1/models`),
  the Composio key, and one check per toolkit the Currents read
  (`TOOLKIT_CHECKS`: ahrefs, scrapecreators, google_maps, googleads, through
  `activeConnection` in `composio.ts`), plus Resend and the Google Ads
  customer id. Details are words for staff, never a value. `readinessSummary`
  gives the verdict (`ready`: every required check; `complete`: every data
  source too). `GET /api/groundswell/run?check=live` returns them; the plain
  GET still only reads the environment. The overview's "Check connections"
  button (`getSetupStatus(true)`) shows each detail and the verdict.
- **Degrade, never fail**: `benchmark` and `deliver_benchmark` are optional
  (no benchmark data at all means three reports and a named gap); the site
  step retries an unreachable website on the first `SITE_ATTEMPTS` calls and
  then goes on with the scan's error recorded; a blocked Instagram profile is
  read once more after `BLOCKED_RETRY_MS`. The maps step keeps Places'
  failure in `detail` (for the admin screen) and the reports carry only
  `PLACES_FALLBACK_NOTE`, so no tool name or quota message is printed.
- **Gaps named** (`gaps.ts`): `gapsFor(outputs, steps)` turns every data
  step without an output into a plain sentence; `reportData` passes them as
  `ReportData.gaps` and the full audit's "Not available this time" lists
  them (`gapsFromMissing` for callers without the step list).
- Step label `deliver_prepare` is "Reports storage" (it was "Drive folder").
- **Tests**: `groundswell-readiness.test.ts`, `groundswell-social.test.ts`,
  the site retry in `groundswell-currents.test.ts`, the gap and partner-safe
  cases in `groundswell-reports.test.ts`, the live route case, the step pins,
  and the overview button. Note for test authors: a function returned from
  `beforeEach` is a cleanup hook to vitest (`beforeEach(() => mock.mockReset())`
  calls the mock after every test).

### Groundswell: Composio connections found by toolkit, not by user id (2026-10-22)

Every Composio step had failed with "no active connection for X under
entity groundswell": the project's accounts were tagged with the user id
Composio's dashboard assigned (`pg-test-…`), not `groundswell`.

- `executeTool` (`composio.ts`) now lists the project's active connected
  accounts for the tool's toolkit (`toolkitOf`: `GOOGLE_MAPS_TEXT_SEARCH` →
  `google_maps`), picks the one under the fixed user id `COMPOSIO_USER_ID`
  (`pg-test-0ff14d6b-e58a-45f1-a053-db132130d54f`, in code; no environment
  variable overrides it, owner's call on 2026-10-22) when there is one
  and otherwise the newest (`connectionFor`, cached per toolkit for the
  function instance), and runs the tool with `connected_account_id`. No
  active account stops the step for good, naming the toolkit and the
  project. The user id is a preference, not a requirement.
- Tests: `src/test/api/groundswell-composio.test.ts`.

### Groundswell: reports stored in the app, visible to their partner and the admin (2026-10-22)

Owner's choices: Supabase Storage in a private bucket; Google Drive dropped
entirely; the admin who sees every report is josh@newwaveitfl.com (an
allow-list), not every signed-in Supabase user.

- **Store** (`api/_lib/groundswell/reportStore.ts`): bucket
  `groundswell-reports` (private, PDFs only), one object per report at
  `<audit id>/<kind>/<file name>`, and one `groundswell_reports` row per
  (audit, kind): `storeReport` (upsert), `reportsFor`, `signedReportUrl`
  (120 s). `safeName` moved here from the deleted `drive.ts`.
- **Delivery** (`delivery.ts`): `deliver_prepare` checks the bucket is
  reachable; each print step stores its PDF; `deliver_finish` marks the
  audit done and no longer writes Drive links (the `*_pdf_url` columns stay
  for audits delivered before). Reports link only to the Groundswell portal
  (`PORTAL_URL`, `portalLink`, `assertPortalOnly`), never to Drive.
- **Access** (`api/groundswell/report.ts`): `GET ?audit=<id>&kind=` answers
  a signed link to the partner whose session queued the audit, or to an
  admin on `GROUNDSWELL_ADMIN_EMAILS` (`adminUser`, `isReportAdmin` in
  `adminKey.ts`; default josh@newwaveitfl.com). Anyone else, and any audit
  the partner does not own, gets 404. Without a kind it lists the audit's
  reports. The partner routes add `reports` (kind, name, pages) to each
  audit (`withReports`).
- **Screens**: the partner customer page and the staff audits screen open
  reports through that route (`partnerReportUrl`, `adminReportUrl`,
  `REPORT_LABELS`); audits with Drive links keep them. The overview names
  the report admins (`report_admins` from `GET /api/groundswell/run`,
  replacing `drive_owner`). Croissance's copy describes the portal.
- **Migration** `20261026120000`: the table (RLS on, no policies) and the
  bucket. `GROUNDSWELL_DRIVE_OWNER` is no longer read.
- **Tests**: `groundswell-report-store.test.ts`,
  `groundswell-report-route.test.ts`; `fakeSupabase` gains `upsert` and a
  storage stand-in; the white-label, reports, ad-copy, benchmark, portal and
  admin tests follow. `groundswell-drive.test.ts` is gone with `drive.ts`.
- **Still to do**: the manual skill (`.claude/skills/groundswell`) and the
  spec still describe Drive delivery.

### Groundswell: the engine picks a benchmark's missing competitors (2026-10-22)

Owner's choices: the Google Places API picks them; only the slots not
entered are filled; one from the local market and one from the
country-wide market.

- **Step** `competitors` (`api/_lib/groundswell/currents/competitors.ts`),
  first in every audit and benchmark, optional. When fewer than two
  competitors were entered: one Places text search finds the business
  (`matchBusiness`) and its category and area; `"<category> near <area>"`
  gives the local pick and `"<category> in the United States"` the
  country-wide one, outside the business's city (`cityOf`). "Top" is the
  most Google reviews, then the higher rating (`pickFrom`); a pick needs a
  website, and never is the business itself, a closed place, an entered
  competitor, or a host already used. Entered competitors stay first. Two
  entered means no Places call. The output records each pick's query,
  rating, reviews and address, and how many places each query returned.
- **Engine**: `StepDefinition.persist(output, audit)` names audit-row fields
  a finished step changes; the worker writes them to `marketing_audits`
  before marking the step done, so the next step's row read sees them
  (`persistCompetitors` writes the competitors only when the step added
  any). A write that fails fails the step.
- **Queueing**: `buildAuditInsert` no longer requires two competitors for a
  benchmark; the admin and partner forms say a blank slot is picked by
  Groundswell. Migration `20261025120000` drops
  `marketing_audits_benchmark_competitors_check`. `STEP_LABELS` gains
  "Top competitors".
- **Tests**: `src/test/api/groundswell-competitors.test.ts`, the persist
  case in `groundswell-engine.test.ts`, and the queue cases in the
  benchmark, partner and customer tests.
- **Not yet**: the reports do not say which competitors were picked and
  why; the step's output holds it. The Places project's daily text-search
  quota (4,000) is shared with every other use of the key.

### Groundswell: review, re-interpret, re-run before delivery (2026-10-21)

Owner's choices: re-read the plan's sources, re-run the plan and add a
reviewer; hold for a person when the passes still disagree; the write-up's
estimates (job value, close rate, margin) stay fixed across passes; audits
and benchmarks both (the competitor pages are not re-read).

- **Package** (`packages/groundswell/src/verify.ts`): `planFigures` (what a
  reader acts on: angle demand, keyword searches and bids, each row's clicks,
  cost per click and 12-month net, the change ranking, fund / test / skip and
  the top three as calls), `compareFigures` (within `verification.tolerance`;
  counts may differ by one; money judged against what is at stake; a figure
  one pass read and the other could not is a disagreement), `findAgreement`
  (the latest pass against every earlier one; the first pass is delivered
  whenever it held up; two later reads that both missed a source never stand
  in for it), and `refreshAngles` (the plan's angles priced from another
  Keyword Planner read). Setup file: `verification.max_review_drops` (0.25,
  New Wave's rule).
- **Steps** (`api/_lib/groundswell/verify.ts`), for rounds 2 to
  `verification.max_rounds` (3) after `adcopy` (audits) or `benchmark`:
  `verify_read_N` (optional) reads Google Maps, Ahrefs, Keyword Planner and
  Instagram again in parallel, only those the first pass read;
  `verify_check_N` re-runs the plan and the search-ad model on it and
  compares. Agreed: one reviewer call (OpenAI) checks every sentence of the
  write-up and a benchmark's; a fix keeps only the data's numbers, anything
  else drops the sentence. When a later read is the one that held up, the
  check's `outputs` carry it with the plan, the ROI model, the ad copy
  (`refitCopy`) and the benchmark scorecard (`scoreTables`) re-run on it.
  Delivery builds from the settled check (`verifiedOutputs` in
  `reportData`). The last round comes from the audit's own step list
  (`StepContext.steps`), and the worker knows rounds up to 5
  (`SUPPORTED_ROUNDS`, `ALL_STEPS`). The ad plan now stores its sorted
  `fixes` so the ranking can be re-run.
- **Hold**: no agreement after the last round, a headline or verdict the
  reviewer could not keep, more than `max_review_drops` dropped, or a
  reviewer that never answered sets `hold`; the engine marks the step done
  and the audit `review` (it falls back to `failed` with "Needs review: …"
  before the migration), so nothing is delivered.
- **Migration** `20261024120000`: `marketing_audits_status_check` gains
  `'review'`.
- **Admin and partners**: `/groundswell/admin/audits` shows "Needs review"
  with each figure that moved (first read against the latest) and what the
  reviewer changed, plus "Deliver anyway" (the first read, reviewed) and "Run
  the checks again" (`POST /api/groundswell/run` with `action`, handled by
  `api/_lib/groundswell/review.ts`); the overview counts them; partners see
  "In review", never the reason.
- **Tests**: `packages/groundswell/test/verify.test.ts`,
  `src/test/api/groundswell-verify.test.ts` (Currents and OpenAI mocked:
  rounds, holds, the reviewer, delivery, answering a held audit), plus hold
  cases in `groundswell-engine.test.ts`, a benchmark case in
  `groundswell-benchmark.test.ts`, and the route, admin, overview and
  partner screens.

### Croissance as a walkthrough; five-item rows centred (2026-10-21)

- **Croissance** (`/social-engineering/croissance`) shows the audit one part
  at a time instead of every table at once: the hero's facts line and a
  second button to the example; an "On this page" row of pill links
  (`nwse-chip`); the five steps as a guided stepper; the Currents as a chip
  explorer, each with where it looks, what it brings back, and, where the
  brewery's audit has a figure, `AuditConnector.example`; the worked example
  as one report viewer (`data-role="sample-viewer"`: findings, return board,
  ad plan, ready-to-run ads, what pays back first, with Back and Next and the
  discovery call at the end) followed by a `CtaStrip`; then the reports,
  growth, questions, and the closing call. New: `components/Tabs.tsx` (the
  WAI-ARIA tabs pattern, three looks in `division.css`, inactive panels under
  the hidden attribute), `CtaStrip` and `PrimaryCta tone="light"` in
  `sections.tsx`, `.nwse-btn-ghost`, `.nwse-btn-navy`, `.nwse-chip`.
  `pages.test.tsx` opens each part before reading it; `Tabs.test.tsx` covers
  the pattern. Notes: "Layout: one part at a time" in
  `docs/social-engineering-division.md`.
- **Five-item grids** (the hub's data points and measures, every service's
  scope) centre their second row under the first (`FIVE_CENTRED_LI`,
  `FIVE_CENTRED_DIV`; `data-centred` on the list). The hub's journey scene
  moved from that grid's sixth cell to beside the band's intro
  (`SectionIntro scene`); `PointGrid` no longer takes a scene.

### Groundswell: the right tool for the job in Maps and the ad libraries (2026-10-21)

The first benchmark run on the live engine showed two Currents relying on
headless-browser scraping where a connected tool now exists. Both keep the
browser read as the fallback, and neither changes an output shape.

- **Maps** (`currents/maps.ts`): `runMaps` asks the Google Places API (text
  search, `GOOGLE_MAPS_TEXT_SEARCH` through Composio) for the business and
  then for rivals in its category near its area (`placesLookup`,
  `toMapsPlace`, `toMapsListing`, `matchBusiness`, `PLACE_FIELDS`). Result
  order is relevance, not the Maps pack, and the `source` string says so.
  When Composio is not set up or Places fails for any reason but a refused
  key (no connection, the shared project's daily quota, an outage), the
  logged-out Maps view is read in the browser as before (`browserLookup`),
  with the reason in `note`. A refused key still stops the step.
- **Ad libraries** (`currents/adsLibrary.ts`): Google's Transparency Center
  is read by domain through `SCRAPECREATORS_LIST_GOOGLE_COMPANY_ADS` (one
  credit, never `get_ad_details`), with no date filter so an empty, complete
  first page is a verified negative and `total_estimate` is the count
  (`googleAdsFromList`). The headless render runs only for domains that call
  could not answer. The spec and the package README say the same.
- **Tests**: `src/test/api/groundswell-maps.test.ts` (new) and the ad-library
  cases in `groundswell-benchmark.test.ts`.
- **Seen on the first live runs, parked**: the maps step's first attempt
  hangs inside the run route's background worker until Vercel's 300 s limit,
  and the 600 s step lease then idles until a cron-started worker reclaims
  it, about ten minutes per audit. The browser path is now the fallback only,
  which should avoid it; if not, shorten the lease or the Maps timeout.

### Admin panel rework, phase 3: "View on site" shows unsaved edits (2026-10-21)

The last phase of the plan Josh approved on 2026-10-21. Every admin "View on
site" link (editor header, the arrow on an open block, sidebar page rows, the
front page) is now `previewUrl(url, anchor?)`: the public page with
`?preview=1` and the block's anchor.

- **`src/lib/preview.ts`**: the admin's `ContentManager` writes each
  section's pending edits to `localStorage` (`nw_preview:<section>`) and a
  BroadcastChannel (`newwave_preview`) whenever the draft moves (`writeDraft`
  does both; a draft restored on load is previewed too; publish and discard
  clear it). `isPreviewMode()` is true for a tab opened with `?preview=1`
  (kept in `sessionStorage` as `nw_preview` until "Exit preview").
- **`useContentWithStatus`**: in preview mode the overlay is laid over the
  saved content and follows the channel; the cache and the CMS only ever
  hold saved content, and a normal visitor's path is unchanged.
- **`PreviewBanner`** (mounted in `App.tsx`): the amber bar with "Back to
  the editor" and "Exit preview".
- **Anchors**: `SectionBlock.anchor` names the public element id the block
  renders in (`hero`, `trust-bar` and `footer` are new ids, the rest
  existed); `sections.test.ts` checks every anchor is an `id="…"` in
  `src/components` or `src/pages`.
- **Tests**: `src/lib/preview.test.tsx` (URL, mode, overlay, the hook in
  and out of preview, the banner), new `ContentManager.test.ts` cases, and
  the pinned hrefs in the admin tests.
### Groundswell: customers (2026-10-21)

PR 2 of the Groundswell portal plan. A customer is now a record of its own
(`groundswell_customers`), and every audit points at one; a partner's
customer list and customer page are built on it. Partners still cannot start
runs (PR 3).

- **Migration** `20261024130000` (renamed from `20261024120000` on 2026-10-22,
  which the review-status migration also carried; Supabase's preview branch
  refused the duplicate): `groundswell_customers` (partner_id, null
  for New Wave's own prospects; name, city, website, Instagram, competitors,
  notes; RLS on, no policies) and `marketing_audits.customer_id`. A `BEFORE
  INSERT` trigger (`groundswell_link_audit_customer`, SECURITY DEFINER)
  finds or creates the customer for any audit inserted without one, so the
  admin queue (an RLS insert by a signed-in user) and the old partner route
  get customers without naming the column; the backfill links every existing
  audit the same way, oldest first. `groundswell_customer_for_audit` has no
  EXECUTE for anon or authenticated. Additive: the customers route answers
  503 until the table exists; nothing else reads the column.
- **Route** `api/groundswell/partner-customers.ts` (partner session): GET
  lists the partner's customers, most recent activity first, each with its
  newest audit (`latest`), `last_reports_at` and `audit_count`; `?id=`
  returns one with all of its audits (Drive links; never error text or ids
  of other things). POST adds a customer and queues its first audit (audit
  or benchmark, optional logo and colour; the customer is removed again if
  the audit cannot be queued). PUT `?id=` edits the details; queued audits
  keep theirs. `buildCustomerInsert` in `groundswellValidation.ts` is the
  audit checks without the per-run fields. `partner-audits.ts` stays.
- **Pages** (`src/groundswell/pages/`): `GroundswellCustomersPage` is a
  table (business, city, status chip, last reports; a search box from four
  customers) with "Add a customer" as the one primary action, the empty
  state, and the branding panel below; `GroundswellCustomerPage`
  (`/groundswell/customers/:id`, noindex) shows the details with Edit in
  place and each audit as a card with its Drive links. `CustomerForm` is the
  shared add/edit form (add queues the first audit and carries the privacy
  notice); `customerStatus.ts` holds the status labels (Not started,
  Waiting to start, Running, Reports ready, Needs attention, In review).
- **Tests**: `src/test/api/groundswell-customers.test.ts` (`fakeSupabase`
  can now simulate a missing table, `['*']`), and the customer cases in
  `src/groundswell/portal.test.tsx`.

### Groundswell: white-label reports for partners (2026-10-21)

Owner's choices: full white-label; the client keeps its colours and logo, the
partner's logo and name sit with "Prepared by"; branding is set in the
partner portal and by admins; logos are https links (no uploads).

- **Migration** `20261023120000` (additive, nullable):
  `groundswell_partners.display_name` / `logo_url` (the name and logo a
  partner's reports carry; the company when unset), and
  `marketing_audits.brand_logo_url` / `brand_color` (a business's own logo
  and colour, when its website's are wrong). Code reads them only where they
  exist (42703 fallbacks), so it runs before or after the migration.
- **Engine**: `loadBranding` (`api/_lib/groundswell/branding.ts`) reads an
  audit's partner and overrides when a step is claimed (`AuditRow.branding`).
  Only a missing column falls back; any other read error fails the step, so a
  partner's report is never printed as New Wave's.
- **Reports**: `preparerFor` / `Preparer` ("Prepared by <partner>", its logo
  on every cover) in all four PDFs, and `ownWording`, a last pass over a
  partner's HTML: "New Wave's estimate" becomes "our estimate", any other
  New Wave, Groundswell or Croissance name becomes the partner's. A test
  renders every report for a partner and fails on any of those names.
  `brandFrom` takes the queued colour and logo first (the colour still has
  to carry text at 4.5:1).
- **Drive**: a partner's audits go to `Partners/<company> (<id>)/<Business>`,
  never a link-shared business folder a same-named New Wave customer (or
  another partner's client) might have. Drive still shows the owner's account
  to viewers.
- **Portal and admin**: "Your branding" on the partner dashboard
  (`api/groundswell/partner-branding.ts`, GET/PUT), a Branding editor per
  partner at `/admin/groundswell/partners` (PATCH `action: 'branding'`), and
  an optional logo and colour on both queue forms. Shared checks:
  `normalizeLogoUrl` (https, public host, ≤ 500), `normalizeBrandColor`,
  `buildPartnerBranding` (`src/lib/groundswellValidation.ts`).
- **Tests**: `src/test/api/groundswell-white-label.test.ts` (wording, every
  report, overrides, loading, Drive folder, printing), plus branding cases in
  `groundswell-partners.test.ts`, `groundswell-benchmark.test.ts`,
  `partners.test.tsx` and `src/lib/groundswell.test.ts`;
  `fakeSupabase` can now simulate a column a migration has not added.

### Groundswell portal at /groundswell (2026-10-21)

Groundswell has its own address, newwaveitfl.com/groundswell, for partners
and New Wave staff (plan: the "Groundswell portal design plan" doc; this is
PR 1 of 4, the address and the shell; customers, partner-run audits and
polish follow). Code: `src/groundswell/`.

- **Pages**: `/groundswell` is the sign-in (partner email and password,
  reset link, a "New Wave staff sign-in" link). It is a static New Wave IT
  route (`IT_PAGE_META['/groundswell']`, prerendered, in the sitemap) whose
  code loads on demand (`src/pages/GroundswellSignInPage.tsx` wraps the lazy
  page). `/groundswell/customers` is the partner app (the old dashboard:
  add a customer, see your own audits and Drive links), `/set-password` is
  where invite and reset links land, and `/groundswell/admin` (+ `/audits`,
  `/partners`) is the staff section behind the content admin's Supabase
  sign-in (`AdminGuard` now takes `title`/`subtitle`). Everything but the
  sign-in is noindex, outside the sitemap and the prerender.
- **Shell** (`GroundswellShell.tsx`, `groundswell.css`, scoped to
  `.gs-root`): top bar, left nav on desktop and tabs on phones, light
  surfaces with the division's amber accent; `GroundswellFrame` wraps the
  pages shown before sign-in. The three staff screens moved from
  `src/admin/groundswell/` to `src/groundswell/admin/` and were restyled to
  it; the content admin's sidebar keeps one "Open Groundswell" link.
- **Old addresses**: `/social-engineering/croissance/partners{,/dashboard,
  /set-password}` and `/admin/groundswell{,/*}` redirect permanently in
  `vercel.json` (the query string, so an old invite token, is kept) and
  client-side in `App.tsx`. Invite and reset emails now link to
  `/groundswell/set-password` (`PARTNER_BASE_PATH` in
  `api/_lib/groundswell/partners.ts`). The division lost its partner page,
  content, SEO entry and preload mapping.
- **Tests**: `src/groundswell/portal.test.tsx` (sign-in, customers, set
  password, the shell, the redirects) and the moved admin tests; updated
  pins in `it-prerender` (32 routes), `division-integration`,
  `FormPrivacyNotice`, and the partner API test.

### Admin panel rework, phase 2: one editor for every section (2026-10-21)

Phase 2 of the plan Josh approved on 2026-10-21 (phase 1, the sidebar, is
below). Every `site_content` editor is now one screen; the stored shapes
are unchanged (`sections.test.ts` pins them), and the public site reads
nothing new.

- **Descriptors** (`src/admin/sections/descriptors.ts`, types in
  `types.ts`): one `SectionDescriptor` per section (hero, trustbar,
  services, whyus, about, contact, footer, pricing, status,
  services-categories, services-detail, threats-detail): its public URL and
  its blocks, each a list of fields. Scalar kinds: text, textarea, number,
  color, select, checkbox, strings (JSON array of strings). `list` fields
  hold items with their own fields, a `titleKey` for the row, `newItem`, and
  `defaults` (the site's built-in items). The footer gained its three social
  URL fields, which `Footer.tsx` already read.
- **`SectionPage`** (`src/admin/SectionPage.tsx`) renders a descriptor:
  `BlockCard`s (collapsed with a preview and a field count, one open at a
  time unless pinned, an amber dot while unsaved), `FieldInput` (the one
  field set), and `ListRows` (rows with move, duplicate, delete, drag; a
  side-panel `ItemPanel` to edit one; "Start from the site's defaults" when
  empty). A stored list that cannot be parsed is shown raw and left alone
  (`parseList` in `sections/listValue.ts`). `?field=<key>` opens the block
  and focuses the input; the sidebar search's "Fields" group
  (`searchAdminFields` in `adminNav.ts`) links there.
- **`ContentManager`**: `loadSection` records each section's newest
  `updated_at`; `publishChanges` refuses with `StaleSectionError` when a
  pending section's rows changed since (the layout confirms, then
  `{ force: true }`), then writes the public cache and the
  BroadcastChannel for each change, so the live site no longer waits for
  the 30 s poll. Pending edits are kept in sessionStorage (`nw_admin_draft`)
  and restored on load; the layout warns before unloading with unsaved
  edits. State updates replace objects rather than mutate them.
- **Removed**: the twelve editors in `src/admin/editors/` except
  `PricingUnitsEditor`, plus `SectionEditor`, `FormSection`, and
  `CardListEditor`. The routes in `App.tsx` point at `SectionPage`.
- **Tests**: `sections.test.ts` (every key the public site reads has a
  field; stored shapes; nav reachability; `parseList`; field search),
  `ContentManager.test.ts` (draft, stale save, cache and channel),
  `SectionPage.test.tsx`. Docs: `docs/admin-guide.md` ("Editing content",
  "Adding an editor"); `docs/editor-migration-guide.md` is closed out.

### Admin panel rework, phase 1: one sidebar, organised by site page (2026-10-21)

From the plan Josh approved on 2026-10-21 (Claude Doc "New Wave admin panel
rework plan"). Phase 1 is navigation only; the page-first editors (collapsed
block cards, list rows, every editor on `ContentManager`) and the "View on
site" preview are phases 2 and 3.

- **One admin, one sidebar** (`AdminLayout.tsx`, model in `adminNav.ts`):
  Site pages (one collapsible row per public page, its block editors beneath
  in page order, plus a "View on site" link), Blog, SEO, Groundswell
  (unchanged; the partner portal thread owns it). A search box filters
  entries by label, page, and `keywords` (field names); open rows are
  remembered in localStorage (`nw_admin_open_pages`). The `PublishBar` now
  lives in the layout, on every editor, shown only while something is
  unsaved or a save is in flight, with Discard always available.
- **Removed**: `UnifiedAdminDashboard`, `SidebarNavigation` (its groups,
  the deleted Testimonials entry, and ten "not yet implemented" screens),
  and the legacy `AdminDashboard`. `/admin/unified` redirects to
  `/admin/blog`, `/admin/legacy` to `/admin`.
- **New routes**: `/admin/blog` (`blog/BlogPage.tsx`: the post list, a
  post's editor in place, Generate with an inline notice instead of
  `alert`) and `/admin/blog/settings`. `/admin` is `AdminHome.tsx`: a card
  per site page with its editors and the newest `site_content.updated_at`
  (`adminHomeData.ts`), and the Groundswell queue count.
- `ContentManager` no longer preloads `navbar` (nothing reads it).
- **Tests**: `adminNav.test.ts` (every entry is an App.tsx route; every
  section the public site reads has an editor; no placeholder screens),
  `AdminLayout.test.tsx`, `AdminHome.test.tsx`. Adding an editor: see
  "Adding an editor" in `docs/admin-guide.md`.

### Groundswell: ad copy for the rows the ad plan runs (2026-10-21)

- **Package** (`packages/groundswell/src/adcopy.ts`): `copyTargets` (one ad
  per angle and platform the plan funds or tests, funded first, at most
  `COPY_LIMIT` 8) and `checkCopy`, which holds written copy to the format:
  each line within the platform's limit, no claim from `unsupported_claims`
  (owner's choice: never, even with proof), no number the caller rejects,
  repeats and unknown fields dropped; a search ad's targeting is its Keyword
  Planner keywords; the rest must pass `templateProblems`, or the row is
  listed as not written with the reason.
- **Step** `adcopy` (`api/_lib/groundswell/adcopy.ts`), optional, after
  `adplan` in audits and benchmarks. One OpenAI call from the business's own
  facts only (`copyFacts`: its website's title, description and headings, its
  Google listing, its Instagram bio; never a competitor); the number guard
  allows only numbers in what the model was sent. No plan, or no row the plan
  runs, skips it.
- **Reports** (owner's choice: the full audit only): "11 · Ad copy, ready to
  paste" after the ad plan, field by field with each limit, then the rows not
  written; Sources becomes 12. Slides (12) and the summary are unchanged; an
  audit without the step's output reads as before.
- **Tests**: `packages/groundswell/test/adcopy.test.ts` (the brewery's plan
  and hand-written ads) and `src/test/api/groundswell-adcopy.test.ts` (the
  step with OpenAI mocked, the audit section, printing).

### Groundswell: `social_depth` current for the competitor benchmark (2026-10-21)

First step of the benchmark workflow in `docs/groundswell-competitor-benchmark.md`
(#114). Merged into the competitor benchmark below: the rules live once, in
`packages/groundswell/src/benchmark/engagement.ts`, and
`api/_lib/groundswell/currents/socialDepth.ts` is the step that fetches the
pages and maps them (`mediaList`, `toRawItem`).

- **Rules** (the spec as #114 updated it): dedupe on time + caption, the copy
  with plays kept; a feed post with a newer one after it is pinned and left
  out of cadence; both passes of the hidden-likes rule (the median over
  likes above 5); cadence over items under 14 days old; reels per week over
  the days the reels page spans (at least 7); plays for reels and videos only.
- **Tests** `src/test/api/groundswell-social-depth.test.ts` (ported to the
  package), pinned to the anonymised fixtures in
  `src/test/api/fixtures/groundswell-benchmark/` (`expected.json` records the
  rules as implemented).

### Social Engineering repositioned as a national growth division (2026-10-21)

Every `/social-engineering` page now describes what the business is: a
national, remote-first growth division for small businesses, built on data,
integrations, and smart advertising. No division page names a home market
(`pages.test.tsx`, "positions the division nationally"); the footer's
address and the Customers page's locations are facts and stay.
Full notes: "Positioning (2026-10-21)" in `docs/social-engineering-division.md`.

- **Copy**: `content/hub.ts` and the six service files were rewritten. The
  six service URLs are unchanged; three labels changed (Marketing → "Smart
  advertising", Integration → "Integrations & data", Digital oversight →
  "Analytics & oversight"). The hub's method is Audit → Plan → Build and run,
  its roadmap is the first 90 days (foundation, demand, scale) with a
  weekly/monthly/quarterly cadence, and `DIVISION_DESCRIPTOR` is
  "Data · Integrations · Smart advertising". `seo.ts` serves the United
  States (`DIVISION_SERVICE_AREA`). The IT Navbar's division blurb and the IT
  Footer link ("Growth Marketing & Advertising") follow.
- **Content model** (`types.ts`): `DivisionPillar`, `DivisionGlance`;
  services carry `pillar`, `glance` (four facts), and `outcomes` (three);
  the hub carries `pillars`, `cadence`, and `industries`. No numbers in any
  of them (tested).
- **Layout** (`components/sections.tsx`): `PillarCards`, `GlanceStrip`,
  `OutcomeList`, `PillarStrip`, `ChipList`, `CadenceRow`, `Band size="compact"`,
  the hero's `facts` line and amber-glow ground. The hub's intro shows the
  growth loop (`components/GrowthLoop.tsx` + `growthLoop.ts`, a static
  decorative SVG) in place of the brand mark; service pages open with the
  glance strip, then outcomes, scope, steps, deliverables, where it fits,
  FAQ, related, CTA.
- **Surfaces and colour roles** (same day, design pass): each pillar has a
  colour (`components/pillarStyle.ts`: Signal Cyan data, Continuity Green
  integrations, Lure Amber smart advertising; Tide Blue for the rest, and
  `accentAt(index)` cycles them), and the pages use five surfaces beside the
  hairline card: tinted panels (`nwse-tint nwse-tint-*`), soft tiles
  (`nwse-soft`, on Cloud White bands), glass tiles (`nwse-glass`, on dark
  bands), the stepper rail (`nwse-stepper`, steps without cards from 768px),
  and capped cards. `Band` takes `tone="dark" | "navy"` and renders
  `DarkCurrents` itself; the hub has four dark sections (hero, pillars,
  metrics, CTA) and the service pages open on a navy glance strip. Icon
  tiles take `nwse-icon-cyan|green|tide` and `nwse-icon-on-dark`. Text on a
  tint is navy, slate, or amber-deep, never Tide Blue; labels on dark are
  amber, cyan, or green. The `data-markers="node"` timeline rules are gone
  (steps always have a marker tile). Full notes: "Surfaces and colour roles"
  in `docs/social-engineering-division.md`.
- **Icons**: three `pillar-*` icons in a new `pillars` group (38 icons; the
  kit's SVG files are still to be added by its owner).
- **Tests**: new cases in `pages.test.tsx` and `icons.test.ts`; updated
  pins in `responsive.test.tsx`, `motion.test.tsx`, and the discovery-call
  description in `pages.test.tsx`.

### Groundswell: competitor benchmark (2026-10-22)

From the spec in PR #110 (`docs/groundswell-competitor-benchmark.md`). A
second audit kind, `benchmark`: the audit plus a comparison with the first
two competitors entered, and a fourth PDF.

- **Package** (`packages/groundswell/src/benchmark/`, the resellable part):
  engagement (dedupe, pinned, hidden likes, comment-to-DM prompts), ad
  evidence (verified negative vs unknown, never spend), pricing extraction and
  `checkLadder`, authority (press list, owned channels, credentials by the
  industry's licence words), and the scorecard with gaps and levers. Setup
  file: a `benchmark` section; industry profiles gain `licences` and
  `do_not_copy`.
- **Engine** (`BENCHMARK_STEPS` in `steps.ts`): after `adplan` (they read its
  industry profile), `social_depth`, `ads_library`, `pricing` and
  `authority` (optional), then `benchmark` (scorecard in code, one guarded
  write-up call; the industry's do-not-copy rules always included) and
  `deliver_benchmark` before the slides. Audits keep `STEPS` unchanged; the
  worker knows every step (`ALL_STEPS`). Pricing makes one extra model call to
  sort offers, held to the prices found. Accounts: `benchmarkAccounts.ts`.
- **Reports**: `reportsBenchmark.ts` (Letter, no links: scorecard,
  engagement, ads, pricing, differences, do not copy, plan and targets, three
  appendices); the slides gain `benchmark_scorecard` and `benchmark_plan`; the
  summary an "Against your competitors" band. `deliver_finish` shares and
  saves `benchmark_pdf_url` only when that file exists.
- **Migration** `20261022120000`: `kind` ('audit' | 'benchmark', two
  competitors required), `benchmark_pdf_url` (Drive only, null on admin
  inserts), and `start_queued_audits(step_names, max_audits,
  benchmark_step_names DEFAULT NULL)` replacing the two-argument function, so
  old two-argument calls still work. The code reads and writes the new columns
  only where they exist, and `startQueuedAudits` falls back to the old call.
- **Admin and partners**: a "Benchmark against the top 2 competitors" switch
  on both queue forms (`buildAuditInsert` needs two competitors and sends
  `kind` only for a benchmark), a Benchmark badge and link, and a benchmark
  count on the overview.
- **Tests**: `packages/groundswell/test/benchmark.test.ts`,
  `src/test/api/groundswell-benchmark.test.ts` (made-up accounts; prints the
  PDF, 13 slides, one-page summary), plus partner, admin and route cases.
- **Real-session fixtures** (`src/test/api/fixtures/groundswell-benchmark/`,
  anonymised: two fictional accounts, every date, count and price kept;
  `groundswell-benchmark-fixtures.test.ts`): the rules reproduce that by-hand
  session's figures, ad statuses, prices and leaders, except where its own
  numbers do not follow from its data (the test's `DIFFERS` and
  `LEADERS_DIFFER` say why). Engagement matches it exactly under the spec's
  rules as #114 updated them (see the `social_depth` entry above).

### Groundswell: the ad plan and change ranking in the live audits (2026-10-21)

- **Step** `adplan` (`api/_lib/groundswell/adplan.ts`), after `model`,
  optional. One planner call (OpenAI) picks the industry profile, groups the
  Keyword Planner searches into at most four angles, and sorts the
  write-up's fixes into the setup file's `effort` types. `checkPlan` holds it
  to the data: only keywords Keyword Planner returned, each in one angle; no
  "best" in angle names; no sentence with a number not in the data; unknown
  industries become `general`; if no angle survives, the largest searches
  become one. Angle values are the write-up's labelled estimates;
  incrementality comes from Ahrefs ranks. Then `planAudit`
  (`packages/groundswell/src/audit.ts`) builds the plan, the ranking and today
  against the plan. No keyword demand skips the step.
- **Reports** (owner's choice: replace): with the step's output, the full
  audit's return becomes "What pays back first" (today vs the plan, every
  change ranked) and "The ad plan" (angles, rows, stop-losses, platform
  rules, sources); the slides gain an ad plan slide (12); the summary shows
  the top three changes. The ad plan's net is before team time and the
  ranking's after; the headers say so. Without the output (a skipped step,
  or an audit started before this deploy) the reports keep the single
  search-ad model. The write-up prompt no longer picks ad platforms or
  budgets, so it cannot contradict the plan.
- **Setup file**: `impact.seo_target` (positions [10, 6, 4], New Wave's
  estimate) and two effort types, `site_fix` and `social_posts` (New Wave's
  estimates; edit them to match the team).
- **Tests**: `src/test/api/groundswell-adplan.test.ts`, plan cases in
  `groundswell-reports.test.ts` (12 slides, one-page summary), and
  `packages/groundswell/test/audit.test.ts`.

### Groundswell package: setup file, ad plan, templates (2026-10-21)

Groundswell is the engine; Croissance is the data it produces. The part of
the engine that does not depend on New Wave lives in `packages/groundswell/`
(its README has the process, the model, and the roadmap), so it can become
its own app.

- **Setup file** `groundswell.config.ts`: every published figure with its
  source, link and edition (LocaliQ 2026 Google and Meta benchmarks by
  industry, Lebesgue 2026 TikTok, ZenABM 2026 LinkedIn; Reddit has no credible
  benchmark and is "not modeled"), official ad-format limits, alcohol rules
  (Reddit and TikTok need a sales team, so self-serve is ruled out), platform
  minimum budgets, scenario rules, tiers, and verification tolerances.
  `industries.ts` holds the industry profiles. `validateConfig` lists every
  problem at once.
- **Ad plan** (`src/adplan.ts`): every angle on every platform its industry
  allows, low / medium / high, ranked by return, with cost-per-click, clicks
  and return tiers, a fund / test / skip call, conditions, and a stop-loss.
  Social leads use the published cost per lead. An angle without a published
  price shows cost and clicks only ("not modeled"); a platform without a
  benchmark is listed, never guessed.
- **Templates** (`src/templates.ts`): field counts, character limits, and New
  Wave's rule against unproven "best" / "#1" claims (stricter than Google's
  current policy; matches TikTok's).
- **Use case** `examples/uncommon-path-brewing.ts`: real Broward County
  Keyword Planner demand and bids and published prices; its plan is pinned by
  `test/upb-usecase.test.ts` and shown on Croissance ("Win the searches you
  can own"), computed at build time, never typed into copy.
- **Change ranking** (`src/changes.ts`): every recommended change (ads, SEO,
  website, Google profile, reviews, listings) costed in team hours (setup
  file `team.hourly_cost` $75, set by the owner; `effort` estimates) plus
  spend, modeled on published curves (AWR 2026 organic CTR, First Page Sage
  2026 local pack) or "not modeled" with its reason, ranked by benefit per
  dollar, and `compareWithToday` (today vs the plan). Croissance shows the
  brewery's ranking ("What pays back first").
- `tsconfig.app.json` type-checks `packages/`. Next (README roadmap): the
  `adplan` and change ranking in the live engine and reports, verification,
  the planner agent and connectors, white-label branding for partners and
  their sub-clients.

### Groundswell section, internal rename, and the Croissance partner portal (2026-10-21)

- **Rename**: everything internal is Groundswell. Admin:
  `/admin/groundswell` (`src/admin/groundswell/`; `/admin/audits` redirects
  to `/admin/groundswell/audits`). API: `api/groundswell/run.ts` and
  `worker.ts` (`/api/audits/run` and `/api/audits/worker` still rewrite there,
  after `/api/(.*)`, like `/api/blog/:id`). Client: `src/lib/groundswell.ts`,
  with the pure input checks in `src/lib/groundswellValidation.ts` (the
  partner API imports those). Skill: `.claude/skills/groundswell` (the manual
  path). Tables keep their names (`marketing_audits`, `marketing_audit_steps`).
  Croissance stays the public name for the audit.
- **Admin section**: a "Groundswell" group in the sidebar with Overview
  (setup checklist from `GET /api/groundswell/run`: variable names and
  whether they are set, never values; audit counts; partner summary), Audits
  (the queue; partner submissions say "via <company>"), and Partners
  (invite, resend invite or reset link, turn off/on).
- **Partner portal**: `/social-engineering/croissance/partners` (prerendered,
  in the sitemap, footer link "Partner portal") is the sign-in page for
  partners: outside agencies and resellers. Signed in, `/dashboard` lets
  them queue businesses and see only their own audits with Drive links;
  `/set-password` is where invite and reset links land. Both are noindex
  and not prerendered.
- **Partner auth is not Supabase Auth.** Any signed-in Supabase user is an
  admin here (`requireAdmin`, the `authenticated` RLS policies), so partners
  live in `groundswell_partners` (migration `20261021140000`) with scrypt
  password hashes, `groundswell_partner_sessions` (12-hour bearer tokens,
  SHA-256 digests only, kept in sessionStorage like the support portal), and
  `groundswell_partner_tokens` (single-use invite links for 7 days, reset
  links for 1 hour). The three tables have RLS on and no policies: only the
  service role reads them. Routes: `api/groundswell/partner-auth.ts`
  (sign-in, sign-out, set-password, forgot-password: the same answer whether
  or not the account exists), `partner-audits.ts` (scoped to the partner;
  no internal error text), and `partners.ts` (admin only). Sign-in is
  rate-limited per IP and per email (in memory). Emails go through Resend
  (`RESEND_API_KEY`); when one fails, the admin screen shows the link once to
  pass on by hand. `marketing_audits.partner_id` records who submitted.
- **Migration** `20261021140000` also re-points the `groundswell-worker` cron
  at `/api/groundswell/worker` and adds a daily cleanup of expired sessions
  and links.
- **Tests**: `src/test/api/groundswell-partners.test.ts` (with
  `fixtures/fakeSupabase.ts`), `src/divisions/socialEngineering/partners.test.tsx`,
  `src/admin/groundswell/GroundswellAdmin.test.tsx`, plus the division
  integration, footer, and privacy-notice lists.

### Groundswell: audits run on the site, not a Claude routine (2026-10-21)

The marketing audit now runs entirely on Vercel functions and Supabase.
Code: `api/_lib/groundswell/`.

- **Steps** (`steps.ts`), in order: site, maps, search, keywords, social,
  ads (the Currents; all but site are optional), model, then five delivery
  steps. Each audit gets one `marketing_audit_steps` row per step
  (migration `20261021120000`; applied to production on 2026-10-21,
  recorded there as version `20261021023209`).
- **Engine** (`engine.ts`): `start_queued_audits` gives queued audits their
  steps; `claim_next_audit_step` (SKIP LOCKED, 600 s lease) hands out the
  next runnable step. A failed step retries up to 3 times; then an optional
  one is skipped and a required one fails the audit. `PermanentStepError`
  skips the retries (missing setup, bad input, a Google check page).
- **Routes**: `api/groundswell/run.ts` (the admin button, `requireAdmin`) starts
  up to 3 queued audits and runs the worker after answering (`waitUntil`).
  `api/groundswell/worker.ts` is the heartbeat pg_cron posts to every minute while
  an audit is running (Vault `blog_admin_api_key` as `x-admin-key`). Both
  have `maxDuration: 300` (`FUNCTION_SECONDS`) and ship
  `@sparticuz/chromium` and the Inter font via `includeFiles`.
- **Currents**: Site fetches HTML (no browser); Maps reads Google Places
  through Composio and, when that fails, scrapes the logged-out Google Maps
  view with puppeteer-core, stopping at any consent or traffic check (see
  "Right tool for the job", 2026-10-21); Search (Ahrefs), Keywords (Keyword
  Planner), Social (ScrapeCreators) and Ads (site tags + Ahrefs paid pages)
  go through the Composio REST API (`composio.ts`).
- **Model** (`model.ts`): one OpenAI JSON call (`GROUNDSWELL_OPENAI_MODEL`,
  default `gpt-4o`) writes the findings. Any sentence quoting a number that
  is not in the gathered data gets one repair call and is then dropped.
  ROI (`roi.ts`, a tested port of `roi_model.py`): demand and CPC from
  Keyword Planner, CTR/CVR from `BENCHMARKS` (LocaliQ 2025), ticket, close
  rate and margin as labelled estimates.
- **Delivery**: `reports.ts` builds the audit (Letter), 11 slides
  (1920×1080) and a one-page summary in the client's colours and logo
  (`brand.ts`), `render.ts` prints them (page count and links read back;
  every link must be Google Drive), and `drive.ts` uploads them in link order
  to `Customers/<Business>/` as `GROUNDSWELL_DRIVE_OWNER`
  (josh@newwaveitfl.com), shares them anyone-with-the-link as viewer,
  verifies, and writes the links back. File names carry the date.
- **Admin**: `/admin/groundswell/audits` shows each running or failed audit's steps.
- **Setup** (Vercel): `COMPOSIO_API_KEY` from a Composio Platform project
  with Google Maps, Google Ads, ScrapeCreators and Ahrefs connected (under
  any user id; `pg-test-0ff14d6b-…`, fixed in `composio.ts`, is preferred); `OPENAI_API_KEY` and the
  Supabase service role as before. Optional: `GOOGLE_ADS_CUSTOMER_ID`,
  `GROUNDSWELL_GEO_TARGETS`. Without the required ones the run route
  answers 503. `AUDIT_ROUTINE_ID`/`AUDIT_ROUTINE_TOKEN` are no longer read.
- **Tests**: `src/test/api/groundswell-*.test.ts` (routes: `groundswell-routes.test.ts`);
  the printing test runs when Chromium is at `CHROMIUM_PATH` or
  `/opt/pw-browsers/chromium`.
### Marketing audit fixes on the New Wave IT site (2026-10-21)

From the New Wave IT marketing audit (Drive: Customers/New Wave IT).

- **Phone**: the real number is (561) 564-1846 (the Google Business Profile's).
  Production CMS rows `contact.phone`, `footer.phone`, and `hero.phone`
  (`+15615641846`) were updated directly; code fallbacks in `Footer`/`Contact`,
  the `index.html` LocalBusiness `telephone`, and the three email templates in
  `api/` now use it. Form input placeholders keep the fictional 555 sample.
- **Badges**: only documented partnerships are claimed: Huntress, Microsoft,
  and Cisco partner (no SOC 2 Type II, "Microsoft Gold", "Cisco Premier",
  CompTIA, or "HIPAA Compliant"). CMS `trustbar.items` and
  `whyus.feature_cards` were updated to match the code defaults. The
  cybersecurity hero lists compliance work ("HIPAA readiness", "SOC 2 audit
  prep"), not certifications.
- **Landing pages**: `/it-support-fort-lauderdale` and
  `/managed-it-services-fort-lauderdale` (`ITSupportFortLauderdalePage`,
  `ManagedITFortLauderdalePage`, built on `ServiceCategoryPage`), in
  `IT_PAGE_META`, `vercel.json`, the sitemap, and the footer. They state only
  claims the site already makes (published prices, address, partners). The
  `/service-category/managed-it-services` title no longer repeats "Fort
  Lauderdale" so the two pages do not compete.
- **Luxury and Cellular DAS**: off the home page and the Navbar's industry
  menu; still live, listed under "Other specialties" on `/services` only
  (`Services showOtherSpecialties`).
- **Tracking** (`src/lib/analytics.ts`): GA4 and Google Ads conversion tags
  load only when `VITE_GA4_ID` / `VITE_GADS_ID` are set at build time, and
  never in a browser sending Global Privacy Control or Do Not Track. Leads
  (`generate_lead`, plus an Ads conversion with `VITE_GADS_LEAD_LABEL`) fire on
  contact, quote, and pricing form success and on any `tel:` link tap. The CSP
  allows Google's tag hosts (`frame-src` now `td.doubleclick.net` and
  `www.googletagmanager.com` instead of `'none'`). The Cookie and Privacy
  Policies read the same flags, so without IDs they still say there is no
  analytics cookie; with IDs they list `_ga`/`_gcl_*` and the GPC/DNT
  behavior (`LegalPagesTracking.test.tsx`). Re-scan the live site and update
  `COOKIE_INVENTORY_REVIEWED` after setting the IDs.
- **No unverified figures** (owner's call, until real numbers exist): the
  home stats band (`Stats.tsx`) and the cybersecurity "By the Numbers" section
  (`SecurityStats.tsx`) are deleted; the hero's stats are word-based (24/7,
  Local, Flat-rate) in code and CMS `hero.stats`; the cybersecurity card, About
  badge, footer tagline, trust bar heading, Why Us proof points, and the
  `/why-us`, `/about`, and live-support descriptions no longer state client
  counts, years, endpoints, uptime, or response times. Prices and "24/7" stay.

### Croissance page: the audit, its Groundswell engine (2026-10-20)

`/social-engineering/croissance` explains the audit to prospects under
public names: **Croissance** (the audit; French for growth), the
**Groundswell** engine and its six **Currents** (Search,
Maps, Social, Site, Ads, Delivery), one per kind of public data. Sections:
the Currents and the audit's ground rules, the five steps (queue, research,
model, build, deliver), the three reports, example data, how the audit grows
with the client's business and team, FAQs. Copy:
`content/croissance.ts`; keep it in step with
`.claude/skills/groundswell`. The example is Uncommon Path Brewing's real
audit (October 21, 2026), shown with the owner's permission: its summary's
findings and its return board, copied from the PDFs in Drive. Update it only
from a newer audit of the same business.
Linked from the division header (desktop row and phone sheet) and footer. Wired through every point of
the division's "Adding a page" checklist. The admin queue, skill, and table
keep the internal "marketing audit" name.

### Marketing audit queue and skill (2026-10-20)

Superseded in part: audits now run on Groundswell, the queue lives at
`/admin/groundswell/audits`, and the skill is `.claude/skills/groundswell`
(a manual path). See the two Groundswell entries above.

NW Social Engineering prospect audits, queued from the admin site and run on
demand by a Claude Code routine.

- **Queue**: `/admin/audits` (`src/admin/audits/MarketingAudits.tsx`,
  `src/lib/marketingAudits.ts`) adds a business by website and/or Instagram
  with optional competitors. "Add competitor" on an existing request
  re-queues it with the new competitor (`requeue_marketing_audit`, which
  raises while the audit is running). The screen shows only Google Drive
  links.
- **Run on demand**: "Run queued audits now" posts to `api/audits/run.ts`
  (`requireAdmin`), which fires the routine's API trigger once per queued
  row, at most `MAX_RUNS_PER_CLICK` (3). Each run claims a row with
  `FOR UPDATE SKIP LOCKED`, so parallel runs never share one, and a spare
  run stops quietly. The routine has no schedule. Vercel needs
  `AUDIT_ROUTINE_ID` (`trig_…`) and `AUDIT_ROUTINE_TOKEN` (shown once when
  the API trigger is created on claude.ai); without them the route answers
  503. The page re-reads the queue every 30 seconds while anything is
  queued or running. "Queue again" and "Add and queue again" only re-queue.
- **Table**: migration `20261020120000` creates `marketing_audits`.
  Admins (authenticated) can read, insert queued rows without links, and
  delete; only the service role updates rows. Every report-link column has
  a CHECK requiring `https://drive.google.com/`. Applied to production on
  2026-10-20 (recorded there as version `20261020165444`).
- **Skill**: `.claude/skills/marketing-audit/` (SKILL.md, references, and
  scripts). It claims the oldest queued row, researches from public data,
  models ROI (fee-neutral: only ad spend is new money), and builds three
  client-branded PDFs: summary, slides, and full audit. It uploads them to
  josh@newwaveitfl.com's Drive under `Customers/<Business>/`, shared
  anyone-with-the-link as viewer, and writes the links back.
  `check_links.py` fails any report with a non-Drive link.
  - **Drive upload**: Drive file ids are reserved first (`generateIds`), so
    every link is final before anything is built. Files reach Composio's
    sandbox only as tool-call text, so `pack_for_workbench.py` sends the
    built sources in checksummed base64 pieces. `workbench_render.py`
    prints them there with `render_pdf.cjs`'s settings, and they upload
    under the reserved ids (`references/drive-publishing.md`).
  - The Node scripts are `.cjs` with their own `package.json`
    (playwright-core only; `npm ci --prefix` the scripts folder). They use
    the container's Chromium.
  - `examples/sample/` is a made-up business that runs the whole chain.
  - Real prospect research never goes in the repo.

### Dead CSP entries removed (2026-10-15)

`vercel.json` no longer allows `https://stream.mux.com` in `connect-src` or
`media-src`: nothing used it. The unused `src/lib/useHlsVideo.ts` hook and
the `hls.js` dependency it imported are gone with it. `Permissions-Policy`
now sets `geolocation=()`, since nothing calls `navigator.geolocation`. The
only remote hosts the CSP still names are Vercel Analytics, Google Fonts,
Supabase, and Pexels (the homepage video), matching the Cookie Policy.

### Cookie and privacy policies matched to the live site (2026-10-15)

A legal review of the Cookie Policy, Privacy Policy, and Terms against what
`www.newwaveitfl.com` actually loads (headless-browser scan plus source).
Findings and the law applied: `docs/legal-compliance-review-2026-10-15.md`.

- **Cookie Policy** (`CookiePolicyPage.tsx`) now carries an inventory keyed
  to the scan date (`COOKIE_INVENTORY_REVIEWED`): the site sets no cookies of
  its own; local/session storage keys; Vercel Web Analytics (cookieless,
  24-hour hash); the Elfsight widget "when it loads"; Pexels' Cloudflare
  cookies `__cf_bm`/`_cfuvid` from the homepage video; Google Fonts. It says
  why there is no consent banner and how Do Not Track and Global Privacy
  Control are treated. Re-scan and update the tables whenever a script,
  embed, or media source changes.
- **Privacy Policy** adds the IP-country form gate and spam screening, the
  content providers the browser contacts, "does not sell sensitive personal
  data", a CAN-SPAM opt-out line, and a "Do Not Track and Global Privacy
  Control" section. Both policies are effective October 15, 2026; the Terms
  are unchanged.
- **Notice at collection**: `src/components/legal/FormPrivacyNotice.tsx`
  sits under the submit button of the contact, quote, support email, support
  chat, and portal sign-in forms (router links inside a router, anchors
  outside). `FormPrivacyNotice.test.tsx` checks each form carries it.
- **Elfsight chatbot removed** (same day, owner's decision): the script
  (`elfsightcdn.com`) had been refused by the CSP's `script-src`
  (`*.elfsight.com`), so the widget never ran in production.
  `ElfsightChatbot.tsx` and its test are deleted, `App.tsx` no longer mounts
  it, the CSP drops every Elfsight host and sets `frame-src 'none'` (the site
  embeds no iframes), `DivisionHeader` no longer looks for a chat launcher to
  make inert, and both policies say the site uses no chat widget
  (`LegalPages.test.tsx` forbids the name from reappearing). Never describe
  as active what the site does not load.

### Homepage testimonials removed until reviews can be linked (2026-10-15)

- The homepage "Customer Stories" band (`src/components/Testimonials.tsx`)
  showed three hard-coded five-star quotes attributed to named people and
  companies, with no link to a review source. The component is deleted and
  `HomePage` in `App.tsx` no longer renders it. Bring reviews back only when
  each one links to where it was posted (Google, Clutch, etc.).
- The admin sidebar's "Testimonials" entry still points at an unimplemented
  editor, as before; nothing on the live site reads it.

### Customers: Watchtower and an "Apps we've developed" section (2026-09-25)

- Watchtower (`watchtowerapp.app`, remote access software for MSP support
  teams) is the fifth customer on `/social-engineering/customers`, described
  from its own site. Its location, Boca Raton, FL, comes from the owner (the
  site names none).
- A new band below the list, "Apps we've developed" (`divisionApps`,
  `appsContent` in `content/customers.ts`), lists Watchtower with its
  platforms and link. Its JSON-LD is an `ItemList` of `SoftwareApplication`
  nodes authored by the division.

### Blog post heads from the server; no links to empty detail pages (2026-09-24)

- **Blog posts**: the raw HTML of every `/blog/:slug` declared the homepage
  canonical, title, and OG tags until JavaScript changed them, which Google
  advises against. `vercel.json` now rewrites `/blog/:slug` to
  `api/blog-page.ts`, which serves `dist/index.html` (shipped with
  `includeFiles`; Vercel compiles functions after `vite build`) with the
  post's head from `blogPostPageMeta` via `applyPageHead`, plus its JSON-LD in
  a `#page-jsonld` block (`PAGE_JSONLD_ELEMENT_ID`) that `usePageMeta`
  replaces rather than duplicates. A missing post is a real 404 with
  `noindex`; a database error is a 503 without `noindex`. It is a
  fixed-name function because the SPA catch-all shadows dynamic `[param]`
  routes.
- **ESM**: the `src/` modules it reaches (`blogSeo`, `pageMeta`,
  `structuredData`, `prerenderHead`, `cmsDetails`) use `.js` import
  specifiers. `blog-routes.test.ts` now follows imports from `api/` into
  `src/` and `types/`.
- **`/cybersecurity`**: its service and threat cards linked to 14
  `/service/*` and `/threat/*` pages, and production's CMS has no entries
  for any of them. The pages rendered "not found" while staying indexable,
  because an empty section looked like one still loading. Cards now link
  only to slugs the CMS lists (`useDetailSlugs`), and the detail pages go
  `noindex` once the section has been read (`useContentWithStatus`),
  including when it has no entries. `slugsFromContentList` moved to
  `src/lib/cmsDetails.ts`; `api/_lib/sitemap.ts` re-exports it.
- **Single-post API**: `api/blog/[id].ts` never ran in production for the
  same shadowing reason (GET returned the SPA shell, PUT/DELETE 405). It is
  now `api/blog/post.ts`, reached by a `/api/blog/:id` → `?id=:id` rewrite
  placed after `/api/(.*)`, so `list` and `generate-post` still resolve to
  their own files. A test forbids `[param]` files under `api/`. The admin
  blog screens never used this route: `BlogEditor` and `BlogPostManager`
  write through Supabase with the signed-in session (RLS allows
  `authenticated`).
- **Tests**: `src/test/api/blog-page.test.ts`,
  `src/components/cybersecurity/detailLinks.test.tsx`, plus additions to
  `usePageMeta.test.tsx`, `NotFoundPage.test.tsx`, and
  `division-integration.test.ts`.

### Blog posts held to an SEO and accuracy bar (2026-09-24)

The first automated post had three invented statistics (including a made-up
"Tech Research Group" study), 705 words, no internal links, and generic
"Introduction/Conclusion" headings.

- **Structured draft**: `api/blog/generate-post.ts` asks for JSON:
  keyword, title (45–60 characters), meta title (≤ 50), meta description
  (140–155), slug, intro, 5–6 sections of 220–300 words, 4 FAQs, and a
  conclusion. The prompt lists recent titles to avoid and forbids
  statistics, cited studies, and external links. There is now one call;
  the separate "trends" call is gone.
- **Quality gate** (`api/_lib/blogQuality.ts`): `reviewDraft` checks
  length (target 1,400–1,800 words, soft minimum 1,300, blocking under
  1,100), invented figures (`findStatistics`), keyword placement (title,
  first 100 words, a heading, meta description), meta lengths, generic
  headings, and the FAQ count. One repair call rewrites only the failing
  parts (`applyPatch`). A draft that is still blocked is not published
  (422).
- **Links**: `assembleContent` builds the Markdown (no H1: the page's H1
  is the title). It keeps only links to `LINKABLE_PAGES` and ends every
  post with links to the category's service page, its guide, and
  `/contact` (`CATEGORY_LINKS`). A test checks that each path is a real
  route.
- **Other**: `availableSlug` avoids slug collisions. `generate-post` has
  `maxDuration: 120` (`MAX_DURATION_SECONDS`, kept in step by a test).
  `BLOG_OPENAI_MODEL` overrides `gpt-4o-mini`. The post page adds
  `wordCount` and an `FAQPage` node (`faqsFromMarkdown` in
  `src/lib/blogSeo.ts`).

### Blog API routes fixed; weekly generation unblocked (2026-09-24)

- **Why nothing worked**: `api/blog/*` imported `src/lib/blog` without a
  `.js` extension (`ERR_MODULE_NOT_FOUND` under the repo's
  `"type": "module"`). Behind that was the browser Supabase client
  (`import.meta.env` is undefined in a function), and behind that anon-key
  writes that RLS rejects. The weekly cron had never reached the route:
  `pg_net` was not enabled, so every run failed with `schema "net" does not
  exist`, and it posted to the apex domain with an unset
  `app.admin_api_key`. The only post is the migration's sample.
- **Server code**: `api/_lib/blogStore.ts` (reads through the anon client in
  `api/_lib/supabasePublic.ts`, writes through the service role),
  `api/_lib/adminKey.ts`, and the typed `ApiRequest`/`ApiResponse` in
  `api/_lib/http.ts`. The pure helpers moved to `src/lib/blogUtils.ts`
  (`blog.ts` re-exports them). API code never imports `src/lib/blog`,
  `supabase`, `content`, or `blogGeneration`.
- **Admin auth** (`requireAdmin` in `api/_lib/adminKey.ts`, used by the blog
  writes, generate-post, and all three `api/seo/*` routes): either
  `x-admin-key` equal to `ADMIN_API_KEY` (the cron), or
  `Authorization: Bearer <Supabase access token>` of a signed-in user (the
  admin screens, via `adminAuthHeaders()` in `src/lib/adminAuth.ts`).
  Anything else is refused, and 503 when nothing is configured; these routes
  used to let everyone through when `ADMIN_API_KEY` was unset. PUT accepts
  only editable fields.
- **No secrets in the bundle**: the SEO screens used to send
  `VITE_ADMIN_API_KEY`, and the blog button called OpenAI from the browser
  with `VITE_OPENAI_API_KEY`/`VITE_PEXELS_API_KEY`. Vite inlines any
  `VITE_` value, so setting one published it. `src/lib/blogGeneration.ts`
  now calls the server route. `admin-auth.test.ts` allows only
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
  `VITE_SUPEROPS_PORTAL_URL` in `src/`.
- **`/sitemap-content.xml`** reads with the anon client too; it answered 503
  in production with the service-role client.
- **Cron**: migration `20260924120000` enables `pg_net` and posts to
  `https://www.newwaveitfl.com/api/blog/generate-post` with the key from
  Vault (`blog_admin_api_key`). Apply it by hand, as production's migration
  history shows the others were. Vercel needs `ADMIN_API_KEY`,
  `OPENAI_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. `generate-post` has
  `maxDuration: 60`.
- **Tests**: `src/test/api/blog-routes.test.ts` (it also requires a `.js`
  extension on every relative runtime import under `api/`),
  `src/test/api/admin-auth.test.ts`, and `src/lib/blogGeneration.test.ts`.

### SEO pass: indexing fixes, breadcrumbs, content sitemap (2026-09-24)

Covers New Wave IT and NW Social Engineering.

- **Blog posts rendered blank**: `BlogPostPage` called `usePageMeta` after
  its early returns, so every post crashed ("Rendered more hooks") once it
  loaded. Its meta now comes from `src/lib/blogSeo.ts` (`blogPostPageMeta`),
  with `BlogPosting` + `BreadcrumbList` JSON-LD. A missing slug is `noindex`;
  a network error is not, so a transient failure can't deindex a post.
- **Soft 404s**: a `path="*"` route renders `NotFoundPage` (`noindex`) for
  any unmatched URL, including unknown `/social-engineering/*` paths. The
  response is still HTTP 200 (the SPA catch-all). `/service/:slug` and
  `/threat/:slug` go `noindex` only once CMS content has loaded and the slug
  is absent. Unknown `/l/*` guides are `noindex`.
- **Content sitemap**: `/sitemap-content.xml` is rewritten to
  `api/sitemap-content.ts`, which lists blog posts (published ones only) and
  the CMS service/threat pages from Supabase (service role). It returns 5xx,
  never an empty sitemap, on failure. `robots.txt` lists both sitemaps;
  `public/sitemap.xml` still lists every static page.
- **Breadcrumbs**: each `IT_PAGE_META` entry has a `crumb` label, which
  becomes `breadcrumbs` (service categories and `/l/*` guides sit under
  Services). `renderRouteHtml` writes a `BreadcrumbList` block
  (`#page-breadcrumbs`) into the raw HTML, and `usePageMeta` takes it over at
  runtime and removes it on unmount. Pages that spread their registry entry
  get this automatically.
- **Shell graph**: `index.html` now declares the `#website` node that the
  division pages already referenced. `#business` links to `#organization`
  (`parentOrganization`). `HOME_PAGE_META` (`routeMeta.ts`) is the homepage
  head, and a test requires the shell's tags to equal it, so hydration no
  longer changes the homepage description or OG tags.
- **Titles/descriptions**: IT titles are at most 60 characters before the
  suffix, and descriptions at most 160 (tested). Guides drop their subtitle
  from the title. The four service categories that lacked `Service` JSON-LD
  now have it.
- **Bundle**: admin routes are `React.lazy` chunks (main chunk 994 → 868 kB,
  gzip 282 → 256 kB, with the Supabase env vars set as in production; a
  build without them drops supabase-js and reads ~125 kB smaller);
  `AdminLayout` suspends around its `<Outlet />`.
- **Tests**: `src/pages/BlogPostPage.test.tsx`, `src/pages/NotFoundPage.test.tsx`,
  `src/test/api/sitemap-content.test.ts`, `src/lib/usePageMeta.test.tsx`, plus
  breadcrumb, length, and homepage-parity checks in `it-prerender.test.ts`.

### Prerendered page heads for every static route (2026-09-22)

Every static New Wave IT page now serves raw HTML with its own `<title>`,
description, canonical, and Open Graph/Twitter tags. Before this change, each
of them declared the homepage canonical until JavaScript ran.

- **One source of truth**: `src/lib/routeMeta.ts` (`IT_PAGE_META`) holds the
  metadata for 23 static routes. The 6 `/l/*` guides come from
  `src/lib/serviceGuides.ts`. Pages call
  `usePageMeta(IT_PAGE_META['/path'])` or spread that entry and add `jsonLd`,
  which stays runtime-only. To change a page's title or description, edit the
  registry, not the page.
- **Shared resolver**: `src/lib/pageMeta.ts` provides `resolvePageMeta()` and
  `headEntries()`. `usePageMeta` and the prerender both use them, so the raw
  head and the hydrated head cannot drift.
- **Build**: `src/lib/prerenderHead.ts` (`applyPageHead`, `renderRouteHtml`),
  called from the `vite.config.ts` plugin, writes `dist/<route>/index.html`.
  `vercel.json` has one exact rewrite per route before the catch-all. The
  division prerender uses the same module.
- **Keywords**: every page writes `meta[name="keywords"]`; pages without their
  own get `DEFAULT_KEYWORDS` (the shell's value, pinned by a test).
- **Not prerendered**: `/` (the untouched shell) and the data-driven routes
  `/service/:slug`, `/threat/:slug`, and `/blog/:slug` (whose head
  `api/blog-page.ts` now writes at request time).
- **Adding a static page**: add it to `IT_PAGE_META` (with a `crumb`
  label), use it in the page, add a `vercel.json` rewrite and a sitemap
  `<url>`. The tests fail until all of them agree.
- **Tests**:
  - `src/test/seo/it-prerender.test.ts` checks the raw head of each route.
  - `src/test/seo/it-route-parity.test.tsx` renders each page at its real
    `App.tsx` route and compares its runtime meta with the prerender.
  - `src/lib/pageMeta.test.ts` covers the resolver.

### New Wave: Social Engineering division (2026-09-22)

A new division lives in the `/social-engineering` subfolder: New Wave IT's
social media, brand development, website design, marketing, integration, and
digital oversight division ("Growth decisions made on data, not guesswork.").
No New Wave IT URL, title, canonical, or structured data changed. Full notes:
`docs/social-engineering-division.md`.

- **Positioning**: the first launch (#73) described security testing
  (phishing, vishing, awareness training), which was wrong. #74 took it
  offline; the relaunch rebuilt the content around six services. "Social
  Engineering" is the brand name only: never describe the division as
  security testing (a test in `pages.test.tsx` guards this). The four retired
  service URLs 308 to the hub (`RETIRED_SERVICE_SLUGS`).
- **Publish switch**: `DIVISION_PUBLISHED` in `site.ts` gates the routes, the
  prerender, and the IT navbar/footer entries. Flip it together with
  `vercel.json` and the sitemap; `division-integration.test.ts` holds them in
  step.

- **Code**: `src/divisions/socialEngineering/`. `site.ts` holds paths and
  constants, `content/` holds the copy, `seo.ts` the per-page SEO and JSON-LD,
  `prerender.ts` the build-time head rewrite, `useDivisionMeta.ts` its runtime
  twin, and `routes.tsx` the lazy route components. It also holds the division
  components and pages, plus `division.css`, which adds only Lure Amber and
  Lure Amber Deep.
- **Prerender**: a `vite.config.ts` plugin writes
  `dist/social-engineering/**/index.html` with each page's own title,
  canonical, OG tags, favicon, and JSON-LD. `vercel.json` rewrites each
  division URL to its file before the SPA catch-all. The build throws if
  `index.html` changes shape.
- **Brand assets**: `public/brand/social-engineering/` holds the kit's
  outlined SVG logos, icons, OG image, and manifest. Naming is "New Wave: Social
  Engineering" on first reference, then "NW Social Engineering", and never
  "NWSE".
- **Type (division only)**: `type.css` self-hosts Plus Jakarta Sans, Inter, and
  IBM Plex Mono (OFL, `public/brand/social-engineering/fonts/`) as
  `'NWSE Display/Text/Mono'`, scoped to `.nwse-root`. Headings, body, labels,
  and kickers use its `nwse-type-*` scale, not Tailwind font utilities.
  `.nwse-kicker` and `.nwse-label` set colour only.
- **Icons (division only)**: `icons/iconData.ts` (pure data, 35 icons) and
  `<NwseIcon name size title? accentColor? />`. The single amber accent wave
  follows `--nwse-icon-accent`. There is no `lucide-react` under
  `src/divisions`, and a test enforces it. The shared `Contact` takes an
  optional `icons` prop that defaults to Lucide. See the "Icons" section of
  the division doc.
- **Motion (division only)**: `motion/` holds the line-art scenes (SVG +
  framer-motion; the contract is `motion/SceneFrame.tsx`'s header comment).
  `motion/scenes/index.ts` (`PAGE_SCENES`) lazy-loads one scene per page;
  `SceneSlot` reserves the 3:2 box and loads a scene only near the viewport.
  Placed by `DivisionHero` (`scene`, `sceneOnPhones`, `sceneSize`) on the hub,
  the six service pages, `/contact`, and Contact us, and by `PointGrid` in the
  hub's "What we gather" band. Croissance and Customers reuse registered
  scenes in their heroes (`hub`; `hubSection`, beside the text only). Scenes play once, hold the final frame, and
  render it statically under reduced motion (read live); they are
  `aria-hidden`, and left out in forced colours and print. A scene that fails
  to load leaves its empty box (`SceneSlot`'s own error boundary, fresh for
  every page) and never triggers main.tsx's stale-chunk reload: the registry
  loads scenes through `loadDecorativeChunk` (`src/lib/chunkReload.ts`). The
  hero's scene layout switches at em widths (48/64/80em), like the header, so
  enlarged text keeps the text column. No IT module reaches `motion/`, even
  through division modules; the registry and `SceneSlot` reach no other
  `motion/` module statically; and Tailwind skips the folder
  (`scenes.test.tsx`). See the "Motion" section of the division doc.
- **Section grounds (division only)**: every light `Band` and the shared
  contact section carry the division's currents faintly, as a background
  image (`components/bandCurrents.svg`, painted by `.nwse-band::before` in
  `division.css`). The cap on their strength is text contrast (4.5:1 wherever
  a current passes behind text), which `grounds.test.tsx` computes. The step
  timeline's band stays plain on phones, where its labels sit on the ground.
  Dark sections use the hero's currents (`DarkCurrents`).
- **IT touch points**: a Navbar Services-menu entry and mobile link, a Footer
  link ("Growth Marketing & Advertising" since 2026-10-21), and sitemap
  entries. `App.tsx` hides the IT `WaveBackground` and `FloatingNav` on
  division paths.
- **Leads**: `Contact` accepts optional `inquiry`, `intro`, `icons`, and
  `details` props. The API allow-lists `inquiry: 'social-engineering'` and
  prefixes the notification subject.
- **Customers and Contact us** (`/social-engineering/customers`,
  `/social-engineering/contact-us`): linked from the header, phone sheet, and
  footer next to the amber "Book a discovery call" (`/contact`, which is
  unchanged apart from those links). Customers says what
  each business is, never what was done for it: no services, results,
  ratings, quotes, logos, or screenshots (`customers.test.ts`). The one
  exception, at the owner's request, is its "Apps we've developed" band
  (`divisionApps`), which says the division developed each app and still
  claims no results or ratings. Contact us
  takes phone, email, and address from the footer's CMS values and leaves out
  the Call row rather than show the placeholder `(954) 555-0100`
  (`contactDetails.ts`). See "Customers and Contact us" in the division doc.
- **Adding a service**: update the content file, `divisionServices`,
  `DIVISION_SERVICE_SLUGS`, the `vercel.json` rewrite, the sitemap, and a
  hero scene registered in `PAGE_SCENES` (`motion/scenes/index.ts`). The
  tests fail until all of them agree.
- **Adding a page**: a path in `site.ts`, content in `content/`, a
  `…PageSeo()` in `allDivisionPages()` (`seo.ts`), the page in `pages/`, its
  module in `divisionPageModule()` (`preload.ts`), a lazy route in
  `routes.tsx` and a `<Route>` in `App.tsx`'s `DIVISION_PUBLISHED` block, a
  `vercel.json` rewrite, a sitemap `<url>`, and header/footer links if needed.
  Follow Customers or Contact us; the tests fail until they agree.
- **Tests**: `src/divisions/socialEngineering/*.test.ts(x)` and
  `src/test/seo/division-integration.test.ts`, which pins every pre-existing
  sitemap URL and the IT homepage head.

### Rotating Hero Video (2026-09-09)

The home hero's animated WebGL wave (`HeroRibbonField` / `ribbonScene`) was
replaced with a full-bleed background video that rotates through muted
Pexels clips:

- **Clips** (`src/components/hero/heroVideoClips.ts`): seven curated
  Pexels videos covering IT services, managed services, and help desk,
  hotlinked from `videos.pexels.com` (720p/1080p, 960px under 640px) with
  Pexels poster frames; `CLIP_PLAY_SECONDS` and `CROSSFADE_MS` tune the
  rotation
- **Component** (`src/components/hero/HeroVideoRotator.tsx`): plays one
  clip at a time with the next clip preloading underneath, crossfades
  after `CLIP_PLAY_SECONDS` or when a clip ends, skips clips that error,
  pauses when off-screen or the tab is hidden, and applies a brand tint;
  reports `onReady` on the first playing clip and `onFailure` if every
  clip errors or Data Saver is on, so `Hero.tsx` keeps its static
  `CurrentField` fallback logic unchanged
- **CSP**: `vercel.json` `media-src` allows `https://videos.pexels.com`
- **Tests**: `src/components/hero/HeroVideoRotator.test.tsx`

### Contact Form Spam Prevention (2026-08-25)

Layered, server-enforced screening on `/api/send-contact-email`:

- **Shared checks** (`api/_lib/spam.ts`): stateless HMAC timing token
  (GET issues it, POST must return it aged 3s–6h; secret is
  `CONTACT_FORM_TOKEN_SECRET`, falling back to `RESEND_API_KEY`),
  honeypot field, gibberish-name and message-content heuristics,
  gmail-alias-collapsing email normalization
- **Route**: in-memory rate limits (5/10min per IP, 3/hour per mailbox),
  detected spam gets a fake success response and no email; the
  `contact_submissions` insert moved server-side (service role)
- **Contact.tsx**: fetches the token on mount, renders the hidden
  `company_website` honeypot, no longer inserts into Supabase directly
- **Migration** `20260825120000` drops the public INSERT policy on
  `contact_submissions` (apply after deploying the frontend)
- **Geo gate** (`api/_lib/geo.ts`): non-US traffic (per Vercel's
  `x-vercel-ip-country` header) is silently dropped on the contact, quote,
  and support-ticket endpoints; override with `GEO_ALLOWED_COUNTRIES`
  (comma-separated, `*` disables); fails open off-Vercel
- **Quote + support-ticket endpoints** also got the IP/mailbox rate limits
  (no honeypot/token yet — their forms are untouched)
- **Tests**: `src/test/api/` covers the token, heuristics, geo gate, and
  all three routes

### Unified Admin Dashboard (2026-08-16)

Implemented a unified admin dashboard with centralized content management:

- **Centralized ContentManager** (`src/admin/ContentManager.ts`)
  - Optimistic updates for instant UI feedback
  - Batch publish to Supabase
  - State subscription system for React components
  - Singleton pattern for app-wide state

- **BroadcastChannel Sync** (`src/lib/content.ts`)
  - Real-time cache updates across browser tabs
  - Polling fallback (30s) for production environments
  - Integrated into useContent hook for automatic sync

- **Unified Dashboard** (`/admin/unified`; removed 2026-10-21, see the admin
  panel rework entry above)
  - Hero and Services editors migrated

## Content Structure

Content is stored in Supabase `site_content` table:
- `section`: Content area (hero, services, etc.)
- `key`: Field name within section
- `value`: Text or JSON string

## Admin Editors

### Section editors (one component)
Every `site_content` section is edited by `src/admin/SectionPage.tsx`, drawn
from its descriptor in `src/admin/sections/descriptors.ts` (see "Admin panel
rework, phase 2" above). Pieces: `components/BlockCard.tsx`,
`components/FieldInput.tsx`, `components/ListRows.tsx`.

### Other editors
- PricingUnitsEditor - `/src/admin/editors/PricingUnitsEditor.tsx` (the
  `pricing_units` table)
- Blog - `src/admin/blog/`

### SEO Editors
- SeoPortal - `/src/admin/seo/SeoPortal.tsx`
- SeoPageEditor - `/src/admin/seo/SeoPageEditor.tsx`

## Key Components

### ContentManager
- **Location**: `src/admin/ContentManager.ts`
- **Pattern**: Singleton with subscription-based state management
- **Methods**:
  - `loadSection(section)` - Load content from Supabase
  - `updateField(section, key, value)` - Optimistic field update
  - `publishChanges()` - Batch publish pending changes
  - `discardChanges()` - Revert unsaved changes
  - `subscribe(listener)` - Subscribe to state updates

### useContent Hook
- **Location**: `src/lib/useContent.ts`
- **Features**:
  - Automatically loads section content
  - BroadcastChannel listener for real-time updates
  - Polling fallback for production environments
  - localStorage caching

## Testing

### Integration Tests
- **Location**: `src/test/integration/content-sync.test.ts`
- **Coverage**: ContentManager load, update, publish, discard, subscriptions
- **Run**: `npm test -- src/test/integration/content-sync.test.ts`

### All Tests
- **Run**: `npm test`
- **Framework**: Vitest

## Documentation

- **User Guide**: `docs/admin-guide.md` - How to use the unified admin dashboard
- **Migration Guide**: `docs/editor-migration-guide.md` - How to migrate remaining editors
- **Implementation Plan**: `docs/superpowers/plans/2026-08-16-unified-admin-dashboard.md`

## Development Workflow

### Adding New Section Editors

1. Add the section's descriptor to `src/admin/sections/descriptors.ts`
   (its blocks and fields; the stored shape must match what the public
   component reads)
2. Add `<Route path="…" element={<SectionPage section="…" />} />` under
   `/admin` in `src/App.tsx`
3. Add the entry to `src/admin/adminNav.ts` under its site page
4. `adminNav.test.ts` and `sections/sections.test.ts` check the rest; see
   "Adding an editor" in `docs/admin-guide.md`

### Running the Project

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Type checking
npm run typecheck

# Run tests
npm test

# Production build
npm run build
```

## Next Steps

1. Implement live preview pane (iframe-based): phase 3 of the admin rework
2. Add version history support
3. Add keyboard shortcuts for common actions

## Architecture Notes

### State Management Flow
```
User Input → Editor Component → ContentManager.updateField()
                                                    ↓
                                            Optimistic UI Update
                                                    ↓
                                    User clicks "Publish Changes"
                                                    ↓
                                      ContentManager.publishChanges()
                                                    ↓
                                          Batch Supabase Upsert
                                                    ↓
                                    BroadcastChannel Update → Other Tabs
                                                    ↓
                                    Polling Fallback (30s) → Live Site
```

### Real-time Sync Mechanism
1. Admin publishes changes via ContentManager
2. Changes written to Supabase and localStorage
3. BroadcastChannel posts message to other tabs
4. useContent hook receives update
5. Component re-renders with new content
6. Polling fallback catches missed updates (production)

## Blog System (2026-08-16)

### Database
- `blog_posts` table with SEO-optimized fields
- Row Level Security: public read, authenticated write
- Indexes on published_at, category, slug

### API Endpoints
Admin auth is `x-admin-key` matching `ADMIN_API_KEY` or a signed-in
admin's Supabase session (`Authorization: Bearer`); see `requireAdmin`.
- `POST /api/blog/generate-post` - AI generation (admin auth; the weekly cron)
- `GET /api/blog/list` - List posts (`page`, `limit` ≤ 50, `category`, `search`)
- `GET /api/blog/:id` - Fetch single post
- `PUT /api/blog/:id` - Update post's editable fields (admin auth)
- `DELETE /api/blog/:id` - Delete post (admin auth)

### Admin Components
- `src/admin/blog/BlogPostManager.tsx` - List view with actions
- `src/admin/blog/BlogEditor.tsx` - Edit/create with Markdown preview
- `src/admin/blog/BlogSettings.tsx` - AI parameters and schedule

### Frontend Pages
- `/blog` - Dynamic blog listing from database
- `/blog/:slug` - Individual post with SEO metadata

### AI Generation
- GPT-4o-mini (override with `BLOG_OPENAI_MODEL`); drafts pass `reviewDraft`
  (`api/_lib/blogQuality.ts`) before anything is published
- Pexels API for featured images
- Weekly automation via Supabase pg_cron

### Utilities
- `src/lib/blog.ts` - Database operations and helpers
- `types/blog.ts` - TypeScript interfaces

## Git History

Recent commits for unified admin dashboard:
- `23f898b` docs: add admin dashboard guides
- `2ef8cb4` test: add integration tests for content sync
- `8fe6bfa` feat: add real-time cache sync to useContent hook
- `e02f314` feat: add link to unified dashboard from admin home
- `168a8e3` feat: add route for unified admin dashboard
- `751670c` feat: create UnifiedAdminDashboard component
- `6ce0f7a` refactor: ServicesEditor to use ContentManager
- `dc7756e` refactor: HeroEditor to use ContentManager
- `e5e94e9` feat: add SidebarNavigation component
- `fd68bd0` feat: add PublishBar component
- `859cdca` feat: create ContentManager for centralized state
- `79a68c4` fix: reuse BroadcastChannel instance to prevent resource leak
- `10d3c11` feat: add BroadcastChannel support for real-time content sync

Recent commits for blog system:
- `de177ca` feat: add weekly blog generation scheduling
- `8800d29` feat: integrate blog into unified admin dashboard
- `50fc049` feat: add blog settings component
- `57f8a0d` feat: add blog editor component
- `2b7ff27` feat: add blog post manager component
- `fd6b8a9` feat: add dynamic blog pages and individual post page
- `637ca63` feat: add AI blog post generation endpoint
- `4cf4600` feat: add blog CRUD API endpoint
- `90f7100` feat: add blog list API endpoint
- `b3f2ac9` feat: add blog utility functions
- `70eca85` feat: create blog_posts table with RLS policies
