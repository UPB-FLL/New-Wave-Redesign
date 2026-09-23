// Integration hero: "...connects the tools... into one path from discovery to
// booking. The goal isn't necessarily to replace the systems already working,
// it's to connect them."
// The tools stay exactly where they are; only the connections move. A current
// from each tool converges into one amber path, and customers who start from
// different tools all reach the same booked calendar. The service-integration
// icon grown into a scene, with recognisable tools as its nodes.
import { Draw, Icon, SceneFrame, Travel, wavePath, type SceneColor, type DivisionIconName, type SceneProps } from '../index';
import { BookedCalendar } from './BookedCalendar';
import { bookedCalendarEntry } from './bookedCalendarEntry';

const CALENDAR = { cx: 404, cy: 168, size: 104 } as const;
const [ENTRY_X, ENTRY_Y] = bookedCalendarEntry(CALENDAR.cx, CALENDAR.cy, CALENDAR.size);

/** Where the currents meet and become one path. */
const MERGE = { x: 204, y: 160 } as const;

/** The one path: an icon-accent wave from the merge point into the calendar's header. */
const ONE_PATH = wavePath({
  variant: 'icon',
  x: MERGE.x,
  y: MERGE.y,
  width: ENTRY_X - MERGE.x,
  amplitude: 14,
  rise: MERGE.y - ENTRY_Y,
});
/** The same path without its moveto, to continue a current into it. */
const ONE_PATH_TAIL = ONE_PATH.replace(/^M\s*[-\d.]+[\s,]+[-\d.]+\s*/, '');

interface Tool {
  icon: DivisionIconName;
  y: number;
  /** The current's colour: incoming channels are cyan and tide, the middle one line2. */
  color: SceneColor;
  current: string;
}

/** Tool icons: a touch larger than the storyboard's 40 so they still read at phone width. */
const TOOL_SIZE = 44;

/** A post, a listing, and an email: the tools the business already uses. */
const TOOLS: readonly Tool[] = [
  { icon: 'service-social', y: 72, color: 'cyan', current: 'M 80 72 C 140 72 150 160 204 160' },
  { icon: 'map-pin', y: 160, color: 'line2', current: 'M 80 160 C 120 160 164 160 204 160' },
  { icon: 'mail', y: 248, color: 'tide', current: 'M 80 248 C 140 248 150 160 204 160' },
];

export function IntegrationOnePathScene({ tone, className, forceStatic }: SceneProps) {
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4}>
      {/* The tools appear in place. Nothing about them moves after this. */}
      {TOOLS.map((tool, i) => (
        <Icon
          key={tool.icon}
          name={tool.icon}
          x={52}
          y={tool.y}
          size={TOOL_SIZE}
          mode="appear"
          delay={i * 0.1}
          duration={0.35}
          color="line"
          accentColor="line2"
        />
      ))}

      {/* The booking they all lead to. */}
      <BookedCalendar {...CALENDAR} tBody={0.2} tHead={3.35} tCheck={3.55} />

      {/* Only the connections move: each tool's current flows into the merge point... */}
      {TOOLS.map((tool, i) => (
        <Draw key={tool.icon} d={tool.current} delay={0.5 + i * 0.1} duration={0.7} color={tool.color} />
      ))}

      {/* ...and becomes one path to the booking. */}
      <Draw d={ONE_PATH} delay={1.2} duration={0.9} accent />

      {/* Customers who start from different tools arrive at the same booking, one after another. */}
      {TOOLS.map((tool, i) => (
        <Travel
          key={tool.icon}
          along={`${tool.current} ${ONE_PATH_TAIL}`}
          delay={1.9 + i * 0.2}
          duration={1.5}
          color="line"
          r={6}
          halo
        />
      ))}
    </SceneFrame>
  );
}

export default IntegrationOnePathScene;
