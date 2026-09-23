import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SceneFrame, SceneOverrides } from './SceneFrame';
import { LOGO_WAVE_D, aspectRatioFor, checkPath, pathEndpoints, pathSignature, ringPath, wavePath } from './geometry';
import { DIVISION_ICONS, DIVISION_ICON_NAMES } from '../icons/iconData';
import { Appear, Check, Draw, Icon, Travel, Wave } from './primitives';
import { useScenePlayback, type ScenePlaybackOptions } from './useScenePlayback';

const { reducedMotion } = vi.hoisted(() => ({ reducedMotion: vi.fn(() => false) }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return { ...actual, useReducedMotion: reducedMotion };
});

/** A controllable IntersectionObserver for the tests that need one. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly elements: Element[] = [];
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  takeRecords() {
    return [];
  }

  /** Report the observed element as `ratio` visible in an 800px-tall viewport. */
  fire(ratio: number) {
    const entry = {
      isIntersecting: ratio > 0,
      intersectionRatio: ratio,
      target: this.elements[0],
      rootBounds: { height: 800 },
      intersectionRect: { height: 320 * ratio },
    } as unknown as IntersectionObserverEntry;
    act(() => this.callback([entry], this as unknown as IntersectionObserver));
  }
}

const latestObserver = () => FakeIntersectionObserver.instances[FakeIntersectionObserver.instances.length - 1];

function stubIntersectionObserver() {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
}

function Probe(options: ScenePlaybackOptions) {
  const { ref, phase, playing, done, reduced } = useScenePlayback<HTMLDivElement>(options);
  return (
    <div
      ref={ref}
      data-testid="probe"
      data-phase={phase}
      data-playing={String(playing)}
      data-done={String(done)}
      data-reduced={String(reduced)}
    />
  );
}

const probeState = (el: HTMLElement) => ({
  phase: el.dataset.phase,
  playing: el.dataset.playing,
  done: el.dataset.done,
  reduced: el.dataset.reduced,
});

beforeEach(() => {
  reducedMotion.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useScenePlayback', () => {
  it('is static in jsdom, which has no IntersectionObserver', () => {
    expect(typeof window.IntersectionObserver).toBe('undefined');
    const { getByTestId } = render(<Probe />);
    expect(probeState(getByTestId('probe'))).toEqual({ phase: 'static', playing: 'false', done: 'true', reduced: 'false' });
  });

  it('shows the final frame immediately under prefers-reduced-motion, without observing', () => {
    stubIntersectionObserver();
    reducedMotion.mockReturnValue(true);
    const { getByTestId } = render(<Probe />);
    expect(probeState(getByTestId('probe'))).toEqual({ phase: 'static', playing: 'false', done: 'true', reduced: 'true' });
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('honours forceStatic as a prop and through <SceneOverrides>', () => {
    stubIntersectionObserver();
    const { getAllByTestId } = render(
      <>
        <Probe forceStatic />
        <SceneOverrides forceStatic>
          <Probe />
        </SceneOverrides>
      </>,
    );
    for (const probe of getAllByTestId('probe')) {
      expect(probeState(probe)).toMatchObject({ phase: 'static', done: 'true', reduced: 'false' });
    }
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it('plays once at 35% in view, finishes after its duration, and never replays', () => {
    stubIntersectionObserver();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { getByTestId } = render(<Probe duration={2} />);
    const probe = getByTestId('probe');
    const observer = latestObserver();
    expect(probeState(probe).phase).toBe('idle');
    expect(observer.elements).toEqual([probe]);
    expect(observer.options.threshold).toContain(0.35);

    observer.fire(0.2);
    expect(probeState(probe).phase).toBe('idle');

    observer.fire(0.36);
    expect(probeState(probe)).toMatchObject({ phase: 'playing', playing: 'true', done: 'false' });
    expect(observer.disconnected).toBe(true);

    act(() => vi.advanceTimersByTime(1999));
    expect(probeState(probe).phase).toBe('playing');
    act(() => vi.advanceTimersByTime(1));
    expect(probeState(probe)).toMatchObject({ phase: 'done', playing: 'false', done: 'true' });

    // Scrolling away and back does nothing: no new observer, the final frame holds.
    observer.fire(0);
    observer.fire(1);
    expect(FakeIntersectionObserver.instances).toHaveLength(1);
    expect(probeState(probe).phase).toBe('done');
  });
});

describe('SceneFrame', () => {
  it('renders a decorative svg in a fixed 3:2 box', () => {
    const { container } = render(
      <SceneFrame className="hero-scene">
        <path d="M 0 0 L 10 10" />
      </SceneFrame>,
    );
    const frame = container.firstElementChild as HTMLElement;
    expect(frame).toHaveClass('hero-scene');
    expect(frame.dataset.sceneState).toBe('static');
    expect(frame.style.aspectRatio).toBe('3 / 2');
    expect(frame.style.width).toBe('100%');
    expect(frame.style.position).toBe('relative');

    const svg = frame.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg).toHaveAttribute('role', 'presentation');
    expect(svg).toHaveAttribute('viewBox', '0 0 480 320');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke-width', '3');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
    expect(svg.querySelector('title, text, desc')).toBeNull();
  });

  it('sets the palette variables for each tone', () => {
    const { container } = render(
      <>
        <SceneFrame />
        <SceneFrame tone="light" />
        <SceneFrame tone="dark" ground="#101E2D" />
      </>,
    );
    const [dark, light, navy] = Array.from(container.children) as HTMLElement[];
    const vars = (el: HTMLElement) =>
      Object.fromEntries(
        ['--scene-line', '--scene-line-2', '--scene-accent', '--scene-cyan', '--scene-tide', '--scene-ground'].map((name) => [
          name,
          el.style.getPropertyValue(name),
        ]),
      );
    expect(vars(dark)).toEqual({
      '--scene-line': '#F7FAFB',
      '--scene-line-2': 'rgba(247, 250, 251, 0.55)',
      '--scene-accent': '#F2A33A',
      '--scene-cyan': '#31C6CF',
      '--scene-tide': '#317B92',
      '--scene-ground': '#09131D',
    });
    expect(vars(light)).toMatchObject({
      '--scene-line': '#101E2D',
      '--scene-line-2': '#526271',
      '--scene-accent': '#F2A33A',
      '--scene-ground': '#FFFFFF',
    });
    expect(light.dataset.sceneTone).toBe('light');
    expect(vars(navy)['--scene-ground']).toBe('#101E2D');
  });

  it('keeps the viewBox aspect ratio for other canvases', () => {
    expect(aspectRatioFor('0 0 480 320')).toBe('3 / 2');
    expect(aspectRatioFor('0 0 400 400')).toBe('1 / 1');
    expect(aspectRatioFor('0 0 640 360')).toBe('16 / 9');
  });
});

describe('primitives in the static final frame', () => {
  const renderScene = (children: React.ReactNode) => render(<SceneFrame>{children}</SceneFrame>).container.querySelector('svg')!;
  const paths = (root: Element) => Array.from(root.querySelectorAll('path'));

  it('Draw renders the finished stroke with no dash or opacity state', () => {
    const svg = renderScene(
      <>
        <Draw d="M 10 10 L 100 10" />
        <Draw d="M 10 20 L 100 20" accent width={4} />
        <Draw d="M 10 30 C 40 0 70 60 100 30" to="M 10 30 C 40 30 70 30 100 30" delay={1} duration={1} />
      </>,
    );
    const [plain, accent, morph] = paths(svg);
    expect(plain).toHaveAttribute('d', 'M 10 10 L 100 10');
    expect(plain).toHaveAttribute('stroke', 'var(--scene-line)');
    for (const attr of ['stroke-dasharray', 'stroke-dashoffset', 'pathLength', 'opacity', 'style']) {
      expect(plain).not.toHaveAttribute(attr);
    }
    expect(accent).toHaveAttribute('stroke', 'var(--scene-accent)');
    expect(accent).toHaveAttribute('stroke-width', '4');
    expect(morph).toHaveAttribute('d', 'M 10 30 C 40 30 70 30 100 30');
  });

  it('Appear renders its children as they end, untransformed and opaque', () => {
    const svg = renderScene(
      <Appear delay={1} from={0.5} rise={12}>
        <circle cx={50} cy={50} r={4} />
      </Appear>,
    );
    const group = svg.querySelector('circle')!.parentElement!;
    expect(group.tagName).toBe('g');
    expect(group).not.toHaveAttribute('style');
    expect(group).not.toHaveAttribute('opacity');
    expect(group).not.toHaveAttribute('transform');
  });

  it('Travel rests its dot at the end of the path', () => {
    const svg = renderScene(
      <>
        <Travel along="M 20 40 C 80 0 140 80 200 40" />
        <Travel along="m 10 10 c 20 -10 40 10 60 0 a 5 5 0 01 10 0" r={7} color="line" trail />
      </>,
    );
    const [first, second] = Array.from(svg.querySelectorAll('circle'));
    expect(first).toHaveAttribute('cx', '200');
    expect(first).toHaveAttribute('cy', '40');
    expect(first).toHaveAttribute('fill', 'var(--scene-accent)');
    expect(second).toHaveAttribute('cx', '80');
    expect(second).toHaveAttribute('cy', '10');
    expect(second).toHaveAttribute('r', '7');
    expect(second).toHaveAttribute('fill', 'var(--scene-line)');
    // The trail is drawn in full; no measuring path is left in a static frame.
    expect(paths(svg).map((p) => p.getAttribute('d'))).toEqual(['m 10 10 c 20 -10 40 10 60 0 a 5 5 0 01 10 0']);
    expect(paths(svg)[0]).toHaveAttribute('stroke', 'var(--scene-line-2)');
  });

  it('Check draws the icon set check, optionally inside a ring', () => {
    const svg = renderScene(
      <>
        <Check at={[100, 100]} size={48} />
        <Check at={[200, 100]} size={48} ring accent />
      </>,
    );
    const [check, ring, inner] = paths(svg);
    expect(check).toHaveAttribute('d', checkPath([100, 100], 48));
    expect(check.getAttribute('d')).toBe('M 84 100 L 94.5 110.5 L 116 89');
    expect(ring).toHaveAttribute('d', ringPath([200, 100], 48));
    expect(inner).toHaveAttribute('d', checkPath([200, 100], 48, { inRing: true }));
    expect(ring).toHaveAttribute('stroke', 'var(--scene-accent)');
  });

  it('Wave follows the logo curve and can end as a straight rising line', () => {
    expect(wavePath({ x: 8, y: 15, width: 48 })).toBe(LOGO_WAVE_D);
    const svg = renderScene(
      <>
        <Wave x={40} y={200} width={400} amplitude={30} />
        <Wave x={40} y={260} width={400} amplitude={30} to={{ amplitude: 0, rise: 80 }} />
        <Wave x={40} y={120} width={200} variant="icon" cycles={2} accent={false} />
      </>,
    );
    const [wave, trend, iconWave] = paths(svg);
    expect(wave).toHaveAttribute('stroke', 'var(--scene-accent)');
    expect(wave.getAttribute('d')).toBe(wavePath({ x: 40, y: 200, width: 400, amplitude: 30 }));
    expect(pathSignature(wave.getAttribute('d')!)).toBe('M2 C6 S4');

    // Straightened: every point lies on the line from (40, 260) to (440, 180).
    const numbers = trend.getAttribute('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i < numbers.length; i += 2) {
      const [x, y] = [numbers[i], numbers[i + 1]];
      expect(y).toBeCloseTo(260 - ((x - 40) / 400) * 80, 1);
    }
    expect(pathSignature(trend.getAttribute('d')!)).toBe(pathSignature(wave.getAttribute('d')!));

    expect(iconWave).toHaveAttribute('stroke', 'var(--scene-line)');
    expect(pathSignature(iconWave.getAttribute('d')!)).toBe('M2 C6 S4 S4 S4');
  });

  it('Icon draws the icon paths at scene scale with its accent in amber', () => {
    const svg = renderScene(<Icon name="journey-book" x={120} y={80} size={64} />);
    const group = svg.querySelector('[data-scene-icon="journey-book"]')!;
    expect(group).toHaveAttribute('transform', 'translate(88 48) scale(2.6667)');
    expect(group).toHaveAttribute('stroke-width', '1.125');
    const drawn = paths(group);
    expect(drawn.map((p) => p.getAttribute('d'))).toEqual(DIVISION_ICONS['journey-book'].paths.map((p) => p.d));
    expect(drawn.filter((p) => p.getAttribute('stroke') === 'var(--scene-accent)')).toHaveLength(1);
    expect(drawn.filter((p) => p.getAttribute('stroke') === 'var(--scene-line)')).toHaveLength(drawn.length - 1);
  });

  it('warns in development when a primitive runs past the scene budget', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <SceneFrame duration={4}>
        <Draw d="M 0 0 L 10 0" delay={3.5} duration={1} />
        <Appear delay={1} duration={0.5}>
          <circle r={2} />
        </Appear>
      </SceneFrame>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/<Draw> ends at 4.5s, after the scene's 4s budget/);
  });
});

describe('primitives before the scene plays', () => {
  it('hold their start state while the frame waits to scroll into view', () => {
    stubIntersectionObserver();
    const { container } = render(
      <SceneFrame>
        <Draw d="M 10 10 L 100 10" />
        <Travel along="M 20 40 L 200 40" />
        <Appear>
          <circle cx={50} cy={50} r={4} />
        </Appear>
      </SceneFrame>,
    );
    expect((container.firstElementChild as HTMLElement).dataset.sceneState).toBe('idle');
    const draw = container.querySelector('path[d="M 10 10 L 100 10"]')!;
    expect(draw).toHaveAttribute('opacity', '0');
    const dot = container.querySelector('circle[r="5"]')!;
    expect(dot).toHaveAttribute('opacity', '0');
    expect(dot).toHaveAttribute('cx', '20');
    const group = container.querySelector('circle[r="4"]')!.parentElement!;
    expect(group.getAttribute('opacity') ?? group.style.opacity).toBe('0');
  });
});

describe('path geometry', () => {
  it('finds start and end points across relative, arc, implicit, and closing commands', () => {
    expect(pathEndpoints('M 10 20 a 5 5 0 01 10 0 l 5 5')).toEqual({ start: [10, 20], end: [25, 25] });
    expect(pathEndpoints('M0 0h10v10z')).toEqual({ start: [0, 0], end: [0, 0] });
    expect(pathEndpoints('m 5 5 10 0')).toEqual({ start: [5, 5], end: [15, 5] });
    expect(pathEndpoints('M3 10.5c2.83-1.54 6.17-1.54 9 0s6.17 1.54 9 0')).toEqual({ start: [3, 10.5], end: [21, 10.5] });
  });
});

describe('scene icons', () => {
  it('draws from the approved icon set: 35 icons, at most one accent path each', () => {
    expect(DIVISION_ICON_NAMES).toHaveLength(35);
    for (const name of DIVISION_ICON_NAMES) {
      const { paths } = DIVISION_ICONS[name];
      expect(paths.length, name).toBeGreaterThan(0);
      expect(paths.filter((p) => p.accent).length, name).toBeLessThanOrEqual(1);
      for (const { d } of paths) expect(() => pathEndpoints(d), `${name}: ${d}`).not.toThrow();
    }
    expect(DIVISION_ICONS['service-social'].paths.filter((p) => p.accent)).toHaveLength(1);
    expect(DIVISION_ICONS.check.paths.some((p) => p.accent)).toBe(false);
  });
});
