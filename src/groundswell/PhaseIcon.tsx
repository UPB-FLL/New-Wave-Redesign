import { Layers, Search, Users } from 'lucide-react';
import type { Phase } from '../lib/groundswellValidation';

const PHASE_ICONS = { audit: Search, competitors: Users, integrated: Layers };

export function PhaseIcon({ phase, size = 18 }: { phase: Phase; size?: number }) {
  const Icon = PHASE_ICONS[phase];
  return <Icon size={size} aria-hidden="true" />;
}
