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
3. **Write the ads** (`src/adcopy.ts`, `src/templates.ts`). Ready-to-paste
   ad copy for each funded or tested row (`copyTargets`), held by
   `checkCopy` to the platform's character limits, to numbers the data shows,
   and to `templateProblems`. Written copy never makes a claim from
   `unsupported_claims`, even with proof; a hand-written template may, with
   the proof named.
4. **Review, re-interpret, re-run** (`src/verify.ts`). Each round after the
   first reads again the sources the plan rests on and re-runs the plan on
   that read, with the first pass's estimates and angles held fixed
   (`refreshAngles`). A pass is judged on what a reader acts on
   (`planFigures`: the figures the reports print, the plan's outcomes, and
   its fund / test / skip calls), and the audit counts as accurate only when
   a later read agrees with an earlier one within the setup file's tolerance
   (`findAgreement`, `verification`). A reviewer then checks every sentence of
   the write-up against the data delivered, correcting or dropping what
   misstates it. An audit that still disagrees after
   `verification.max_rounds`, or whose reviewer drops more than
   `verification.max_review_drops` of it, is flagged for a person, not
   delivered.
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
3. Call `validateConfig` on your setup file, then `planAudit`
   (`src/audit.ts`: the ad plan, every change ranked, and today against the
   plan) and `templateProblems`.

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

## One audit's plan (`src/audit.ts`)

`planAudit` takes what an engine gathers and judges (the angles, the industry
profile, where the website already ranks, and the audit's findings sorted
into `effort` types) and returns the ad plan, every change ranked, and today
against the plan. Besides the ad rows it adds, for each angle with a value,
one page that ranks for its searches: modeled from where the website ranks
now to `impact.seo_target`, unless it already ranks there. Findings of a type
those already cover are left out, so nothing is ranked twice; the rest are
listed as not modeled, cheapest first.

## Competitor benchmark (`src/benchmark/`)

The business against its top two competitors, for any industry. The rules
are code here; the engine only fetches the data.

- **Engagement** (`engagement.ts`): one page of posts and one of reels per
  account, deduped (the reels page repeats posts), pinned posts (a feed post
  with a newer one after it) left out of cadence, hidden likes detected (an
  account that hides likes reads as a small placeholder), comment-to-DM
  prompts ("comment GUIDE") counted, and reels per week over the days the
  reels page spans (a page is a sample). A real by-hand benchmark,
  anonymised, checks these rules
  (`src/test/api/fixtures/groundswell-benchmark/` in New Wave's repository).
- **Ads** (`ads.ts`): the Meta Ad Library by the Page's own id and Google's Ads
  Transparency Center. A verified negative ("isn't currently running ads", "0
  ads, any time") is kept apart from "could not be determined". No spend,
  ever: only presence, dates and creative are public.
- **Pricing** (`pricing.ts`): offer pages found, every price pulled with short
  context, and `checkLadder` holding a model's classification to the prices
  the pages show (an offer with no price is "not published", never a guess).
- **Authority** (`authority.ts`): press from the setup file's list of media
  domains (never a hosting platform), owned channels, content depth, and the
  credentials an About page states, read against the industry profile's
  licence words.
- **Scorecard** (`scorecard.ts`): one row per dimension with a leader by a
  fixed rule, and a gap (with its lever) wherever a competitor leads. Unknown
  values call no leader.

The setup file's `benchmark` section holds the account cap, pages read per
account, the entry-product price line, the engagement bands (an assumption
until a cited report replaces them), the press and platform lists, and the
"do not copy" rules every benchmark carries; each industry profile adds its
own `licences` and `do_not_copy`.

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
3. **The ad plan in the live engine** (now): the `adplan` step
   (`api/_lib/groundswell/adplan.ts`) and the reports' return section, slides
   and summary, and the `adcopy` step (`api/_lib/groundswell/adcopy.ts`): an
   ad for each funded or tested row, checked by `checkCopy`, in the full
   audit. Next: the use-case library.
4. **Review, re-interpret, re-run** (now, in New Wave's engine) before an
   audit counts as accurate: a second read and the plan re-run on it, a
   reviewer over the write-up, and a person for anything that does not hold
   up.
5. **The planner agent and connectors.** An agent picks the industry profile
   and the platforms to audit (LinkedIn for IT; Angi, Yelp and Reddit for
   home services), within the setup file's allowlist, and runs the flow.
   Data sources plug in as connectors, so a reseller can link in the tools
   they use.
6. **White-label** (now, in New Wave's engine). A partner (for example a
   marketing agency reselling Croissance) sets the name and logo its reports
   carry from the partner portal, and any business's logo and colour when
   queuing it; a partner's reports say "Prepared by" the partner and never
   name New Wave, Groundswell or Croissance. Next: reports filed in the
   partner's own Drive (today Drive shows New Wave's account as the owner).
7. **Standalone.** The rest of the engine moves here behind adapters for
   storage, documents and the language model, ready for its own deployment.

## Status

| Piece | State |
|---|---|
| Setup file, ad plan, templates | Here, tested (`test/`). |
| Every change ranked by return; today against the plan | Here, tested; shown on Croissance for the brewery. |
| Ad plan and ranking in the live audits and reports | Live: the `adplan` step and `planAudit` (`src/audit.ts`). |
| Ad copy for the rows the plan runs | Live: the `adcopy` step, `checkCopy` (`src/adcopy.ts`), and the full audit's "Ad copy, ready to paste". |
| White-label for partners | Live in New Wave's engine (`api/_lib/groundswell/branding.ts`, `ownWording` in `reports.ts`); the partner's own Drive is next. |
| Competitor benchmark | Here, tested (`src/benchmark/`); live as the `benchmark` audit kind. |
| Review → re-interpret → re-run | Here, tested (`src/verify.ts`); live in New Wave's engine (`api/_lib/groundswell/verify.ts`, the `verify_read_N` and `verify_check_N` steps). |
| Planner agent and industry platforms | Planned: an agent picks the industry profile from the business's data, within the setup file's allowlist. |
| SEO, website and Google Business Profile audits | Partly live (`api/_lib/groundswell/currents/`); being widened. |
| Engine moved here behind adapters | Planned. |
