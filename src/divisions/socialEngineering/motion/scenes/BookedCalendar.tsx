// Shared part for the calendar scenes (social, integration, oversight): the
// "booked" calendar. It is the journey-book icon with its plus removed, so a
// path can flow straight into its amber header wave; the check lands where
// the plus was. A part, not a page scene, so it has no PAGE_SCENES entry.
// Entry-point geometry: ./bookedCalendarEntry.ts.
import { Check, Draw, DIVISION_ICONS } from '../index';

export interface BookedCalendarProps {
  /** Centre of the calendar's 24-unit icon box, in scene units. */
  cx: number;
  cy: number;
  /** Rendered size of the icon box (the scenes use 104 or 80). */
  size: number;
  /** Seconds from scene start: the body and the two rings start drawing (600 ms each, 100 ms stagger). */
  tBody: number;
  /** Seconds from scene start: the amber header wave draws (350 ms). */
  tHead: number;
  /** Seconds from scene start: the check draws (400 ms). */
  tCheck: number;
}

const BOOK = DIVISION_ICONS['journey-book'].paths;
// journey-book paths: 0 body, 1 left ring, 2 right ring, 3 + 4 the plus (omitted), 5 header wave.
const OUTLINES = [BOOK[0].d, BOOK[1].d, BOOK[2].d];
const HEADER = BOOK[5].d;

const round = (n: number) => Math.round(n * 100) / 100;

export function BookedCalendar({ cx, cy, size, tBody, tHead, tCheck }: BookedCalendarProps) {
  const k = size / 24;
  return (
    <>
      <g transform={`translate(${round(cx - size / 2)} ${round(cy - size / 2)}) scale(${Math.round(k * 1e4) / 1e4})`} strokeWidth={Math.round((3 / k) * 1e4) / 1e4}>
        {OUTLINES.map((d, i) => (
          <Draw key={i} d={d} delay={tBody + i * 0.1} duration={0.6} color="line" />
        ))}
        <Draw d={HEADER} delay={tHead} duration={0.35} ease="easeOut" accent />
      </g>
      <Check at={[cx, round(cy + 4 * k)]} size={round(10 * k)} color="line" delay={tCheck} duration={0.4} />
    </>
  );
}
