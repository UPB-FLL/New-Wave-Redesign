import type { DivisionFaq, DivisionPoint } from '../types';
import type { DivisionIconName } from '../icons/iconData';

// The Marketing audit page (/social-engineering/marketing-audit). Pure data.
//
// Describes the audit the division runs for prospects and clients (the
// marketing-audit skill in .claude/skills/marketing-audit and the queue at
// /admin/audits) under its public names: the Groundswell engine and its
// Currents, one per kind of public data. Keep the process here in step with
// the skill: public data only, every number sourced and dated, three reports
// in the client's brand, delivered as Google Drive links.
//
// The worked example is the skill's own made-up business (examples/sample,
// "Harbor Auto Care"), with the figures roi_model.py prints for it, rounded to
// the nearest $10 as the reports do. It is labelled as made up wherever it
// appears; never replace it with a real client's numbers. No percentages
// (seo.test.ts), so rates are left out and only counts and dollars shown.

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
    format: '11 slides',
    audience: 'For the meeting',
    detail: 'At a glance, Google, social, website, ads, competitors, keywords, the plan, the return, and next steps.',
  },
  {
    name: 'Full audit',
    format: '10 boards',
    audience: 'For whoever does the work',
    detail: 'Every finding with its source and date: history, rivals, keyword-to-page changes, and a 12-week plan.',
  },
];

/** The skill's made-up sample business, as roi_model.py models it (rounded to $10). */
export const auditSample = {
  label: 'Sample audit · made-up business',
  business: 'Harbor Auto Care',
  businessNote: 'An invented auto repair shop that the engine’s own test run uses. It is not a client, and these are not results.',
  lever: 'Google Search ads: a call-first campaign on core repair keywords near the shop',
  demand: { label: 'Searches per month in the campaign area', value: '1,800' },
  scenarios: [
    {
      name: 'Conservative',
      figures: [
        { label: 'Ad spend per month', value: '$300' },
        { label: 'Leads per month', value: '5' },
        { label: 'Cost per lead', value: '$60' },
        { label: '12-month net', value: '−$820' },
      ],
    },
    {
      name: 'Base case',
      highlighted: true,
      figures: [
        { label: 'Ad spend per month', value: '$420' },
        { label: 'Leads per month', value: '10' },
        { label: 'Cost per lead', value: '$40' },
        { label: '12-month net', value: '$7,820' },
      ],
    },
    {
      name: 'Upside',
      figures: [
        { label: 'Ad spend per month', value: '$480' },
        { label: 'Leads per month', value: '16' },
        { label: 'Cost per lead', value: '$30' },
        { label: '12-month net', value: '$31,600' },
      ],
    },
  ] satisfies readonly AuditScenario[],
  stopLoss: 'Conservative loses money, so the plan says so and pairs it with a stop-loss: if cost per lead stays above a set ceiling after 60 days, pull back.',
  footnote:
    'Steady-state month after a two-month ramp. Net is gross profit minus ad spend. Our management fee replaces the one you already pay, so ad spend is the only new money.',
} as const;

export const auditContent = {
  metaTitle: 'Marketing audit engine | New Wave: Social Engineering',
  metaDescription:
    'How New Wave: Social Engineering audits a business’s Google, social, website, ads, and competitors from public data, then delivers three reports in your brand.',
  keywords:
    'marketing audit, local marketing audit fort lauderdale, competitor analysis south florida, google ads roi estimate, social media audit, new wave it',
  navLabel: 'Marketing audit',
  kicker: `The ${AUDIT_ENGINE_NAME} audit engine`,
  headline: 'A marketing audit anyone on your team can read',
  summary: `New Wave: Social Engineering audits your marketing before we recommend anything. Our ${AUDIT_ENGINE_NAME} engine gathers your public data and your rivals’, models a realistic return, and hands you three reports in your own brand.`,
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
        detail: 'One lever with a measurable return, Google Search ads, is modeled in three scenarios from cited benchmarks.',
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
    kicker: 'Example data',
    heading: 'What the numbers look like',
    intro: 'This is the return board from a sample audit. Every audit shows three scenarios, highlights the base case, and names its sources under the table.',
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
        'From the searches in your area, published search-ad benchmarks for your industry, your prices or your competitors’, and industry margins. It is shown as three scenarios, and after 90 days your own tracked results replace the estimates.',
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
