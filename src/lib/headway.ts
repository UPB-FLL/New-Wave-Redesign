import type { ClientService } from './groundswellValidation';

// Headway, GroundSwell's implementation service: the part of the platform that
// carries out what the audit and plans recommend, through the client's own
// linked accounts (Composio) where a tool exists and as a brief for the team
// where none does. Pure data, shared by the browser and the API
// (api/_lib/groundswell/headway/). The six services are the division's six
// (src/divisions/socialEngineering/site.ts, DIVISION_SERVICE_SLUGS; a test
// holds the two in step): a customer pays for some of them, and staff switch
// those on per customer (groundswell_customer_services).

/** The product name, capital H. "Headway by GroundSwell" on first reference in copy. */
export const HEADWAY_NAME = 'Headway';
export const HEADWAY_TAGLINE = 'Progress you can measure.';
/** The one-line descriptor beside the wordmark. */
export const HEADWAY_DESCRIPTOR = 'The plan, carried out.';

export const HEADWAY_SERVICES = [
  'social-media',
  'brand-development',
  'website-design',
  'marketing',
  'integration',
  'digital-oversight',
] as const;
export type HeadwayService = (typeof HEADWAY_SERVICES)[number];
export const isHeadwayService = (v: unknown): v is HeadwayService => HEADWAY_SERVICES.includes(v as HeadwayService);

/**
 * What Headway needs from a customer before it can do a service's work. Four
 * kinds:
 * - link: an account signed in through Composio (the client-accounts card);
 * - id: an identifier staff or the partner types in (a Page id, a ZIP code);
 * - access: an invitation or access the customer grants outside the app,
 *   recorded here as given;
 * - secret: a login or key the customer would rather hand over than link,
 *   stored encrypted (GROUNDSWELL_SECRETS_KEY) and shown only to staff who ask.
 */
export type SetupKind = 'link' | 'id' | 'access' | 'secret';

export interface SetupItemDef {
  key: string;
  kind: SetupKind;
  label: string;
  /** What it is for and where to find it, in the customer's words. */
  hint: string;
  /** The Composio-linked service a `link` item stands for. */
  service?: ClientService;
  /** An item that satisfies the same need (a login instead of a link). */
  alternative?: string;
  /** False: nice to have; the checklist shows it after the required ones. */
  required: boolean;
}

export const SETUP_ITEMS: readonly SetupItemDef[] = [
  { key: 'link:instagram', kind: 'link', service: 'instagram', label: 'Instagram (linked)', hint: 'Sign in with the business’s Instagram so Headway can publish the week’s posts.', alternative: 'social_logins', required: true },
  { key: 'link:metaads', kind: 'link', service: 'metaads', label: 'Meta Ads (linked)', hint: 'Sign in to the Meta ad account so Headway can build the Facebook and Instagram campaigns, paused, for approval.', alternative: 'ads_logins', required: true },
  { key: 'link:googleads', kind: 'link', service: 'googleads', label: 'Google Ads (linked)', hint: 'Sign in to Google Ads so Headway can build the search campaign, paused, for approval.', alternative: 'ads_logins', required: true },
  { key: 'link:google_analytics', kind: 'link', service: 'google_analytics', label: 'Google Analytics 4 (linked)', hint: 'Sign in to Analytics so the reports read real sessions and conversions.', required: true },
  { key: 'link:google_search_console', kind: 'link', service: 'google_search_console', label: 'Google Search Console (linked)', hint: 'Sign in to Search Console so Headway can submit the sitemap and read the searches the site appears for.', required: true },
  { key: 'facebook_page_id', kind: 'id', label: 'Facebook Page id', hint: 'The numeric id of the business’s Facebook Page (Page settings → About → Page ID). Meta ads run from the Page.', required: true },
  { key: 'business_zip', kind: 'id', label: 'ZIP code of the business', hint: 'Meta ad sets target a radius around it. Usually filled from the Google listing.', required: true },
  { key: 'google_ads_customer_id', kind: 'id', label: 'Google Ads customer id', hint: 'The 10-digit id at the top right of Google Ads. Optional: Headway otherwise takes the first non-manager account it can read.', required: false },
  { key: 'meta_pixel_id', kind: 'id', label: 'Meta pixel id', hint: 'Lets the lead campaigns optimise for leads instead of clicks. Optional.', required: false },
  { key: 'gbp_manager_access', kind: 'access', label: 'Google Business Profile manager access', hint: 'Invite New Wave as a manager of the Business Profile so the listing changes can be made.', required: true },
  { key: 'website_access', kind: 'secret', label: 'Website access', hint: 'A login to the site’s CMS or hosting (or your developer’s contact) so the website changes can be made.', required: true },
  { key: 'brand_assets', kind: 'access', label: 'Brand assets', hint: 'The logo files and any brand guide, shared as a link or by email.', required: false },
  { key: 'crm_booking_access', kind: 'access', label: 'CRM, booking or point-of-sale access', hint: 'Access to the systems that hold customers and sales, so they can be connected to the tracking.', required: false },
  { key: 'social_logins', kind: 'secret', label: 'Social media logins', hint: 'If you would rather not link Instagram: the login the team posts with.', required: false },
  { key: 'ads_logins', kind: 'secret', label: 'Ad account logins', hint: 'If you would rather not link the ad accounts: the login the team builds the campaigns with.', required: false },
];
export const findSetupItem = (key: string) => SETUP_ITEMS.find((i) => i.key === key);
export const isSetupKey = (v: unknown): v is string => typeof v === 'string' && SETUP_ITEMS.some((i) => i.key === v);

export interface HeadwayServiceDef {
  key: HeadwayService;
  label: string;
  /** What Headway does for it, automatically where it can. */
  does: string;
  /** Which of it runs on its own through the linked accounts, and which is a brief for the team. */
  automatic: string[];
  team: string[];
  /** Setup items the service needs, required ones first. */
  needs: string[];
}

export const HEADWAY_SERVICE_INFO: Record<HeadwayService, HeadwayServiceDef> = {
  'social-media': {
    key: 'social-media',
    label: 'Social media',
    does: 'Publishes the plan’s first week of posts to the business’s Instagram, with the business’s own images, and briefs the rest.',
    automatic: ['Instagram posts from the plan, one a day, each approved first'],
    team: ['Facebook, TikTok, LinkedIn and YouTube posts', 'Replies and community management'],
    needs: ['link:instagram', 'social_logins', 'facebook_page_id'],
  },
  'brand-development': {
    key: 'brand-development',
    label: 'Brand development',
    does: 'Turns the benchmark’s differences and do-not-copy rules into a brief for positioning, messaging and identity work.',
    automatic: [],
    team: ['Positioning and messaging', 'Identity work from the brief'],
    needs: ['brand_assets'],
  },
  'website-design': {
    key: 'website-design',
    label: 'Website design',
    does: 'Lists every page change from the website optimization plan with its reason and evidence, submits the sitemap once the pages change, and hands the changes to the team with the site access.',
    automatic: ['Sitemap submitted to Search Console'],
    team: ['Page changes and new pages from the plan'],
    needs: ['website_access', 'link:google_search_console'],
  },
  marketing: {
    key: 'marketing',
    label: 'Smart advertising',
    does: 'Builds the ad sets in the ad accounts, paused: the Google search campaign with its ad groups, keywords, negatives and ads, and each Meta set with its ad. Turning them on is a second approval.',
    automatic: ['Google Ads search campaign (paused)', 'Meta campaigns, ad sets and ads (paused)', 'Switching them on, after approval'],
    team: ['Weekly budget moves and creative tests'],
    needs: ['link:googleads', 'link:metaads', 'ads_logins', 'facebook_page_id', 'business_zip', 'google_ads_customer_id', 'meta_pixel_id'],
  },
  integration: {
    key: 'integration',
    label: 'Integrations & data',
    does: 'Finds what the site scan says is missing (analytics, the Meta pixel, booking paths) and briefs the tracking and connection work.',
    automatic: [],
    team: ['Tracking tags and conversion events', 'CRM, booking and point-of-sale connections'],
    needs: ['link:google_analytics', 'website_access', 'crm_booking_access'],
  },
  'digital-oversight': {
    key: 'digital-oversight',
    label: 'Analytics & oversight',
    does: 'Reads the plan against the business’s own accounts a month after the work starts, and briefs the monthly report.',
    automatic: ['The integrated plan run again on the linked accounts, 30 days on'],
    team: ['The monthly report against revenue'],
    needs: ['link:google_analytics', 'link:google_search_console', 'link:googleads', 'link:metaads', 'gbp_manager_access'],
  },
};

/** Setup-item states. A `link` item is `linked` or `pending` from the client-accounts table; the rest come from groundswell_setup_items. */
export type SetupStatus = 'needed' | 'pending' | 'linked' | 'provided' | 'waived';
export const SETUP_STATUSES: readonly SetupStatus[] = ['needed', 'pending', 'linked', 'provided', 'waived'];
/** The states a person can set on a typed item (links come from the accounts card). */
export const SETTABLE_SETUP_STATUSES = ['provided', 'waived', 'needed'] as const;
export const isSettableSetupStatus = (v: unknown): v is (typeof SETTABLE_SETUP_STATUSES)[number] => SETTABLE_SETUP_STATUSES.includes(v as never);

export interface ChecklistItem extends SetupItemDef {
  status: SetupStatus;
  /** True when this item or its alternative is in place. */
  satisfied: boolean;
  /** The services (switched on for the customer) that need it. */
  for: HeadwayService[];
  /** A masked hint of a stored value (the last characters), never the value. */
  value_hint: string | null;
  provided_at: string | null;
  notes: string | null;
}

/**
 * How an action gets done: `automatic` through a linked account (Composio),
 * `handoff` as a brief the team carries out and marks done.
 */
export type ActionKind = 'automatic' | 'handoff';
export const ACTION_STATUSES = ['proposed', 'approved', 'applying', 'applied', 'failed', 'declined', 'done'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export const isActionStatus = (v: unknown): v is ActionStatus => ACTION_STATUSES.includes(v as ActionStatus);

/** The tools the automatic actions run, by name (api/_lib/groundswell/headway/apply.ts). */
export const ACTION_TOOLS = ['instagram.publish', 'googleads.campaign', 'googleads.enable', 'metaads.adset', 'metaads.enable', 'search_console.sitemap', 'groundswell.measure'] as const;
export type ActionTool = (typeof ACTION_TOOLS)[number];

export interface HeadwayAction {
  id: string;
  customer_id: string;
  plan_id: string;
  service: HeadwayService;
  kind: ActionKind;
  tool: ActionTool | null;
  title: string;
  /** What will be done, in full (a caption, the campaign's rows), for the approval. */
  detail: string;
  status: ActionStatus;
  /** Setup keys the action waits on; empty when it can run. */
  blocked_by: string[];
  /** The action that must be applied first (turning on a campaign waits on creating it). */
  depends_on: string | null;
  /** Not before this time (a post's day; the measurement a month on). */
  scheduled_for: string | null;
  /** What applying it produced: ids and links, for the record; staff only sees `error`. */
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  approved_by: string | null;
  approved_at: string | null;
  applied_at: string | null;
  created_at: string;
}

export interface HeadwayPlanSummary {
  id: string;
  customer_id: string;
  audit_id: string | null;
  status: 'open' | 'closed';
  summary: string;
  created_at: string;
  counts: Record<ActionStatus, number>;
}

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  proposed: 'Waiting for approval',
  approved: 'Approved',
  applying: 'Applying',
  applied: 'Applied',
  failed: 'Failed',
  declined: 'Declined',
  done: 'Done',
};

/** The last few characters of a stored value, for the checklist; never more. */
export function valueHint(value: string): string {
  const v = value.replace(/\s+/g, '');
  if (v.length <= 4) return '•'.repeat(v.length);
  return `…${v.slice(-4)}`;
}
