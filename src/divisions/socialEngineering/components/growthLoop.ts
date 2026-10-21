// The growth loop's nodes (GrowthLoop.tsx draws them; the hub names them).
// Pure data, kept apart from the component so the component file exports
// only a component (React Fast Refresh).
import type { DivisionIconName } from '../icons/iconData';

export type GrowthLoopNodeKey = 'data' | 'integrations' | 'advertising' | 'sales';

/** The four nodes, clockwise from the top left, on the 480 × 320 canvas. */
export const GROWTH_LOOP_NODES: readonly { key: GrowthLoopNodeKey; icon: DivisionIconName; at: readonly [number, number] }[] = [
  { key: 'data', icon: 'pillar-data', at: [112, 96] },
  { key: 'integrations', icon: 'pillar-integrations', at: [368, 96] },
  { key: 'advertising', icon: 'pillar-advertising', at: [368, 224] },
  { key: 'sales', icon: 'metric-bookings', at: [112, 224] },
];
