import type { DivisionCustomer } from '../types';

// The Customers page (/social-engineering/customers). Pure data.
//
// Each entry says what the business IS, taken from its own site, and nothing
// about work the division did for it: no services delivered, results,
// metrics, ratings, reviews, quotes, or "we built / launched / grew"
// statements, and no logos or screenshots. customers.test.ts enforces this.
// Keep the customers' names and category terms out of the page's title,
// description, and keywords, so the page never competes with their own sites.

/** In the owner's order. */
export const divisionCustomers: readonly DivisionCustomer[] = [
  {
    // Unverified: the site blocks automated fetches, so these facts come from
    // search results, its Facebook page, and its BBB listing. The owner must
    // confirm them before launch. Neutral wording only: no medical or healing claims.
    name: 'Wildly Primal',
    category: 'Health coaching',
    location: 'Jacksonville Beach, FL',
    description: 'Online coaching focused on digestion, gut health, blood sugar balance, and metabolism.',
    linkLabel: 'wildlyprimal.com',
    href: 'https://www.wildlyprimal.com/',
  },
  {
    // The division's parent company: an internal link to its home page.
    name: 'New Wave IT',
    category: 'Managed IT',
    location: 'Fort Lauderdale, FL',
    description:
      'Our parent company, providing 24/7 support, cybersecurity, cloud migration, and network infrastructure to South Florida businesses.',
    linkLabel: 'newwaveitfl.com',
    href: '/',
  },
  {
    name: 'Uncommon Path Brewing',
    category: 'Brewery & pizza',
    location: 'Fort Lauderdale, FL',
    description:
      'A craft brewery and wood-fired pizza kitchen in Progresso / Flagler Village, with beer brewed on-site, weekly trivia, live music, and rotating local art.',
    linkLabel: 'uncommonpathbrewing.com',
    href: 'https://www.uncommonpathbrewing.com/',
  },
  {
    // The owner chose www.playluckyshot.com. The same site also answers on
    // www.playluckyshotgolf.com, which its own canonical tag names.
    name: 'Lucky Shot Golf',
    category: 'Golf simulator rental',
    location: 'Miramar, FL',
    description:
      'Mobile simulators for parties, weddings, and corporate events across South Florida, with setup, takedown, and on-site support included.',
    linkLabel: 'playluckyshot.com',
    href: 'https://www.playluckyshot.com/',
  },
];

export const customersContent = {
  metaTitle: 'Our customers | New Wave: Social Engineering',
  metaDescription:
    'Meet the customers of New Wave: Social Engineering, a Fort Lauderdale social media and marketing agency from New Wave IT, and see what each business does.',
  keywords: 'marketing agency fort lauderdale customers, south florida marketing agency customers, new wave it',
  navLabel: 'Customers',
  kicker: 'Customers',
  headline: 'Businesses we work with',
  summary:
    'Every business below is a customer of New Wave: Social Engineering. Here’s what each one does, with a link to its website.',
  /** Visually hidden H2 over the list. */
  listHeading: 'Customer list',
  /** Visually hidden, after each external link's text. */
  externalLinkNote: ' (opens in a new tab)',
  cta: {
    heading: 'Where is your business headed?',
    body: 'Tell us on a discovery call. We’ll ask how customers find you today, where you want to be in 12 months, and where the gaps are.',
  },
} as const;
