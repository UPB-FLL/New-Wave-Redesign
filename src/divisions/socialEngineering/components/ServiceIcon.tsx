import { NwseIcon } from '../icons/NwseIcon';
import type { DivisionIconName } from '../icons/iconData';
import type { DivisionServiceIcon } from '../types';

const ICONS: Record<DivisionServiceIcon, DivisionIconName> = {
  social: 'service-social',
  brand: 'service-brand',
  web: 'service-web',
  marketing: 'service-marketing',
  integration: 'service-integration',
  oversight: 'service-oversight',
};

export function ServiceIcon({ icon, size, className }: { icon: DivisionServiceIcon; size?: number; className?: string }) {
  return <NwseIcon name={ICONS[icon]} size={size} className={className} />;
}
