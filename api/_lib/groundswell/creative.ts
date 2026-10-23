import type { CreativeRef } from '../../../packages/groundswell/src/adsets.js';
import { PHASE_INFO } from '../../../src/lib/groundswellValidation.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { storeAsset } from './assetStore.js';
import { executeTool } from './composio.js';
import { mediaFrom, type FacebookSnapshot, type InstagramMedia, type InstagramSnapshot } from './currents/social.js';
import type { SiteScan } from './currents/site.js';
import { PermanentStepError, type StepContext } from './types.js';

/**
 * Creative step (phase 2): the business's own images for its ads, stored with
 * the run (assetStore.ts). Only the business's images, never a competitor's.
 * Where they come from, in order, until there are enough:
 * 1. the posts phase 1's Instagram read already listed (no extra credit);
 * 2. one more page of posts from ScrapeCreators (one credit), when those
 *    links have expired;
 * 3. Apify's Instagram scraper, when ScrapeCreators is blocked or empty;
 * 4. the images on the business's newest Facebook posts (phase 1's read);
 * 5. the website's own share image.
 * Each image is downloaded, checked (a JPEG, PNG or WebP, at least
 * MIN_SIDE pixels on its short side) and stored. The best performers come
 * first: likes plus three times comments, newest first on a tie.
 */

export const WANTED = 6;
export const MIN_SIDE = 500;
const MAX_BYTES = 8 * 1024 * 1024;
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

export interface CreativeImage extends CreativeRef {
  origin: 'instagram' | 'facebook' | 'website';
  type: InstagramMedia['type'] | 'image';
  taken_at: string | null;
  caption: string | null;
  content_type: string;
}

export interface CreativeOutput {
  source: string;
  fetched_at: string;
  handle: string | null;
  images: CreativeImage[];
  /** What was tried and what came of it, for staff. */
  tried: string[];
}

export const isCreativeOutput = (x: unknown): x is CreativeOutput => Boolean(x && Array.isArray((x as CreativeOutput).images));

/** Width and height from a JPEG, PNG or WebP header; null when the bytes are none of those. */
export function imageSize(b: Uint8Array): { width: number; height: number; type: string } | null {
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { width: v.getUint32(16), height: v.getUint32(20), type: 'image/png' };
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      const length = (b[i + 2] << 8) | b[i + 3];
      // Start-of-frame markers carry the size (not DHT C4, JPG C8 or DAC CC).
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8], type: 'image/jpeg' };
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) i += 2;
      else i += 2 + length;
    }
    return null;
  }
  if (b.length > 30 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') {
    const chunk = String.fromCharCode(...b.slice(12, 16));
    if (chunk === 'VP8X') return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), type: 'image/webp' };
    if (chunk === 'VP8 ') return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff, type: 'image/webp' };
    if (chunk === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, type: 'image/webp' };
    }
  }
  return null;
}

/** Best performers first: likes plus three times comments, then newest. */
export function rankMedia(media: InstagramMedia[]): InstagramMedia[] {
  const score = (m: InstagramMedia) => (m.likes ?? 0) + 3 * (m.comments ?? 0);
  return [...media].sort((a, b) => score(b) - score(a) || (b.taken_at ?? '').localeCompare(a.taken_at ?? ''));
}

/** Downloads one image and checks it; null when it is not a usable image. */
export async function download(url: string, fetchImpl: typeof fetch = fetch): Promise<{ bytes: Uint8Array; width: number; height: number; type: string } | null> {
  try {
    const response = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'image/avif,image/webp,image/*;q=0.8' }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return null;
    const size = imageSize(bytes);
    if (!size || Math.min(size.width, size.height) < MIN_SIDE) return null;
    return { bytes, ...size };
  } catch {
    return null;
  }
}

const extension = (type: string) => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg');
const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 200);

export async function runCreative(ctx: StepContext, fetchImpl: typeof fetch = fetch): Promise<CreativeOutput> {
  const social = ctx.outputs.social as { business?: InstagramSnapshot | null; facebook?: FacebookSnapshot | null } | undefined;
  const site = ctx.outputs.site as { business?: SiteScan | null } | undefined;
  const handle = social?.business?.handle ?? ctx.audit.instagram ?? null;
  const tried: string[] = [];
  const images: CreativeImage[] = [];
  const seen = new Set<string>();
  const db = getSupabaseAdmin();

  const take = async (media: InstagramMedia[], label: string) => {
    let kept = 0;
    for (const m of rankMedia(media)) {
      if (images.length >= WANTED) break;
      const key = m.code ?? m.image_url;
      if (seen.has(key)) continue;
      seen.add(key);
      const got = await download(m.image_url, fetchImpl);
      if (!got) continue;
      const name = `ig-${(m.code ?? `${images.length + 1}`).replace(/[^A-Za-z0-9_-]/g, '')}.${extension(got.type)}`;
      const row = await storeAsset(
        db,
        { audit_id: ctx.audit.id, kind: 'image', name, content_type: got.type, meta: { origin: 'instagram', permalink: m.permalink, likes: m.likes, comments: m.comments, width: got.width, height: got.height } },
        got.bytes
      );
      images.push({ path: row.path, name, permalink: m.permalink, likes: m.likes, comments: m.comments, width: got.width, height: got.height, origin: 'instagram', type: m.type, taken_at: m.taken_at, caption: m.caption, content_type: got.type });
      kept++;
    }
    tried.push(`${label}: ${media.length} post${media.length === 1 ? '' : 's'} listed, ${kept} image${kept === 1 ? '' : 's'} kept.`);
  };

  if (handle) {
    await take(social?.business?.media ?? [], `${PHASE_INFO.audit.title}’s Instagram read`);
    if (images.length < WANTED) {
      try {
        await take(mediaFrom(await executeTool('SCRAPECREATORS_LIST_INSTAGRAM_USER_POSTS', { handle, trim: true })), 'ScrapeCreators, one page of posts');
      } catch (err) {
        tried.push(`ScrapeCreators: ${message(err)}`);
      }
    }
    if (images.length < 2) {
      try {
        const out = await executeTool('APIFY_SCRAPE_INSTAGRAM_POSTS', { username: [handle], resultsLimit: 12, dataDetailLevel: 'basicData', maxTotalChargeUsd: 0.25 }, 300_000);
        await take(mediaFrom(out), 'Apify Instagram scraper');
      } catch (err) {
        tried.push(`Apify: ${message(err)}`);
      }
    }
  } else {
    tried.push('No Instagram handle: none was entered and the website links none.');
  }

  const fbPosts = (social?.facebook?.posts ?? []).filter((p) => p.image_url);
  if (images.length < 2 && fbPosts.length) {
    let kept = 0;
    for (const p of fbPosts) {
      if (images.length >= WANTED) break;
      const got = await download(p.image_url!, fetchImpl);
      if (!got) continue;
      const name = `fb-${images.length + 1}.${extension(got.type)}`;
      const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'image', name, content_type: got.type, meta: { origin: 'facebook', permalink: p.url, reactions: p.reactions, comments: p.comments, width: got.width, height: got.height } }, got.bytes);
      images.push({ path: row.path, name, permalink: p.url, likes: p.reactions, comments: p.comments, width: got.width, height: got.height, origin: 'facebook', type: 'image', taken_at: p.posted_at, caption: p.text, content_type: got.type });
      kept++;
    }
    tried.push(`The business’s Facebook posts: ${fbPosts.length} with an image, ${kept} kept.`);
  }

  const og = site?.business?.og_image;
  if (images.length < 2 && og && /^https:\/\//.test(og)) {
    const got = await download(og, fetchImpl);
    if (got) {
      const name = `site-share-image.${extension(got.type)}`;
      const row = await storeAsset(db, { audit_id: ctx.audit.id, kind: 'image', name, content_type: got.type, meta: { origin: 'website', url: og, width: got.width, height: got.height } }, got.bytes);
      images.push({ path: row.path, name, permalink: null, likes: null, comments: null, width: got.width, height: got.height, origin: 'website', type: 'image', taken_at: null, caption: null, content_type: got.type });
      tried.push('The website’s share image: kept.');
    } else {
      tried.push('The website’s share image: not usable.');
    }
  }

  if (!images.length) throw new PermanentStepError(`No usable image of the business’s own was found. ${tried.join(' ')}`);
  return {
    source: images.some((i) => i.origin === 'instagram') ? `The business’s own Instagram posts${handle ? ` (@${handle})` : ''}` : images.some((i) => i.origin === 'facebook') ? 'The business’s own Facebook posts' : 'The business’s website',
    fetched_at: new Date().toISOString(),
    handle,
    images,
    tried,
  };
}
