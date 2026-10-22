import type { DivisionHubContent } from '../types';

// The division hub (/social-engineering). Pure data.
//
// Positioning (2026-10-21): New Wave: Social Engineering is the growth
// division of New Wave IT, a national, remote-first team that helps small
// businesses grow sales through data, integrations, and smart advertising. No
// copy here names a home market as the division's territory; local search
// work is described market by market, wherever the client is.

export const hubContent: DivisionHubContent = {
  metaTitle: 'Small business growth marketing | New Wave: Social Engineering',
  metaDescription:
    'New Wave: Social Engineering helps small businesses nationwide grow sales through data, integrations, and smart advertising. Book a discovery call.',
  keywords:
    'small business growth marketing, growth marketing agency for small business, data-driven marketing for small business, marketing integrations crm booking, paid search and social ads for small business, marketing analytics and attribution for small business, marketing agency united states remote',
  kicker: 'Growth marketing for small businesses, nationwide',
  headline: 'Growth decisions made on data, not guesswork.',
  summary:
    'New Wave: Social Engineering is the growth division of New Wave IT. We help small businesses across the United States grow sales with three things working together: data you can trust, integrations that connect the tools you already use, and smart advertising that answers for the sales it brings in, not the clicks.',
  intro: {
    heading: 'Most small businesses are one connected system away from steady growth',
    paragraphs: [
      'You have a product people want and customers who come back. Online, though, the business runs on a website, a few listings, social accounts, an ad account someone set up once, a booking or point-of-sale system, and an inbox. None of them talk to each other, so no one can say which dollar brought in which sale.',
      'Large brands solved this years ago with analytics teams, integration engineers, and media buyers who meet every week. A small business usually gets a freelancer for each piece and a monthly report full of impressions.',
      'We bring the same discipline at a size that fits: one team that measures, connects, and advertises, and is accountable for sales rather than activity.',
    ],
  },
  pillars: [
    {
      key: 'data',
      title: 'Data',
      icon: 'pillar-data',
      summary: 'Know what is working before you spend another dollar.',
      items: [
        'GroundSwell, our audit: your market, your rivals, and real demand, from public data',
        'Analytics and conversion tracking, tested before anyone relies on them',
        'Attribution from first click to sale, by channel and campaign',
        'One monthly report against revenue, ending with the next moves',
      ],
    },
    {
      key: 'integrations',
      title: 'Integrations',
      icon: 'pillar-integrations',
      summary: 'Your tools, connected into one path from first visit to sale.',
      items: [
        'Website, booking, and checkout connected to your CRM',
        'Email and SMS lists built from real customers, with consent',
        'Lead routing that puts every inquiry in front of a person',
        'Point-of-sale and revenue data fed back into the reporting',
      ],
    },
    {
      key: 'advertising',
      title: 'Smart advertising',
      icon: 'pillar-advertising',
      summary: 'Campaigns that bid on data and answer for cost per sale.',
      items: [
        'Paid search on the terms people type when they are ready to buy',
        'Paid social and retargeting with creative that is tested, not guessed',
        'Lifecycle email and SMS that turn a first purchase into a second',
        'Budget moved every week toward the channels that bring in sales',
      ],
    },
  ],
  method: [
    {
      title: 'Audit',
      icon: 'method-discover',
      detail:
        'We run GroundSwell, our audit, on your business and your rivals from public data, then review your tracking, tools, and ad accounts. You see where the demand is, what it costs to reach, and what breaks between a click and a sale.',
    },
    {
      title: 'Plan',
      icon: 'method-prioritize',
      detail:
        'We rank the opportunities by expected return and set a 90-day plan with targets, a budget, and the measures we will report against. Nothing is built before it has been prioritized.',
    },
    {
      title: 'Build and run',
      icon: 'method-build',
      detail:
        'We put tracking and integrations in place first, then launch the campaigns and manage them week by week. Every month you get one report against sales and an updated plan.',
    },
  ],
  dataWeGather: [
    {
      title: 'Market and demand',
      detail:
        'How many people search for what you sell in the places you serve, what those clicks cost, and how your rivals show up for the same searches. All of it from public data, with a source and date on every number.',
    },
    {
      title: 'Touchpoint audit',
      detail:
        'Every public touchpoint: the website, listings, social accounts, booking and checkout, ads on record, and the paths phone and email inquiries take. The result is a clear picture of what customers see today and where it breaks down.',
    },
    {
      title: 'Customer journey',
      detail:
        'How people discover the business, weigh it up, buy or book, experience it, come back, and refer others. Each stage shows where people drop off and what would move them forward.',
    },
    {
      title: 'Tracking and tools',
      detail:
        'Which systems hold customer and sales data today, what is connected, what is tracked, and what cannot be measured yet. Integrations and attribution start from this map.',
    },
    {
      title: 'Revenue paths',
      detail:
        'Every way the business earns and how each one is reached online. The aim is one digital destination with several revenue paths, not a separate front door for each.',
    },
  ],
  journey: ['Discover', 'Consider', 'Buy or book', 'Experience', 'Return', 'Refer'],
  roadmap: [
    {
      phase: 'Days 1–30',
      title: 'Foundation',
      icon: 'phase-foundation',
      items: ['GroundSwell audit', 'Tracking and analytics', 'CRM and booking integrations', 'Website conversion fixes', 'Google Business Profile', 'Offers and landing pages'],
    },
    {
      phase: 'Days 31–60',
      title: 'Demand',
      icon: 'phase-demand',
      items: ['Paid search live', 'Paid social and retargeting', 'Creative testing', 'Lead routing and follow-up', 'Email and SMS capture', 'First monthly report'],
    },
    {
      phase: 'Days 61–90 and on',
      title: 'Scale',
      icon: 'phase-engine',
      items: [
        'Budget shifted to what sells',
        'Lifecycle email and SMS',
        'New channels and markets',
        'Promotions and partnerships',
        'Quarterly plan reviews',
        'Monthly reporting',
      ],
    },
  ],
  cadence: [
    {
      title: 'Weekly',
      detail: 'Campaigns, budget, and creative reviewed against cost per sale; what is not working is paused.',
    },
    {
      title: 'Monthly',
      detail: 'One report against revenue: what moved, what did not, and what we are changing next.',
    },
    {
      title: 'Quarterly',
      detail: 'The plan reset: targets, channels, and budget for the next 90 days, from the data so far.',
    },
  ],
  industries: {
    heading: 'Built for small businesses, wherever they are',
    intro:
      'We work remotely with owner-led businesses across the United States: anyone whose customers find them online and buy, book, or call. Local search and Maps work is done market by market for the places each business serves.',
    items: [
      'Restaurants, breweries and venues',
      'Health, wellness and fitness',
      'Home and field services',
      'Professional services',
      'Retail and e-commerce',
      'Events, rentals and experiences',
      'Software and apps',
    ],
    note: 'Remote-first, with calls in your time zone. The team is based in Florida; the work is done wherever you are.',
  },
  metrics: [
    {
      title: 'Sales and bookings',
      icon: 'metric-bookings',
      detail: 'Purchases, bookings, calls, and form inquiries, tracked by source, so every channel answers for the revenue it produced.',
    },
    {
      title: 'Cost per sale',
      icon: 'metric-cost-per-lead',
      detail: 'What each inquiry, booking, and sale costs across paid channels, so budget goes where it earns.',
    },
    {
      title: 'Conversion rate',
      icon: 'metric-conversion',
      detail: 'How many visitors go on to buy, book, or inquire, and where the rest leave.',
    },
    {
      title: 'Search visibility',
      icon: 'metric-search',
      detail: 'How often the business shows up in Google Search and Maps for the searches that matter in the markets it serves.',
    },
    {
      title: 'Engagement that turns into customers',
      icon: 'metric-engagement',
      detail: 'Social and email activity judged by what it leads to: visits, inquiries, and sales, not likes alone.',
    },
  ],
  relationship: {
    heading: 'Part of New Wave IT, built for any small business',
    paragraphs: [
      'NW Social Engineering is a division of New Wave IT, a managed IT and cybersecurity company. We work remotely with small businesses across the United States: New Wave IT clients, businesses that have never used New Wave IT, and teams that already have an agency, a developer, or an in-house marketer we can work alongside.',
      'Being part of an IT company is why the data and integration work holds up: accounts set up in your name with the right access, tracking tested before anyone relies on it, and data that moves cleanly between your website, your tools, and the reporting.',
    ],
  },
  faqs: [
    {
      question: 'What does New Wave: Social Engineering do?',
      answer:
        'New Wave: Social Engineering is the growth division of New Wave IT. We help small businesses grow sales through data, integrations, and smart advertising: an audit of your market and your rivals, tracking and reporting you can trust, your tools connected into one path from first visit to sale, and paid search, paid social, email, and SMS campaigns judged by the sales they bring in. Social media, brand development, and website design serve the same goal.',
    },
    {
      question: 'Where do you work?',
      answer:
        'Across the United States. The team is remote-first and based in Florida, and the work, from the audit and tracking to campaigns and reporting, is done online, with calls in your time zone. Local search and Maps work is done market by market for the places you serve.',
    },
    {
      question: 'How do we get started?',
      answer:
        'With a discovery call, then GroundSwell, our audit, which uses only public data and needs no logins. From there we set a 90-day plan with targets and a budget. The work starts with tracking and integrations, so every campaign that follows can be measured against sales.',
    },
    {
      question: 'Do we need to be a New Wave IT client?',
      answer:
        'No. Businesses that use another IT provider, or none at all, work with us the same way, and we can take on only the parts that make sense next to your current agency, developer, or in-house team. If you are a New Wave IT client, we coordinate directly with the team that already supports your technology.',
    },
    {
      question: 'Who owns our accounts, data, and ad history?',
      answer:
        'Your business owns its domain, website, analytics, CRM, ad accounts, email and SMS lists, and social profiles, and our team works through access you grant and can remove. Because the accounts are yours, the campaign history, audiences, and data stay with the business if the arrangement ever changes. Ownership of the creative work we produce is set out in writing before work begins.',
    },
    {
      question: 'How do you measure and report results?',
      answer:
        'Against sales, bookings, and inquiries, not impressions. Tracking is set up and checked before campaigns scale, so each channel can be tied to the revenue it produced and to its cost per sale. Every month you get one report that shows what moved, what did not, and what we plan to do next, and every quarter the plan is reset from the data.',
    },
  ],
  cta: {
    heading: 'Start with the audit',
    body: 'Book a discovery call. We’ll run GroundSwell on your business and your rivals, show you where the demand is and what it costs to reach, and set out what we would do first.',
  },
};
