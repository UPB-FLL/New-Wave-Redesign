import { Megaphone, MonitorSmartphone, Palette, Radar, Share2, Workflow, type LucideProps } from 'lucide-react';
import type { DivisionServiceIcon } from '../types';

const ICONS = {
  social: Share2,
  brand: Palette,
  web: MonitorSmartphone,
  marketing: Megaphone,
  integration: Workflow,
  oversight: Radar,
} as const;

export function ServiceIcon({ icon, ...props }: { icon: DivisionServiceIcon } & LucideProps) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden="true" {...props} />;
}
