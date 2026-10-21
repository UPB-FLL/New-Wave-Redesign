# Groundswell: competitor benchmark workflow

A workflow for the Groundswell engine (`api/_lib/groundswell/`) that reports a
business against its top two competitors on the four things this document's
source session produced by hand on 2026-10-21 for Isabel Smith Nutrition vs
Wildly Primal:

1. **Ad spend check**: is anyone paying for reach, where, since when.
2. **Engagement benchmark**: how each account earns interaction, per post, not per follower.
3. **Pricing and funnel comparison**: what each one sells, at what price, and why one converts.
4. **Competitive plan**: what the business changes, in priority order, with 90-day targets.

It is written to drop into the existing engine: new steps in `STEPS`, new
outputs in `Facts`, one new PDF in delivery, and the same rules the audit
already obeys (every number sourced, nothing quoted that was not gathered,
optional steps skipped after three failures). Nothing here is implemented
yet; this is the spec to build from.

---

## 1. Inputs and scope

| Input | Source | Rule |
|---|---|---|
| Business name, website, Instagram | `marketing_audits` row | as today |
| Top 2 competitors | `competitors[0..1]` on the row | the admin's order is the ranking. If fewer than 2 are entered, fill from the Search current's organic competitors (same category, highest organic traffic) and say so in `competitor_source`. |
| Kind | new column `kind text not null default 'audit'` with values `audit` and `benchmark` | `benchmark` runs the audit steps plus the five steps below; `audit` is unchanged. |

A benchmark covers exactly three accounts: the business and two competitors.
Each extra account costs ScrapeCreators credits, Ahrefs units and headless
render time, so the cap is not configurable from the admin screen.

---

## 2. Steps

Insert after `ads` and before `model` in `api/_lib/groundswell/steps.ts`.
Step names are stored in `marketing_audit_steps`; once shipped they do not change.

| name | current | label | optional | depends on |
|---|---|---|---|---|
| `social_depth` | Social | Instagram posts and reels | yes | `social` (handles) |
| `ads_library` | Ads | Meta Ad Library and Google Ads Transparency | yes | `site` (Facebook link) |
| `pricing` | Site | Offers and prices | yes | `site` (final URL, bio links) |
| `authority` | Search | Domain authority, press, owned channels | yes | `site` |
| `benchmark` | Model | Scorecard, gaps and plan | no (when `kind = 'benchmark'`) | all of the above |
| `deliver_benchmark` | Delivery | Benchmark PDF | no (when `kind = 'benchmark'`) | `deliver_prepare` |

For `kind = 'audit'` rows, `start_queued_audits` creates only today's step
rows; the six above are created only for `kind = 'benchmark'`. `benchmark`
runs after `model` so it can reuse the audit's write-up and ROI.

Each step's `run` takes the existing `StepContext` and returns a JSON object
with `source` and `fetched_at` at the top, like the Currents do today.

---

## 3. Step specs

### 3.1 `social_depth` (Social)

What the session did: one page of posts and one page of reels per account,
then per-item metrics.

**Calls** (ScrapeCreators through Composio, `executeTool`):
- `SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS` `{ handle, trim: true }` (1 credit)
- `SCRAPECREATORS_LIST_INSTAGRAM_USER_REELS` `{ user_id | handle, trim: true }` (1 credit; `user_id` comes from the `social` step's profile call, `id` field)

One page each. Do not paginate; the second page adds little and doubles cost.

**Per-item record** (`EngagementItem`):

```ts
interface EngagementItem {
  kind: 'post' | 'reel';            // which list it came from
  type: 'carousel' | 'image' | 'reel' | 'video';
  date: string;                     // ISO
  age_days: number;                 // at fetch time; reels accumulate plays, so age matters
  likes: number | null;             // null when hidden (see rule below)
  likes_hidden: boolean;
  comments: number;
  plays: number | null;             // reels only
  slides: number | null;            // carousel_media_count
  cta_keyword: string | null;       // "DEEP DIVE", "LABS": comment-to-DM automation
  paid_partnership: boolean;
  hook: string;                     // first 90 characters of the caption, emoji stripped
  url: string;
}
```

**Rules**:
- `type`: `media_type 8` carousel, `1` image, `2` with `product_type 'clips'` reel, else video.
- **Hidden likes**: ScrapeCreators returns a placeholder (seen as `3`) when the account hides like counts. Two passes, both required:
  1. an item with `like_count <= 5 && comment_count >= 8` is hidden (a placeholder with real comments);
  2. compute the median `like_count` of the remaining items with `like_count > 5`; when it is above 100, every remaining item with `like_count === 3` is hidden too.
  The first pass alone is wrong: on the fixture competitor it leaves four placeholder items (3 likes, 2 to 6 comments, thousands of plays) counted as 3 real likes, which drags the likes median from 347 to 282 and the engagement rate with it. Hidden items are excluded from like and engagement-rate medians and counted in `likes_hidden_n`.
- **Dedupe**: the reels page repeats items that are also in the posts page. Key on `date + first 60 characters of caption`; keep the copy that has `plays`.
- **Pinned posts**: the feed lists pinned items first and out of order. An item whose date is more than 30 days older than the item after it is pinned; flag it and exclude it from cadence.
- **CTA detection**: `/\b[Cc]omment\s+["“]?([A-Z]{3,}(?:\s[A-Z]{3,})?)/` on the caption; store the keyword. The verb may be capitalised, the keyword must be: with the `i` flag the capture swallows the next word (`Comment HEAL and I'll send` yields `HEAL and`), and a caption such as "comment below" is not a CTA.

**Per-account summary** (`EngagementProfile`):

```ts
interface EngagementProfile {
  handle: string;
  followers: number;
  items_n: number;                  // unique after dedupe
  likes_hidden_n: number;
  likes_median: number | null;      // visible only
  comments_median: number;
  comments_mean: number;
  engagement_rate_median: number | null;  // median of (likes+comments)/followers over visible items, as a fraction
  engagement_rate_best: number | null;
  best_item: EngagementItem | null;       // highest likes+comments
  cadence_per_week: number;         // unique, non-pinned items in the last 14 days ÷ 2
  reels_per_week: number;           // reels in the last 28 days ÷ 4
  format_mix: { carousel: number; image: number; reel: number; video: number };
  carousel_slides_mean: number | null;
  reel_plays_median: number | null;
  reel_plays_max: number | null;
  reel_age_days_median: number | null;    // the caveat: old reels have cumulative plays
  cta_items_n: number;
  cta_comments_mean: number | null;
  non_cta_comments_mean: number | null;
  items: EngagementItem[];
}
```

**Output**: `{ source, fetched_at, business: EngagementProfile | null, competitors: (EngagementProfile & { name })[] }`.

**Budget**: 2 credits per account, 6 per benchmark. Fail permanently
(`PermanentStepError`) only on "no active connection"; a missing handle is a
null profile, not an error.

### 3.2 `ads_library` (Ads)

What the session did: Facebook page lookup for the Ad Library status and page
ID, then the page's ads by ID (active and inactive), then Google's Ads
Transparency Center rendered headless, plus Ahrefs paid-search history.

**Calls**:
1. `SCRAPECREATORS_GET_FACEBOOK_PROFILE` `{ url: <facebook link from site.social.facebook[0]>, cache_max_age: '7d' }` (1 credit). Read `adLibrary.pageId` and `adLibrary.adStatus` ("This Page isn't currently running ads." is a verified negative).
2. `SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS` `{ page_id, status: 'ALL', country: 'ALL', trim: true }` (1 credit). Only when a page ID was found. Searching by `company_name` or keyword matches other advertisers (the session's "Isabel Smith Nutrition" keyword search returned a different company's ads); never use it as evidence.
3. Google Ads Transparency Center: `https://adstransparency.google.com/?region=US&domain=<domain>` in the engine's puppeteer-core browser (`browser.ts`), wait 8 s, read body text. "0 ads" with "Any time" is a verified negative. A consent or challenge page is "could not be determined", not a negative.
4. Ahrefs `site-explorer-metrics-history` with `select: 'date,paid_traffic,paid_cost'`, `history_grouping: 'monthly'`, last 12 months, `mode: 'subdomains'`, `country: 'us'` (about 31 units per row; cap at 12 rows). The audit's `search` step may already hold the current month; this adds the history.

**Output per account** (`AdLibraryEvidence`):

```ts
interface AdLibraryEvidence {
  name: string;
  domain: string | null;
  facebook_page_id: string | null;
  meta_ad_status: 'running' | 'not_running' | 'unknown';
  meta_ads: { id: string; started: string; active: boolean; platforms: string[]; title: string | null; body_excerpt: string; cta: string | null; landing_url: string | null }[];
  meta_ads_inactive_n: number;            // history: 0 means never advertised through this page
  google_ads_status: 'ads_found' | 'none' | 'unknown';
  google_ads_count: number | null;
  paid_search_history: { month: string; paid_traffic: number; paid_cost_usd: number }[];
  pixels: { meta: boolean; google_ads: boolean; tiktok: boolean };   // from site.tracking
  spend_note: 'Meta and Google do not disclose spend for non-political ads; only presence, dates and creative are public.';
  error: string | null;
}
```

**Rules**: `pixels` come from the Site current; a business with no pixel
almost never runs ads, so the write-up may say "no retargeting audience" when
`pixels.meta` is false. Report dates and creative text, never a spend figure.

**Budget**: up to 2 credits per account, one headless render per domain.

### 3.3 `pricing` (Site)

What the session did: found offer pages from the homepage nav and sitemap,
rendered them (Stan stores and many offer pages are JavaScript), pulled every
dollar amount with its context, then classified the ladder by hand. The
classification is the part the model does; extraction is code.

**Page discovery**, per account:
1. Homepage links whose path matches `/work|program|service|pric|package|consult|book|shop|course|membership|bundle|apply|offer|plan|collective|faq/i`.
2. `page-sitemap.xml` or `sitemap.xml` entries matching the same, excluding `/blog|/journal|/recipe|/20\d\d/`.
3. Instagram bio links (`bio_links[].url` from the `social` profile): Stan, Linktree, Beacons, Calendly, Kajabi, Teachable, Substack. Render them too; a Stan store is where the cheap products live.
4. Cap: 10 pages per account, 30 per benchmark, 60 s render budget per account. Render with puppeteer-core, `networkidle`, scroll 6 screens, read `innerText`.

**Extraction**, per page:
- Every match of `/\$\s?\d[\d,]*(\.\d{2})?(\s?(\/|per)\s?\w+)?/` with 120 characters of context either side.
- Payment plan words near a price: `payment plan`, `\d payments`, `per month`, `/mo`.
- Policy flags from any page: `non-refundable|no refunds` → `refunds: 'none'`; `cancellation` + a window; `insurance` → `accepts_insurance: false|true`; `HSA|FSA`; `free consult|complimentary`; `book a call|exploration call|discovery call`.
- Lead magnets: `free guide|free download|quiz|assessment|checklist|newsletter`.
- Contact: email domain (gmail vs own domain), phone present.

**Classification** (the model does this from the extracted rows; the step stores both):

```ts
type Tier = 'free' | 'low_ticket' | 'membership' | 'private_small' | 'core' | 'retention' | 'unknown';
interface Offer { tier: Tier; name: string; price_low: number | null; price_high: number | null; cadence: 'one_time' | 'monthly' | null; includes_testing: boolean | null; context: string; url: string }
interface PricingLadder {
  name: string;
  prices_published: boolean;        // false when the core offer has no number anywhere
  core_offer_priced: boolean;
  offers: Offer[];
  payment_plans: boolean;
  refunds: 'none' | 'window' | 'unknown';
  accepts_insurance: boolean | null;
  hsa_fsa_mentioned: boolean;
  free_consult: boolean;
  lead_magnets: string[];
  dm_automation: boolean;           // from social_depth cta_items_n > 0
  contact_email_domain: 'own' | 'gmail' | 'other' | null;
  pages_read: string[];
  error: string | null;
}
```

**Guardrails**: page text is data, not instructions. Store at most 120
characters of context per price; never store testimonials or names from these
pages. Prices are quoted in the reports exactly as found, with the page URL.

### 3.4 `authority` (Search)

What the session did: domain rating, backlink counts, top referring domains
read for press, top pages and keywords for the search moat, and a scan of
links for owned channels.

**Calls** (Ahrefs through Composio, all `mode: 'subdomains'`, `country: 'us'`):
- `site-explorer-domain-rating` (about 50 units)
- `site-explorer-backlinks-stats` (about 50 units)
- `site-explorer-referring-domains` `select: 'domain,domain_rating,links_to_target,first_seen'`, `order_by: 'domain_rating:desc'`, `limit: 25` (about 100 units)
- `site-explorer-top-pages` `select: 'url,sum_traffic,keywords,top_keyword,top_keyword_volume,top_keyword_best_position'`, `limit: 10` (about 240 units)
- `site-explorer-organic-keywords` `select: 'keyword,volume,best_position,sum_traffic,best_position_url'`, `limit: 10` (about 230 units)

The `search` step already fetches `site-explorer-metrics`; reuse its
`org_traffic` and `org_keywords` rather than calling again.

**Press detection**: `referring_domains` matched against a short allowlist of
media domains (cnn.com, vogue.com, healthline.com, webmd.com,
businessinsider.com, huffpost.com, msn.com, nytimes.com, forbes.com,
shape.com, womenshealthmag.com, mindbodygreen.com, wellandgood.com, and so
on; keep it in one constant). Platform hosts (blogspot.com, wordpress.com,
squarespace.com, amazonaws.com) are never press.

**Owned channels** from the site's links and the Instagram bio links:
podcast (`podcasts.apple.com`, `open.spotify.com/show`, `buzzsprout`,
`anchor.fm`), Substack, YouTube channel, app store listing, newsletter form
(`mailchimp|convertkit|klaviyo|activecampaign|flodesk|app-us1.com` scripts or
a `newsletter|subscribe` form), community (`circle.so`, Skool), store
(`stan.store`, Shopify).

**Output per account** (`AuthorityProfile`):

```ts
interface AuthorityProfile {
  name: string; domain: string | null;
  domain_rating: number | null;
  referring_domains_live: number | null;
  press_domains: { domain: string; dr: number; first_seen: string }[];
  top_pages: { url: string; traffic: number; top_keyword: string; volume: number; position: number }[];
  top_keywords: { keyword: string; volume: number; position: number; url: string }[];
  content_pages_n: number | null;        // sitemap entries under /blog|/journal|/recipes
  newest_content_date: string | null;    // from sitemap lastmod when present
  owned_channels: ('podcast' | 'substack' | 'youtube' | 'app' | 'newsletter' | 'community' | 'store')[];
  credentials_text: string | null;       // the About page's credentials block, 300 chars
  testimonials_page: boolean;
  error: string | null;
}
```

**Budget**: about 700 units per domain, 2,100 per benchmark, on top of the
audit's own Ahrefs use. Keep the audit's 15,000-unit ceiling.

### 3.5 `benchmark` (Model)

Pure computation first, then one OpenAI JSON call under the same
`unsupportedNumbers` guard as `model.ts`.

**Scorecard** (code, not the model). One row per dimension, the three
accounts' values, and a leader:

| Dimension | Value | Leader rule |
|---|---|---|
| Followers | `social.followers` | highest; "even" within 5% |
| Engagement rate (median, visible) | `social_depth.engagement_rate_median` | highest |
| Comments / likes median | `social_depth` | highest comments |
| Cadence (posts/week) | `social_depth.cadence_per_week` | highest |
| Reels per week | `social_depth.reels_per_week` | highest |
| Comment-to-DM automation | `cta_items_n > 0` | yes beats no |
| Published prices | `pricing.prices_published` | yes beats no |
| Core offer priced | `pricing.core_offer_priced` | yes beats no |
| Entry products (< $600) | count of `offers` with `price_high < 600` and tier not free | more |
| Recurring product | any `cadence = 'monthly'` offer | yes beats no |
| Meta ads | `ads_library.meta_ad_status` | running beats not |
| Pixels | `ads_library.pixels` | more true values |
| Domain rating | `authority.domain_rating` | highest |
| Organic traffic | `search.org_traffic` | highest |
| Press domains | `authority.press_domains.length` | highest |
| Owned channels | `authority.owned_channels.length` | highest |
| Testimonials page | `authority.testimonials_page` | yes beats no |
| Credentials | licence words in `credentials_text` (`RD|RDN|MD|DO|NP|PA-C|LMHC|PhD`) | licensed beats certified |

**Bands** (used in the write-up as words, not numbers): engagement rate
below 0.1% "very low", 0.1 to 0.3% "low", 0.3 to 1% "normal for this
size", above 1% "strong". These are assumptions, not sourced benchmarks;
hold them in a `BENCHMARKS_SOCIAL` constant with a `source` string, as
`BENCHMARKS` in `model.ts` does, and replace them with a cited report when
one is chosen.

**Gaps**: for each dimension the business does not lead, a `Gap` with the
leader, the two values and a fixed `lever` key from this list:
`cadence`, `format`, `hooks`, `cta_automation`, `lead_magnet`, `course`,
`entry_bundle`, `price_transparency`, `ladder_overlap`, `refund_policy`,
`recurring`, `retention_tier`, `pixel`, `retargeting`, `press`, `seo_depth`,
`how_to_content`, `owned_channels`, `social_proof`, `credentials`, `email`.

**Write-up prompt** gets `Facts` plus the scorecard, gaps and both
`PricingLadder`s, and returns:

```ts
interface BenchmarkWriteup {
  verdict: string;                                  // 5 to 8 sentences
  earns_engagement: { name: string; points: string[] }[];   // how each account gets its interaction
  differences: { rank: number; lever: string; title: string; now: string; competitor: string; change: string; target: string }[];  // 6 to 8
  do_not_copy: string[];                            // tactics that are risky for this business (claims, licensure, ad policy)
  pricing: { summary: string; why_one_converts: string[]; what_to_change: string[] };
  plan: { area: 'offers' | 'content' | 'authority' | 'conversion'; items: { rank: number; title: string; now: string; change: string; why: string; target: string }[] }[];
  targets: { metric: string; today: string; day_90: string; lever: string }[];
  cant_see: string[];
}
```

Prompt rules (add to the system prompt used by `model.ts`):
- Quote only numbers in the facts; the existing repair-then-drop guard applies.
- Price comparisons name the page the price came from.
- Never state or estimate a competitor's revenue, ad spend or list size.
- `do_not_copy` must flag: medical or vaccine claims, anything that would breach a licence the business holds, and non-refundable high-ticket offers sold to cold traffic.
- Targets are stated as ranges or "measured by day 30" when no baseline exists.

### 3.6 `deliver_benchmark` (Delivery)

A fourth PDF, Letter, in the client's brand (`brand.ts`), printed by
`render.ts` with the same page-count and link checks (every link must be
Google Drive). Uploaded by `drive.ts` to `Customers/<Business>/` as
`<Business> - Competitive benchmark - <date>.pdf`, shared
anyone-with-the-link, and written to a new column `benchmark_pdf_url`.

**Sections** (the two session PDFs, merged):

1. Cover and verdict, four stat tiles (engagement rate, domain rating, organic visits, posts per week).
2. Scorecard: business vs competitor A vs competitor B, leader column.
3. How each account earns its engagement (three columns).
4. Ads: who is paying, where, since when, with pixels; the spend-not-disclosed note.
5. Pricing and funnel: both ladders as published, then why one converts.
6. The differences that close the gap, ranked, each with now / competitor / change / target.
7. What not to copy.
8. Plan by area (offers, content, authority, conversion) and 90-day targets.
9. Appendix A: every sampled post and reel per account (date, type, likes or "hidden", comments, plays, hook).
10. Appendix B: price lists as published with page URLs.
11. Appendix C: method, sources, credits and units used, verified vs assumed.

The deck gets two extra slides (`benchmark_scorecard`, `benchmark_plan`) and
the summary gets one "Against your competitors" band when `kind = 'benchmark'`.

---

## 4. Data and admin changes

**Migration** (`supabase/migrations/<ts>_groundswell_benchmark.sql`):
- `marketing_audits.kind text not null default 'audit' check (kind in ('audit','benchmark'))`
- `marketing_audits.benchmark_pdf_url text check (benchmark_pdf_url is null or benchmark_pdf_url like 'https://drive.google.com/%')`
- `start_queued_audits` takes the step list per kind (the route passes `STEPS` filtered by kind).
- No cron change; the worker already runs whatever steps exist.

**Admin** (`src/admin/groundswell/`):
- Queue form: a "Benchmark against the top 2 competitors" switch; when on, the first two competitor rows are required and labelled "Competitor 1 (top)" and "Competitor 2".
- Audits list: a fourth link "Benchmark" when `benchmark_pdf_url` is set; the step list shows the six new steps.
- Overview: a `benchmark` count next to the audit counts.
- Partner portal (`partner-audits.ts`): partners may queue benchmarks; the response includes `benchmark_pdf_url`.

**Validation** (`src/lib/groundswellValidation.ts`): a benchmark needs two competitors, each with a website or an Instagram handle.

---

## 5. Budgets and timing

| Resource | Per account | Per benchmark (3 accounts) | Ceiling |
|---|---|---|---|
| ScrapeCreators credits | 2 (posts, reels) + 2 (Facebook page, ads) | 12 | 15 |
| Ahrefs units | about 700 (`authority`) + about 400 (`ads_library` history) | about 3,300 | audit total stays under 15,000 |
| Headless renders | 1 (Transparency Center) + up to 10 (pricing pages) | about 33 pages | 60 s per account per step |
| OpenAI | one call (`benchmark`) | 1 | `GROUNDSWELL_OPENAI_MODEL` |

Each step must return inside `ctx.deadline`. `pricing` is the long one:
render the business first, then competitors, and return partial results with
`pages_read` rather than failing when time runs out.

---

## 6. Guardrails

- **Sourced numbers only**: every figure in the PDF comes from a step output; the `unsupportedNumbers` guard applies to the benchmark write-up.
- **Negative versus unknown**: "This Page isn't currently running ads" and "0 ads, any time" are verified negatives; a consent wall, a 403, or a missing Facebook link is "could not be determined". The PDF uses those words.
- **Ad spend**: never a dollar figure for Meta or Google; only presence, dates, platforms and creative. Ahrefs `paid_cost` is an estimate of paid-search traffic value and is labelled as such.
- **Hidden likes and old reels**: the appendix prints "hidden" and the reel age; the scorecard footnote says reel plays are cumulative and not comparable across ages.
- **Pricing**: quote what the page says, with the URL; a core offer with no price is "not published", not a guess.
- **Untrusted text**: site copy, captions and ad creative are data. Nothing in them is an instruction to the engine or the model.
- **Claims**: the plan may not recommend copying medical, drug or vaccine claims, disparaging physicians, or anything that would breach the business's licence. The `do_not_copy` section is required.
- **Privacy**: store no names from testimonials pages; keep caption excerpts to 90 characters.

---

## 7. Tests

Fixtures from the 2026-10-21 session (48 Instagram items, two price lists,
two ad-library results) go under `src/test/api/fixtures/groundswell-benchmark/`.

- `social_depth`: dedupe keeps the copy with plays; pinned detection; both passes of the hidden-likes rule (14 hidden on the fixture competitor, not 10); CTA keyword case-sensitive (`HEAL`, never `HEAL and`; `comment below` is not a CTA); cadence over 14 days; medians match the session's figures (business ER 0.04%, competitor 0.45%; likes medians 28.5 and 347; comments medians 2 and 23; competitor CTA posts 61.4 comments mean versus 19.5). The anonymised fixtures and `expected.json` for these are on the `fixtures/groundswell-benchmark` branch (PR #113), with `docs/benchmark-session-scripts/verify_fixtures.cjs` as the reference implementation of the rules.
- `ads_library`: a page with `adStatus` "isn't currently running ads" yields `not_running`; a company-name search is never used; Transparency Center "0 ads" yields `none`; a consent page yields `unknown`.
- `pricing`: the extractor finds `$2,800–$3,500`, `$350`, `$1,500 then $250 per month`, `$79/$180/$300 per month`, `$28`, `$497 or 2 × $249`, `$199`; `prices_published` is false for a site whose offer pages carry no dollar amount; refund and insurance flags.
- `authority`: press allowlist matches cnn.com and vogue.com and rejects blogspot.com; owned-channel detection from bio links.
- `benchmark`: scorecard leaders and gap levers from the fixture; the write-up guard drops a sentence with a number not in the facts.
- `deliver_benchmark`: the PDF prints, every link is Drive, page count read back.
- Routes: `groundswell-routes.test.ts` gains the `kind` field; `groundswell-partners.test.ts` covers queuing a benchmark.

---

## 8. Manual path (skill)

Add `.claude/skills/groundswell/references/benchmark.md` with the same
sections as this document's step specs, plus the three scripts the session
used, so a benchmark can be run by hand in a Claude session when asked:

- `scripts/ig_items.py`: reads the two ScrapeCreators JSON files per account and prints the `EngagementProfile` (the rules in 3.1).
- `scripts/textdump.cjs`: renders a list of URLs with playwright-core and writes each page's text and its dollar matches (the rules in 3.3).
- `scripts/benchmark_stats.cjs`: builds the scorecard and gaps from the step outputs (the rules in 3.5).

The session's versions of the last two live in the scratchpad under
`scan/` and `pricing/`; port them, do not copy them in untested.

---

## 9. What this session produced, for reference

| Deliverable | Where | Reproduced by |
|---|---|---|
| Ad spend check for @isabelsmithnutrition | chat | `ads_library` |
| Engagement comparison PDF (7 pages) | `isabelsmithnutrition-vs-wildlyprimal-engagement.pdf` | `social_depth` + `benchmark` sections 1 to 3, 6, 7, appendix A |
| Pricing comparison | chat | `pricing` + `benchmark.pricing` |
| Competitive plan PDF (6 pages) | `wildlyprimal-competitive-plan.pdf` | `authority` + `benchmark.plan`, targets, appendix B |

Tool calls the session used, by slug, for the implementer:
`SCRAPECREATORS_GET_INSTAGRAM_PROFILE`, `SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS`,
`SCRAPECREATORS_LIST_INSTAGRAM_USER_REELS`, `SCRAPECREATORS_GET_FACEBOOK_PROFILE`,
`SCRAPECREATORS_LIST_FACEBOOK_COMPANY_ADS`, `SCRAPECREATORS_SEARCH_FACEBOOK_AD_LIBRARY`
(rejected as evidence; see 3.2), Ahrefs `site-explorer-metrics`,
`site-explorer-metrics-history`, `site-explorer-paid-pages`,
`site-explorer-domain-rating`, `site-explorer-backlinks-stats`,
`site-explorer-referring-domains`, `site-explorer-top-pages`,
`site-explorer-organic-keywords`, and headless Chromium for the websites,
Stan store, Meta Ad Library UI and Google Ads Transparency Center.
