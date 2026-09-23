// Page → scene registry for the New Wave: Social Engineering line-art stories.
//
// Every entry is React.lazy, so a page downloads only its own scene (the
// engine and the shared calendar part come along as small shared chunks; the
// IT pages load none of it). Keys are the pages' own names: 'hub' and
// 'contact', the six service slugs (DIVISION_SERVICE_SLUGS, so the service
// page can look its scene up by `slug`), and 'hubSection' for the optional
// scene in the hub's "What we gather" band (light tone, Cloud White ground).
//
// Render a lazy scene inside <Suspense>, with a fallback that holds the same
// 3:2 box so nothing shifts while the chunk loads. <SceneSlot page="…"> does
// exactly that.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { SceneProps } from '../sceneState';

export const PAGE_SCENES = {
  /** Hub hero: the brand wave straightens from guesswork into a rising trend of bookings. */
  hub: lazy(() => import('./HubGrowthScene')),
  /** A post that worked leads a customer from the feed to a booked calendar. */
  'social-media': lazy(() => import('./SocialPostToBookingScene')),
  /** Scattered touchpoints snap onto one line, all wearing the same amber mark. */
  'brand-development': lazy(() => import('./BrandAlignScene')),
  /** A post, an ad and a listing each land on a lane that ends at a next step; one books. */
  'website-design': lazy(() => import('./WebPathsScene')),
  /** The campaign's wave carries a customer to a page that books; an email brings them back. */
  marketing: lazy(() => import('./MarketingReachScene')),
  /** Tools stay put; their currents merge into one amber path to a booked calendar. */
  integration: lazy(() => import('./IntegrationOnePathScene')),
  /** One dial watches every touchpoint; the gap is closed before the customer gets there. */
  'digital-oversight': lazy(() => import('./OversightOneTeamScene')),
  /** Contact hero: a clear path grows out of the discovery lens to the business's goal flag. */
  contact: lazy(() => import('./ContactDiscoveryScene')),
  /** Hub "What we gather" band: book, return, refer, as one flywheel (light tone by default). */
  hubSection: lazy(() => import('./HubJourneyScene')),
} satisfies Record<string, LazyExoticComponent<ComponentType<SceneProps>>>;

export type ScenePageKey = keyof typeof PAGE_SCENES;

export const SCENE_PAGE_KEYS = Object.keys(PAGE_SCENES) as ScenePageKey[];

export function isScenePageKey(key: string): key is ScenePageKey {
  return Object.prototype.hasOwnProperty.call(PAGE_SCENES, key);
}
