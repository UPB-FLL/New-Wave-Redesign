/**
 * Curated Pexels clips for the hero collage.
 *
 * Every clip is free to use under the Pexels license (no attribution
 * required, but we credit Pexels in the hero). The `src` URLs are the
 * 960px-wide renditions served from Pexels' CDN, which is the largest any
 * collage tile is displayed at. `poster` is the clip's still frame so the
 * collage has an image while the video buffers (or if it never plays).
 *
 * `layout` drives the grid: `tall` tiles take a 2x2 block, `wide` tiles a
 * 2x1 block. The full collage sums to 18 cells (a 6x3 grid); the first
 * `COMPACT_CLIP_COUNT` clips sum to 12 cells (a 4x3 grid) for small screens.
 */
export type HeroCollageClip = {
  /** Pexels video id (see https://www.pexels.com/video/<id>/). */
  id: number;
  /** Short description of the footage, used for the tile's aria-label. */
  title: string;
  /** Photographer credited on Pexels. */
  credit: string;
  /** Which service line the clip illustrates. */
  theme: 'it-services' | 'managed-services' | 'helpdesk';
  src: string;
  poster: string;
  layout: 'tall' | 'wide';
};

const VIDEO_CDN = 'https://videos.pexels.com/video-files';
const IMAGE_CDN = 'https://images.pexels.com/videos';

function pexelsVideo(id: number, file: string): string {
  return `${VIDEO_CDN}/${id}/${file}`;
}

function pexelsPoster(id: number, file: string): string {
  return `${IMAGE_CDN}/${id}/${file}?auto=compress&cs=tinysrgb&w=960`;
}

export const HERO_COLLAGE_CLIPS: readonly HeroCollageClip[] = [
  {
    id: 1085656,
    title: 'Network cabling lit up inside a server room',
    credit: 'Dima Krivoy',
    theme: 'it-services',
    src: pexelsVideo(1085656, '1085656-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(1085656, 'free-video-1085656.jpg'),
    layout: 'tall',
  },
  {
    id: 8048328,
    title: 'Help desk agent on a headset at her workstation',
    credit: 'Antoni Shkraba',
    theme: 'helpdesk',
    src: pexelsVideo(8048328, '8048328-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(8048328, 'pexels-photo-8048328.jpeg'),
    layout: 'wide',
  },
  {
    id: 5028622,
    title: 'Server racks in a managed data center',
    credit: 'ALL IZ Well',
    theme: 'managed-services',
    src: pexelsVideo(5028622, '5028622-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(5028622, 'pexels-photo-5028622.jpeg'),
    layout: 'wide',
  },
  {
    id: 8201290,
    title: 'Monitoring dashboards at a support desk',
    credit: 'Kampus Production',
    theme: 'managed-services',
    src: pexelsVideo(8201290, '8201290-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(8201290, 'pexels-photo-8201290.jpeg'),
    layout: 'tall',
  },
  {
    id: 7661338,
    title: 'Help desk team taking support calls',
    credit: 'Jep Gambardella',
    theme: 'helpdesk',
    src: pexelsVideo(7661338, '7661338-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(7661338, 'adult-african-american-black-boy-7661338.jpeg'),
    layout: 'wide',
  },
  {
    id: 7140937,
    title: 'Ethernet cables patched into a network switch',
    credit: 'MrColo',
    theme: 'it-services',
    src: pexelsVideo(7140937, '7140937-sd_960_540_24fps.mp4'),
    poster: pexelsPoster(7140937, 'pexels-photo-7140937.jpeg'),
    layout: 'wide',
  },
  {
    id: 7108186,
    title: 'Support specialist on a headset beside live system screens',
    credit: 'TREEDEO.ST',
    theme: 'helpdesk',
    src: pexelsVideo(7108186, '7108186-sd_960_506_30fps.mp4'),
    poster: pexelsPoster(7108186, '1-man-bank-business-call-center-7108186.jpeg'),
    layout: 'wide',
  },
];

/** Number of leading clips shown on small screens (fills a 4x3 grid). */
export const COMPACT_CLIP_COUNT = 4;

/** Grid columns for each mode; both use three rows. */
export const COLLAGE_COLUMNS = { full: 6, compact: 4 } as const;
