import { sampleAudit, sampleOutputs } from './groundswell-report';
import type { AuditRow } from '../../../../api/_lib/groundswell/types';

/**
 * A made-up competitor benchmark for the engine tests: the sample business
 * (Harbor Auto Care) against Bayside Garage and Coastline Motors, with
 * ScrapeCreators, Ahrefs and page responses shaped like the real ones.
 */

export const benchmarkAudit: AuditRow = { ...sampleAudit };

const NOW = Date.now();
const ago = (days: number) => Math.floor((NOW - days * 86_400_000) / 1000);

/** ScrapeCreators list responses (epoch-second times, as Instagram returns them). */
export const igPosts: Record<string, unknown> = {
  harborautocare: {
    items: [
      { media_type: 1, taken_at: ago(1), like_count: 20, comment_count: 1, caption: { text: 'Brake check special this week' }, code: 'h1' },
      { media_type: 8, taken_at: ago(6), like_count: 15, comment_count: 2, carousel_media_count: 4, caption: { text: 'Before and after: AC repair' }, code: 'h2' },
      { media_type: 1, taken_at: ago(20), like_count: 12, comment_count: 0, caption: { text: 'Open Saturdays' }, code: 'h3' },
    ],
  },
  baysidegarage: {
    items: [
      { media_type: 2, product_type: 'clips', taken_at: ago(1), like_count: 300, comment_count: 40, caption: { text: 'Comment BRAKES for our checklist' }, code: 'b1' },
      { media_type: 8, taken_at: ago(3), like_count: 220, comment_count: 25, carousel_media_count: 7, caption: { text: 'Five signs your brakes are going' }, code: 'b2' },
      { media_type: 1, taken_at: ago(5), like_count: 3, comment_count: 30, caption: { text: 'Comment GUIDE for the winter guide' }, code: 'b3' },
    ],
  },
};

export const igReels: Record<string, unknown> = {
  harborautocare: { items: [] },
  baysidegarage: {
    items: [{ media: { media_type: 2, product_type: 'clips', taken_at: ago(1), like_count: 300, comment_count: 40, play_count: 9000, caption: { text: 'Comment BRAKES for our checklist' }, code: 'b1' } }],
  },
};

export const facebookProfiles: Record<string, unknown> = {
  'https://www.facebook.com/harborauto': { adLibrary: { pageId: '111', adStatus: "This Page isn't currently running ads." } },
};

export const facebookAds: Record<string, unknown> = { '111': { results: [] } };

/** Pages served to fetch(): homepages, an offer page and an About page; anything else is a 404. */
export const pages: Record<string, string> = {
  'https://harbor-auto.example/':
    '<html><body><a href="/services">Services</a><a href="/about">About us</a><a href="/blog/tips">Blog</a><a href="https://podcasts.apple.com/us/podcast/harbor">Podcast</a></body></html>',
  'https://harbor-auto.example/services': '<html><body><h1>Services</h1><p>Brake pads $189 per axle. Full AC service $149.</p><p>No refunds on parts.</p></body></html>',
  'https://harbor-auto.example/about': '<html><body><p>Our technicians are ASE certified.</p></body></html>',
  'https://bayside.example/': '<html><body><a href="/pricing">Pricing</a><a href="/reviews">Reviews</a></body></html>',
  'https://bayside.example/pricing': '<html><body><p>Brake package $229. Maintenance club $29 per month.</p></body></html>',
};

export function benchmarkOutputs(): Record<string, unknown> {
  return { ...sampleOutputs() };
}

/** A fetch stub that serves `pages` and 404s everything else. */
export function fakeFetch(input: unknown): Promise<Response> {
  const url = String(input instanceof URL ? input.toString() : input);
  const body = pages[url] ?? pages[url.replace(/\/$/, '')] ?? pages[`${url}/`];
  return Promise.resolve(
    body
      ? new Response(body, { status: 200, headers: { 'Content-Type': 'text/html' } })
      : new Response('not found', { status: 404 })
  );
}
