# Groundswell: more public sources, and what the engine makes from them

Written 2026-10-22 from the two live Uncommon Path Brewing runs (benchmark
runs `1c15c575…` on 2026-10-21 and `28a89d79…` on 2026-10-22). Owner's
direction the same day: gather every source through the public scrape tools
already linked to Composio's consumer account (ScrapeCreators, Apify, the
Ahrefs instant account); posting and ad-account hooks are the owner's to
connect later. Part 1 shipped with this document; parts 2 to 4 are the plan.

## 1. Why Uncommon Path's Instagram came back empty (shipped)

Both runs recorded, for `@uncommonpathbrewing`, ScrapeCreators' answer
"Instagram blocked access to this public profile" (the `social` step) and
"…to this user's public posts" (`social_depth`), while the two competitors'
profiles were read in the same runs. Instagram's own logged-out page for the
handle serves an error page (`httpErrorPage`, the logged-out 404 layout)
where a public profile redirects to the sign-in wall: the account is shown
only to signed-in adults. That is Instagram's minimum-age control, which
alcohol brands set (and are expected to), and it hides the profile from every
logged-out reader, scrapers included. The Facebook Page is gated the same
way, which is why the ad-library step found "no Ad Library id" for all three
breweries.

What changed (`api/_lib/groundswell/currents/social.ts`):

- A profile ScrapeCreators reports blocked twice is read through Apify's
  Instagram scrapers (`APIFY_SCRAPE_INSTAGRAM_PROFILES`,
  `APIFY_SCRAPE_INSTAGRAM_POSTS`, the posts capped at 12 and $0.25).
  `summarizeInstagram` reads Apify's field names too. The snapshot records
  `read_via`, `restricted` and, when nothing could read it, a `note` the
  reports print instead of a blank row (never "inactive on Instagram").
- The business's Facebook Page (the website's link) is read with
  `include_gated_profile: true`, with one page of its posts; each
  competitor's Page is read without posts. `SocialOutput.facebook` and
  `facebook_competitors`. The write-up sees them under `instagram.facebook`;
  the full audit's social section lists them; the creative step takes the
  images on the business's Facebook posts before the website's share image.
- The ads-library step passes `include_gated_profile: true` so a gated Page's
  Ad Library id is found.
- Readiness gains an Apify row. Step label: "Instagram and Facebook".

Field names, read from ScrapeCreators' own documentation on 2026-10-22
(docs.scrapecreators.com; Composio's consumer executor refused every call
that day with an SSRF-guard error of its own, so nothing ran against the
live services):

- Facebook Page (`/v1/facebook/profile`): `id`, `name`, `isPrivate`,
  `url`, `adLibrary.{pageId,adStatus}`, `creationDate`, `businessHours`,
  and (from the docs' field list, not the quoted example) `category`,
  `pageIntro`, `rating`, `ratingCount`, `likeCount`, `followerCount`,
  `talkingAboutCount`, `priceRange`, `website`, `phone`, `address`. The Ad
  Library's `pageId` differs from the profile's `id`; the ads step reads by
  the former.
- Facebook posts (`/v1/facebook/profile/posts`, "visible without login, 3
  per page"): `posts[].{id,text,url,permalink,reactionCount,commentCount,
  videoViewCount,publishTime (Unix seconds),videoDetails.thumbnailUrl,
  topComments[]}`. No shares and no image list in the example: a photo
  post's image is not documented, so `image_url` reads the video thumbnail
  and the usual image keys, and may be null.
- Instagram profile (`/v1/instagram/profile`): `data.user.edge_followed_by.
  count`, `edge_follow.count`, `edge_owner_to_timeline_media.count`,
  `biography`, `bio_links[].url`, `external_url`, `is_business_account`,
  `is_private`. Refusals: HTTP 403 "Profile is age restricted"
  (`age_restricted: true`, not charged), 404 "Profile is restricted", and
  on the posts endpoints 404 "Profile is private". Composio relays the
  first as "Instagram blocked access to this public profile", which is what
  the live runs recorded. `refusal()` in `social.ts` tells them apart: age
  and restricted go to Apify; private gets its own note and no paid read.
- Instagram posts (`/v2/instagram/user/posts`): `items[].{code,taken_at,
  created_at,media_type,caption.text,like_count,comment_count,
  image_versions2.candidates[].url,product_type}`, `more_available`,
  `next_max_id`.

Still to confirm on a live run: that Apify reads an age-gated profile (if
it cannot, the note stands and Facebook carries the social section).

Getting past the age gate itself: Instagram shows a gated profile only to
a signed-in adult, so the only readers are a signed-in session or the
account's own API. Two ways; the owner chose the first on 2026-10-22:

1. **Link the account** (built, and the owner's choice): the account's own
   token through the Graph API, which the minimum-age control does not
   gate. This is the read Instagram allows. What that takes, and what
   shipped for it:
   - Uncommon Path is New Wave's own customer (`partner_id` null, stage
     prospect, no partner exists yet), and the partner route could not
     reach it. The staff customer page (`/groundswell/admin/customers/:id`)
     now has "Became a client" and the Linked accounts card, through
     `api/groundswell/accounts.ts` (Groundswell admins; any customer; the
     sign-in comes back to the staff page; `linked_by: staff:<email>`). The
     partner route shares its answers (`api/_lib/groundswell/accountLinking.ts`).
   - The `social` step reads a linked client's Instagram first, in every
     phase (`linkedInstagram` in `currents/social.ts`: `INSTAGRAM_GET_USER_INFO`
     and `INSTAGRAM_GET_IG_USER_MEDIA` as the account itself, with the images
     for the ad sets; `read_via: 'linked'`), and only then the public reads.
     Phase 3's `linked` step keeps reading the insights.
   - Still needed on the live side: an Instagram auth config in the Composio
     project (the overview's "Client sign-in: Instagram" row says whether
     it is there), then on the staff page: Became a client, Link Instagram,
     sign in as the brewery's account, Run again.
2. **A signed-in headless browser**: Chromium (`browser.ts`) carrying the
   `sessionid` cookie of an adult account from Vercel's environment, asking
   Instagram's own web profile endpoint (`/api/v1/users/web_profile_info/`,
   which answers in the same `data.user` shape as above, so
   `summarizeInstagram` reads it unchanged). It was not built from this
   session: the Claude Code permission classifier refused the module (a
   cookie-carrying automated session against Instagram), and Instagram's
   terms do not allow automated reads of a signed-in session, so a session
   used this way can be signed out or checkpointed. If the owner wants it
   anyway, it is a small module (`currents/socialBrowser.ts`, about 60
   lines) to be written and run under the owner's own permission rule,
   with a dedicated account, never a personal one.

## 2. The next sources (public scrape tools only)

Every tool slug below exists in Composio's catalogue (checked 2026-10-22);
their answer shapes are not yet read, so each step is written like the
Facebook read: look figures up by their usual names, record what could not
be read, never fail the run. Each is an optional step; its gap wording goes
in `gaps.ts`; its figures go in `Facts` so `allowedNumbers` lets the
write-up and the ad copy quote them.

### 2.1 Facebook, in depth (benchmarks and phase 2)

- `SCRAPECREATORS_LIST_FACEBOOK_PROFILE_POSTS` pages by `next_cursor` (three
  posts a credit): read up to four pages for the business and two for each
  competitor, so the engagement rules in
  `packages/groundswell/src/benchmark/engagement.ts` run on Facebook too
  (reactions, comments and shares per post, cadence, the newest post's age).
  Bulk alternative at $0.005 a post: `APIFY_SCRAPE_FACEBOOK_POSTS`.
- `APIFY_SCRAPE_FACEBOOK_REVIEWS` for the Page's recommendations when the
  Page shows them.
- Lands in `social_depth` as a `facebook` block beside the Instagram one;
  the benchmark scorecard's engagement row takes whichever platform the
  business posts on.

### 2.2 Reviews beyond Google: Yelp (new step `reviews`, Current "Maps")

The website already links the Yelp listing
(`yelp.com/biz/uncommon-path-brewing-fort-lauderdale`); the site scan should
keep that link (`SiteScan.social` gains `yelp`), and the Places read already
gives the Google rating and count.

- First try, no credits: the listing page's JSON-LD (`aggregateRating`,
  `priceRange`, `servesCuisine`) over plain HTTPS like the site step. Yelp
  turns datacenter addresses away often, so this is best-effort.
- Fallback, public scrape: an Apify Yelp scraper through `APIFY_RUN_ACTOR`
  and `APIFY_GET_RUN_DATASET_ITEMS` (pick one actor and pin its id in the
  setup file; cap the charge).
- The Yelp toolkit itself (`YELP_SEARCH_BUSINESSES`,
  `YELP_GET_BUSINESS_DETAILS`, `YELP_GET_BUSINESS_REVIEWS` for three
  excerpts; `YELP_GET_REVIEW_HIGHLIGHTS` needs Yelp's premium plan) needs a
  Yelp Fusion key linked in the consumer account. Not linked today; use it
  when the owner links one.
- Output per account: `{ yelp: { url, rating, reviews, price, categories,
  claimed }, google: from maps, facebook: from social }`. The reports gain
  a "Reputation" table (Google, Yelp, Facebook side by side, the business
  against each competitor); the write-up's `google` area becomes the
  reputation area; the change ranking's `reviews` change takes the
  combined count.

### 2.3 Reddit (new step `community`, Current "Social")

- First try, no account: Reddit's public search JSON
  (`/search.json?q=…&sort=new&t=year&limit=50`, a browser user agent),
  for the business name, the name with the city, `url:<domain>`, each
  competitor, and the category in the local subreddits (the setup file
  lists them per area; Fort Lauderdale: r/fortlauderdale, r/Broward,
  r/FloridaBeer). Logged-out reads are rate-limited and datacenter
  addresses sometimes refused.
- Fallbacks: `REDDIT_SEARCH_ACROSS_SUBREDDITS` (the `reddit` toolkit; only
  `reddit_ads` is linked today, so this needs a Reddit account linked in the
  consumer account), or an Apify Reddit scraper through `APIFY_RUN_ACTOR`.
- Output: every mention with `subreddit`, `flair` (the "tags"), `score`,
  `comments`, `created`, `permalink`, the first 300 characters; the
  subreddits ranked by mentions; the flair tags by count; and the questions
  people ask about the category locally (titles ending in a question mark,
  or starting with who/what/where/which/best).
- Feeds: the questions are angle candidates for the ad plan (the planner
  prompt in `adplan.ts` gets `community.questions`), and the engagement
  carousel's slide topics (`adsets.ts` writer input gains them); the
  write-up's social area names where the business is talked about and
  where it is not. Reddit as an ad platform stays "not modeled" in the
  setup file until a credible benchmark exists.

### 2.4 AI visibility (new step `ai_visibility`, Current "Search")

Through the Ahrefs instant account (`ahrefs_mcp`, billed per call; read
`AHREFS_MCP_DOC` for each tool's real inputs first, and
`AHREFS_MCP_SUBSCRIPTION_INFO_LIMITS_AND_USAGE` to confirm Brand Radar is
in the plan):

- `AHREFS_MCP_BRAND_RADAR_MENTIONS_OVERVIEW_ENTITIES` and
  `…_SOV_OVERVIEW_ENTITIES`: mentions and share of voice for the business
  against its competitors (`brands` as names plus `url_groups` on each
  domain), per `data_source` (ChatGPT, Perplexity, Gemini, Google AI
  Overviews, Copilot: the doc tool lists the accepted values).
- `…_AI_RESPONSES_ENTITIES`: the prompts where any of them is named and the
  answers' cited sources.
- `…_CITED_PAGES_ENTITIES` and `…_CITED_DOMAINS_ENTITIES`: which pages and
  domains the assistants cite for the category; the listings the business
  is missing from (Yelp, Untappd, local press) become `listings` changes in
  the change ranking (`packages/groundswell/src/changes.ts`).
- `AHREFS_MCP_SITE_EXPLORER_AI_RESPONSES_COUNT` for the domain, and the
  `ai_overview` SERP feature on the plan's keywords from the keyword
  overview, so the plan knows which searches now answer with an AI
  summary.
- Output: `{ sources: [{ assistant, mentions, share_of_voice }],
  prompts: [...], cited: [{ domain, pages }], missing_from: [...] }`; the
  full audit gains an "AI answers" section; the slides a line on the
  search slide; the write-up's search area reads it.

### 2.5 Untappd (breweries only, optional)

The site links it (`untappd.com/v/uncommon-path-brewing/12272330`). The
public venue page carries the rating and check-in count in its HTML; an
industry profile flag (`industries.ts`, `brewery.untappd = true`) decides
whether the reviews step reads it. No Composio tool; a plain fetch like
Yelp's first try.

## 3. What the engine makes from the scraped sets

The ad sets already turn the plan into Meta and Google sets with the
business's own images (`adsets.ts`, `creative.ts`, `creativeRender.ts`).
With the sources above:

- Creative: Instagram posts (ScrapeCreators, then Apify), then the Facebook
  posts' images (shipped), then the website's share image. Yelp and Untappd
  photos are never used (their terms).
- Copy facts (`copyFacts` in `adcopy.ts`): the Yelp and Facebook ratings and
  counts join the Google ones as numbers the ads may quote; a "proof line"
  rule in the setup file (`adsets.proof`: a rating of at least 4.5 on at
  least 50 reviews may be quoted, with the platform named) decides when a
  Meta primary text carries one.
- Engagement carousel: slide topics from the community questions; the
  caption's closing question from the most-asked one.
- Change ranking: the reputation counts and the AI-cited listings feed the
  `reviews` and `listings` changes so they rank against the ads.
- Posts, not only ads: a `posts` output beside the ad sets (caption,
  image, first comment, suggested day from the business's own posting
  cadence), rendered by `creativeRender.ts` like the carousel, stored with
  the run and shown in the workspace. Written by the same guarded writer:
  only the business's facts, no number not in the data.

Posting and ad-account hooks (the owner's to connect): Composio's
`METAADS_UPLOAD_AD_IMAGE`, `METAADS_CREATE_AD_CREATIVE`,
`METAADS_CREATE_AD_SET`, `METAADS_CREATE_AD` and the Instagram publishing
tools run only as a client's own linked account (`executeToolAs`, phase 3),
as a `publish` step that starts from an explicit approval in the workspace,
never from a phase finishing on its own. Image generation
(`GEMINI_GENERATE_IMAGE`, the fal.ai tools) is an owner's choice to make
first: a made-up picture of a business's products is a trust risk the
reports have avoided so far.

## 4. Order of work

1. (Shipped) Instagram fallback, the Facebook read, gated Pages in the ad
   libraries. Then one live run for Uncommon Path to confirm Apify and the
   Facebook field names; fix the lookups from the recorded output.
2. Reviews step (Yelp JSON-LD, Apify fallback, Untappd flag) with the
   reputation table and the combined `reviews` change.
3. Community step (Reddit public search, fallbacks) feeding the planner and
   the carousel.
4. AI visibility step (Ahrefs Brand Radar) with the "AI answers" section
   and the `listings` changes.
5. Facebook in depth inside `social_depth`; posts beside the ad sets.
6. The `publish` step, once the owner has linked the posting accounts.

Each step ships with its test against provider-shaped answers in
`src/test/api/`, a gap line, a readiness row where a new toolkit is read,
and a `STEP_LABELS` entry.

## 5. Open items seen on 2026-10-22

- Composio's consumer executor answered every tool call with "SSRF guard
  blocked request … (validated host was www.googleapis.com)", an error on
  Composio's side; phases 1 and 2 run through that endpoint, so a run queued
  while it lasts skips every Composio step. Worth a word to Composio.
- The 2026-10-22 run's `keywords` step was skipped with "no active
  connection for googleads in this project": it ran before the consumer
  account shipped (deployed 20:58 UTC, the run started 15:52 UTC). Whether
  `COMPOSIO_CONSUMER_API_KEY` is set in Vercel could not be read from this
  session (the environment listing is refused); the overview's "Check
  connections" button shows it.
- Phase 2 for Uncommon Path has not run yet: both runs predate the phases.
  "Run again" on its workspace card starts phase 1 on the new code and
  queues phase 2 on its own.

## 6. Seen on 2026-10-24: the Wildly Primal run, and what shipped for it

The first run for Wildly Primal (functional health coach, Jacksonville
Beach; audit `40b49eba…`, 2026-10-23 22:12 UTC) came back held for review
with two problems the owner saw at once:

- **No Instagram or Facebook data, and the later reads empty too.** Every
  Composio read from the social step on recorded "Composio public-data reads
  are paused because the credit balance is empty". Checked live on
  2026-10-24 through the consumer account: `SCRAPECREATORS_GET_INSTAGRAM_PROFILE`
  answers HTTP 402 "ScrapeCreators has insufficient credits for this profile
  lookup" (ScrapeCreators' own balance; its connection listing said 100
  credits at the same moment, so the plan or the lookup's price is the
  question for ScrapeCreators), `SERPAPI_GOOGLE_LIGHT_SEARCH` answers 401
  "Invalid API key", and Firecrawl answers (1,045 credits). The engine's
  credit pause matched the 402 and paused every toolkit for 30 s, so Ahrefs,
  Places and SerpApi went dark in the same steps. Shipped: the pause is per
  provider and names it (`providerBudget.ts`).
- **SERVPRO and a plumber in the nearby table.** The Maps step's nearby
  query ran on the Places label "Services" (the run started minutes before
  the first-party category rules of #153 deployed). Shipped: the business
  profile from its own pages, the relevance check on every candidate (words,
  then the model), the Maps table filtered the same way, and the reasons and
  the left-out candidates printed in the reports.

What the run makes now, with Firecrawl and SerpApi linked (the engine's
entry for 2026-10-24 in CLAUDE.md has the code): the site's pages read as
main content, the competitors chosen for what they sell, the website
optimization plan page by page, and the social media plan with its first
week of posts, ready to paste, every line held to the data.

Firecrawl shapes read on 2026-10-24 (wildlyprimal.com): `map` answers
`{ links: [{ url, title?, description? }], success }`; `scrape` answers
`{ data: { markdown, links, metadata: { title, description, og:*, statusCode,
sourceURL, creditsUsed } } }` (one credit a page); `search` answers
`{ data: { web: [{ position, title, url, description, links?, metadata? }] },
creditsUsed }` (six credits for five results with scraping on).

Next on the live side: credits at ScrapeCreators, a valid SerpApi key in the
Composio connection (the "searchapi" and "serper" toolkits were only
initiated, with no account), then Run again on the workspace card; the held
run is unchanged. Then the remaining steps in section 4 (reviews, community,
AI visibility, Facebook in depth, publishing).
