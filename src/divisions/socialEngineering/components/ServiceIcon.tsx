import { Building2, GraduationCap, Mail, PhoneCall, type LucideProps } from 'lucide-react';
import type { DivisionServiceIcon } from '../types';

const ICONS = {
  mail: Mail,
  phone: PhoneCall,
  building: Building2,
  graduation: GraduationCap,
} as const;

export function ServiceIcon({ icon, ...props }: { icon: DivisionServiceIcon } & LucideProps) {
  const Icon = ICONS[icon];
  return <Icon aria-hidden="true" {...props} />;
}
