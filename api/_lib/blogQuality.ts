/**
 * SEO and accuracy rules for AI-written blog posts (api/blog/generate-post.ts).
 * Pure functions: the model returns a structured draft, this module assembles
 * the Markdown, keeps only links to real pages on this site, adds the internal
 * links every post must carry, and reports what still fails the bar. The first
 * automated post had three invented statistics, 705 words, and no internal
 * links; these checks are what catch that before anything is published.
 */

export interface DraftSection {
  heading: string;
  body: string;
}

export interface DraftFaq {
  question: string;
  answer: string;
}

export interface BlogDraft {
  primary_keyword: string;
  title: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  excerpt: string;
  featured_image_query: string;
  tags: string[];
  intro: string;
  sections: DraftSection[];
  faqs: DraftFaq[];
  conclusion: DraftSection;
}

export interface SiteLink {
  path: string;
  label: string;
}

/** Pages a post may link to. Anything else the model writes is unlinked (a test checks each path is a real route). */
export const LINKABLE_PAGES: readonly (SiteLink & { about: string })[] = [
  { path: '/services', label: 'IT services', about: 'overview of every New Wave IT service' },
  { path: '/service-category/managed-it-services', label: 'managed IT services', about: 'flat-rate managed IT, monitoring, patching, backup and disaster recovery' },
  { path: '/service-category/cybersecurity', label: 'cybersecurity services', about: 'SOC monitoring, endpoint protection, compliance' },
  { path: '/service-category/live-it-support', label: '24/7 IT support', about: 'help desk, remote and on-site support' },
  { path: '/service-category/cloud-solutions', label: 'cloud and Microsoft 365 services', about: 'cloud migration, Azure, Microsoft 365' },
  { path: '/service-category/network-infrastructure', label: 'network infrastructure services', about: 'business WiFi, cabling, firewalls, VPN' },
  { path: '/service-category/it-repair-upgrades', label: 'IT repair and upgrades', about: 'hardware repair and upgrades' },
  { path: '/service-category/healthcare', label: 'healthcare IT', about: 'HIPAA-compliant IT for medical practices' },
  { path: '/l/managed-it-guide', label: 'Managed IT Services Strategy Guide', about: 'guide to managed IT' },
  { path: '/l/cybersecurity-guide', label: 'Complete Cybersecurity Guide', about: 'guide to business cybersecurity' },
  { path: '/l/cloud-solutions-guide', label: 'Cloud Solutions Strategy Guide', about: 'guide to cloud strategy' },
  { path: '/l/network-infrastructure-guide', label: 'Network Infrastructure Design Guide', about: 'guide to network design' },
  { path: '/l/it-support-guide', label: 'IT Support Excellence Guide', about: 'guide to IT support' },
  { path: '/pricing', label: 'IT services pricing', about: 'flat-rate pricing and quotes' },
  { path: '/contact', label: 'free IT assessment', about: 'contact New Wave IT for a free IT assessment' },
];

const LINKABLE = new Set(LINKABLE_PAGES.map((page) => page.path));

/** The service page and guide every post in a category links to, whatever the model wrote. */
export const CATEGORY_LINKS: Record<string, { service: SiteLink; guide: SiteLink }> = {
  'Managed IT Services': { service: { path: '/service-category/managed-it-services', label: 'managed IT services' }, guide: { path: '/l/managed-it-guide', label: 'Managed IT Services Strategy Guide' } },
  Cybersecurity: { service: { path: '/service-category/cybersecurity', label: 'cybersecurity services' }, guide: { path: '/l/cybersecurity-guide', label: 'Complete Cybersecurity Guide' } },
  'Cloud Solutions': { service: { path: '/service-category/cloud-solutions', label: 'cloud solutions' }, guide: { path: '/l/cloud-solutions-guide', label: 'Cloud Solutions Strategy Guide' } },
  'Network Infrastructure': { service: { path: '/service-category/network-infrastructure', label: 'network infrastructure services' }, guide: { path: '/l/network-infrastructure-guide', label: 'Network Infrastructure Design Guide' } },
  'Microsoft 365': { service: { path: '/service-category/cloud-solutions', label: 'Microsoft 365 and cloud services' }, guide: { path: '/l/cloud-solutions-guide', label: 'Cloud Solutions Strategy Guide' } },
  'IT Support': { service: { path: '/service-category/live-it-support', label: '24/7 IT support' }, guide: { path: '/l/it-support-guide', label: 'IT Support Excellence Guide' } },
  'Backup & Disaster Recovery': { service: { path: '/service-category/managed-it-services', label: 'managed backup and disaster recovery' }, guide: { path: '/l/managed-it-guide', label: 'Managed IT Services Strategy Guide' } },
};

export const WORDS = { target: [1400, 1800], soft: 1300, hard: 1100 } as const;
export const META_TITLE_MAX = 50;
export const META_DESCRIPTION = { min: 130, max: 158 } as const;
const GENERIC_HEADINGS = /^(introduction|intro|overview|summary|conclusion|final thoughts|call to action|cta|next steps)$/i;

/** Keeps Markdown links only when they point at a listed page on this site; every other link becomes its text. */
export function sanitizeLinks(markdown: string): string {
  return markdown.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_match, text: string, href: string) => {
    const path = href.replace(/^https?:\/\/(www\.)?newwaveitfl\.com/i, '').replace(/\/$/, '') || '/';
    return LINKABLE.has(path) ? `[${text}](${path})` : text;
  });
}

/** Headings inside a section body must stay below the section's H2 (the page's H1 is the title). */
function demoteHeadings(markdown: string): string {
  return markdown.replace(/^#{1,2}\s+/gm, '### ');
}

const clean = (markdown: string) => demoteHeadings(sanitizeLinks(markdown.trim()));

export function internalLinkLine(category: string): string {
  const links = CATEGORY_LINKS[category] ?? CATEGORY_LINKS['Managed IT Services'];
  return (
    `**Next steps:** explore our [${links.service.label}](${links.service.path}), ` +
    `read the [${links.guide.label}](${links.guide.path}), or [book a free IT assessment](/contact) with our Fort Lauderdale team.`
  );
}

/** The post body in Markdown: intro, H2 sections, FAQ, conclusion, and the internal links every post carries. */
export function assembleContent(draft: BlogDraft, category: string): string {
  const parts = [clean(draft.intro)];
  for (const section of draft.sections) {
    parts.push(section.heading.trim() ? `## ${section.heading.trim()}\n\n${clean(section.body)}` : clean(section.body));
  }
  if (draft.faqs.length) {
    parts.push(
      '## Frequently asked questions\n\n' +
        draft.faqs.map((faq) => `### ${faq.question.trim()}\n\n${clean(faq.answer)}`).join('\n\n'),
    );
  }
  const conclusionHeading = draft.conclusion.heading.trim() || capitalize(fallbackConclusionHeading(draft.primary_keyword));
  parts.push(`## ${conclusionHeading}\n\n${clean(draft.conclusion.body)}`);
  parts.push(internalLinkLine(category));
  return parts.join('\n\n') + '\n';
}

/** Words as a reader sees them: link targets and Markdown markers don't count. */
export function countWords(markdown: string): number {
  const text = markdown.replace(/\]\([^)]*\)/g, ']').replace(/[#*_>`[\]-]/g, ' ');
  return text.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
}

const STATISTIC = [
  /\b\d+(?:\.\d+)?\s?%/,
  /\b\d+(?:\.\d+)?\s?percent\b/i,
  /\$\s?\d/,
  /\b\d+(?:\.\d+)?\s?(?:million|billion|trillion)\b/i,
  /\b(?:study|survey|report|research)\b[^.]*\b(?:found|finds|shows?|showed|reveal(?:s|ed)?)\b/i,
];

/** Sentences carrying a figure or a cited study: the model is told not to invent them, and this catches when it does. */
export function findStatistics(markdown: string): string[] {
  return markdown
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => STATISTIC.some((pattern) => pattern.test(sentence)))
    .map((sentence) => sentence.trim());
}

const truncateAtWord = (text: string, max: number) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '');
};

/** The site appends " | New Wave IT" itself; a model-written suffix would repeat or crowd out the keyword. */
const BRAND_SUFFIX = /\s*[|:–—-]\s*New Wave IT\s*$/i;
const LOCATION = /fort lauderdale|south florida|broward|miami|palm beach|florida/i;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Heading for a conclusion the model left untitled; an empty "## " must never reach the page. */
export const fallbackConclusionHeading = (keyword: string) =>
  keyword?.trim() ? `Get help with ${keyword.trim().toLowerCase()} in South Florida` : 'Talk to a South Florida IT team';

/** Deterministic fixes that need no second model call. */
export function normalizeDraft(draft: BlogDraft): BlogDraft {
  const metaTitle = (draft.meta_title?.trim() || draft.title.trim()).replace(BRAND_SUFFIX, '').trim() || draft.title.trim();
  return {
    ...draft,
    title: draft.title.trim(),
    meta_title: metaTitle.length > 60 ? truncateAtWord(metaTitle, 60) : metaTitle,
    meta_description: truncateAtWord((draft.meta_description ?? '').trim(), 160),
    excerpt: truncateAtWord((draft.excerpt ?? '').trim(), 200),
    tags: (draft.tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 6),
    sections: (draft.sections ?? []).filter((section) => section?.heading?.trim() && section?.body?.trim()),
    faqs: (draft.faqs ?? []).filter((faq) => faq?.question?.trim() && faq?.answer?.trim()),
    conclusion: {
      heading: draft.conclusion?.heading?.trim() || capitalize(fallbackConclusionHeading(draft.primary_keyword)),
      body: draft.conclusion?.body ?? '',
    },
  };
}

export type IssueTarget = 'meta' | 'intro' | 'conclusion' | 'faqs' | `section:${number}`;

export interface QualityIssue {
  code: string;
  message: string;
  /** Parts of the draft a repair should rewrite. */
  targets: IssueTarget[];
  /** Blocks publishing when it survives the repair pass. */
  blocking: boolean;
}

export interface QualityReport {
  words: number;
  issues: QualityIssue[];
  /** True when nothing blocking is left. */
  publishable: boolean;
}

const includesKeyword = (text: string, keyword: string) => !!keyword && text.toLowerCase().includes(keyword.toLowerCase());

export function reviewDraft(draft: BlogDraft, category: string): QualityReport {
  const content = assembleContent(draft, category);
  const words = countWords(content);
  const issues: QualityIssue[] = [];
  const keyword = draft.primary_keyword?.trim() ?? '';
  const add = (code: string, message: string, targets: IssueTarget[], blocking = false) =>
    issues.push({ code, message, targets, blocking });

  if (draft.sections.length < 4) add('sections', `Only ${draft.sections.length} body sections; write 5-6.`, [], true);

  if (words < WORDS.soft) {
    const counted = draft.sections.map((section, index) => ({ index, words: countWords(section.body) }));
    const thin = counted.filter((section) => section.words < 250);
    const expand = (thin.length ? thin : [...counted].sort((a, b) => a.words - b.words).slice(0, 2));
    add(
      'length',
      `The article is ${words} words; it needs ${WORDS.target[0]}-${WORDS.target[1]}. Rewrite each of these sections to 260-320 words with concrete, practical detail (examples, steps, what to ask a provider): ` +
        expand.map((section) => `section:${section.index} (now ${section.words} words)`).join(', ') + '.',
      expand.map(({ index }) => `section:${index}` as IssueTarget),
      words < WORDS.hard,
    );
  }

  const statisticTargets: IssueTarget[] = [];
  if (findStatistics(draft.intro).length) statisticTargets.push('intro');
  draft.sections.forEach((section, index) => findStatistics(section.body).length && statisticTargets.push(`section:${index}`));
  if (draft.faqs.some((faq) => findStatistics(faq.answer).length)) statisticTargets.push('faqs');
  if (findStatistics(draft.conclusion.body).length) statisticTargets.push('conclusion');
  if (statisticTargets.length) {
    add('statistics', 'Remove every statistic, percentage, dollar figure, and cited study or survey; state the point qualitatively instead.', statisticTargets, true);
  }

  if (!keyword) add('keyword', 'No primary keyword.', ['meta'], true);
  else {
    if (!includesKeyword(draft.title, keyword)) add('keyword-title', `The title must contain "${keyword}".`, ['meta']);
    if (!includesKeyword(draft.meta_description, keyword)) add('keyword-description', `The meta description must contain "${keyword}".`, ['meta']);
    const opening = content.split(/\s+/).slice(0, 100).join(' ');
    if (!includesKeyword(opening, keyword)) add('keyword-intro', `Use "${keyword}" within the first 100 words.`, ['intro']);
    if (!draft.sections.some((section) => includesKeyword(section.heading, keyword))) {
      add('keyword-heading', `At least one section heading must contain "${keyword}".`, ['section:0']);
    }
  }

  if (draft.title.length < 40 || draft.title.length > 65) add('title-length', `The title is ${draft.title.length} characters; write 45-60.`, ['meta']);
  if (draft.meta_title.length > META_TITLE_MAX) add('meta-title-length', `The meta title is ${draft.meta_title.length} characters; keep it at ${META_TITLE_MAX} or fewer.`, ['meta']);
  if (!LOCATION.test(draft.meta_title)) add('meta-title-location', `Add "Fort Lauderdale" or "South Florida" to the meta title, keeping it at ${META_TITLE_MAX} characters or fewer.`, ['meta']);
  if (countWords(draft.conclusion.body) < 60) add('conclusion', 'Write a 100-150 word conclusion that sums up and invites the reader to talk to New Wave IT.', ['conclusion']);
  if (draft.meta_description.length < META_DESCRIPTION.min) {
    add('meta-description-length', `The meta description is ${draft.meta_description.length} characters; write 140-155.`, ['meta']);
  }

  const generic = draft.sections.map((section, index) => ({ section, index })).filter(({ section }) => GENERIC_HEADINGS.test(section.heading.trim()));
  if (generic.length || GENERIC_HEADINGS.test(draft.conclusion.heading.trim())) {
    add('generic-headings', 'Replace generic headings ("Introduction", "Conclusion", …) with specific, descriptive ones.', [
      ...generic.map(({ index }) => `section:${index}` as IssueTarget),
      ...(GENERIC_HEADINGS.test(draft.conclusion.heading.trim()) ? (['conclusion'] as IssueTarget[]) : []),
    ]);
  }

  if (draft.faqs.length < 3) add('faqs', `Only ${draft.faqs.length} FAQs; write 4.`, ['faqs']);

  return { words, issues, publishable: !issues.some((issue) => issue.blocking) };
}

/** A repair reply: only the parts the model rewrote. */
export interface DraftPatch {
  title?: string;
  meta_title?: string;
  meta_description?: string;
  intro?: string;
  sections?: { index: number; heading?: string; body?: string }[];
  faqs?: DraftFaq[];
  conclusion?: Partial<DraftSection>;
}

/**
 * Merges a repair reply. Empty strings and placeholder items are "no change"
 * (a model echoing the reply shape must not wipe what it didn't rewrite), and
 * FAQs are replaced only by a set at least as complete as the one they replace.
 */
export function applyPatch(draft: BlogDraft, patch: DraftPatch): BlogDraft {
  const text = (value?: string) => (value?.trim() ? value : undefined);
  const faqs = (patch.faqs ?? []).filter((faq) => faq?.question?.trim() && faq?.answer?.trim());
  const sections = draft.sections.map((section) => ({ ...section }));
  for (const change of patch.sections ?? []) {
    if (!Number.isInteger(change.index) || !sections[change.index]) continue;
    if (change.heading?.trim()) sections[change.index].heading = change.heading;
    if (change.body?.trim()) sections[change.index].body = change.body;
  }
  return normalizeDraft({
    ...draft,
    title: patch.title?.trim() || draft.title,
    meta_title: patch.meta_title?.trim() || draft.meta_title,
    meta_description: patch.meta_description?.trim() || draft.meta_description,
    intro: patch.intro?.trim() || draft.intro,
    sections,
    faqs: faqs.length >= Math.min(3, Math.max(draft.faqs.length, 1)) ? faqs : draft.faqs,
    conclusion: {
      heading: text(patch.conclusion?.heading) ?? draft.conclusion.heading,
      body: text(patch.conclusion?.body) ?? draft.conclusion.body,
    },
  });
}

/** Slug of at most 60 characters on a word boundary. */
export function shortenSlug(slug: string): string {
  if (slug.length <= 60) return slug;
  return slug.slice(0, 61).replace(/-[^-]*$/, '');
}
