import { INDUSTRIES } from './industries.js';
import { validateConfig, type GroundswellConfig, type Triple } from './src/config.js';

/**
 * Groundswell's setup file. Every published figure carries its source and
 * edition; everything else is a rule New Wave chose, and says so. Change a
 * number here, not in the code. `validateConfig` checks the file when it is
 * loaded and lists every problem at once.
 *
 * Researched October 21, 2026. Re-check each source when its publisher
 * releases a new edition (LocaliQ updates its benchmarks yearly).
 */

/**
 * Most sources publish one median. The low and high scenarios are a spread
 * around it (New Wave's rule, not a published figure): clicks cost a quarter
 * more and convert a quarter less in the low scenario, and cost 15% less and
 * convert 10% more in the high one.
 */
const cost = (median: number): Triple => [median * 1.25, median, median * 0.85];
const rate = (median: number): Triple => [median * 0.75, median, median * 1.1];
/** Search click-through and conversion rates stay at the median: `search` below discounts them per scenario. */
const flat = (median: number): Triple => [median, median, median];

const LOCALIQ_SEARCH = {
  source: 'LocaliQ and WordStream, Search Advertising Benchmarks for Every Industry (medians, US campaigns, April 2025 to March 2026)',
  url: 'https://localiq.com/blog/search-advertising-benchmarks/',
  as_of: '2026',
};
const LOCALIQ_FACEBOOK = {
  source: 'LocaliQ and WordStream, Facebook Advertising Benchmarks for 2026',
  url: 'https://localiq.com/blog/facebook-advertising-benchmarks/',
  as_of: '2026',
};

export const GROUNDSWELL_CONFIG: GroundswellConfig = validateConfig({
  version: 1,

  incrementality: {
    source: 'Chan, Kumar, Ma and Koehler (Google, 2012), 390 search-ad pause studies',
    as_of: '2012',
    ranks_first: 0.5,
    ranks_2_to_4: 0.82,
    ranks_5_plus: 0.96,
  },

  platforms: {
    google_search: {
      id: 'google_search',
      label: 'Google Search',
      buying: 'search',
      benchmarks: { ...LOCALIQ_SEARCH, cpc: cost(5.42), ctr: flat(0.0664), cvr: flat(0.0818) },
      by_industry: {
        'Restaurants & Food': { ...LOCALIQ_SEARCH, cpc: cost(2.05), ctr: flat(0.0683), cvr: flat(0.0805) },
        'Home & Home Improvement': { ...LOCALIQ_SEARCH, cpc: cost(8.33), ctr: flat(0.0647), cvr: flat(0.0805) },
        'Business Services': { ...LOCALIQ_SEARCH, cpc: cost(5.87), ctr: flat(0.061), cvr: flat(0.0485) },
      },
      template: {
        source: 'Google Ads Help, About responsive search ads; Display URL paths',
        url: 'https://support.google.com/google-ads/answer/7684791',
        as_of: '2026',
        format: 'Responsive search ad',
        fields: {
          headlines: { max_chars: 30, min_count: 3, max_count: 15 },
          descriptions: { max_chars: 90, min_count: 2, max_count: 4 },
          path1: { max_chars: 15, min_count: 0 },
          path2: { max_chars: 15, min_count: 0 },
        },
      },
      restricted_categories: {
        alcohol: {
          rule: 'Google allows alcohol ads in the US if they do not target or mainly appeal to people under the drinking age, or encourage excessive drinking.',
          blocks_self_serve: false,
          source: 'Google Ads policy: Alcohol',
          url: 'https://support.google.com/adspolicy/answer/6012382',
        },
      },
    },

    meta: {
      id: 'meta',
      label: 'Meta (Facebook and Instagram)',
      buying: 'social',
      benchmarks: {
        ...LOCALIQ_FACEBOOK,
        cpc: cost(0.6),
        ctr: rate(0.0193),
        cvr: rate(0.0854),
        cpl: cost(27.39),
        note: 'cost per click and click-through from traffic campaigns; leads at the lead-campaign cost per lead',
      },
      by_industry: {
        'Restaurants & Food': {
          ...LOCALIQ_FACEBOOK,
          cpc: cost(0.45),
          ctr: rate(0.0268),
          cvr: rate(0.0854),
          cpl: cost(27.39),
          note: 'restaurant traffic-campaign cost per click and click-through; the 2026 edition publishes no restaurant lead figures, so leads use the all-industry cost per lead',
        },
        'Home & Home Improvement': {
          ...LOCALIQ_FACEBOOK,
          cpc: cost(0.63),
          ctr: rate(0.0176),
          cvr: rate(0.0532),
          cpl: cost(42.95),
          note: 'traffic cost per click and click-through; leads at the lead-campaign cost per lead',
        },
        'Business Services': {
          ...LOCALIQ_FACEBOOK,
          cpc: cost(0.7),
          ctr: rate(0.0164),
          cvr: rate(0.0854),
          cpl: cost(27.39),
          note: 'traffic cost per click and click-through; no Business Services lead figures, so leads use the all-industry cost per lead',
        },
      },
      template: {
        source: 'Meta Ads Guide: Facebook Feed and Instagram Feed image ads (recommended lengths)',
        url: 'https://www.facebook.com/business/ads-guide/update/image/instagram-feed',
        as_of: '2026',
        format: 'Feed image ad',
        fields: {
          primary_text: { max_chars: 125, note: 'Instagram Feed recommendation; Facebook Feed recommends 50 to 150' },
          headline: { max_chars: 27, note: 'Facebook Feed recommendation (Instagram allows 40)' },
          description: { max_chars: 25, min_count: 0 },
        },
      },
      test_budget: {
        min_monthly: 150,
        share_of_search_spend: 0.5,
        basis: 'New Wave’s smallest useful test, about $5 a day, or half the angle’s search spend if larger (a setup-file rule, not a Meta requirement).',
      },
      restricted_categories: {
        alcohol: {
          rule: 'Meta requires alcohol ads in the US to target people 21 or older.',
          blocks_self_serve: false,
          source: 'Meta Advertising Standards: Alcohol',
          url: 'https://transparency.meta.com/policies/ad-standards/restricted-goods-services/alcohol/',
        },
      },
    },

    reddit: {
      id: 'reddit',
      label: 'Reddit',
      buying: 'social',
      benchmarks: null,
      benchmarks_missing:
        'No credible published Reddit cost per click or click-through rate was found in October 2026 (WordStream gives only a $0.50 to $15 cost per thousand views), so Reddit spend is not modeled.',
      template: {
        source: 'Reddit Ads Help: Reddit Ad Unit Specifications',
        url: 'https://business.reddithelp.com/en/categories/campaign-setup/reddit-ad-unit-specifications',
        as_of: '2026',
        format: 'Promoted post',
        fields: {
          headline: { max_chars: 300, note: '100 on mobile in the conversation placement' },
          body: { max_chars: 40000, min_count: 0 },
        },
      },
      test_budget: {
        min_monthly: 150,
        share_of_search_spend: 0.5,
        basis: 'About $5 a day, the minimum third-party guides report for Reddit (not confirmed on Reddit’s own help pages).',
      },
      restricted_categories: {
        alcohol: {
          rule: 'Reddit runs alcohol ads only through its managed sales team, which asks for a commitment of $10,000 or more a quarter, so a self-serve test is not possible.',
          blocks_self_serve: true,
          source: 'Reddit Ads Help: About Reddit’s ad review process; How to purchase Reddit Ads',
          url: 'https://business.reddithelp.com/s/article/How-to-purchase-Reddit-Ads',
        },
      },
    },

    tiktok: {
      id: 'tiktok',
      label: 'TikTok',
      buying: 'social',
      benchmarks: {
        source: 'Lebesgue, TikTok Ads Benchmarks for CTR, CR, and CPM (2026 update; ecommerce campaigns)',
        url: 'https://lebesgue.io/tiktok-ads/tiktok-ads-benchmarks-for-ctr-cr-and-cpm',
        as_of: '2026',
        // $4.80 per thousand views at a 0.61% click-through rate is about $0.79 a click.
        cpc: cost(4.8 / (1000 * 0.0061)),
        ctr: rate(0.0061),
        cvr: rate(0.0192),
        note: 'cost per click derived from the report’s cost per thousand views ($4.80) and click-through rate (0.61%)',
      },
      template: {
        source: 'TikTok Ads Manager Help: Auction In-Feed Ads; TopView specifications',
        url: 'https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads',
        as_of: '2026',
        format: 'In-feed ad',
        fields: {
          ad_text: { max_chars: 100 },
          display_name: { max_chars: 20 },
        },
      },
      test_budget: {
        min_monthly: 620,
        share_of_search_spend: 0.5,
        basis: 'TikTok’s minimum: an ad group’s daily budget must be more than $20, about $620 for a 31-day month.',
      },
      restricted_categories: {
        alcohol: {
          rule: 'In the US, TikTok alcohol ads must be shown only to people 25 and older, land on an age-gated page, and run through a TikTok sales representative, so a self-serve test is not possible.',
          blocks_self_serve: true,
          source: 'TikTok Ads policy: Alcohol, market-specific requirements',
          url: 'https://ads.tiktok.com/help/article/alcohol-market-specific-requirements',
        },
      },
    },

    linkedin: {
      id: 'linkedin',
      label: 'LinkedIn',
      buying: 'social',
      benchmarks: {
        source: 'ZenABM, LinkedIn Ads Benchmarks: Real Data from 211 B2B Companies (US medians; a vendor dataset)',
        url: 'https://zenabm.com/blog/linkedin-ads-benchmarks-2026',
        as_of: '2026',
        cpc: cost(8.99),
        ctr: rate(0.0052),
        cvr: null,
        note: 'no conversion rate is published, so LinkedIn rows show cost and clicks only',
      },
      template: {
        source: 'LinkedIn Help: Single image ads advertising specifications',
        url: 'https://www.linkedin.com/help/lms/answer/a426534',
        as_of: '2026',
        format: 'Single image ad',
        fields: {
          intro_text: { max_chars: 150, note: 'to avoid truncation; the maximum is 3,000' },
          headline: { max_chars: 70, note: 'to avoid truncation; the maximum is 200' },
          description: { max_chars: 100, min_count: 0 },
        },
      },
      test_budget: {
        min_monthly: 300,
        share_of_search_spend: 0.5,
        basis: 'LinkedIn’s minimum daily budget of $10, about $300 a month.',
      },
    },
  },

  industries: INDUSTRIES,

  search: {
    // New Wave's rules for a new, modest account (as in the audit's ROI method).
    impression_share: [0.5, 0.65, 0.75],
    ctr_factor: [0.8, 1, 1.1],
    cvr_factor: [0.6, 0.8, 1],
    ramp: [0.5, 0.75],
  },

  tiers: {
    cpc: [1, 3],
    clicks: [20, 100],
    roi_strong: 1,
  },

  min_angle_searches: 100,

  // New Wave's rule, stricter than Google's current policy: TikTok bans absolute claims about a region or brand
  // ("Misleading and false content"), and the FTC expects any objective claim to be substantiated.
  unsupported_claims: ['best', '#1', 'number one', 'no. 1', 'top-rated', 'top rated', 'guaranteed', 'cheapest', 'world-class'],

  verification: {
    tolerance: 0.1,
    max_rounds: 3,
  },
});
