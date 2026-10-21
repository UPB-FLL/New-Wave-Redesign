# Groundswell

**Groundswell is the engine. Croissance is the data it produces.**

Groundswell audits a business's marketing from public data and models where
its ad money should go. What comes out (the findings, the ad plan, the
templates, and the three reports a client reads) is that business's
Croissance: French for growth.

This folder is the part of Groundswell that does not depend on New Wave IT.
It imports nothing outside itself, so it can move into its own repository
as-is (see "Running it outside New Wave").

## The process

Every audit runs the same steps. The setup file (`groundswell.config.ts`)
decides the details, not the code.

1. **Gather** (the Currents). Public data only: no logins, no sign-ups, no
   contacting the business. Each number keeps its source and the date it was
   read. Something that cannot be read is recorded as unknown, never
   guessed.
   - Site: the website as a visitor sees it (speed, first screen, tracking,
     booking, structured data).
   - Maps: the Google Business Profile and where the business places in Maps.
   - Search: organic rankings and keyword demand (Keyword Planner volumes and
     top-of-page bids for the business's area).
   - Social: the platforms the business uses.
   - Ads: ads on record for the business and its rivals.
   - Industry platforms: the places customers in that industry actually
     look (planned; see "Status").
2. **Plan the ads** (`src/adplan.ts`). The engine finds the angles the business
   can win (see "Angles") and models each one on every ad platform its
   industry allows, in a low, medium and high scenario, ranked by cost per
   click, clicks and return.
3. **Write templates** (`src/templates.ts`). Ready-to-paste ad copy for each
   funded or tested row, checked against the platform's character limits and
   against claims an ad cannot make without proof.
4. **Review, re-interpret, re-run** (planned). A reviewer pass checks every
   first-round number against the raw data. Anything that does not hold up
   is fetched again, the plan is re-run, and the audit counts as accurate
   only when the two passes agree within the setup file's tolerance
   (`verification`). An audit that still disagrees after
   `verification.max_rounds` is flagged for a person, not delivered.
5. **Deliver.** The reports, in the client's brand: a one-page summary, the
   slides, and the full audit.

## Angles

An angle is a reason to choose the business that people actually search
for. A brewery that the city's best-of lists leave out does not win "best
brewery" (Keyword Planner shows about 50 searches a month for it in Broward
County), but it can win "best pizza fort lauderdale" (about 1,300) on its own
menu, or "event space fort lauderdale" (about 210) on published packages
that no rival advertises.

Each angle carries:

- its keywords, with monthly searches and Keyword Planner's top-of-page bids;
- a value per customer, close rate and gross margin, each with a basis, or
  no value at all when nothing published supports one, in which case its
  return is "not modeled" and it is shown on cost and clicks alone;
- incrementality: the share of ad customers who would not have come anyway,
  lower where the business already ranks for the searches;
- an optional restricted category (alcohol), which adds each platform's
  rule to the plan.

## The model

For each angle on each platform, in each scenario:

| | Search platforms (Google) | Social platforms (Meta, Reddit, TikTok, LinkedIn) |
|---|---|---|
| Size | monthly searches × impression share × CTR = clicks | test budget ÷ cost per click = clicks |
| Spend | clicks × cost per click | the test budget: the larger of the platform minimum and a share of the angle's medium search spend |
| Cost per click | the angle's own top-of-page bids (the high bid in the low scenario) | the platform's published benchmark |

Then `leads = clicks × conversion rate`,
`customers = leads × incrementality × close rate`,
`net = customers × value × gross margin − spend` a month, and the same over 12
months with the first months ramped down (`search.ramp`).

Every row is put into tiers from the setup file (`tiers`): cost per click
low / medium / high, clicks low / medium / high, and return "loses money",
"pays back", "strong" or "not modeled". Then it gets a recommendation:

- **fund**: strong in the medium scenario, or paying back even in the low one;
- **test**: pays back in the medium scenario only, or cheap search clicks on
  real demand with no price to model;
- **skip**: loses money in the medium scenario, or no price and no cheap
  clicks.

Each row also carries a **stop-loss**: the cost per lead at which the medium
scenario stops paying back. Ranges, not promises: the business's own tracked
calls, bookings and visits replace the estimates after 90 days.

The management fee is never in these numbers. It replaces what the business
already pays, so ad spend is the only new money.

## The setup file

`groundswell.config.ts` holds, with a source and date for every published
figure:

- `platforms`: each ad platform's buying model, benchmarks (cost per click,
  click-through and conversion rates for the low, medium and high
  scenarios), ad format limits, test budget rule, and restricted categories;
- `industries`: for each kind of business, which public platforms the audit
  checks and which ad platforms it may use (IT services: LinkedIn; home
  services: Angi, Yelp, Nextdoor, Reddit; restaurants and bars: Yelp,
  Tripadvisor, TikTok, Reddit). A `general` profile is the fallback;
- `search`: impression share and the new-account discounts per scenario,
  and the ramp;
- `tiers`, `min_angle_searches`, `unsupported_claims`, and `verification`.

`validateConfig` checks the file before any audit runs and lists every
problem at once. To change a benchmark, a limit or a rule, edit the setup
file; the tests in `test/` check that the code still reads it correctly.

## Running it outside New Wave

The package needs only TypeScript and a test runner. It talks to nothing on
its own: whoever runs it gathers the data (New Wave does this with Composio,
Supabase and Vercel functions in `api/_lib/groundswell/`) and passes it in.
To run Groundswell elsewhere:

1. Copy this folder into a new repository.
2. Supply the data: keyword demand and bids per angle, and the business's
   published prices.
3. Call `validateConfig` on your setup file, then `buildAdPlan` and
   `templateProblems`.

The remaining engine (the Currents, the step runner, delivery) moves in here
behind small adapters for storage, documents and the language model as the
work in "Status" lands.

## Use cases

`examples/` holds documented use cases: real audits, shown with the owner's
permission, kept as inputs so every number comes from the model.
`examples/uncommon-path-brewing.ts` is the first. Its plan (pinned by
`test/upb-usecase.test.ts`) funds private events on Meta and Google Search,
tests cheap happy-hour and brewery searches without modeling a return (no
drink prices are published), shows pizza ads losing money at a $22 pie, and
rules out TikTok and Reddit, whose alcohol rules require a sales team.

## Every change, ranked (`src/changes.ts`)

Ads are one kind of change. Every change an audit recommends gets a cost
(team hours at `team.hourly_cost`, from the `effort` estimates in the setup
file, plus any spend) and an impact model:

- **ads**: an ad-plan row, with its spend added to the team's time;
- **ranking**: clicks gained moving from one position to another on a
  published click-through curve (`impact.organic_ctr`, Advanced Web Ranking
  2026; `impact.local_pack_ctr`, First Page Sage 2026), building up over
  `impact.seo_ramp`;
- **conversion**: a published relative lift in the visit-to-lead rate;
- **not modeled**: no credible published effect (entry pop-ups, profile
  posts, best-of lists, reviews for an already well-rated business). Still
  ranked, after the modeled changes, cheapest first, with the reason.

`rankChanges` sorts by benefit per dollar of cost in the medium case.
`compareWithToday` sets the business as it is today (its ad spend, or
"not public") against the plan: every modeled change that pays back in the
medium case, with its added spend, team hours, new customers and 12-month
net from low to high.

For the brewery, counting team time changes the answer: Meta event ads and
ranking the events page pay back; a Google events campaign of about $80 a
month does not cover its setup and weekly management.

## Roadmap

Groundswell is being built as an agent and a process that can be resold as
a service (SaaS), with tools linked in as each client needs them. In order:

1. **Setup file, ad plan, templates, first use case** (this folder, now).
2. **Every change ranked by return** (`src/changes.ts`, now). Not only ads:
   SEO, website, Google Business Profile, reviews and listings changes each
   get a cost, a sourced impact model (or "not modeled") and a low / medium /
   high return, in one list with the highest return first, and **the return
   as the business is set up today against the return with the team's
   plan**. Still to come with the live engine: each audit writes its top
   changes to a use-case library for later audits.
3. **The ad plan in the live engine** (`api/_lib/groundswell`): an `adplan`
   step, and a board and slide in the reports.
4. **Review, re-interpret, re-run** before an audit counts as accurate.
5. **The planner agent and connectors.** An agent picks the industry profile
   and the platforms to audit (LinkedIn for IT; Angi, Yelp and Reddit for
   home services), within the setup file's allowlist, and runs the flow.
   Data sources plug in as connectors, so a reseller can link in the tools
   they use.
6. **White-label.** A partner (for example a marketing agency reselling
   Croissance) sets its own branding, and its sub-clients' branding, from the
   partner portal; reports say "Prepared by" the partner.
7. **Standalone.** The rest of the engine moves here behind adapters for
   storage, documents and the language model, ready for its own deployment.

## Status

| Piece | State |
|---|---|
| Setup file, ad plan, templates | Here, tested (`test/`). |
| Every change ranked by return; today against the plan | Here, tested; shown on Croissance for the brewery. |
| Ad plan in the live audits and reports | Next. |
| Review → re-interpret → re-run | Planned. |
| Planner agent and industry platforms | Planned: an agent picks the industry profile from the business's data, within the setup file's allowlist. |
| SEO, website and Google Business Profile audits | Partly live (`api/_lib/groundswell/currents/`); being widened. |
| Engine moved here behind adapters | Planned. |
