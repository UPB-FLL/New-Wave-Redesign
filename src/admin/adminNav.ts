/**
 * The admin sidebar's model: four groups, organised by the public page each
 * editor changes (Josh's choice, 2026-10-21). The layout renders it, the
 * search box filters it, and `adminNav.test.ts` holds it to App.tsx's routes
 * and to the CMS sections the public site reads.
 *
 * `section` names the `site_content` section an editor writes (or `pricing_units`,
 * the quote builder's own table). `keywords` are the words someone might type
 * to find that editor: the fields it holds and the places they show.
 * `searchAdminFields` goes one level deeper, into each section descriptor's
 * fields, and links to the editor with `?field=<key>` so it opens on them.
 */

import { SECTIONS } from './sections/descriptors';

export interface AdminNavEntry {
  label: string;
  path: string;
  /** The CMS section this editor writes, if it edits one. */
  section?: string;
  /** Words the search box matches besides the label: field names, where the content shows. */
  keywords: string[];
  end?: boolean;
}

/** A public page, with the editors for each of its blocks in page order. */
export interface AdminNavPage {
  id: string;
  label: string;
  /** The public URL the page's blocks render on. */
  url: string;
  description: string;
  entries: AdminNavEntry[];
}

export interface AdminNavGroup {
  id: string;
  label: string;
  /** Pages (Site pages) or direct entries (Blog, SEO). */
  pages?: AdminNavPage[];
  entries?: AdminNavEntry[];
}

export const SITE_PAGES: AdminNavPage[] = [
  {
    id: 'home',
    label: 'Home',
    url: '/',
    description: 'Hero, trust bar, and the service cards',
    entries: [
      { label: 'Hero', path: '/admin/hero', section: 'hero', keywords: ['badge', 'headline', 'subheadline', 'buttons', 'phone number', 'stats', 'feature cards'] },
      { label: 'Trust bar', path: '/admin/trustbar', section: 'trustbar', keywords: ['partners', 'badges', 'certifications', 'huntress', 'microsoft', 'cisco'] },
      { label: 'Service cards', path: '/admin/services', section: 'services', keywords: ['services overview', 'service cards', 'highlights'] },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    url: '/services',
    description: 'Category pages, service and threat detail pages',
    entries: [
      { label: 'Service categories', path: '/admin/service-categories', section: 'services-categories', keywords: ['category pages', 'cybersecurity', 'managed it', 'cloud', 'network', 'seo link'] },
      { label: 'Service details', path: '/admin/services-detail', section: 'services-detail', keywords: ['service pages', 'features', 'benefits', 'pricing note', 'microsoft 365', 'google workspace'] },
      { label: 'Threat details', path: '/admin/threats-detail', section: 'threats-detail', keywords: ['threat pages', 'ransomware', 'phishing', 'cybersecurity page'] },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    url: '/pricing',
    description: 'The pricing page headline and the quote builder',
    entries: [
      { label: 'Pricing headline', path: '/admin/pricing', section: 'pricing', keywords: ['headline', 'estimate', 'pricing'] },
      { label: 'Quote builder units', path: '/admin/pricing-units', section: 'pricing_units', keywords: ['quote builder', 'units', 'rates', 'per device', 'per user'] },
    ],
  },
  {
    id: 'about',
    label: 'About and Why us',
    url: '/about',
    description: 'Company story and proof points',
    entries: [
      { label: 'About', path: '/admin/about', section: 'about', keywords: ['company story', 'years', 'team', 'tagline', 'mission'] },
      { label: 'Why us', path: '/admin/whyus', section: 'whyus', keywords: ['proof points', 'feature cards', 'why choose'] },
    ],
  },
  {
    id: 'contact',
    label: 'Contact and footer',
    url: '/contact',
    description: 'Phone, email, address, and footer links',
    entries: [
      { label: 'Contact', path: '/admin/contact', section: 'contact', keywords: ['phone', 'email', 'address', 'hours', 'form', 'support page'] },
      { label: 'Footer', path: '/admin/footer', section: 'footer', keywords: ['tagline', 'phone', 'email', 'address', 'links', 'copyright'] },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    url: '/status',
    description: 'The system status page',
    entries: [
      { label: 'Status page', path: '/admin/status', section: 'status', keywords: ['services', 'uptime', 'incidents', 'operational'] },
    ],
  },
];

export const ADMIN_NAV: AdminNavGroup[] = [
  { id: 'site', label: 'Site pages', pages: SITE_PAGES },
  {
    id: 'blog',
    label: 'Blog',
    entries: [
      { label: 'Posts', path: '/admin/blog', end: true, keywords: ['articles', 'generate', 'ai', 'publish', 'edit post'] },
      { label: 'Settings', path: '/admin/blog/settings', keywords: ['schedule', 'weekly', 'model', 'categories'] },
    ],
  },
  {
    id: 'seo',
    label: 'SEO',
    entries: [
      { label: 'Landing pages', path: '/admin/seo', keywords: ['local pages', 'competitor research', 'backlinks', 'keywords'] },
    ],
  },
];
// Groundswell is not in the model: it is its own portal at /groundswell
// (staff pages under /groundswell/admin), linked from the sidebar's foot.

/** Every entry, in sidebar order. */
export function allNavEntries(): AdminNavEntry[] {
  return ADMIN_NAV.flatMap((g) => g.pages ? g.pages.flatMap((p) => p.entries) : (g.entries ?? []));
}

/** The site page an admin path belongs to, if it edits one. */
export function pageForPath(path: string): AdminNavPage | undefined {
  return SITE_PAGES.find((p) => p.entries.some((e) => e.path === path));
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * The entries whose label, page, or keywords contain every word typed.
 * Empty or whitespace-only input matches everything.
 */
export function searchAdminNav(query: string): AdminNavEntry[] {
  const words = normalise(query).split(' ').filter(Boolean);
  if (words.length === 0) return allNavEntries();
  const groupLabel = new Map<AdminNavEntry, string[]>();
  for (const group of ADMIN_NAV) {
    for (const page of group.pages ?? []) page.entries.forEach((e) => groupLabel.set(e, [group.label, page.label, page.url]));
    (group.entries ?? []).forEach((e) => groupLabel.set(e, [group.label]));
  }
  return allNavEntries().filter((entry) => {
    const haystack = normalise([entry.label, ...entry.keywords, ...(groupLabel.get(entry) ?? [])].join(' '));
    return words.every((w) => haystack.includes(w));
  });
}

export interface AdminFieldHit {
  entry: AdminNavEntry;
  /** The field's `site_content` key. */
  key: string;
  label: string;
  block: string;
  /** The editor's path with the field parameter, so it opens on the field. */
  href: string;
}

/** Fields (from the section descriptors) whose label or key contains every word typed. */
export function searchAdminFields(query: string): AdminFieldHit[] {
  const words = normalise(query).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const hits: AdminFieldHit[] = [];
  for (const entry of allNavEntries()) {
    const descriptor = entry.section ? SECTIONS[entry.section] : undefined;
    if (!descriptor) continue;
    for (const block of descriptor.blocks) {
      for (const field of block.fields) {
        const haystack = normalise([field.label, field.key.replace(/_/g, ' ')].join(' '));
        if (words.every((w) => haystack.includes(w))) {
          hits.push({ entry, key: field.key, label: field.label, block: block.title, href: `${entry.path}?field=${encodeURIComponent(field.key)}` });
        }
      }
    }
  }
  return hits;
}
