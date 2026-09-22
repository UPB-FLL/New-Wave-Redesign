import type { DivisionServiceContent } from '../types';
import { hubContent } from './hub';
import { phishingSimulation } from './phishing-simulation';
import { physicalSocialEngineering } from './physical-social-engineering';
import { securityAwarenessTraining } from './security-awareness-training';
import { vishingPretextTesting } from './vishing-pretext-testing';

export { hubContent };

/** Display order for navigation, the hub's service grid, and the sitemap. */
export const divisionServices: readonly DivisionServiceContent[] = [
  phishingSimulation,
  vishingPretextTesting,
  physicalSocialEngineering,
  securityAwarenessTraining,
];

export function findDivisionService(slug: string | undefined): DivisionServiceContent | undefined {
  return divisionServices.find((service) => service.slug === slug);
}

export const contactContent = {
  metaTitle: 'Contact | New Wave: Social Engineering',
  metaDescription:
    'Talk with New Wave: Social Engineering about phishing simulation, vishing tests, onsite assessments, or awareness training for your South Florida team.',
  keywords:
    'social engineering assessment quote, phishing test quote, security awareness training quote fort lauderdale, contact new wave it',
  kicker: 'Start a conversation',
  headline: 'Scope your first assessment',
  summary:
    'Tell us about your team and what worries you most. We’ll come back with a proposed scope, rules of engagement, and a timeline — no obligation.',
} as const;
