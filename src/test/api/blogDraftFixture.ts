import { normalizeDraft, type BlogDraft } from '../../../api/_lib/blogQuality';

/** Plain, figure-free prose of about `words` words. */
export const prose = (words: number, topic = 'managed backup') =>
  Array.from({ length: Math.ceil(words / 12) }, (_, i) => `Planning ${topic} carefully keeps a small office running when hardware fails, step ${'abcdefghij'[i % 10]}.`)
    .join(' ');

export function goodDraft(overrides: Partial<BlogDraft> = {}): BlogDraft {
  return normalizeDraft({
    primary_keyword: 'managed backup',
    title: 'Managed Backup for Fort Lauderdale Small Businesses',
    meta_title: 'Managed Backup for Small Businesses',
    meta_description:
      'Managed backup for Fort Lauderdale businesses: automated, tested restores that keep your team working when a laptop, server, or cloud app fails you.',
    slug: 'managed-backup-fort-lauderdale',
    excerpt: 'How managed backup protects South Florida businesses, and what to ask a provider.',
    featured_image_query: 'server room backup',
    tags: ['backup', 'disaster recovery', 'fort lauderdale', 'managed it'],
    intro: `Managed backup is the safety net most small businesses only think about after a bad day. ${prose(140)}`,
    sections: [
      { heading: 'What managed backup covers for a small business', body: prose(260) },
      { heading: 'How hurricane season changes your backup plan', body: `${prose(200)}\n\n- Test restores\n- Keep an offsite copy\n- Document who does what` },
      { heading: 'Cloud apps still need their own copies', body: prose(250, 'Microsoft 365 backup') },
      { heading: 'Choosing a provider in South Florida', body: `See our [managed IT services](/service-category/managed-it-services). ${prose(240)}` },
      { heading: 'Testing restores before you need them', body: prose(250) },
    ],
    faqs: [
      { question: 'How often should backups run?', answer: prose(55) },
      { question: 'Do I need backup for Microsoft 365?', answer: prose(55) },
      { question: 'What is a restore test?', answer: prose(55) },
      { question: 'Where should backups be stored?', answer: prose(55) },
    ],
    conclusion: { heading: 'Protect the work your team does every day', body: prose(120) },
    ...overrides,
  });
}
