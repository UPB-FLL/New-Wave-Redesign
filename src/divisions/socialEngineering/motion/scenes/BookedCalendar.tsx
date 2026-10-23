// Shared part for the calendar scenes (social, integration, oversight): the
// "booked" calendar. Its companion journey-book artwork draws in three beats:
// the body and bindings, the header a path flows into, and the body check.
// A part, not a page scene, so it has no PAGE_SCENES entry.
// Entry-point geometry: ./bookedCalendarEntry.ts.
import { Draw } from '../index';
import { BOOKED_CALENDAR, BOOKED_CALENDAR_HEADER } from './bookedCalendarEntry';

export interface BookedCalendarProps {
  /** Centre of the calendar's 24-unit icon box, in scene units. */
  cx: number;
  cy: number;
  /** Rendered size of the icon box (the scenes use 104 or 80). */
  size: number;
  /** Seconds from scene start: the body and bindings start drawing (600 ms). */
  tBody: number;
  /** Seconds from scene start: the amber header divider draws (350 ms). */
  tHead: number;
  /** Seconds from scene start: the check draws (400 ms). */
  tCheck: number;
}

const OUTLINES = BOOKED_CALENDAR.paths.filter((path) => path !== BOOKED_CALENDAR_HEADER && !path.accent);
const CHECKS = BOOKED_CALENDAR.paths.filter((path) => path.accent);

const round = (n: number) => Math.round(n * 100) / 100;

export function BookedCalendar({ cx, cy, size, tBody, tHead, tCheck }: BookedCalendarProps) {
  const k = size / 24;
  return (
    <>
      <g transform={`translate(${round(cx - size / 2)} ${round(cy - size / 2)}) scale(${Math.round(k * 1e4) / 1e4})`} strokeWidth={BOOKED_CALENDAR.strokeWidth ?? Math.round((3 / k) * 1e4) / 1e4}>
        {OUTLINES.map((path, i) => (
          <Draw key={path.d} d={path.d} delay={tBody + i * 0.1} duration={0.6} color="line" />
        ))}
        <Draw d={BOOKED_CALENDAR_HEADER.d} delay={tHead} duration={0.35} ease="easeOut" accent />
        {CHECKS.map((path) => <Draw key={path.d} d={path.d} delay={tCheck} duration={0.4} ease="easeOut" color="line" />)}
      </g>
    </>
  );
}
