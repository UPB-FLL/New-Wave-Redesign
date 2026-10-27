import { STATUS_SERVICES } from '../../lib/statusPages';
import type { ScalarField, SectionDescriptor, SelectOption } from './types';

/**
 * One descriptor per `site_content` section the public site reads. Keys,
 * list shapes and defaults are carried over from the editors they replace
 * (2026-10-21), so nothing stored changes shape.
 */

const text = (key: string, label: string, hint?: string): ScalarField => ({ key, label, kind: 'text', hint });
const textarea = (key: string, label: string, hint?: string): ScalarField => ({ key, label, kind: 'textarea', hint });
const select = (key: string, label: string, options: SelectOption[], hint?: string): ScalarField => ({ key, label, kind: 'select', options, hint });
const strings = (key: string, label: string, hint?: string): ScalarField => ({ key, label, kind: 'strings', hint });
const color = (key: string, label: string, hint?: string): ScalarField => ({ key, label, kind: 'color', hint });

const ACCENTS = { teal: '#39CCCC', deepTeal: '#2db8b8', green: '#5EBC67' };

const headlineBlock = (hints: { label?: string; headline?: string; accent?: string; sub?: string } = {}) => [
  text('section_label', 'Section label', hints.label ?? 'Small label above the headline'),
  text('headline', 'Headline', hints.headline ?? 'Main heading'),
  text('headline_accent', 'Headline accent', hints.accent ?? 'The word in the headline that gets the gradient colour'),
  textarea('subheadline', 'Subheadline', hints.sub ?? 'Supporting text under the headline'),
];

export const HERO: SectionDescriptor = {
  section: 'hero',
  title: 'Hero',
  description: 'The first screen of the home page.',
  url: '/',
  blocks: [
    {
      anchor: 'hero', id: 'headline',
      title: 'Headline',
      description: 'Badge, headline, and the text under it',
      fields: [
        text('badge', 'Badge text', 'Small label above the main headline'),
        text('headline_part1', 'Headline part 1', 'First part of the main headline'),
        text('headline_accent', 'Headline accent 1 (teal)', 'Word that gets the teal gradient'),
        text('headline_part2', 'Headline part 2', 'Second part of the headline'),
        text('headline_accent2', 'Headline accent 2 (green)', 'Word that gets the green gradient'),
        textarea('subheadline', 'Subheadline', 'Supporting text below the main headline'),
      ],
    },
    {
      anchor: 'hero', id: 'cta',
      title: 'Buttons and phone',
      fields: [
        text('cta_primary', 'Primary button label', 'Main action button text'),
        text('cta_secondary', 'Secondary button label', 'Secondary action button text'),
        text('phone', 'Phone number', 'With country code, e.g. +15615641846; the tel: link under the buttons'),
      ],
    },
    {
      anchor: 'hero', id: 'stats',
      title: 'Mini stats',
      description: 'The short facts under the hero (24/7, Local, Flat-rate). Words, not unverified numbers.',
      fields: [{
        key: 'stats', label: 'Stats', kind: 'list', itemLabel: 'stat', titleKey: 'value', subtitleKey: 'label',
        fields: [text('value', 'Value', 'e.g. 24/7, Local, Flat-rate'), text('label', 'Label', 'e.g. Support, Team, Pricing')],
        newItem: { value: '', label: '' },
      }],
    },
    {
      anchor: 'hero', id: 'cards',
      title: 'Feature cards',
      description: 'The cards on the right of the hero',
      fields: [{
        key: 'feature_cards', label: 'Feature cards', kind: 'list', itemLabel: 'card', titleKey: 'title', subtitleKey: 'desc',
        fields: [text('title', 'Title'), textarea('desc', 'Description')],
        newItem: { title: '', desc: '' },
      }],
    },
  ],
};

const TRUST_ICONS: SelectOption[] = ['Shield', 'Award', 'Star', 'Users', 'TrendingUp', 'CheckCircle', 'Lock', 'Cloud', 'Server', 'Zap', 'Globe', 'Briefcase']
  .map((v) => ({ value: v, label: v.replace(/([a-z])([A-Z])/g, '$1 $2') }));

export const TRUSTBAR: SectionDescriptor = {
  section: 'trustbar',
  title: 'Trust bar',
  description: 'Partnerships shown below the hero. Only documented partners (Huntress, Microsoft, Cisco).',
  url: '/',
  blocks: [
    { anchor: 'trust-bar', id: 'heading', title: 'Heading', fields: [text('heading', 'Heading text', 'e.g. Trusted by businesses across South Florida')] },
    {
      anchor: 'trust-bar', id: 'items',
      title: 'Trust items',
      fields: [{
        key: 'items', label: 'Trust items', kind: 'list', itemLabel: 'item', titleKey: 'label', subtitleKey: 'sub',
        fields: [select('icon', 'Icon', TRUST_ICONS), text('label', 'Label', 'e.g. Huntress Partner'), text('sub', 'Subtitle', 'e.g. Managed threat detection')],
        newItem: { icon: 'Shield', label: '', sub: '' },
        defaults: [
          { icon: 'Shield', label: 'Huntress Partner', sub: 'Managed threat detection' },
          { icon: 'Award', label: 'Microsoft Partner', sub: 'Microsoft 365 and Azure' },
          { icon: 'Users', label: 'Cisco Partner', sub: 'Network solutions' },
          { icon: 'Star', label: 'Flat-Rate Pricing', sub: 'Published per-device rates' },
          { icon: 'Briefcase', label: 'Local Team', sub: 'Fort Lauderdale based' },
        ],
      }],
    },
  ],
};

export const SERVICES: SectionDescriptor = {
  section: 'services',
  title: 'Service cards',
  description: 'The services band on the home page.',
  url: '/#services',
  blocks: [
    { anchor: 'services', id: 'headline', title: 'Headline', fields: headlineBlock({ accent: 'Gradient-coloured word in the headline (e.g. Modern Business)' }) },
    {
      anchor: 'services', id: 'cards',
      title: 'Service cards',
      fields: [{
        key: 'cards', label: 'Service cards', kind: 'list', itemLabel: 'card', titleKey: 'title', subtitleKey: 'description',
        fields: [
          text('title', 'Service title'),
          textarea('description', 'Description'),
          strings('highlights', 'Highlights', 'Three short points shown on the card'),
          color('accent', 'Accent colour', 'Border and icon tint for this card'),
        ],
        newItem: { title: '', description: '', highlights: [], accent: ACCENTS.teal },
      }],
    },
  ],
};

const numbered = (prefix: string, n: number, titleHint: string) => [
  text(`${prefix}${n}_title`, `Point ${n} title`, titleHint),
  textarea(`${prefix}${n}_desc`, `Point ${n} description`),
];

export const WHYUS: SectionDescriptor = {
  section: 'whyus',
  title: 'Why us',
  description: 'Proof points and feature cards, on the home page and /why-us.',
  url: '/why-us',
  blocks: [
    {
      anchor: 'why-us', id: 'headline',
      title: 'Headline',
      fields: [...headlineBlock(), text('cta_label', 'Button label', 'Call-to-action button text')],
    },
    {
      anchor: 'why-us', id: 'proof',
      title: 'Proof points',
      description: 'Short facts, no unverified numbers',
      fields: [strings('proof_points', 'Proof points')],
    },
    {
      anchor: 'why-us', id: 'cards',
      title: 'Feature cards',
      fields: [{
        key: 'feature_cards', label: 'Feature cards', kind: 'list', itemLabel: 'card', titleKey: 'title', subtitleKey: 'desc',
        fields: [text('title', 'Title'), textarea('desc', 'Description')],
        newItem: { title: '', desc: '' },
      }],
    },
    {
      anchor: 'why-us', id: 'how',
      title: 'How it works',
      fields: [
        text('how_it_works_title', 'Section title', 'e.g. How It Works'),
        textarea('how_it_works_desc', 'Section description'),
        ...['Assessment', 'Planning', 'Implementation & Support'].flatMap((stage, index) => [
          text(`how_step${index + 1}_title`, `${stage} title`, `e.g. ${stage}`),
          textarea(`how_step${index + 1}_desc`, `${stage} description`),
        ]),
      ],
    },
  ],
};

export const ABOUT: SectionDescriptor = {
  section: 'about',
  title: 'About',
  description: 'The company story on /about.',
  url: '/about',
  blocks: [
    {
      anchor: 'about', id: 'headline',
      title: 'Headline',
      fields: [
        text('section_label', 'Section label', 'Label above the headline'),
        text('headline', 'Headline'),
        text('headline_accent', 'Headline accent', 'Word that gets the gradient colour'),
      ],
    },
    {
      anchor: 'about', id: 'story',
      title: 'Story',
      fields: [textarea('paragraph1', 'Paragraph 1', 'Opening paragraph'), textarea('paragraph2', 'Paragraph 2'), textarea('paragraph3', 'Paragraph 3', 'Closing paragraph')],
    },
    {
      anchor: 'about', id: 'team',
      title: 'Team',
      fields: [
        text('years_badge', 'Years badge', 'e.g. 15 or 20+ (leave empty to show none)'),
        text('years_label', 'Years badge label', 'e.g. Years of Experience'),
        text('team_tagline', 'Team tagline'),
        text('team_sub', 'Team sub-text'),
      ],
    },
    {
      anchor: 'about', id: 'approach',
      title: 'Our approach',
      fields: [
        text('approach_title', 'Section title', 'e.g. Our Approach'),
        textarea('approach_desc', 'Section description'),
        ...[1, 2, 3, 4].flatMap((n) => numbered('approach_point', n, ['e.g. Proactive', 'e.g. Collaborative', 'e.g. Certified', 'e.g. Responsive'][n - 1])),
      ],
    },
    {
      anchor: 'about', id: 'why',
      title: 'Why choose us',
      fields: [
        text('why_choose_title', 'Section title', 'e.g. Why Choose New Wave IT?'),
        textarea('why_choose_desc', 'Section description'),
        ...[1, 2, 3].flatMap((n) => numbered('why_reason', n, ['e.g. Flat-Rate Pricing', 'e.g. Local Expertise', 'e.g. True Partnership'][n - 1])),
      ],
    },
  ],
};

export const CONTACT: SectionDescriptor = {
  section: 'contact',
  title: 'Contact',
  description: 'The contact section on /contact and the support page.',
  url: '/contact',
  blocks: [
    { anchor: 'contact', id: 'headline', title: 'Headline', fields: headlineBlock() },
    {
      anchor: 'contact', id: 'details',
      title: 'Phone, email, address',
      fields: [
        text('phone', 'Phone number', 'As shown, e.g. (561) 564-1846'),
        text('phone_sub', 'Phone description', 'Supporting text under the phone option'),
        text('email', 'Email address'),
        text('email_sub', 'Email description'),
        text('address', 'Street address'),
        text('address_city', 'City, state, ZIP'),
        text('address_sub', 'Address description'),
      ],
    },
    {
      anchor: 'contact', id: 'success',
      title: 'Form success message',
      fields: [text('success_title', 'Success title'), textarea('success_body', 'Success message')],
    },
  ],
};

export const FOOTER: SectionDescriptor = {
  section: 'footer',
  title: 'Footer',
  description: 'Tagline, contact details and links at the bottom of every page.',
  url: '/#footer',
  blocks: [
    { anchor: 'footer', id: 'branding', title: 'Tagline', fields: [textarea('tagline', 'Tagline')] },
    {
      anchor: 'footer', id: 'contact',
      title: 'Contact info',
      fields: [text('phone', 'Phone', 'Main phone number'), text('email', 'Email'), textarea('address', 'Address', 'Full street address')],
    },
    {
      anchor: 'footer', id: 'links',
      title: 'Links',
      fields: [
        text('privacy_url', 'Privacy Policy URL'),
        text('terms_url', 'Terms of Service URL'),
        text('facebook_url', 'Facebook URL', 'Leave empty to hide the icon'),
        text('linkedin_url', 'LinkedIn URL', 'Leave empty to hide the icon'),
        text('twitter_url', 'X (Twitter) URL', 'Leave empty to hide the icon'),
      ],
    },
  ],
};

// The SaaS / HaaS / Support tiers that used to sit here were never rendered
// by /pricing (the page shows the quote builder, fed by pricing_units) and
// were retired on 2026-10-26 (GEO audit, owner's call); migration
// 20261103120000 removes the stored row.
export const PRICING: SectionDescriptor = {
  section: 'pricing',
  title: 'Pricing page',
  description: 'The headline on /pricing. The rates themselves are the quote builder units.',
  url: '/pricing',
  blocks: [
    { id: 'headline', title: 'Headline', fields: headlineBlock({ label: 'e.g. Transparent Pricing', accent: 'The word that gets the gradient colour (e.g. Plans)' }) },
  ],
};

// /status links each service to its provider's own status page and states no
// status of its own (2026-10-27), so an entry stores the link in place of the
// status, uptime and check time it used to (entries stored before keep them,
// unread; the page links those by name).
export const STATUS: SectionDescriptor = {
  section: 'status',
  title: 'Status page',
  description: 'The official status pages listed on /status.',
  url: '/status',
  blocks: [
    {
      id: 'headline',
      title: 'Headline',
      fields: [
        text('section_label', 'Section label'),
        text('headline', 'Headline'),
        textarea('subheadline', 'Subheadline'),
      ],
    },
    {
      id: 'services',
      title: 'Services',
      fields: [{
        key: 'services', label: 'Services', kind: 'list', itemLabel: 'service', titleKey: 'name', subtitleKey: 'url',
        fields: [
          text('name', 'Service name'),
          select('category', 'Category', [{ value: 'saas', label: 'SaaS service' }, { value: 'isp', label: 'Internet service provider' }]),
          text('url', 'Official status page', "The provider's own https:// page. Without one, only a service the site already links is shown"),
        ],
        newItem: { name: 'New service', category: 'saas', url: '' },
        defaults: STATUS_SERVICES,
      }],
    },
  ],
};

export const SERVICES_CATEGORIES: SectionDescriptor = {
  section: 'services-categories',
  title: 'Service categories',
  description: 'The six /service-category pages.',
  url: '/services',
  blocks: [{
    id: 'list',
    title: 'Categories',
    fields: [{
      key: 'services_list', label: 'Categories', kind: 'list', itemLabel: 'category', titleKey: 'title', subtitleKey: 'slug',
      fields: [
        text('title', 'Service title'),
        text('slug', 'URL slug', 'Used in /service-category/:slug'),
        textarea('description', 'Description', 'Brief overview for the hero'),
        textarea('details', 'Detailed explanation', 'Shown in the Service Overview section'),
        strings('highlights', 'Highlights'),
        text('seo_link', 'Guide link', 'e.g. /l/cybersecurity-guide or /blog/managed-it-services'),
      ],
      newItem: { title: '', slug: '', description: '', details: '', highlights: [], seo_link: '' },
      defaults: [
        { title: 'Cybersecurity', slug: 'cybersecurity', description: '', details: '', highlights: [], seo_link: '' },
        { title: 'Live IT Support', slug: 'live-it-support', description: '', details: '', highlights: [], seo_link: '' },
        { title: 'IT Repair & Upgrades', slug: 'it-repair-upgrades', description: '', details: '', highlights: [], seo_link: '' },
        { title: 'Managed IT Services', slug: 'managed-it-services', description: '', details: '', highlights: [], seo_link: '' },
        { title: 'Cloud Solutions', slug: 'cloud-solutions', description: '', details: '', highlights: [], seo_link: '' },
        { title: 'Network Infrastructure', slug: 'network-infrastructure', description: '', details: '', highlights: [], seo_link: '' },
      ],
    }],
  }],
};

export const SERVICES_DETAIL: SectionDescriptor = {
  section: 'services-detail',
  title: 'Service details',
  description: 'The /service/:slug pages linked from the cybersecurity page. Only slugs listed here get a link.',
  url: '/cybersecurity',
  blocks: [{
    id: 'list',
    title: 'Services',
    fields: [{
      key: 'services_list', label: 'Services', kind: 'list', itemLabel: 'service', titleKey: 'name', subtitleKey: 'slug',
      fields: [
        text('name', 'Service name'),
        text('slug', 'URL slug', 'Used in /service/:slug'),
        textarea('description', 'Description'),
        strings('features', 'Features'),
        strings('benefits', 'Benefits'),
        textarea('pricing_note', 'Pricing note', 'Any pricing or integration notes'),
      ],
      newItem: { name: '', slug: '', description: '', features: [], benefits: [], pricing_note: '' },
      defaults: ['Microsoft 365', 'Google Workspace', 'AWS', 'Slack', 'Zoom', 'Salesforce', 'HubSpot', 'Stripe'].map((name) => ({
        name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), description: '', features: [], benefits: [], pricing_note: '',
      })),
    }],
  }],
};

export const THREATS_DETAIL: SectionDescriptor = {
  section: 'threats-detail',
  title: 'Threat details',
  description: 'The /threat/:slug pages linked from the cybersecurity page. Only slugs listed here get a link.',
  url: '/cybersecurity',
  blocks: [{
    id: 'list',
    title: 'Threats',
    fields: [{
      key: 'threats_list', label: 'Threats', kind: 'list', itemLabel: 'threat', titleKey: 'name', subtitleKey: 'severity',
      fields: [
        text('name', 'Threat name'),
        text('slug', 'URL slug', 'Used in /threat/:slug'),
        select('severity', 'Severity', ['CRITICAL', 'HIGH', 'MEDIUM'].map((v) => ({ value: v, label: v }))),
        text('impact', 'Impact statement', 'e.g. Encryption of critical data'),
        textarea('description', 'Short description', 'One or two sentences'),
        textarea('details', 'Detailed explanation'),
        strings('mitigation_strategies', 'Mitigation strategies'),
      ],
      newItem: { name: '', slug: '', severity: 'HIGH', impact: '', description: '', details: '', mitigation_strategies: [] },
      defaults: [
        ['Ransomware', 'CRITICAL'], ['Phishing', 'HIGH'], ['DDoS Attacks', 'HIGH'], ['Data Breaches', 'CRITICAL'],
        ['Zero-Day Exploits', 'CRITICAL'], ['Insider Threats', 'MEDIUM'], ['Network Intrusions', 'HIGH'], ['Compliance Violations', 'MEDIUM'],
      ].map(([name, severity]) => ({
        name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), severity, description: '', details: '', mitigation_strategies: [], impact: '',
      })),
    }],
  }],
};

/** Every descriptor, keyed by section. */
export const SECTIONS: Record<string, SectionDescriptor> = Object.fromEntries(
  [HERO, TRUSTBAR, SERVICES, WHYUS, ABOUT, CONTACT, FOOTER, PRICING, STATUS, SERVICES_CATEGORIES, SERVICES_DETAIL, THREATS_DETAIL].map((d) => [d.section, d]),
);
