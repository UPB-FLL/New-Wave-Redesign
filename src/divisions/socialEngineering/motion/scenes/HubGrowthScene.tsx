// Hub hero: "Growth decisions made on data, not guesswork."
// The brand wave wanders across the frame (guesswork), then straightens into a
// rising trend line (data). It leaves its old wander behind as a faint dotted
// ghost, and the trend's data points are bookings. The phase-demand icon grown
// into a scene, with check-circle bookings on the line.
import { Appear, Check, Draw, SceneFrame, sceneColor, wavePath, type Point, type SceneProps } from '../index';

/** The brand wave's wander: one big logo-wave swing across the frame. */
const WANDER = wavePath({ x: 56, y: 184, width: 368, amplitude: 50 });
/** The same wave straightened into a rising trend (same M C S structure, so it morphs). */
const TREND = wavePath({ x: 56, y: 256, width: 368, amplitude: 14, rise: 168 });

/** Bookings sit on the trend at 30%, 57% and 83% of its length. */
const BOOKINGS: readonly Point[] = [
  [162.21, 193.6],
  [265.92, 154.33],
  [369.04, 126.65],
];

/** Arrowhead at the trend's end (424, 84.27), along its final tangent. */
const ARROWHEAD = 'M 422.74 102.23 L 424 84.27 L 406.09 86.08';

export function HubGrowthScene({ tone, className, forceStatic }: SceneProps) {
  return (
    <SceneFrame tone={tone} className={className} forceStatic={forceStatic} duration={4}>
      {/* A quiet baseline. */}
      <Draw d="M 40 284 L 440 284" color="line2" delay={0} duration={0.6} />

      {/* Guesswork: the dotted ghost of the wander, revealed by opacity only (never pathLength). */}
      <Appear delay={1.3} duration={0.5} from={1}>
        <path d={WANDER} stroke={sceneColor('line2')} strokeDasharray="0 10" />
      </Appear>

      {/* The brand wave wanders, then straightens into the rising trend. */}
      <Draw
        d={WANDER}
        to={TREND}
        accent
        delay={0.15}
        duration={1.1}
        morphDelay={1.4}
        morphDuration={1.1}
      />

      {/* Bookings land on the trend, left to right; ground fills knock the line out behind them. */}
      {BOOKINGS.map(([x, y], i) => (
        <Appear key={`ring-${x}`} delay={2.45 + i * 0.3} duration={0.3} from={0.6}>
          <circle cx={x} cy={y} r={13} stroke={sceneColor('line')} fill={sceneColor('ground')} />
        </Appear>
      ))}
      {BOOKINGS.map(([x, y], i) => (
        <Check key={`check-${x}`} at={[x, y]} size={20} delay={2.6 + i * 0.3} duration={0.25} />
      ))}

      {/* And it keeps rising. */}
      <Draw d={ARROWHEAD} delay={3.45} duration={0.35} ease="easeOut" />
    </SceneFrame>
  );
}

export default HubGrowthScene;
