// Colour roles for the division's surfaces (2026-10-21). The brand palette is
// inherited unchanged; what changed is that each colour now means something:
// Signal Cyan is data, Continuity Green is integrations, Lure Amber is smart
// advertising, and Tide Blue (the label colour) covers everything else. Every
// class name here is a full literal, so Tailwind and division.css see it.
//
// Text rules: on a tint, text is Current Navy, Slate, or Lure Amber Deep
// (never Tide Blue, which falls under 4.5:1 there); on a dark band, labels are
// Lure Amber, Signal Cyan, or Continuity Green (all at least 7:1 on Current
// Navy), never Tide Blue (3.5:1).
import type { DivisionPillarKey } from '../types';

export interface SurfaceColor {
  /** `.nwse-icon` role class for the tile's tint ('' keeps the amber default). */
  tile: string;
  /** `.nwse-tint` role class for a washed panel. */
  tint: string;
  /** The colour itself, for bars, dots, rings, and borders. */
  accent: string;
  /** Text in this role on a light ground. */
  deep: string;
  /** Text in this role on a dark ground. */
  onDark: string;
}

export const PILLAR_STYLE: Record<DivisionPillarKey, SurfaceColor> = {
  data: {
    tile: 'nwse-icon-cyan',
    tint: 'nwse-tint-cyan',
    accent: 'var(--nw-signal-cyan)',
    deep: 'var(--nw-current-navy)',
    onDark: 'var(--nw-signal-cyan)',
  },
  integrations: {
    tile: 'nwse-icon-green',
    tint: 'nwse-tint-green',
    accent: 'var(--nw-continuity-green)',
    deep: 'var(--nw-current-navy)',
    onDark: 'var(--nw-continuity-green)',
  },
  advertising: {
    tile: '',
    tint: 'nwse-tint-amber',
    accent: 'var(--nwse-lure-amber)',
    deep: 'var(--nwse-lure-amber-deep)',
    onDark: 'var(--nwse-lure-amber)',
  },
};

/** The label colour's role, for lists that belong to no pillar. */
export const TIDE_STYLE: SurfaceColor = {
  tile: 'nwse-icon-tide',
  tint: 'nwse-tint-tide',
  accent: 'var(--nw-tide-blue)',
  deep: 'var(--nw-current-navy)',
  onDark: 'var(--nw-cloud-white)',
};

/** The roles in rotation (cyan, green, amber, tide), for lists with no pillar of their own. */
export const ACCENT_CYCLE: readonly SurfaceColor[] = [PILLAR_STYLE.data, PILLAR_STYLE.integrations, PILLAR_STYLE.advertising, TIDE_STYLE];

export const accentAt = (index: number): SurfaceColor => ACCENT_CYCLE[index % ACCENT_CYCLE.length];
