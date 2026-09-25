// Contact us hero: "Client requests, general questions, partnership ideas...
// We'll reply within one business day."
// A note is written, and the brand wave carries it across to the team. The
// team's bubble opens, a reply is typed, and it lands as the amber wave. The
// service-social icon's two bubbles, grown into a scene: the visitor's (tail
// bottom-left) and the team's (tail bottom-right), level with each other.
import { motion, type Variants } from 'framer-motion';
import { Appear, Draw, SceneFrame, Travel, sceneColor, useSceneState, wavePath, type SceneProps } from '../index';
import { dot } from './shapes';

/**
 * A speech bubble: a rounded box with its tail at the bottom-left corner
 * (`left`) or bottom-right (`right`), drawn from the tail's tip. The tail is
 * the box's side carried 30 units below it, closed back to the bottom edge.
 */
function bubble(x: number, side: 'left' | 'right'): string {
  const [y, w, h, r, tailIn, tailDrop] = [100, 164, 100, 18, 36, 30];
  if (side === 'left') {
    return `M ${x} ${y + h + tailDrop} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + tailIn} Z`;
  }
  return `M ${x + w} ${y + h + tailDrop} V ${y + r} A ${r} ${r} 0 0 0 ${x + w - r} ${y} H ${x + r} A ${r} ${r} 0 0 0 ${x} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 0 ${x + r} ${y + h} H ${x + w - tailIn} Z`;
}

/** The visitor's note (x 24–188) and its two lines of text. */
const NOTE = bubble(24, 'left');
const NOTE_LINES = ['M 52 134 L 160 134', 'M 52 160 L 124 160'];

/** The team's bubble (x 292–456). */
const REPLY = bubble(292, 'right');

/** The brand wave that carries the note across, from edge to edge at the bubbles' middle. */
const LINK = wavePath({ variant: 'logo', x: 188, y: 150, width: 104 });

/** The reply: service-social's accent wave, grown. */
const REPLY_WAVE = wavePath({ variant: 'icon', x: 322, y: 150, width: 104, amplitude: 12 });

/** Someone is typing: three dots, gone when the reply lands (not part of the final frame). */
const TYPING = [350, 374, 398].map((x) => dot(x, 150));
const TYPING_IN = 2.55;
const TYPING_STAGGER = 0.1;
const TYPING_FADE_IN = 0.15;
const TYPING_OUT = 3.2;
const TYPING_FADE_OUT = 0.2;

function Typing() {
  const state = useSceneState();
  if (state.isStatic || state.phase === 'done') return null;
  return (
    <g stroke={sceneColor('line2')} strokeWidth={8}>
      {TYPING.map((d, i) => {
        const start = TYPING_IN + i * TYPING_STAGGER;
        const span = TYPING_OUT + TYPING_FADE_OUT - start;
        const variants: Variants = {
          hidden: { opacity: 0 },
          shown: {
            opacity: [0, 1, 1, 0],
            transition: {
              delay: start,
              duration: span,
              times: [0, TYPING_FADE_IN / span, (TYPING_OUT - start) / span, 1],
              ease: 'easeInOut',
            },
          },
        };
        return <motion.path key={d} d={d} variants={variants} initial="hidden" animate={state.phase === 'idle' ? 'hidden' : 'shown'} />;
      })}
    </g>
  );
}

export function ContactUsReplyScene({ tone, className, forceStatic }: SceneProps) {
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4.2}>
      {/* A note is written. */}
      <Draw d={NOTE} delay={0} duration={0.7} />
      <Draw d={NOTE_LINES[0]} color="line2" delay={0.4} duration={0.35} ease="easeOut" />
      <Draw d={NOTE_LINES[1]} color="line2" delay={0.55} duration={0.35} ease="easeOut" />

      {/* The brand wave carries it across. */}
      <Draw d={LINK} color="line2" delay={0.85} duration={0.6} />
      <Travel along={LINK} delay={1.3} duration={1} color="line" r={6} halo />

      {/* The team's bubble opens, a reply is typed, and it lands in amber. */}
      <Appear delay={2.25} duration={0.4} from={0.6}>
        <path d={REPLY} />
      </Appear>
      <Typing />
      <Draw d={REPLY_WAVE} accent delay={3.3} duration={0.8} />
    </SceneFrame>
  );
}

export default ContactUsReplyScene;
