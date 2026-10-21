import type { AuditRow } from '../../../../api/_lib/groundswell/types';
import { parseSite } from '../../../../api/_lib/groundswell/currents/site';
import { runRoiModel } from '../../../../api/_lib/groundswell/roi';
import { buildFacts, roiInputsFrom, normalizeEstimates, normalizeWriteup } from '../../../../api/_lib/groundswell/model';
import type { ModelOutput, ReportData } from '../../../../api/_lib/groundswell/reports';
import { brandFrom } from '../../../../api/_lib/groundswell/brand';

/** A made-up business ("Harbor Auto Care (sample)") with every Current's output. */

export const sampleAudit: AuditRow = {
  id: '00000000-0000-4000-8000-000000000001',
  business_name: 'Harbor Auto Care (sample)',
  city: 'Fort Lauderdale, FL',
  website: 'https://harbor-auto.example',
  instagram: 'harborautocare',
  competitors: [
    { name: 'Bayside Garage', website: 'https://bayside.example', instagram: 'baysidegarage' },
    { name: 'Coastline Motors', website: 'https://coastline.example', instagram: null },
  ],
  notes: 'Pays a marketing company today.',
};

export const sampleHtml = `<!doctype html><html><head>
<title>Harbor Auto Care | Auto Repair in Fort Lauderdale</title>
<meta name="description" content="Honest auto repair &amp; maintenance in Fort Lauderdale.">
<meta name="viewport" content="width=device-width">
<meta name="theme-color" content="#0E5A8A">
<meta property="og:image" content="/og.jpg">
<link rel="canonical" href="https://harbor-auto.example/">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":["AutoRepair","LocalBusiness"]}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234567"></script>
<script>gtag('config','AW-123456789');</script>
<style>.a{color:#0e5a8a}.b{color:#0e5a8a}.c{color:#f5a623}.d{color:#333333}</style>
</head><body>
<img class="site-logo" src="/img/logo.png" alt="Harbor Auto Care logo">
<h1>Auto repair you can <em>trust</em></h1>
<p>Brakes, tires and AC repair.</p>
<a href="tel:+1 (954) 555-0199">Call</a>
<a href="https://www.instagram.com/harborautocare/">IG</a>
<a href="https://www.instagram.com/p/abc123/">post</a>
<a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>
<a href="https://www.facebook.com/HarborAuto">FB</a>
<a href="https://book.squareup.com/appointments/xyz">Book</a>
</body></html>`;

export function sampleOutputs(): Record<string, unknown> {
  const business = parseSite(sampleHtml, 'https://harbor-auto.example', 'https://harbor-auto.example/', 200);
  const rival = parseSite('<html><title>Bayside</title><a href="https://calendly.com/x">b</a></html>', 'https://bayside.example', 'https://bayside.example/', 200);
  const at = '2026-10-21T12:00:00.000Z';
  return {
    site: { business, competitors: [{ name: 'Bayside Garage', site: rival }, { name: 'Coastline Motors', site: null }] },
    maps: {
      fetched_at: at,
      source: 'Google Maps (logged-out view)',
      business: { name: 'Harbor Auto Care', rating: 4.6, reviews: 212, category: 'Auto repair shop', address: '1 Harbor Rd, Fort Lauderdale, FL 33301', phone: '(954) 555-0199', website: 'https://harbor-auto.example/', hours: ['Monday 8 AM–6 PM'], url: null },
      nearby: [
        { name: 'Bayside Garage', rating: 4.8, reviews: 540, info: 'Auto repair shop', url: null },
        { name: 'Coastline Motors', rating: 4.3, reviews: 95, info: 'Auto repair shop', url: null },
      ],
      note: null,
    },
    search: {
      source: 'Ahrefs Site Explorer (US), via Composio',
      fetched_at: at,
      business: {
        domain: 'harbor-auto.example', domain_rating: 18, organic_keywords: 140, organic_traffic: 320, traffic_value_usd: 910, paid_keywords: 0,
        top_keywords: [{ keyword: 'auto repair fort lauderdale', volume: 1300, position: 7, traffic: 40, url: null }],
        error: null,
      },
      competitors: [{ name: 'Bayside Garage', domain: 'bayside.example', domain_rating: 31, organic_keywords: 600, organic_traffic: 2100, traffic_value_usd: null, paid_keywords: 12, top_keywords: [], error: null }],
    },
    keywords: {
      source: 'Google Ads Keyword Planner (geoTargetConstants/200528, English, Google Search), via Composio',
      fetched_at: at,
      seeds: ['Auto repair shop'],
      ideas: [
        { keyword: 'auto repair fort lauderdale', monthly_searches: 1300, competition: 'HIGH', low_bid_usd: 4.1, high_bid_usd: 12.5 },
        { keyword: 'brake repair near me', monthly_searches: 900, competition: 'HIGH', low_bid_usd: 5, high_bid_usd: 14 },
        { keyword: 'car ac repair', monthly_searches: 480, competition: 'MEDIUM', low_bid_usd: 3.2, high_bid_usd: 9.8 },
      ],
    },
    social: {
      source: 'Instagram public profiles, via ScrapeCreators through Composio',
      fetched_at: at,
      handle_source: 'entered by an admin',
      business: { handle: 'harborautocare', exists: true, followers: 1250, following: 300, posts: 88, biography: null, is_business: true, last_post_at: at, posts_last_30_days: 2, avg_likes_recent: 14, avg_comments_recent: 1, error: null },
      competitors: [{ name: 'Bayside Garage', handle: 'baysidegarage', exists: true, followers: 5400, following: 200, posts: 410, biography: null, is_business: true, last_post_at: at, posts_last_30_days: 9, avg_likes_recent: 60, avg_comments_recent: 4, error: null }],
    },
    ads: {
      source: 'Website tags (Site Current) and Ahrefs paid pages (US), via Composio',
      fetched_at: at,
      business: { name: 'Harbor Auto Care (sample)', domain: 'harbor-auto.example', google_ads_tag: true, meta_pixel: false, tiktok_pixel: false, paid_pages: [], error: null },
      competitors: [{ name: 'Bayside Garage', domain: 'bayside.example', google_ads_tag: false, meta_pixel: true, tiktok_pixel: false, paid_pages: [{ url: 'https://bayside.example/', keywords: 12, traffic: 300 }], error: null }],
    },
  };
}

export const sampleModelJson = {
  headline: 'Well rated, but rivals win the searches nearby',
  verdict: 'Harbor Auto Care has a 4.6 rating from 212 reviews. Bayside Garage has 540 reviews and posts more on Instagram.',
  areas: {
    google: { summary: 'Strong rating, fewer reviews than Bayside Garage.', working: ['4.6 rating from 212 reviews'], costing: ['Bayside Garage has 540 reviews'], fixes: ['Ask every customer for a review'] },
    social: { summary: 'Instagram posts are rare.', working: ['1,250 followers'], costing: ['2 posts in the last 30 days'], fixes: ['Post weekly'] },
    website: { summary: 'The site is secure and mobile-ready.', working: ['Online booking through Square'], costing: ['Domain rating of 18'], fixes: ['Add service pages'] },
    ads: { summary: 'A Google Ads tag is on the site.', working: [], costing: ['No Meta pixel'], fixes: ['Add the Meta pixel'] },
    competitors: { summary: 'Bayside Garage leads on reviews and search.', working: [], costing: ['Bayside Garage gets about 2,100 organic visits a month'], fixes: [] },
    keywords: { summary: 'Auto repair fort lauderdale has 1,300 searches a month.', working: [], costing: ['The site ranks 7 for it'], fixes: ['Build a page for brake repair'] },
  },
  plan: { weeks_1_2: ['Fix the Google profile'], weeks_3_6: ['Launch search ads'], weeks_7_12: ['Review cost per lead'] },
  next_steps: ['Approve the search campaign', 'Share Google profile access', 'Book a review call'],
  cant_see: ['Google Business Profile performance needs owner access'],
  estimates: { category: 'auto repair', ticket: [300, 420, 600], close: [0.25, 0.35, 0.45], gross_margin: 0.5, basis: 'Groundswell estimate for auto repair shops.', has_current_marketer: true },
};

export function sampleModelOutput(): ModelOutput {
  const facts = buildFacts(sampleAudit, sampleOutputs());
  const estimates = normalizeEstimates(sampleModelJson.estimates);
  const plan = roiInputsFrom(facts, estimates)!;
  return {
    model: 'test-model',
    generated_at: '2026-10-21T12:00:00.000Z',
    writeup: normalizeWriteup(sampleModelJson),
    removed_sentences: [],
    estimates,
    roi: runRoiModel(plan.inputs),
    roi_sources: plan.sources,
    core_keywords: plan.core_keywords,
    roi_note: null,
  };
}

export function sampleReportData(): ReportData {
  const outputs = sampleOutputs();
  const facts = buildFacts(sampleAudit, outputs);
  return { facts, model: sampleModelOutput(), brand: brandFrom(facts.site?.business), date: 'October 21, 2026' };
}
