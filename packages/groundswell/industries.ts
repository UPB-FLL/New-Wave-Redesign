import type { IndustryProfile } from './src/config.js';

/**
 * Industry profiles for the setup file: where each kind of business is
 * looked up, and where it may advertise. The planner agent picks one from the
 * business's own data; `match` words are its hint, and `general` is the
 * fallback. Add a profile here to teach Groundswell a new industry.
 *
 * `audit_platforms` are public places customers check, in priority order.
 * Google Search and Maps are always checked and are not listed.
 */
export const INDUSTRIES: IndustryProfile[] = [
  {
    id: 'restaurant_bar',
    label: 'Restaurants, breweries and bars',
    match: ['restaurant', 'brewery', 'brewpub', 'bar', 'pizza', 'cafe', 'coffee', 'taproom', 'winery', 'distillery', 'kitchen'],
    audit_platforms: ['instagram', 'facebook', 'tiktok', 'yelp', 'tripadvisor', 'untappd', 'reddit', 'opentable'],
    ad_platforms: ['google_search', 'meta', 'reddit', 'tiktok'],
    restricted: ['alcohol'],
    benchmark_industry: 'Restaurants & Food',
    do_not_copy: ['Alcohol content aimed at anyone under 21, or drinking games and binge offers.'],
  },
  {
    id: 'event_venue',
    label: 'Event venues',
    match: ['event space', 'venue', 'banquet', 'wedding', 'party rental'],
    audit_platforms: ['instagram', 'facebook', 'the_knot', 'wedding_wire', 'peerspace', 'yelp', 'tiktok'],
    ad_platforms: ['google_search', 'meta', 'tiktok', 'reddit'],
    benchmark_industry: 'Restaurants & Food',
  },
  {
    id: 'home_services',
    label: 'Home services (HVAC, plumbing, electrical, roofing)',
    match: ['hvac', 'air conditioning', 'ac repair', 'plumb', 'electric', 'roof', 'pest', 'landscap', 'pool', 'handyman'],
    audit_platforms: ['angi', 'yelp', 'nextdoor', 'reddit', 'bbb', 'google_local_services', 'facebook', 'thumbtack'],
    ad_platforms: ['google_search', 'meta', 'reddit'],
    benchmark_industry: 'Home & Home Improvement',
    licences: ['licensed', 'insured', 'bonded', 'NATE', 'EPA'],
    do_not_copy: ['Prices or response times the business cannot meet in every job.', 'Claims of a licence the business does not hold for the work advertised.'],
  },
  {
    id: 'it_services',
    label: 'IT and technology services',
    match: ['managed it', 'it support', 'msp', 'cybersecurity', 'software', 'saas', 'cloud', 'network'],
    audit_platforms: ['linkedin', 'clutch', 'g2', 'bbb', 'reddit', 'youtube'],
    ad_platforms: ['google_search', 'linkedin', 'meta'],
    benchmark_industry: 'Business Services',
  },
  {
    id: 'health_wellness',
    label: 'Health, coaching and wellness',
    match: ['coach', 'wellness', 'health', 'nutrition', 'fitness', 'gym', 'yoga', 'spa', 'med spa', 'chiropract'],
    audit_platforms: ['instagram', 'facebook', 'tiktok', 'youtube', 'yelp', 'reddit'],
    ad_platforms: ['google_search', 'meta', 'tiktok'],
    restricted: ['health'],
    benchmark_industry: 'Health & Fitness',
    licences: ['RD', 'RDN', 'LDN', 'MD', 'DO', 'NP', 'PA-C', 'LMHC', 'LCSW', 'PhD', 'DC', 'PT', 'DPT'],
    do_not_copy: [
      'Medical, drug or vaccine claims, or promises to treat, cure or prevent a condition.',
      'Anything that would breach a licence the business holds, or practise outside its scope.',
      'Disparaging physicians or conventional care.',
    ],
  },
  {
    id: 'events_entertainment',
    label: 'Mobile entertainment and party rentals',
    match: ['simulator', 'rental', 'entertainment', 'photo booth', 'dj', 'party'],
    audit_platforms: ['instagram', 'facebook', 'tiktok', 'yelp', 'the_knot', 'thumbtack', 'reddit'],
    ad_platforms: ['google_search', 'meta', 'tiktok'],
    benchmark_industry: 'Arts & Entertainment',
  },
  {
    id: 'general',
    label: 'General local business',
    match: [],
    audit_platforms: ['instagram', 'facebook', 'yelp', 'bbb', 'reddit'],
    ad_platforms: ['google_search', 'meta'],
  },
];
