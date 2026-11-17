import { describe, expect, it, vi } from 'vitest';
import { hostOf, linksTo, readTikTok, tiktokHandles, tiktokProfile, tiktokRecent, type TikTokOutput } from '../../../api/_lib/groundswell/currents/tiktok';
import { buildFacts } from '../../../api/_lib/groundswell/model';
import { quickWins, targetKeywords } from '../../../api/_lib/groundswell/visibility';
import { buildAuditHtml } from '../../../api/_lib/groundswell/reports';
import { buildInternalHtml } from '../../../api/_lib/groundswell/reportsInternal';
import { visibilityFromFacts } from '../../../api/_lib/groundswell/visibility';
import { brandFrom } from '../../../api/_lib/groundswell/brand';
import { sampleAudit, sampleOutputs, sampleReportData } from './fixtures/groundswell-report';

/**
 * TikTok in the Social Current (owner's ask, 2026-11-17: a client whose
 * traffic comes from TikTok, which no step read). Made-up accounts; the
 * answer shapes are ScrapeCreators' as they answered that day.
 */

const NOW = Date.parse('2026-11-17T17:00:00Z');
const profile = (handle: string, nickname: string, followers: number, bioLink: string | null, bio = '') => ({
  success: true,
  user: { uniqueId: handle, nickname, signature: bio, bioLink: bioLink ? { link: bioLink, risk: 3 } : null, privateAccount: false, verified: false },
  stats: { followerCount: followers, heartCount: followers * 3, videoCount: 120, followingCount: 50 },
});
const video = (days: number, plays: number, extra: Record<string, unknown> = {}) => ({
  url: `https://www.tiktok.com/@x/video/${days}`,
  create_time_utc: new Date(NOW - days * 86_400_000).toISOString(),
  desc: `Video ${days} days old`,
  is_ad: false,
  shop_product_url: null,
  statistics: { play_count: plays, digg_count: plays / 10, comment_count: 2, share_count: 1 },
  ...extra,
});
const videos = { success: true, has_more: true, items: [video(1, 500, { is_ad: true, shop_product_url: 'https://www.tiktok.com/shop/pdp/1' }), video(3, 1500, { shop_product_url: 'https://www.tiktok.com/shop/pdp/2' }), video(10, 900), video(45, 30_000)] };

function fakeExec() {
  return vi.fn(async (slug: string, args: Record<string, unknown>) => {
    if (slug === 'SCRAPECREATORS_GET_TIKTOK_PROFILE') {
      const h = args.handle as string;
      if (h === 'leafline_tea') return profile('leafline_tea', 'Leafline', 40_000, null, 'Teas • Results\nShop below ↓');
      if (h === 'the_leafline_family') return profile('the_leafline_family', 'The Leafline Family', 1_700_000, 'Leafline.example');
      if (h === 'leafline_fan') return profile('leafline_fan', 'Leafline fan page', 900, null);
      throw new Error('Profile not found');
    }
    if (slug === 'SCRAPECREATORS_SEARCH_TIKTOK_USERS') {
      // "cleaflinesmith" holds "leafline" inside a longer word: not a fit (live: "barbaraguzmanf" for Baraguz).
      return { items: [{ unique_id: 'the_leafline_family', nickname: 'The Leafline Family', follower_count: 1_700_000 }, { unique_id: 'leafline_tea', nickname: 'Leafline', follower_count: 40_000 }, { unique_id: 'leafline_fan', nickname: 'Leafline fan page', follower_count: 900 }, { unique_id: 'cleaflinesmith', nickname: 'Cleaflinesmith', follower_count: 5_000 }, { unique_id: 'unrelated', nickname: 'Someone else', follower_count: 9_000_000 }] };
    }
    if (slug === 'SCRAPECREATORS_LIST_TIKTOK_PROFILE_VIDEOS') return videos;
    throw new Error(`unexpected ${slug}`);
  });
}

describe('reading TikTok', () => {
  it('reads handles from links, the site’s host, and whether a bio link points at it', () => {
    expect(tiktokHandles(['https://www.tiktok.com/@Leafline_Tea', 'https://tiktok.com/@leafline_tea/video/1', 'https://example.com'])).toEqual(['leafline_tea']);
    expect(hostOf('https://www.leafline.example/')).toBe('leafline.example');
    expect(linksTo('Leafline.example', 'leafline.example')).toBe(true);
    expect(linksTo('https://shop.leafline.example/?utm_source=tiktok', 'leafline.example')).toBe(true);
    expect(linksTo('linktr.ee/leafline', 'leafline.example')).toBe(false);
  });

  it('summarises a profile and its latest videos: cadence, plays, ads and Shop links, the most played first', () => {
    const p = tiktokProfile('x', profile('leafline_tea', 'Leafline', 40_000, 'https://leafline.example/?utm_source=tiktok'), 'leafline.example');
    expect(p).toMatchObject({ handle: 'leafline_tea', followers: 40_000, likes: 120_000, videos: 120, links_to_site: true, bio_link_tagged: true });
    const r = tiktokRecent(videos, NOW)!;
    expect(r).toMatchObject({ read: 4, posts_last_30_days: 3, median_plays: 1200, ads: 1, shop_links: 2 });
    expect(r.top[0].plays).toBe(30_000);
    expect(r.last_post_at).toBe(new Date(NOW - 86_400_000).toISOString());
  });

  it('finds the accounts by evidence: the Instagram handle that fits the brand, a search hit linking to the site; a name alone is to confirm', async () => {
    const exec = fakeExec();
    const out = (await readTikTok({ business: 'Leafline', website: 'https://leafline.example', siteLinks: [], instagramBioLinks: [], instagramHandle: 'leafline_tea' }, () => 1000, exec))!;
    expect(out.accounts.map((a) => [a.handle, a.matched_by, a.confirmed])).toEqual([
      ['the_leafline_family', 'search', true],
      ['leafline_tea', 'instagram handle', true],
      ['leafline_fan', 'search', false],
    ]);
    expect(out.searched).toBe('Leafline');
    expect(out.accounts.some((a) => a.handle === 'unrelated' || a.handle === 'cleaflinesmith')).toBe(false);
    expect(out.accounts[0].recent?.shop_links).toBe(2);
  });

  it('takes a TikTok link on the website as the business’s, and never throws on a failed read', async () => {
    const exec = vi.fn(async (slug: string) => {
      if (slug === 'SCRAPECREATORS_SEARCH_TIKTOK_USERS') throw new Error('provider down');
      throw new Error('Profile not found');
    });
    const out = (await readTikTok({ business: 'Leafline', website: 'https://leafline.example', siteLinks: ['https://www.tiktok.com/@leafline_tea'], instagramBioLinks: [], instagramHandle: null }, () => 1000, exec))!;
    expect(out.accounts).toHaveLength(1);
    expect(out.accounts[0]).toMatchObject({ handle: 'leafline_tea', matched_by: 'website', confirmed: true });
    expect(out.accounts[0].error).toMatch(/^Profile: /);
    expect(out.note).toMatch(/search did not answer/);
  });
});

async function factsWithTikTok() {
  const tiktok = (await readTikTok({ business: 'Leafline', website: 'https://leafline.example', siteLinks: [], instagramBioLinks: [], instagramHandle: 'leafline_tea' }, () => 1000, fakeExec())) as TikTokOutput;
  const o = sampleOutputs();
  const site = o.site as { business: Record<string, unknown> };
  site.business = { ...site.business, url: 'https://leafline.example', final_url: 'https://leafline.example/' };
  (o.social as Record<string, unknown>).tiktok = tiktok;
  return { facts: buildFacts({ ...sampleAudit, business_name: 'Leafline', website: 'https://leafline.example' }, o), outputs: o };
}

describe('what TikTok puts in the plan', () => {
  it('leads week 1 with the pixel, tagged bio links and a missing bio link; the Shop note and the accounts to confirm stay with staff', async () => {
    const { facts } = await factsWithTikTok();
    const w = quickWins(facts, targetKeywords(facts));
    expect(w.slice(0, 3).map((x) => x.id)).toEqual(['tiktok:pixel', 'tiktok:utm', 'tiktok:bio-link']);
    expect(w.find((x) => x.id === 'tiktok:utm')!.action).toContain('https://leafline.example/?utm_source=tiktok&utm_medium=social&utm_campaign=the_leafline_family');
    expect(w.find((x) => x.id === 'tiktok:bio-link')!.evidence).toContain('“Shop below ↓”');
    expect(w.find((x) => x.id === 'tiktok:site-link')!.week).toBe(2);
    expect(w.filter((x) => !x.client).map((x) => x.id)).toEqual(expect.arrayContaining(['tiktok:shop', 'tiktok:confirm']));
    expect(w.find((x) => x.id === 'tiktok:confirm')!.evidence).toContain('@leafline_fan');
  });

  it('the client’s audit shows only the accounts tied to the business; the brief shows them all, marked', async () => {
    const { facts } = await factsWithTikTok();
    const d = { ...sampleReportData(), facts };
    const audit = buildAuditHtml(d);
    expect(audit).toContain('@the_leafline_family');
    expect(audit).toContain('@leafline_tea');
    expect(audit).not.toContain('@leafline_fan');
    const brief = buildInternalHtml({ facts, brand: brandFrom(facts.site?.business), date: 'November 17, 2026', visibility: visibilityFromFacts(facts) });
    expect(brief).toContain('2 · TikTok · Internal');
    expect(brief).toContain('To confirm (name only)');
    expect(brief).toContain('Linked (bio link to the site)');
    expect(brief).toContain('3 · Copy · Internal');
  });
});
