import type { DivisionServiceContent } from '../types';
import { brandDevelopment } from './brand-development';
import { digitalOversight } from './digital-oversight';
import { hubContent } from './hub';
import { integration } from './integration';
import { marketing } from './marketing';
import { socialMedia } from './social-media';
import { websiteDesign } from './website-design';

export { hubContent };

/** Display order for navigation, the hub's service grid, and the sitemap. */
export const divisionServices: readonly DivisionServiceContent[] = [
  socialMedia,
  brandDevelopment,
  websiteDesign,
  marketing,
  integration,
  digitalOversight,
];

export function findDivisionService(slug: string | undefined): DivisionServiceContent | undefined {
  return divisionServices.find((service) => service.slug === slug);
}

export const contactContent = {
  metaTitle: 'Book a discovery call | New Wave: Social Engineering',
  metaDescription:
    'Book a discovery call with New Wave: Social Engineering, the social media, brand, web, and marketing division of New Wave IT in Fort Lauderdale.',
  keywords:
    'book a discovery call, marketing agency fort lauderdale contact, social media and web design quote south florida, new wave it',
  kicker: 'Start with discovery',
  headline: 'Book a discovery call',
  summary:
    'Before we recommend anything, we’d like to understand the business: where you want to be in 12 months, how customers find you today, and where the gaps are.',
} as const;
