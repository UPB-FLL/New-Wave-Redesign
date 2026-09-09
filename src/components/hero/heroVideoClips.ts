/**
 * Curated Pexels clips for the rotating hero video.
 *
 * Every clip is free to use under the Pexels license (no attribution
 * required). The hero plays one clip at a time, full-bleed, and crossfades
 * to the next after `CLIP_PLAY_SECONDS` (or when the clip ends). `src` is
 * the 720p rendition where Pexels publishes one (1080p otherwise) and
 * `srcCompact` is the 960px rendition used under 640px; `poster` is the
 * clip's still frame so the hero has an image while the video buffers.
 */
export type HeroVideoClip = {
  /** Pexels video id (see https://www.pexels.com/video/<id>/). */
  id: number;
  /** Short description of the footage, used for the video's aria-label. */
  title: string;
  /** Photographer credited on Pexels (kept for reference). */
  credit: string;
  /** Which service line the clip illustrates. */
  theme: 'it-services' | 'managed-services' | 'helpdesk';
  src: string;
  srcCompact: string;
  poster: string;
};

const VIDEO_CDN = 'https://videos.pexels.com/video-files';
const IMAGE_CDN = 'https://images.pexels.com/videos';

function pexelsVideo(id: number, file: string): string {
  return `${VIDEO_CDN}/${id}/${file}`;
}

function pexelsPoster(id: number, file: string): string {
  return `${IMAGE_CDN}/${id}/${file}?auto=compress&cs=tinysrgb&w=1280`;
}

export const HERO_VIDEO_CLIPS: readonly HeroVideoClip[] = [
  {
    id: 1085656,
    title: 'Network cabling lit up inside a server room',
    credit: 'Dima Krivoy',
    theme: 'it-services',
    src: pexelsVideo(1085656, '1085656-hd_1280_720_25fps.mp4'),
    srcCompact: pexelsVideo(1085656, '1085656-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(1085656, 'free-video-1085656.jpg'),
  },
  {
    id: 7683126,
    title: 'Help desk agent smiling while taking a support call on a headset',
    credit: 'Mikhail Nilov',
    theme: 'helpdesk',
    src: pexelsVideo(7683126, '7683126-hd_1280_720_24fps.mp4'),
    srcCompact: pexelsVideo(7683126, '7683126-sd_960_540_24fps.mp4'),
    poster: pexelsPoster(7683126, 'pexels-photo-7683126.jpeg'),
  },
  {
    id: 7140928,
    title: 'Server units with status lights in a dark data center',
    credit: 'MrColo',
    theme: 'managed-services',
    src: pexelsVideo(7140928, '7140928-hd_1280_720_24fps.mp4'),
    srcCompact: pexelsVideo(7140928, '7140928-sd_960_540_24fps.mp4'),
    poster: pexelsPoster(7140928, 'pexels-photo-7140928.jpeg'),
  },
  {
    id: 8201290,
    title: 'Monitoring dashboards at a support desk',
    credit: 'Kampus Production',
    theme: 'managed-services',
    src: pexelsVideo(8201290, '8201290-hd_1280_720_25fps.mp4'),
    srcCompact: pexelsVideo(8201290, '8201290-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(8201290, 'pexels-photo-8201290.jpeg'),
  },
  {
    id: 7661338,
    title: 'Help desk team taking support calls',
    credit: 'Jep Gambardella',
    theme: 'helpdesk',
    src: pexelsVideo(7661338, '7661338-hd_1280_720_25fps.mp4'),
    srcCompact: pexelsVideo(7661338, '7661338-sd_960_540_25fps.mp4'),
    poster: pexelsPoster(7661338, 'adult-african-american-black-boy-7661338.jpeg'),
  },
  {
    id: 7140937,
    title: 'Ethernet cables patched into a network switch',
    credit: 'MrColo',
    theme: 'it-services',
    src: pexelsVideo(7140937, '7140937-hd_1280_720_24fps.mp4'),
    srcCompact: pexelsVideo(7140937, '7140937-sd_960_540_24fps.mp4'),
    poster: pexelsPoster(7140937, 'pexels-photo-7140937.jpeg'),
  },
  {
    id: 7108186,
    title: 'Support specialist on a headset beside live system screens',
    credit: 'TREEDEO.ST',
    theme: 'helpdesk',
    src: pexelsVideo(7108186, '7108186-hd_2048_1080_30fps.mp4'),
    srcCompact: pexelsVideo(7108186, '7108186-sd_960_506_30fps.mp4'),
    poster: pexelsPoster(7108186, '1-man-bank-business-call-center-7108186.jpeg'),
  },
];

/** How long each clip plays before the hero crossfades to the next one. */
export const CLIP_PLAY_SECONDS = 9;

/** Crossfade duration between clips. */
export const CROSSFADE_MS = 1200;
