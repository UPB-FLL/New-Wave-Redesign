// Geometry for the shared BookedCalendar part (kept out of BookedCalendar.tsx so
// that file exports components only, for fast refresh).
import { DIVISION_ICONS } from '../../icons/iconData';
import { fromIconGrid, pathEndpoints, type Point } from '../geometry';

// The calendar's companion artwork marks its divider in tide and its body
// check as the named accent. Select these roles rather than path positions.
export const BOOKED_CALENDAR = DIVISION_ICONS['journey-book'];
export const BOOKED_CALENDAR_HEADER = BOOKED_CALENDAR.paths.find((path) => path.tone === 'tide')!;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Where a path enters a BookedCalendar centred at (cx, cy) in a `size`-unit
 * icon box: the left end of its header divider, (3.5, 10) on the icon grid.
 * Every path into a calendar ends exactly here, so the amber path reads as
 * flowing into the header, and the customer dot rests here.
 */
export function bookedCalendarEntry(cx: number, cy: number, size: number): Point {
  const [x, y] = fromIconGrid([cx, cy], size, pathEndpoints(BOOKED_CALENDAR_HEADER.d).start);
  return [round(x), round(y)];
}
