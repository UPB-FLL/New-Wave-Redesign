import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyPatch,
  assembleContent,
  CATEGORY_LINKS,
  countWords,
  findStatistics,
  LINKABLE_PAGES,
  reviewDraft,
  sanitizeLinks,
  shortenSlug,
} from '../../../api/_lib/blogQuality';
import { goodDraft, prose } from './blogDraftFixture';
import { MAX_DURATION_SECONDS } from '../../../api/blog/generate-post';
import { IT_PAGE_META } from '../../lib/routeMeta';
import { SERVICE_GUIDE_SUMMARIES, serviceGuidePath } from '../../lib/serviceGuides';
import { BLOG_CATEGORIES } from '../../../types/blog';

/** The three sentences the first automated post invented, verbatim. */
const FIRST_POST_STATISTICS = [
  'According to a 2026 study by Tech Research Group, approximately 70% of South Florida businesses have adopted remote work policies.',
  'In 2026, it is estimated that businesses leveraging cloud backup solutions will save up to 30% in operational costs compared to traditional backup methods.',
  'According to a cybersecurity report, businesses using cloud services saw a 40% reduction in data breaches in 2026.',
];

describe('findStatistics', () => {
  it('flags every invented figure from the first automated post', () => {
    FIRST_POST_STATISTICS.forEach((sentence) => expect(findStatistics(sentence), sentence).toHaveLength(1));
    expect(findStatistics('A recent survey found that most offices lack a plan.')).toHaveLength(1);
    expect(findStatistics('Losses can top $50,000 an hour.')).toHaveLength(1);
  });

  it('leaves ordinary numbers alone', () => {
    ['We offer 24/7 support.', 'Follow the 3-2-1 backup rule.', 'Microsoft 365 and Windows 11 need patching.', 'Hurricane season runs June through November in 2026.'].forEach(
      (sentence) => expect(findStatistics(sentence), sentence).toEqual([]),
    );
  });
});

describe('sanitizeLinks', () => {
  it('keeps links to listed pages, normalises our own absolute URLs, and unlinks everything else', () => {
    expect(sanitizeLinks('Read [our guide](/l/managed-it-guide).')).toBe('Read [our guide](/l/managed-it-guide).');
    expect(sanitizeLinks('[Contact](https://www.newwaveitfl.com/contact/)')).toBe('[Contact](/contact)');
    expect(sanitizeLinks('See [a source](https://example.com/study).')).toBe('See a source.');
    expect(sanitizeLinks('Visit [backup page](/services/backup).')).toBe('Visit backup page.');
  });
});

describe('assembleContent', () => {
  it('writes intro, H2 sections, FAQ, conclusion, and three internal links, with no H1', () => {
    const draft = goodDraft({ sections: [...goodDraft().sections.slice(0, 4), { heading: 'Rogue headings', body: '# Big\n## Medium\nText.' }] });
    const content = assembleContent(draft, 'Backup & Disaster Recovery');

    expect(content).not.toMatch(/^#\s/m);
    expect(content).toMatch(/^### Big$/m);
    expect(content).toMatch(/^### Medium$/m);
    expect(content).toMatch(/^## Frequently asked questions$/m);
    expect(content.match(/^### How often should backups run\?$/m)).not.toBeNull();
    expect(content.trim().split('\n').pop()).toBe(
      '**Next steps:** explore our [managed backup and disaster recovery](/service-category/managed-it-services), read the [Managed IT Services Strategy Guide](/l/managed-it-guide), or [book a free IT assessment](/contact) with our Fort Lauderdale team.',
    );
  });
});

describe('reviewDraft', () => {
  it('passes a draft that meets the bar', () => {
    const draft = goodDraft();
    const report = reviewDraft(draft, 'Backup & Disaster Recovery');
    expect(report.words).toBeGreaterThanOrEqual(1400);
    expect(report.issues.map((issue) => issue.code)).toEqual([]);
    expect(report.publishable).toBe(true);
  });

  it('blocks a draft like the first automated post: invented figures, 700 words, generic headings', () => {
    const draft = goodDraft({
      primary_keyword: 'cloud backup',
      title: 'Cloud-Based Backup Solutions for South Florida Businesses',
      intro: `${FIRST_POST_STATISTICS[0]} ${prose(80)}`,
      sections: [
        { heading: 'Introduction', body: prose(90) },
        { heading: 'Cost-Effectiveness of Pay-As-You-Go Models', body: `${FIRST_POST_STATISTICS[1]} ${prose(90)}` },
        { heading: 'Enhanced Data Security Features', body: `${FIRST_POST_STATISTICS[2]} ${prose(90)}` },
        { heading: 'Practical Tips', body: prose(90) },
      ],
      faqs: [],
      conclusion: { heading: 'Conclusion', body: prose(60) },
    });
    const report = reviewDraft(draft, 'Backup & Disaster Recovery');
    const codes = report.issues.map((issue) => issue.code);

    expect(report.publishable).toBe(false);
    expect(codes).toEqual(expect.arrayContaining(['length', 'statistics', 'generic-headings', 'faqs', 'keyword-description', 'keyword-heading']));
    const statistics = report.issues.find((issue) => issue.code === 'statistics');
    expect(statistics?.targets).toEqual(['intro', 'section:1', 'section:2']);
  });

  it('asks for a keyword in the opening, a heading, the title, and the meta description', () => {
    const draft = goodDraft({ primary_keyword: 'backup testing service' });
    expect(reviewDraft(draft, 'IT Support').issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['keyword-title', 'keyword-description', 'keyword-intro', 'keyword-heading']),
    );
  });
});

describe('applyPatch', () => {
  it('rewrites only the parts named in the repair and keeps the rest', () => {
    const draft = goodDraft();
    const patched = applyPatch(draft, { sections: [{ index: 1, body: 'New body.' }, { index: 99, body: 'ignored' }], meta_title: 'Shorter title' });
    expect(patched.sections[1]).toEqual({ heading: draft.sections[1].heading, body: 'New body.' });
    expect(patched.sections[0]).toEqual(draft.sections[0]);
    expect(patched.meta_title).toBe('Shorter title');
    expect(patched.intro).toBe(draft.intro);
  });
});

describe('normalizeDraft and shortenSlug', () => {
  it('caps meta lengths at a word boundary and slugs at 60 characters', () => {
    const draft = goodDraft({ meta_description: `${'word '.repeat(50)}end` });
    expect(draft.meta_description.length).toBeLessThanOrEqual(160);
    expect(draft.meta_description.endsWith(' ')).toBe(false);
    const slug = shortenSlug('managed-backup-and-disaster-recovery-services-for-fort-lauderdale-businesses');
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('counts words as a reader sees them', () => {
    expect(countWords('## Heading\n\nTwo [linked words](/contact) here.')).toBe(5);
  });
});

describe('site links', () => {
  const realPaths = new Set([...Object.keys(IT_PAGE_META), ...Object.keys(SERVICE_GUIDE_SUMMARIES).map(serviceGuidePath)]);

  it('links posts only to pages that exist', () => {
    LINKABLE_PAGES.forEach((page) => expect(realPaths.has(page.path), page.path).toBe(true));
    Object.values(CATEGORY_LINKS).forEach(({ service, guide }) => {
      expect(realPaths.has(service.path), service.path).toBe(true);
      expect(realPaths.has(guide.path), guide.path).toBe(true);
    });
  });

  it('covers every blog category', () => {
    BLOG_CATEGORIES.forEach((category) => expect(CATEGORY_LINKS[category], category).toBeDefined());
  });

  it('keeps the route time budget in step with vercel.json', () => {
    const config = JSON.parse(readFileSync(path.resolve(__dirname, '../../../vercel.json'), 'utf8'));
    expect(config.functions['api/blog/generate-post.ts'].maxDuration).toBe(MAX_DURATION_SECONDS);
  });
});
