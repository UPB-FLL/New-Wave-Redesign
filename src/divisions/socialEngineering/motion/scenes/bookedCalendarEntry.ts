// Geometry for the shared BookedCalendar part (kept out of BookedCalendar.tsx so
// that file exports components only, for fast refresh).
import type { Point } from '../index';

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Where a path enters a BookedCalendar centred at (cx, cy) in a `size`-unit
 * icon box: the left end of its amber header wave, (3, 10.5) on the icon grid.
 * Every path into a calendar ends exactly here, so the amber path reads as
 * flowing into the header, and the customer dot rests here.
 */
export function bookedCalendarEntry(cx: number, cy: number, size: number): Point {
  const k = size / 24;
  return [round(cx - 9 * k), round(cy - 1.5 * k)];
}
