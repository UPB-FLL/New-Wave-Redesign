import type { DivisionFaq, DivisionPoint } from '../types';
import type { DivisionIconName } from '../icons/iconData';

// The Croissance page (/social-engineering/croissance). Pure data.
//
// Croissance (French for "growth") is the public name of the audit the
// division runs for prospects and clients: the groundswell skill
// (.claude/skills/groundswell) and the queue at /admin/groundswell/audits, which keep
// their internal "marketing audit" names. It runs on the Groundswell engine
// and its Currents, one per kind of public data. Keep the process here in step with
// the skill: public data only, every number sourced and dated, three reports
// in the client's brand, delivered as Google Drive links.
//
// The worked example is a real audit: Uncommon Path Brewing's, with the
// owner's permission (see auditSample). No percentages (seo.test.ts), so rates
// and ROI are left out and only counts and dollars shown.

export const AUDIT_PRODUCT_NAME = 'Croissance';
export const AUDIT_ENGINE_NAME = 'Groundswell';
export const AUDIT_CONNECTORS_NAME = 'Currents';

export interface AuditConnector {
  name: string;
  icon: DivisionIconName;
  /** Where the data comes from, in plain words. */
  source: string;
  /** What it brings back. */
  gathers: string;
}

export interface AuditReport {
  name: string;
  /** Format and length, e.g. "1 page". */
  format: string;
  audience: string;
  detail: string;
}

export interface AuditScenario {
  name: string;
  /** The scenario the reports highlight. */
  highlighted?: boolean;
  figures: readonly { label: string; value: string }[];
}

export const auditConnectors: readonly AuditConnector[] = [
  {
    name: 'Search Current',
    icon: 'metric-search',
    source: 'Google Keyword Planner and organic search data',
    gathers: 'Monthly searches in your area, top-of-page bid ranges, the keywords and pages you rank for, and your domain strength.',
  },
  {
    name: 'Maps Current',
    icon: 'map-pin',
    source: 'Google Maps and your Business Profile, as any customer sees them',
    gathers: 'Where you place for each search across your service area, ratings and reviews by platform, and listing gaps.',
  },
  {
    name: 'Social Current',
    icon: 'metric-engagement',
    source: 'Public Instagram profiles and posts',
    gathers: 'Followers, typical engagement per post, your best-performing post, and the same for each rival.',
  },
  {
    name: 'Site Current',
    icon: 'service-web',
    source: 'Your website in a real browser, PageSpeed Insights, and the Wayback Machine',
    gathers: 'The first screen on a phone, speed, tracking tags, and when the site and its offers last changed.',
  },
  {
    name: 'Ads Current',
    icon: 'metric-cost-per-lead',
    source: 'Google Ads Transparency Center and the tags on your site',
    gathers: 'Ads on record for you and each rival, and evidence of past campaigns, kept apart from “no evidence found”.',
  },
  {
    name: 'Delivery Current',
    icon: 'send',
    source: 'A Google Drive folder named for your business',
    gathers: 'The three finished reports, each a view-only link you can forward to anyone on your team.',
  },
];

export const auditReports: readonly AuditReport[] = [
  {
    name: 'Summary',
    format: '1 page',
    audience: 'For owners',
    detail: 'The verdict, the key numbers, and the plan on one page, with a link to the slide behind each finding.',
  },
  {
    name: 'Slides',
    format: '12 slides',
    audience: 'For the meeting',
    detail: 'At a glance, Google, social, website, ads, competitors, keywords, the plan, what pays back first, the ad plan, and next steps.',
  },
  {
    name: 'Full audit',
    format: '11 boards',
    audience: 'For whoever does the work',
    detail: 'Every finding with its source and date: history, rivals, keyword-to-page changes, and a 12-week plan.',
  },
];

/**
 * Uncommon Path Brewing's audit (marketing_audits a7a2482e…, run October 21,
 * 2026), shown with the owner's permission: an exception, like the Customers
 * page's apps band, to the rule against describing work for a customer. Every
 * figure is copied from that audit's PDFs (Customers/Uncommon Path Brewing in
 * Drive): the findings from its summary, the scenarios from its return board.
 * Change them only from a newer audit of the same business.
 */
export const auditSample = {
  label: 'Real audit · October 21, 2026',
  business: 'Uncommon Path Brewing',
  businessNote:
    'A craft brewery and wood-fired pizza kitchen in Fort Lauderdale, and a New Wave: Social Engineering client, shown with its permission. Public data only.',
  lever: 'Google Search ads for private events, built on the brewery’s published $1,000, $2,000, and $3,000 buyout packages',
  demand: { label: 'Searches a month for 20 event-space terms in Broward County', value: '770' },
  /** What the audit found, from its one-page summary. */
  findings: [
    { value: '4.8★', label: 'Google rating, from about 283 reviews; sixth in Maps for “brewery near Fort Lauderdale”' },
    { value: '3', label: 'Pop-ups a phone visitor clears before the page: a 21+ gate, a cookie banner, and a promo' },
    { value: '746', label: 'Of about 850 organic search visits a month come from searching the brewery’s name' },
    { value: '0 of 2', label: 'City best-of lists that name it; both name all five nearby rivals' },
  ],
  scenarios: [
    {
      name: 'Conservative',
      figures: [
        { label: 'Ad spend per month', value: '$80' },
        { label: 'Inquiries per month', value: '0.6' },
        { label: 'Revenue per month', value: '$80' },
        { label: '12-month net', value: '−$680' },
      ],
    },
    {
      name: 'Base case',
      highlighted: true,
      figures: [
        { label: 'Ad spend per month', value: '$100' },
        { label: 'Inquiries per month', value: '1.4' },
        { label: 'Revenue per month', value: '$400' },
        { label: '12-month net', value: '+$470' },
      ],
    },
    {
      name: 'Upside',
      figures: [
        { label: 'Ad spend per month', value: '$100' },
        { label: 'Inquiries per month', value: '3.2' },
        { label: 'Revenue per month', value: '$1,550' },
        { label: '12-month net', value: '+$6,160' },
      ],
    },
  ] satisfies readonly AuditScenario[],
  stopLoss:
    'Demand is small, so the audit calls this a careful test, not a growth engine. Conservative loses money, so it comes with a stop-loss: if cost per inquiry is above $130 after 60 days, pause and fix the page before spending more.',
  footnote:
    'Steady-state month after a two-month ramp; net is gross profit after food, drink, and labor, minus ad spend. Sources: Google Keyword Planner (demand), LocaliQ’s 2026 restaurant benchmarks (clicks and inquiries), the brewery’s own package prices (event value), and Restaurant365 (margins). As a current client, its only new money is ad spend.',
} as const;

export const auditContent = {
  metaTitle: 'Croissance growth audit | New Wave: Social Engineering',
  metaDescription:
    'Croissance from New Wave: Social Engineering audits your Google, social, website, ads, and rivals from public data, then delivers three reports in your brand.',
  keywords:
    'croissance, growth audit, marketing audit for small business, competitor analysis, local search audit, google ads roi estimate, social media audit, new wave it',
  navLabel: AUDIT_PRODUCT_NAME,
  kicker: `${AUDIT_PRODUCT_NAME} · powered by ${AUDIT_ENGINE_NAME}`,
  headline: 'A growth audit anyone on your team can read',
  summary: `${AUDIT_PRODUCT_NAME}, French for growth, is how New Wave: Social Engineering audits your marketing before we recommend anything, for any business in the United States. Its ${AUDIT_ENGINE_NAME} engine gathers your public data and your rivals’, models a realistic return, and hands you three reports in your own brand.`,
  engine: {
    kicker: 'The engine',
    heading: `${AUDIT_ENGINE_NAME} and its ${AUDIT_CONNECTORS_NAME}`,
    intro: `${AUDIT_ENGINE_NAME} is the engine that runs every audit. Each of its ${AUDIT_CONNECTORS_NAME} connects to one kind of public data, so every audit draws on the same sources, in the same way, with a source and date on every number.`,
  },
  process: {
    kicker: 'The process',
    heading: 'From a website to three reports',
    intro: 'You give us a website, an Instagram handle, or both, and any competitors you watch. The rest runs on its own.',
    steps: [
      {
        title: 'Queue',
        detail: 'We add your business and the competitors you name. Name another later and the audit runs again with it included.',
        icon: 'method-discover',
      },
      {
        title: 'Research',
        detail: 'The Currents gather your Google, social, website, ads, and keyword data, and the same for four to six nearby rivals.',
        icon: 'metric-search',
      },
      {
        title: 'Model',
        detail: 'Every change is costed and ranked by return: an ad plan for each angle on every platform your industry allows, plus search, website and listing changes, in three scenarios from cited benchmarks.',
        icon: 'method-prioritize',
      },
      {
        title: 'Build',
        detail: 'Three reports are built in your colors, fonts, and logo, and checked for overflow and broken links before printing.',
        icon: 'method-build',
      },
      {
        title: 'Deliver',
        detail: 'The reports land in a Google Drive folder named for your business, shared as view-only links you can forward.',
        icon: 'send',
      },
    ] satisfies DivisionPoint[],
  },
  reports: {
    kicker: 'The reports',
    heading: 'Three reports, one story, in your brand',
    intro: 'Each report tells the same story at a different depth, so the owner, the team, and whoever does the work all read the same numbers.',
  },
  sample: {
    kicker: 'A real example',
    heading: 'What the numbers look like',
    intro: 'What one client’s audit found, and the return board it modeled. Every audit shows three scenarios, highlights the base case, and names its sources under the table.',
  },
  adPlan: {
    kicker: 'The ad plan',
    heading: 'Win the searches you can own',
    intro:
      'Groundswell models every angle a business can win on every ad platform its industry allows, in a low, medium and high case, and ranks them by return. For the brewery that means private events and pizza, not “best brewery”.',
    columns: { angle: 'Angle', platform: 'Platform', cpc: 'Cost per click', clicks: 'Clicks a month', spend: 'Ad spend a month', net: '12-month net, low to high', call: 'Call' },
    calls: { fund: 'Fund', test: 'Test', skip: 'Skip' },
    /** The platform rules the funded and tested rows run under. */
    conditionsHeading: 'Platform rules',
    /** Shown when a platform has no published benchmark: nothing is guessed. */
    unmodeledHeading: 'Not modeled',
    templatesHeading: 'Ready-to-run ads',
    templatesIntro:
      'Every funded or tested row comes with ads checked against the platform’s character limits. None claims “best” without third-party proof named beside it.',
    footnote:
      'Medium case, a month at full speed; the 12-month net includes a two-month ramp. Keyword demand and bids: Google Ads Keyword Planner, Broward County, read October 21, 2026. Platform costs: LocaliQ 2026 benchmarks, named per row in the full audit.',
  },
  changes: {
    kicker: 'Every change, ranked',
    heading: 'What pays back first',
    intro:
      'Ads are one kind of change. Every change the audit finds (search pages, the website, the Google profile, reviews, listings) is costed in team hours and spend, modeled on published figures where they exist, and ranked by what it returns. A change with no published figure is still listed, with its reason, after the ones that are modeled.',
    columns: { rank: '#', change: 'Change', area: 'Area', hours: 'Team hours, first year', net: '12-month net, low to high', back: 'Back per $1, medium case' },
    areas: { ads: 'Ads', seo: 'Search', website: 'Website', google: 'Google profile', reviews: 'Reviews', listings: 'Listings', social: 'Social', email: 'Email' },
    notModeled: 'Not modeled',
    todayHeading: 'Today',
    planHeading: 'With the plan',
    labels: {
      adSpend: 'Ad spend a month',
      addedSpend: 'Added ad spend a month',
      hours: 'Team hours, first year',
      customers: 'New customers a month, medium case',
      net: '12-month net, low to high',
      medium: 'medium case',
    },
    footnote:
      'The plan takes every modeled change that pays back in the medium case. Team time is costed at New Wave’s hourly cost; the management fee replaces what the business already pays, so it is not in these numbers.',
  },
  growth: {
    kicker: 'Built to grow',
    heading: 'An audit that grows with you',
    intro: 'The first audit is a baseline, not a one-off. It is built to be rerun, shared, and handed on as your business and your team grow.',
    groups: [
      {
        title: 'As your business grows',
        items: [
          'Rerun the audit any time for a fresh read on where you stand.',
          'Add a competitor as one appears and the audit runs again with it included.',
          'After 90 days your own tracked calls and jobs replace the estimates.',
          'The 12-week plan becomes the roadmap for what we do next.',
        ],
      },
      {
        title: 'As your team grows',
        items: [
          'Every report is a link: forward it to a partner, a manager, or a new hire.',
          'The summary fits one page, so a busy owner reads it in minutes.',
          'The full audit gives an in-house marketer or another agency a complete brief.',
          'Every report carries your brand, so it reads as yours when you share it.',
        ],
      },
    ],
  },
  /** Ground rules, shown as a checklist beside the engine. */
  rules: [
    'Public data only: no logins, no sign-ups, and no one contacts your business or customers.',
    'Every number carries its source and date. Anything unknown is marked unknown, never guessed.',
    'Ranges, not promises: three scenarios, including the one that loses money.',
    'Reports link only to their own Google Drive files.',
  ],
  faqs: [
    {
      question: 'What do you need from us to start an audit?',
      answer: 'A website, an Instagram handle, or both, plus any competitors you’d like compared. No logins or account access are needed.',
    },
    {
      question: 'Where does the data come from?',
      answer:
        'Only public sources: Google Search and Maps, Google Keyword Planner, your public Instagram, your website, PageSpeed Insights, the Wayback Machine, and the Google Ads Transparency Center. Each number in the reports names its source and date.',
    },
    {
      question: 'How is the return worked out?',
      answer:
        'From the searches in your area, published ad benchmarks for your industry on each platform it can use, your prices or your competitors’, industry margins, and the team time each change takes. It is shown as three scenarios, and after 90 days your own tracked results replace the estimates.',
    },
    {
      question: 'Who can see the reports?',
      answer: 'Anyone you send the links to. The files sit in a Google Drive folder named for your business and are shared view-only.',
    },
    {
      question: 'Can we run it again later?',
      answer: 'Yes. Rerun it for a fresh read on where you stand, or add a competitor and it runs again with that business included.',
    },
  ] satisfies DivisionFaq[],
  cta: {
    heading: 'See where your marketing stands',
    body: 'Book a discovery call and we’ll run your audit before we recommend anything.',
  },
} as const;
