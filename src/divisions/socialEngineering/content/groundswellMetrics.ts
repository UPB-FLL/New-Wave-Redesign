import type { DivisionIconName } from '../icons/iconData';
import type { GroundswellMetricSlug } from '../site';
import { AUDIT_PRODUCT_NAME } from './groundswell';

// The metrics GroundSwell actually gathers, grouped the way the reports group
// them, each with where it comes from and why it matters. Every metric here
// is one the engine reads or models today (api/_lib/groundswell): keep this
// file in step with the Currents and the two plans, and never list a figure
// the engine cannot pull. The main page shows each group as a card; every
// group also has its own page under /social-engineering/groundswell/<slug>.

export interface GroundswellMetric {
  name: string;
  /** What is measured, in plain words: the unit, the window, the count. */
  what: string;
  /** Where the number comes from. */
  source: string;
  /** Why a business owner should care about it. */
  why: string;
}

export interface GroundswellMetricGroup {
  slug: GroundswellMetricSlug;
  /** The group's name, as the card title and the sub page's crumb. */
  name: string;
  icon: DivisionIconName;
  /** The sub page's H1. */
  headline: string;
  /** One or two sentences under the name on the card and the sub page. */
  summary: string;
  /** The card's one-line answer to "why does this matter?". */
  matters: string;
  /** The sub page's "Why it matters" paragraph. */
  why: string;
  /** Which part of the plan the group drives. */
  feeds: string;
  metrics: readonly GroundswellMetric[];
  /** What the group does not measure, or reads with a caveat; printed, never hidden. */
  limits: readonly string[];
  /** Where the group's figures appear in the reports. */
  reports: string;
  /** What the brewery's audit found, only where the engine measures it (auditSample has the sources). */
  example?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
}

const KEYWORD_PLANNER = 'Google Ads Keyword Planner';
const AHREFS = 'Ahrefs';
const PUBLIC_SEARCH = 'A public Google search (SerpApi, SearchAPI or Serper, whichever answers)';
const PLACES = 'The Google Places API, with the logged-out Google Maps view as the fallback';
const SCRAPE = 'Public Instagram and Facebook pages (ScrapeCreators; Apify for age-gated profiles)';
const FIRECRAWL = 'Your own pages, read as text through Firecrawl';
const SITE_HTML = 'Your website’s HTML';
const LINKED = 'The client’s own account, linked with its sign-in from the partner workspace';
const MODELLED = 'Modelled from the figures above and published benchmarks (LocaliQ 2026 by industry), with every assumption named';

export const groundswellMetricGroups: readonly GroundswellMetricGroup[] = [
  {
    slug: 'search',
    name: 'Search demand and visibility',
    icon: 'metric-search',
    headline: 'What people search for, and whether they find you',
    summary:
      'How many people in your area search for what you sell each month, what a click costs, where your site shows up for those searches, and who takes the clicks today.',
    matters: 'Demand sets the ceiling on what ads and search pages can bring; your positions decide how much of it you get.',
    why:
      'Search is the one channel where the customer states the need in their own words. The number of searches sets the ceiling on what ads and search pages can bring; your positions decide how much of that you get today; the gap between the two is what the plan is built to close. Without the demand figure, a budget is a guess.',
    feeds: 'Every search row of the ad plan, the return board’s three scenarios, and the pages the website plan proposes to add.',
    metrics: [
      {
        name: 'Monthly searches by keyword',
        what: 'Average monthly searches for up to 60 terms built from your category, your services and your area.',
        source: KEYWORD_PLANNER,
        why: 'A plan built on terms nobody searches cannot pay back. This is the demand every estimate starts from.',
      },
      {
        name: 'Top-of-page bid range',
        what: 'The low and high bid Google reports for each term.',
        source: KEYWORD_PLANNER,
        why: 'With the searches, it prices a search campaign before a dollar is spent.',
      },
      {
        name: 'Keyword competition',
        what: 'Low, medium or high, per term.',
        source: KEYWORD_PLANNER,
        why: 'A crowded term costs more and converts no better; the ad plan weighs it when it picks angles.',
      },
      {
        name: 'Organic keywords and traffic',
        what: 'How many terms your site ranks for, the visits they bring a month, and what that traffic would cost as ads.',
        source: AHREFS,
        why: 'Shows whether search already works for you, and how much of it is people typing your name rather than what you sell.',
      },
      {
        name: 'Domain Rating',
        what: 'Ahrefs’ 0 to 100 measure of the sites linking to yours.',
        source: AHREFS,
        why: 'Sets how hard new pages will be to rank, so the plan knows whether to lead with content or with ads.',
      },
      {
        name: 'Your strongest terms and their positions',
        what: 'Your 30 strongest terms, each with its position, its searches and the page that ranks.',
        source: AHREFS,
        why: 'Positions 4 to 20 are the closest wins: the rankings ad set and the website plan start there.',
      },
      {
        name: 'Who ranks for your searches',
        what: 'The organic top 20 and the local pack for the searches that describe your business.',
        source: PUBLIC_SEARCH,
        why: 'Names the businesses taking the clicks you want. It is one of the ways the audit finds the competitors that compete with you.',
      },
      {
        name: 'Related searches and the questions people ask',
        what: 'Google’s related searches and “People also ask” for your searches.',
        source: PUBLIC_SEARCH,
        why: 'The questions customers already ask become the pages and the posts the two plans propose.',
      },
    ],
    limits: [
      'Keyword Planner reports averages and ranges, not exact counts; the reports say so beside each figure.',
      'A term the Planner did not return is never priced.',
    ],
    reports: 'The keywords slide, the search section of the full audit, and every search row of the ad plan.',
    example:
      'Keyword Planner put demand at 770 searches a month across 20 event-space terms, and about 746 of the brewery’s 850 organic visits a month came from people searching its name.',
    metaTitle: 'Search demand and visibility · GroundSwell | New Wave',
    metaDescription:
      'The search metrics GroundSwell pulls: monthly searches and bids, organic traffic and rankings, and who ranks for your searches, each with why it matters.',
    keywords: 'keyword demand, monthly searches, keyword planner, organic traffic, domain rating, local pack, search audit, groundswell',
  },
  {
    slug: 'google-listing',
    name: 'Google listing and local market',
    icon: 'map-pin',
    headline: 'How you look on Google Maps, and who sits beside you',
    summary:
      'Your Business Profile as a customer sees it: rating, review count, category, hours and website, plus the listings in your category nearby.',
    matters: 'The listing is the first impression and often the only one: rating and reviews decide who calls.',
    why:
      'For a local business the Google listing is the first impression and often the only one a customer gets before they call, book or drive past. The rating and the review count carry most of that decision; a missing website link or wrong hours lose the rest. The listings in your category nearby set the bar you are measured against.',
    feeds: 'The reviews and Google profile changes in the ranking of what pays back first, and the local picks in the competitor benchmark.',
    metrics: [
      {
        name: 'Rating and review count',
        what: 'Your Google rating and how many reviews it rests on.',
        source: PLACES,
        why: 'A customer comparing two listings rarely reads past these two numbers.',
      },
      {
        name: 'Listing completeness',
        what: 'Category, address, phone, website and opening hours, as the listing shows them.',
        source: PLACES,
        why: 'A missing website link or wrong hours turn an interested customer away at the last step.',
      },
      {
        name: 'Nearby listings in your category',
        what: 'Up to eight listings whose category matches yours, each with its rating and review count.',
        source: PLACES,
        why: 'Sets the local bar: the same rating reads differently beside three higher ones than beside three lower.',
      },
      {
        name: 'Rating and reviews for each competitor',
        what: 'The same two figures for every competitor the audit keeps.',
        source: PLACES,
        why: 'The review gap is often the cheapest one to close, and the ranking says what it is worth.',
      },
    ],
    limits: [
      'Your position in the Maps results is not measured: it changes with where the searcher stands, so it is never printed as a rank.',
      'A listing that does not share your category wording is left out, so a plumber never appears beside a health coach.',
    ],
    reports: 'The Google slide, the Google listing section of the full audit, and the competitor scorecard.',
    example: 'A 4.8★ Google rating, from about 283 reviews.',
    metaTitle: 'Google listing and local market · GroundSwell | New Wave',
    metaDescription:
      'The Google listing metrics GroundSwell pulls: rating, review count, listing completeness and the listings in your category nearby, and why each matters.',
    keywords: 'google business profile audit, google rating, review count, local competitors, google maps listing, groundswell',
  },
  {
    slug: 'competitors',
    name: 'Competitors that compete',
    icon: 'journey-discover',
    headline: 'Benchmarked against businesses that actually compete with you',
    summary:
      'Who the audit compares you with, how it decides they compete, who it left out and why, and the scorecard that puts the first two side by side with you.',
    matters: 'A comparison with the wrong businesses finds the wrong gaps; every pick is checked against what you sell.',
    why:
      'A plumber beside a health coach tells you nothing about either. Every comparison in the audit is against businesses that sell what you sell, so the gaps it finds are gaps a customer would see. Where a competitor is ahead, the scorecard says by how much and what they did; where you are ahead, the plan protects it.',
    feeds: 'The competitor plan: the benchmark scorecard, the do-not-copy list for your industry, and the levers the plan funds.',
    metrics: [
      {
        name: 'Your business profile',
        what: 'Your category, your offer, your services, who you serve and where, in words taken from your own pages.',
        source: FIRECRAWL,
        why: 'Everything else is measured against this profile. A category or service not on your site is dropped, so nothing is invented.',
      },
      {
        name: 'Candidates found',
        what: 'Businesses from the listings nearby, from the Google results for your own searches, and from a web search of the same.',
        source: `${PLACES}; ${PUBLIC_SEARCH}`,
        why: 'Three independent ways of finding rivals catch the ones a single source misses.',
      },
      {
        name: 'Relevance check and reason',
        what: 'Each candidate must share your category wording and pass a judgement that gives its reason; directories such as Yelp never pass.',
        source: 'GroundSwell’s own check, held to your profile’s words',
        why: 'So the audit can say, for each competitor, why it is one.',
      },
      {
        name: 'Left out, with reasons',
        what: 'Every candidate dropped, named with why.',
        source: 'GroundSwell’s own check',
        why: 'You see who was considered, so a rival that was missed can be added and the audit run again.',
      },
      {
        name: 'Engagement benchmark',
        what: 'Median likes and comments, engagement rate, posts and reels a week, and the best post, for you and the first two competitors.',
        source: SCRAPE,
        why: 'Shows what the audience in your category responds to, not what you assume it does.',
      },
      {
        name: 'Pricing ladder',
        what: 'Whether prices are published, payment plans, refunds, a free consultation or discovery call, and lead magnets, per business.',
        source: FIRECRAWL,
        why: 'A competitor who publishes prices when you do not wins the comparison shopper before you hear from them.',
      },
      {
        name: 'Authority',
        what: 'Live referring domains, press domains, top pages, content pages and the newest one’s date, and the channels each business owns.',
        source: `${AHREFS}; ${FIRECRAWL}`,
        why: 'Authority is what makes new pages rank; the gap says whether content or links come first.',
      },
    ],
    limits: [
      'The first two competitors are benchmarked in depth; the rest are named with their reason.',
      'A competitor’s images are never kept; text only.',
    ],
    reports: 'The competitors slide, “Why it competes” and “Left out as not competing” in the full audit, and the competitor benchmark PDF.',
    metaTitle: 'Competitors that compete · GroundSwell | New Wave',
    metaDescription:
      'How GroundSwell picks competitors that actually compete with a business, who it leaves out and why, and the scorecard that benchmarks the first two.',
    keywords: 'competitor analysis, competitor benchmark, relevant competitors, pricing comparison, authority comparison, groundswell',
  },
  {
    slug: 'social',
    name: 'Social reach and engagement',
    icon: 'metric-engagement',
    headline: 'What your Instagram and Facebook actually do',
    summary:
      'Followers, how often you post, what a typical post earns in likes and comments, your best post, the words and hashtags you use, and the same for each competitor.',
    matters: 'Followers are a vanity number; engagement per post and cadence are what a social plan is built on.',
    why:
      'A follower count says little on its own. What a typical post earns, how often you post, and what your best post did are what a social plan can be built on, and the same read of each competitor shows what the audience in your category responds to. The week of posts in the social media plan is written from these figures and your own captions.',
    feeds: 'The social media plan and its first week of posts, and the engagement ad set that boosts your best posts.',
    metrics: [
      {
        name: 'Followers, following and post count',
        what: 'The three profile figures, for you and each competitor.',
        source: SCRAPE,
        why: 'The size of the audience the plan starts with; on its own it is the least useful number here.',
      },
      {
        name: 'Posts in the last 30 days',
        what: 'How many posts went up in the last month, and when the last one was.',
        source: SCRAPE,
        why: 'Cadence is the first thing a plan changes, and the easiest to compare with a competitor.',
      },
      {
        name: 'Average likes and comments per recent post',
        what: 'The averages over your recent posts, and the medians in the benchmark.',
        source: SCRAPE,
        why: 'What a post actually earns; the engagement rate the benchmark reports is built from it.',
      },
      {
        name: 'Your best post',
        what: 'The recent post with the most engagement, and what it was.',
        source: SCRAPE,
        why: 'The engagement ad set boosts it, and the week of posts borrows what worked.',
      },
      {
        name: 'Bio, links, captions and hashtags',
        what: 'Your biography and its links, your recent captions and the hashtags you and your competitors use.',
        source: SCRAPE,
        why: 'The captions in the plan are written in your voice, from your own words, never a competitor’s.',
      },
      {
        name: 'Facebook Page figures',
        what: 'Followers, likes, category, intro, rating and review count, whether the Page runs ads, and three recent posts.',
        source: SCRAPE,
        why: 'Many local customers still find a business on Facebook first; the Page’s photos also feed the ad images.',
      },
    ],
    limits: [
      'A private profile is never read.',
      'An age-gated profile (an alcohol brand, say) is read through the fallback or the client’s own linked account; the reports say which.',
      'Reach and impressions are not public; they appear only when a client links the account.',
    ],
    reports: 'The social slide, the Instagram and Facebook section of the full audit, and the engagement tables of the benchmark.',
    metaTitle: 'Social reach and engagement · GroundSwell | New Wave',
    metaDescription:
      'The Instagram and Facebook metrics GroundSwell pulls from public profiles: followers, cadence, likes and comments per post, best post, and why each matters.',
    keywords: 'instagram audit, engagement rate, posting cadence, best post, facebook page audit, social media metrics, groundswell',
  },
  {
    slug: 'website',
    name: 'Website and pages',
    icon: 'service-web',
    headline: 'Whether your site says what you sell, and whether it can be measured',
    summary:
      'What each of your pages says and asks the visitor to do, the tracking and booking paths in place, and the technical checks that decide whether Google can read it.',
    matters: 'Every ad and every search ends on your site; a page that does not say what the ad promised leaks spend unmeasured.',
    why:
      'Every ad and every search ends on your website. If the page does not say what the ad promised, carries no way to book, or has no tracking, the spend leaks out and nobody can tell. The website optimization plan is written page by page from this read, so every change it proposes names the page it read and what was missing.',
    feeds: 'The website optimization plan: page-by-page changes with their priority, reason and evidence, and the pages to add for measured searches.',
    metrics: [
      {
        name: 'Title, description and headings per page',
        what: 'The title, the meta description, the H1 and the headings of each page read.',
        source: `${SITE_HTML}; ${FIRECRAWL}`,
        why: 'These are what Google shows and what a visitor skims; a page that does not name the service cannot rank for it.',
      },
      {
        name: 'Word count, calls to action and prices seen',
        what: 'How much each page says, what it asks the visitor to do, and any price it shows.',
        source: FIRECRAWL,
        why: 'A thin page with no next step is where paid traffic goes to die.',
      },
      {
        name: 'Tracking tags',
        what: 'Whether Google Analytics 4, Tag Manager, the Google Ads tag, the Meta pixel and the TikTok pixel are present.',
        source: SITE_HTML,
        why: 'Without them no campaign can be measured, so the plan puts tracking before spend.',
      },
      {
        name: 'Booking and contact paths',
        what: 'Booking links, phone numbers and social links found on the site.',
        source: SITE_HTML,
        why: 'The ad plan’s leads have to land somewhere; this is where.',
      },
      {
        name: 'Technical checks',
        what: 'HTTPS, the viewport tag, the canonical, robots rules, structured data types, how many H1s the page has, images without alt text, and whether the page is an empty app shell.',
        source: SITE_HTML,
        why: 'Each one is a reason Google may not index or rank a page; the plan lists them with their severity.',
      },
      {
        name: 'Pages read',
        what: 'The site’s pages found, the ones that say what it sells (home, about, services, pricing, FAQ, contact, blog), and each competitor’s home page.',
        source: FIRECRAWL,
        why: 'So the plan can say “change this page” rather than “improve the website”.',
      },
    ],
    limits: [
      'Page speed is not measured: the audit reads the page’s words and tags, not its load time.',
      'Legal and account pages are never read.',
    ],
    reports: 'The website slide, “Pages read” in the full audit, and the website optimization plan.',
    metaTitle: 'Website and pages metrics · GroundSwell | New Wave',
    metaDescription:
      'The website metrics GroundSwell pulls: titles, headings and calls to action per page, tracking tags, booking paths and technical checks, and why each matters.',
    keywords: 'website audit, tracking tags, ga4 tag, meta pixel, technical seo checks, website optimization plan, groundswell',
  },
  {
    slug: 'ads',
    name: 'Advertising on record and what it should cost',
    icon: 'metric-cost-per-lead',
    headline: 'Who is advertising, with what, and what it should cost you',
    summary:
      'The ads on record for you and each competitor on Google and Meta, the tags on your site, and from there the cost per click, the cost per lead and the return the plan expects at three budgets.',
    matters: 'A competitor that advertises says the market pays; a verified “no ads” says the first mover wins. Neither is guessed.',
    why:
      'Knowing a competitor runs ads tells you the market pays for attention; knowing nobody does tells you the first mover wins. Neither is guessed: a verified “no ads” is kept apart from “could not check”. From the ads on record, the searches and the published costs for your industry, the plan prices every angle on every platform your industry allows, in a low, medium and high case, with a stop-loss on each.',
    feeds: 'The ad plan, the ready-to-paste ad copy, and the three ad sets (leads, engagement, rankings) at low, medium and high budgets.',
    metrics: [
      {
        name: 'Google ads on record',
        what: 'How many ads each domain has in Google’s Ads Transparency Center, and whether any ran recently.',
        source: 'Google Ads Transparency Center, read by domain through ScrapeCreators',
        why: 'The clearest public sign that a competitor buys search traffic for what you sell.',
      },
      {
        name: 'Meta ads on record',
        what: 'Whether each Page is running ads, how many are inactive, and each ad’s call to action and landing page.',
        source: 'The Meta Ad Library',
        why: 'Shows the offers and landing pages a competitor is paying to show; the plan avoids copying them and names what to do instead.',
      },
      {
        name: 'Paid pages',
        what: 'The pages a site is buying traffic to, and the terms it buys.',
        source: AHREFS,
        why: 'Tells you which of a competitor’s services it pays to sell: usually its most profitable.',
      },
      {
        name: 'Ad tags on your site',
        what: 'Whether the Google Ads tag, the Meta pixel and the TikTok pixel are installed.',
        source: SITE_HTML,
        why: 'A campaign without its tag cannot report a lead; the plan fixes that first.',
      },
      {
        name: 'Cost per click and cost per lead, by platform',
        what: 'For each angle and platform: the clicks a month, the cost per click, the leads and the 12-month net in a low, medium and high case.',
        source: MODELLED,
        why: 'Puts a price on every option before a dollar is spent, and ranks them by return.',
      },
      {
        name: 'Fund, test or skip, with a stop-loss',
        what: 'The call on each row, its reason, and the cost per inquiry after which to pause.',
        source: MODELLED,
        why: 'So the plan says what to do, what it should cost, and when to stop.',
      },
    ],
    limits: [
      'Spend is never estimated from an ad library; no library publishes it.',
      'A platform with no published benchmark for your industry is listed, never priced.',
      'No ad claims “best” or “#1” without third-party proof named beside it.',
    ],
    reports: 'The ads slide, the ad plan and ad copy sections of the full audit, the ad sets PDF, and the Meta and Google Ads import files.',
    example: 'Eight Google ads on record for the brewery in the Transparency Center, with no spend made public.',
    metaTitle: 'Advertising on record and cost · GroundSwell | New Wave',
    metaDescription:
      'The advertising metrics GroundSwell pulls and models: Google and Meta ads on record, ad tags, and the cost per click, cost per lead and return at three budgets.',
    keywords: 'ads transparency center, meta ad library, competitor ads, cost per click estimate, cost per lead, ad plan, groundswell',
  },
  {
    slug: 'your-accounts',
    name: 'Your own accounts',
    icon: 'pillar-integrations',
    headline: 'When you connect your accounts, your figures replace the estimates',
    summary:
      'What the integrated plan reads once a client links Google Analytics 4, Search Console, Google Ads, Instagram and Meta Ads, and how those figures take over from the public estimates.',
    matters: 'Public data estimates; your accounts measure. Once linked, the plan is held to what the accounts actually did.',
    why:
      'Public data can only estimate; your own accounts measure. Once a client links them, every public estimate that overlaps a linked figure gives way to it, and from 50 clicks and 5 leads your own cost per click and cost per lead replace the published ones. The read is done with the client’s own sign-in, it is read-only, and it can be revoked at any time.',
    feeds: 'The integrated plan: the same ad plan and ad sets, re-run on the account’s own costs and conversion counts.',
    metrics: [
      {
        name: 'Google Analytics 4',
        what: 'Sessions, users, new users, conversions and engagement rate over 30 days, by channel and by landing page.',
        source: LINKED,
        why: 'Shows which channels and pages already bring customers, so the plan builds on what works.',
      },
      {
        name: 'Google Search Console',
        what: 'Clicks, impressions, click-through rate and average position over 28 days, with the top queries and pages.',
        source: LINKED,
        why: 'The exact searches that bring you traffic, from Google itself, rather than an estimate.',
      },
      {
        name: 'Google Ads',
        what: 'Impressions, clicks, cost, conversions, conversion value and cost per conversion over 30 days, by campaign and search term.',
        source: LINKED,
        why: 'Your real cost per click and cost per lead; once there are enough, they replace the published ones.',
      },
      {
        name: 'Instagram insights',
        what: 'Reach, accounts engaged, interactions, profile views and website clicks over 30 days, with your posts and reels.',
        source: LINKED,
        why: 'Reach and profile views are never public; they show whether posting turns into visits.',
      },
      {
        name: 'Meta Ads',
        what: 'Impressions, reach, clicks, spend, cost per click, cost per thousand, click-through rate, leads and messages, by campaign.',
        source: LINKED,
        why: 'What Meta spend actually returns, in the account’s own counts.',
      },
    ],
    limits: [
      'A prospect’s audit reads none of this; it runs on public data only.',
      'Nothing linked ever stops a run: a service that fails is named as not read, and the public figures stand in.',
    ],
    reports: '“Your accounts” in the full audit, the linked line on every cover, and the integrated plan PDF.',
    metaTitle: 'Your own accounts · GroundSwell metrics | New Wave',
    metaDescription:
      'What GroundSwell reads once a client links Google Analytics 4, Search Console, Google Ads, Instagram and Meta Ads, and how those figures replace the estimates.',
    keywords: 'ga4 metrics, search console metrics, google ads cost per conversion, instagram insights, meta ads metrics, integrated plan, groundswell',
  },
];

export function findGroundswellMetricGroup(slug: string | undefined): GroundswellMetricGroup | undefined {
  return groundswellMetricGroups.find((group) => group.slug === slug);
}

/** The main page's metrics section and the labels every metric page shares. */
export const groundswellMetricsContent = {
  kicker: 'What it measures',
  heading: 'Metrics you can actually pull, and why each one matters',
  intro: `Every figure in a ${AUDIT_PRODUCT_NAME} report is one the engine read or modelled, with its source and date beside it. These are the groups it works in. Open one for every metric in it, where it comes from, what it feeds, and what it does not measure.`,
  /** The card's link to the group's page, with the metric count. */
  cardLink: (count: number) => `All ${count} metrics`,
  mattersLabel: 'Why it matters',
  /** Sub page labels. */
  page: {
    kicker: `${AUDIT_PRODUCT_NAME} · What it measures`,
    whyKicker: 'Why it matters',
    whyHeading: 'Why these numbers',
    feedsLabel: 'What it feeds',
    metricsKicker: 'The metrics',
    metricsHeading: 'What is measured, and where it comes from',
    whatLabel: 'What is measured',
    sourceLabel: 'Where it comes from',
    whyLabel: 'Why it matters',
    limitsHeading: 'What it does not measure',
    reportsHeading: 'Where it appears',
    exampleLabel: 'From the brewery’s audit',
    othersLabel: 'Other metrics',
    back: `Back to ${AUDIT_PRODUCT_NAME}`,
    cta: {
      heading: 'See these numbers for your business',
      body: 'Book a discovery call and the audit runs before we recommend anything.',
    },
  },
} as const;
