// Social media hero: "...post on a steady calendar, and answer the comments and
// messages that come in. Then we show you which posts and platforms actually
// led to inquiries and bookings."
// Posts go out on a steady feed and a conversation happens. The post that
// worked lights up with the amber wave, and a customer follows it from the
// phone to a booked calendar. The service-social bubbles and the journey-book
// calendar, grown into a scene.
import { Appear, Draw, SceneFrame, Travel, sceneColor, wavePath, type SceneProps } from '../index';
import { BookedCalendar } from './BookedCalendar';
import { bookedCalendarEntry } from './bookedCalendarEntry';
import { roundRect } from './shapes';

const PHONE = roundRect(40, 28, 120, 264, 20);
const SPEAKER = 'M 86 44 L 114 44';

/** The feed: three post cards; the middle one is the post that worked. */
const POSTS = [60, 136, 212] as const;
const WINNER = 1;
const postCard = (y0: number) => roundRect(54, y0, 92, 64, 10);
const postCaption = (y0: number) => `M 68 ${y0 + 50} L 110 ${y0 + 50}`;
const postImage = (y0: number) => wavePath({ variant: 'icon', x: 68, y: y0 + 26, width: 64, amplitude: 7 });

/** A comment (tail bottom-left) and the reply to it (tail bottom-right): service-social's bubbles. */
const COMMENT = 'M 184 112 V 72 A 12 12 0 0 1 196 60 H 264 A 12 12 0 0 1 276 72 V 88 A 12 12 0 0 1 264 100 H 200 Z';
const COMMENT_TEXT = 'M 200 80 L 256 80';
const REPLY = 'M 324 168 V 128 A 12 12 0 0 0 312 116 H 244 A 12 12 0 0 0 232 128 V 144 A 12 12 0 0 0 244 156 H 308 Z';
const REPLY_TEXT = ['M 248 130 L 304 130', 'M 248 142 L 284 142'];

const CALENDAR = { cx: 392, cy: 176, size: 104 } as const;
const [ENTRY_X, ENTRY_Y] = bookedCalendarEntry(CALENDAR.cx, CALENDAR.cy, CALENDAR.size);

/** The customer's path: leaves the phone beside the winning post, dips, and rises into the calendar's header. */
const PATH = `M 160 168 C 200 168 206 240 256 240 S 330 190 ${ENTRY_X} ${ENTRY_Y}`;

export function SocialPostToBookingScene({ tone, className, forceStatic }: SceneProps) {
  const line = sceneColor('line');
  const line2 = sceneColor('line2');
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4.1}>
      {/* The phone. */}
      <Draw d={PHONE} delay={0} duration={0.8} />
      <Draw d={SPEAKER} delay={0.5} duration={0.2} ease="easeOut" />

      {/* A steady feed: three posts rise into place. */}
      {POSTS.map((y0, i) => (
        <Appear key={y0} delay={0.3 + i * 0.15} duration={0.45} from={1} rise={16}>
          <path d={postCard(y0)} stroke={i === WINNER ? line : line2} />
          <path d={postCaption(y0)} stroke={line2} />
          {i !== WINNER && <path d={postImage(y0)} stroke={line2} />}
        </Appear>
      ))}

      {/* The destination is there from the start. */}
      <BookedCalendar {...CALENDAR} tBody={0.35} tHead={3.4} tCheck={3.6} />

      {/* The comments and messages that come in get answered. */}
      <Appear delay={1.1} duration={0.35} from={0.6}>
        <path d={COMMENT} stroke={line2} />
        <path d={COMMENT_TEXT} stroke={line2} />
      </Appear>
      <Appear delay={1.45} duration={0.35} from={0.6}>
        <path d={REPLY} stroke={line} />
        {REPLY_TEXT.map((d) => (
          <path key={d} d={d} stroke={line2} />
        ))}
      </Appear>

      {/* The post that worked. */}
      <Draw d={postImage(POSTS[WINNER])} delay={1.8} duration={0.35} ease="easeOut" accent />

      {/* A customer follows it to a booking, drawing the amber path behind them. */}
      <Travel along={PATH} delay={2.05} duration={1.35} color="line" r={6} halo trail="accent" />
    </SceneFrame>
  );
}

export default SocialPostToBookingScene;
