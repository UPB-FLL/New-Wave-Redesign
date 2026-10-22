import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stubReducedMotion } from '../../../test/reducedMotion';
import { auditContent } from '../content';
import { GroundswellProcess } from './GroundswellProcess';

const observers = new Set<TestObserver>();
class TestObserver {
  target: Element | null = null;
  constructor(private callback: IntersectionObserverCallback) { observers.add(this); }
  observe(target: Element) { this.target = target; }
  disconnect() { this.target = null; }
  notify(visible: boolean) {
    this.callback([{ isIntersecting: visible, intersectionRatio: visible ? 1 : 0 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

let preference: ReturnType<typeof stubReducedMotion>;
const renderProcess = () => render(<MemoryRouter><GroundswellProcess /></MemoryRouter>);
const drawing = () => screen.getByRole('tabpanel').querySelector('.gs-process-drawing')!;
const visibleObserver = () => [...observers].find(observer => observer.target === drawing())!;

beforeEach(() => {
  observers.clear();
  preference = stubReducedMotion(false);
  vi.stubGlobal('IntersectionObserver', TestObserver);
});
afterEach(() => vi.unstubAllGlobals());

describe('GroundSwell process', () => {
  it('keeps the final illustration visible when motion APIs are unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    renderProcess();
    expect(drawing()).toHaveAttribute('data-playback', 'static');
    expect(screen.getByRole('heading', { name: auditContent.process.steps[0].heading })).toBeInTheDocument();
  });

  it('keeps the animation still until visible, pauses offscreen, and replays on request', () => {
    const { unmount } = renderProcess();
    expect(drawing()).toHaveAttribute('data-playback', 'idle');
    act(() => visibleObserver().notify(true));
    expect(drawing()).toHaveAttribute('data-playback', 'playing');
    act(() => visibleObserver().notify(false));
    expect(drawing()).toHaveAttribute('data-playback', 'paused');
    act(() => visibleObserver().notify(true));
    const previous = drawing();
    fireEvent.click(screen.getByRole('button', { name: 'Replay queue animation' }));
    expect(drawing()).not.toBe(previous);
    expect(drawing()).toHaveAttribute('data-playback', 'idle');
    unmount();
    expect(preference.listenerCount()).toBe(0);
    expect([...observers].every(observer => observer.target === null)).toBe(true);
  });

  it('responds to reduced motion while playing and keeps all five steps usable', () => {
    renderProcess();
    act(() => visibleObserver().notify(true));
    act(() => preference.set(true));
    expect(drawing()).toHaveAttribute('data-playback', 'static');
    fireEvent.keyDown(screen.getAllByRole('tab')[0], { key: 'End' });
    expect(screen.getAllByRole('tab')[4]).toHaveFocus();
    expect(drawing()).toHaveAttribute('data-playback', 'static');
    expect(within(screen.getByRole('tabpanel')).getByText(auditContent.process.steps[4].outcome)).toBeInTheDocument();
    fireEvent.keyDown(screen.getAllByRole('tab')[4], { key: 'Home' });
    expect(screen.getAllByRole('tab')[0]).toHaveFocus();
  });

  it('shows a distinct drawing and outcome for each chapter without advancing automatically', () => {
    renderProcess();
    const scenes = new Set<string>();
    auditContent.process.steps.forEach((step, index) => {
      fireEvent.click(screen.getAllByRole('tab')[index]);
      const panel = within(screen.getByRole('tabpanel'));
      expect(panel.getByRole('heading', { name: step.heading })).toBeInTheDocument();
      expect(panel.getByText(step.outcome)).toBeInTheDocument();
      expect(drawing()).toHaveAttribute('aria-hidden', 'true');
      scenes.add(drawing().innerHTML);
      act(() => visibleObserver().notify(true));
      expect(screen.getAllByRole('tab')[index]).toHaveAttribute('aria-selected', 'true');
    });
    expect(scenes.size).toBe(5);
  });
});
