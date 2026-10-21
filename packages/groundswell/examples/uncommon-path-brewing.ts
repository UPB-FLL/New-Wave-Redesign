import type { AngleInput } from '../src/adplan.js';
import type { AdTemplate } from '../src/templates.js';

/**
 * Use case: Uncommon Path Brewing, Fort Lauderdale (a New Wave: Social
 * Engineering client, shown with the owner's permission).
 *
 * Inputs only: buildAdPlan turns them into the plan, so the numbers shown
 * anywhere (the Croissance page, a report) always come from the model.
 *
 * - Keyword demand and bids: Google Ads Keyword Planner, Broward County
 *   (geoTargetConstants/1014969), English, Google Search, read October 21, 2026.
 * - Event value, booking rate and margin: the brewery's audit of October 21,
 *   2026 (its published package minimums plus three hours of room rental;
 *   Tripleseat EventUp; Restaurant365).
 * - Pizza prices: the published menu at uncommonpathbrewing.com/food, read
 *   October 21, 2026 (pies $18 to $25).
 * - No drink prices are published, so the happy-hour and brewery angles show
 *   cost and clicks only.
 */

export const UPB_READ_ON = 'October 21, 2026';
export const UPB_INDUSTRY = 'restaurant_bar';

const kw = (keyword: string, monthly_searches: number, low: number | null, high: number | null) => ({
  keyword,
  monthly_searches,
  low_bid_usd: low,
  high_bid_usd: high,
});

/** The brewery's rank for these searches was not confirmed, so the cautious rank-2-to-4 rate applies. */
const UNCONFIRMED_RANK = 0.82;
const UNCONFIRMED_RANK_BASIS =
  'its rank for these searches was not confirmed, so the cautious figure for a business ranking second to fourth applies (Chan and others, Google, 2012).';

export const UPB_ANGLES: AngleInput[] = [
  {
    id: 'events',
    name: 'Private events',
    why: 'Published packages for up to 120 guests and room rental, which no rival advertises.',
    keywords: [
      kw('event space fort lauderdale', 210, 1.71, 5.27),
      kw('event venues fort lauderdale', 210, 1.71, 5.27),
      kw('party venue fort lauderdale', 90, 1.42, 4.26),
      kw('small party venues in fort lauderdale', 50, 1.13, 3.36),
      kw('birthday party places fort lauderdale', 40, 0.96, 3.68),
      kw('birthday party venue fort lauderdale', 20, 1.43, 4.0),
    ],
    value: {
      per_customer: [1300, 2025, 2550],
      close: [0.1, 0.15, 0.2],
      gross_margin: [0.3, 0.36, 0.42],
      basis:
        'Its published package minimums plus three hours of room rental; one booking for every 10, 7 or 5 inquiries (Tripleseat EventUp); margin after food, drink and labor (Restaurant365).',
    },
    incrementality: UNCONFIRMED_RANK,
    incrementality_basis: UNCONFIRMED_RANK_BASIS,
  },
  {
    id: 'pizza',
    name: 'Wood-fired pizza',
    why: 'Pizza searches outnumber “best brewery” searches about 50 to 1, and the menu is on the site.',
    keywords: [kw('pizza fort lauderdale', 1300, 0.66, 1.96), kw('best pizza fort lauderdale', 1300, 0.38, 1.03)],
    value: {
      per_customer: [18, 22, 40],
      close: [0.5, 0.7, 0.9],
      gross_margin: [0.3, 0.36, 0.42],
      basis:
        'One pie from the published menu ($18 to $25, typically $22; the high case adds an appetizer); the share of calls and direction requests that become a visit is a Groundswell estimate, as no figure is published; margin after food, drink and labor (Restaurant365).',
    },
    incrementality: UNCONFIRMED_RANK,
    incrementality_basis: UNCONFIRMED_RANK_BASIS,
  },
  {
    id: 'nights',
    name: 'Happy hour and live music',
    why: 'An all-day Thursday happy hour and live music, on searches that do not name a brewery.',
    keywords: [
      kw('happy hour fort lauderdale', 1900, 0.43, 1.16),
      kw('best happy hour fort lauderdale', 880, 0.55, 1.27),
      kw('live music fort lauderdale', 590, 0.24, 1.5),
    ],
    value: null,
    incrementality: UNCONFIRMED_RANK,
    incrementality_basis: UNCONFIRMED_RANK_BASIS,
  },
  {
    id: 'brewery',
    name: 'Brewery',
    why: 'Shown for contrast: the city’s best-of lists name five other breweries, and it already ranks for the main search.',
    keywords: [kw('brewery fort lauderdale', 1000, 0.63, 2.36), kw('best brewery fort lauderdale', 50, null, null), kw('craft beer fort lauderdale', 20, null, null)],
    value: null,
    incrementality: 0.82,
    incrementality_basis: 'it already ranks third organically for “brewery fort lauderdale”, so fewer ad clicks are new (Chan and others, Google, 2012).',
  },
];

/** Proof every template may name: third-party, dated, and shown with the ad. */
const RATING = 'Google rating 4.8 from about 283 reviews (October 21, 2026)';

export const UPB_TEMPLATES: AdTemplate[] = [
  {
    platform: 'google_search',
    angle_id: 'events',
    fields: {
      headlines: [
        'Private Event Space',
        'Groups of Up to 120 Guests',
        'Packages From $1,000',
        'Beer Brewed On Site',
        'Wood-Fired Pizza for Groups',
        'Rated 4.8 on Google',
        'Flagler Village, NW 5th Ave',
        'Book Your Private Event',
      ],
      descriptions: [
        'Private events for up to 120 guests, with food and drink packages from $1,000.',
        'Room rental from $100 an hour Monday to Thursday. Open bar add-on available.',
      ],
      path1: 'private-events',
      path2: 'packages',
    },
    targeting: 'Searches for event spaces and party venues; Broward County; adults 21 and older.',
    call_to_action: 'Check dates (the private-events page, its packages and an inquiry form above the fold).',
    proof: [RATING],
  },
  {
    platform: 'google_search',
    angle_id: 'pizza',
    fields: {
      headlines: [
        'Wood-Fired Pizza',
        'Fresh Pies From $18',
        'Beer Brewed On Site',
        'Rated 4.8 on Google',
        'NW 5th Ave, Flagler Village',
        'Hot Honey, Truffle and More',
        'See the Menu',
      ],
      descriptions: [
        'Wood-fired pies from $18 and beer brewed on site, on NW 5th Ave.',
        'Weekly trivia and live music in Flagler Village. See the menu and hours.',
      ],
      path1: 'food',
    },
    targeting: 'Searches for pizza in Fort Lauderdale, including “best pizza” searches; 3 miles around the brewery; 21 and older.',
    call_to_action: 'See the menu (the food page, with address, hours and a call button in the first screen).',
    proof: [RATING],
  },
  {
    platform: 'meta',
    angle_id: 'events',
    fields: {
      primary_text: 'Your group, our room. Private events for up to 120 guests, with packages from $1,000 and beer brewed on site.',
      headline: 'Private events from $1,000',
      description: 'Check open dates',
    },
    targeting: 'Adults 21 and older within 10 miles; interests in event planning, birthdays and work events.',
    call_to_action: 'Learn more',
  },
  {
    platform: 'meta',
    angle_id: 'pizza',
    fields: {
      primary_text: 'Wood-fired pies from $18, hot honey to truffle, and beer brewed on site. Rated 4.8 on Google.',
      headline: 'Wood-fired pies, NW 5th Ave',
      description: 'See the menu',
    },
    targeting: 'Adults 21 and older within 3 miles of the brewery.',
    call_to_action: 'See menu',
    proof: [RATING],
  },
  {
    platform: 'reddit',
    angle_id: 'events',
    fields: {
      headline: 'Planning a birthday or work party in Fort Lauderdale? Our private room fits up to 120 people, with packages from $1,000.',
      body: 'Wood-fired pizza, beer brewed on site, and a room that is yours for the night. Space rental starts at $100 an hour Monday to Thursday.',
    },
    targeting: 'r/fortlauderdale and r/southflorida; 21 and older. Requires Reddit’s managed sales team for alcohol advertisers.',
    call_to_action: 'Learn more',
  },
  {
    platform: 'tiktok',
    angle_id: 'pizza',
    fields: {
      ad_text: 'Hot honey, truffle, fig: wood-fired pies from $18 on NW 5th Ave. 21+.',
      display_name: 'Uncommon Path',
    },
    targeting: 'Fort Lauderdale; 25 and older (TikTok’s US rule for alcohol advertisers). Requires a TikTok sales representative.',
    call_to_action: 'View now',
  },
];
