import { HEADWAY_DESCRIPTOR, HEADWAY_NAME, HEADWAY_SERVICE_INFO, HEADWAY_TAGLINE, SETUP_ITEMS } from '../../../lib/headway';
import type { DivisionFaq } from '../types';

// Headway (/social-engineering/headway): GroundSwell's implementation
// service, the one service the division sells, with the six kinds of work
// listed under it. GroundSwell finds and plans; Headway carries the plan out,
// through the client's own accounts where a tool exists and through the team
// where none does, every action approved first. Pure data. The service
// catalogue, the setup items and the automatic/team split come from
// src/lib/headway.ts, so the page can never describe something the
// platform does not do.

export { HEADWAY_DESCRIPTOR, HEADWAY_NAME, HEADWAY_TAGLINE };

export const headwayContent = {
  metaTitle: 'Headway — Implementation service by GroundSwell | New Wave',
  metaDescription:
    'Headway carries out the GroundSwell plan: posts, campaigns, website and tracking work through your own accounts, every action approved first. By New Wave.',
  keywords:
    'headway, marketing implementation service, done-for-you marketing small business, groundswell implementation, approve marketing actions, google ads setup service, instagram posting service, new wave it',
  navLabel: HEADWAY_NAME,
  kicker: `${HEADWAY_NAME} · by GroundSwell`,
  headline: HEADWAY_TAGLINE,
  summary:
    'GroundSwell finds where the growth is and writes the plan. Headway carries it out: the posts, the campaigns, the website and tracking changes, through your own accounts and our team, one action at a time, each one approved before it happens.',
  /** Under the hero summary: three short facts (no numbers). */
  facts: ['Approve every action', 'Your accounts, your access', 'Six services, one plan'],
  secondaryCta: 'See the six services',
  intro: {
    kicker: 'What it is',
    heading: 'One service that does the work the plan calls for',
    paragraphs: [
      'Most plans stall between the report and the first change. Headway is the part of GroundSwell that closes that gap. It takes the delivered plan, turns every recommendation into a plain action, shows you exactly what will be done, and does it once you say yes.',
      'Where a tool can do the work through an account you have linked, Headway does it itself: the week’s Instagram posts, the Google and Meta campaigns built paused for your review, the sitemap submitted to Search Console, the plan read again against your own figures a month on. Where no tool should, the same action becomes a brief our team carries out and marks done.',
      'You pay for the services you want. We switch those on for your business, the checklist tells you what each one needs, and nothing runs until it is in place.',
    ],
  },
  services: {
    kicker: 'The services',
    heading: 'Six kinds of work, all under Headway',
    intro: 'Each service reads the same plan and reports against the same sales. Take one, or the set; what each one needs from you is listed before anything starts.',
    automaticLabel: 'Runs through your linked accounts',
    teamLabel: 'The team carries out',
    noneLabel: 'Nothing runs on its own for this service; every item is a brief for the team.',
    pageLink: 'About the service',
  },
  process: {
    kicker: 'How it works',
    heading: 'Switch on, set up, approve, carry out',
    steps: [
      { title: 'Switch on', detail: 'We switch on the services your business pays for. Headway plans only for those, so the list of actions is never longer than what you asked for.' },
      { title: 'Set up', detail: 'The checklist names what each service needs: an account signed in, an id, access you grant, or a login you would rather hand over. It stays encrypted, and only our staff can open it.' },
      { title: 'Approve', detail: 'From the delivered plan, Headway lists every action with the exact caption, the campaign rows, the page change. Approve each one, or decline it. Campaigns are built paused; turning them on is a second approval.' },
      { title: 'Carry out and measure', detail: 'Approved actions run on their day through your own accounts; briefs go to the team and are marked done. A month on, the plan is read again against your real figures.' },
    ],
  },
  setup: {
    kicker: 'What we need from you',
    heading: 'The setup checklist, in plain words',
    intro: 'Every item below exists because a service needs it. Link an account where you can; where you would rather not, a login works, and an invitation does for the rest.',
    kinds: {
      link: { title: 'Accounts you sign in to', detail: 'Signed in with you through a hosted sign-in, so the credentials stay with the sign-in service and you can remove the access at any time.' },
      id: { title: 'Ids you type in', detail: 'Plain identifiers from your accounts; most are filled in from your Google listing.' },
      access: { title: 'Access you grant', detail: 'An invitation or a share, recorded as given once it arrives.' },
      secret: { title: 'Logins, if you would rather not link', detail: 'Stored encrypted, shown only to New Wave staff who ask, and never printed in a report.' },
    },
  },
  rules: {
    kicker: 'The ground rules',
    heading: 'What Headway never does',
    items: [
      'Nothing touches your accounts without an approval on that exact action.',
      'Campaigns are created paused; switching them on is a separate approval, after you have seen them in the ad account.',
      'Every caption, headline and page change comes from the plan GroundSwell wrote from your data; Headway invents nothing of its own.',
      'The accounts, campaigns, audiences and history stay yours: the work runs through access you grant and can remove.',
      'A login you hand over is held encrypted and never written into a report or a brief.',
    ],
  },
  faqs: [
    {
      question: 'What is Headway?',
      answer:
        'Headway is GroundSwell’s implementation service, by New Wave: the part of the platform that carries out the plan. The six services (social media, brand development, website design, smart advertising, integrations and data, analytics and oversight) are the kinds of work it does. GroundSwell finds and plans; Headway does.',
    },
    {
      question: 'Do we have to buy all six services?',
      answer: 'No. You pay for the services you want, and our staff switch those on for your business. Headway plans and lists actions only for the services that are on.',
    },
    {
      question: 'Will anything run without our say-so?',
      answer:
        'No. Every action is listed with exactly what it will do, and it runs only once a person approves it. Ad campaigns are built paused and need a second approval to switch on. You can decline any action, and an approved one can be stopped before its day.',
    },
    {
      question: 'What if we would rather not link our accounts?',
      answer:
        'Then hand over a login instead. It is held encrypted, only New Wave staff can open it, and the team does that service’s work by hand. Linking is quicker and lets you remove the access yourself, but it is your call.',
    },
    {
      question: 'How does Headway know what to do?',
      answer:
        'From the plan GroundSwell delivered for your business: the website optimization plan, the social media plan with its first week of posts, the ad sets with their budgets, the benchmark’s differences, and what the site scan found missing. Each becomes one action, in the plan’s own words, so what you approve is what gets done.',
    },
    {
      question: 'What happens when something fails?',
      answer:
        'The action is marked as failed with the reason, our team is notified, and nothing else is affected. Once the cause is fixed (a missing id, an expired sign-in), the action can be tried again from the same screen.',
    },
  ] satisfies readonly DivisionFaq[],
  cta: {
    heading: 'Start with the audit, then let Headway carry it out',
    body: 'Book a discovery call. We run GroundSwell on your business, agree the services that make sense, and Headway takes it from the plan to the work.',
  },
} as const;

/** The six services as the page lists them, with what runs on its own and what the team carries out, from the shared catalogue. */
export const headwayServices = Object.values(HEADWAY_SERVICE_INFO);

/** The setup items the page explains, grouped by kind, from the shared catalogue. */
export const headwaySetupItems = SETUP_ITEMS;
