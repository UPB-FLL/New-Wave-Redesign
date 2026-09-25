import { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DIVISION_SERVICE_SLUGS } from '../../site';
import { PAGE_SCENES, SCENE_PAGE_KEYS, isScenePageKey } from './index';
import { SceneSlot } from './SceneSlot';

const staticFrame = (container: HTMLElement) => container.querySelector('[data-scene-state="static"] svg[aria-hidden="true"]');

describe('page scene registry', () => {
  it('has one scene per division page: the hub, each service slug, contact, contact us, and the hub section', () => {
    expect([...SCENE_PAGE_KEYS].sort()).toEqual(['contact', 'contactUs', 'hub', 'hubSection', ...DIVISION_SERVICE_SLUGS].sort());
    for (const slug of DIVISION_SERVICE_SLUGS) expect(isScenePageKey(slug)).toBe(true);
    expect(isScenePageKey('phishing-simulation')).toBe(false);
    expect(isScenePageKey('toString')).toBe(false);
  });

  // Runs before the per-key loads below, so the contact chunk is still pending on first render.
  it('holds a 3:2 box while a scene loads, then shows the scene in its place', async () => {
    const { container } = render(<SceneSlot page="contact" className="scene-slot" forceStatic />);
    const placeholder = container.querySelector('[data-scene-slot="loading"]') as HTMLElement;
    expect(placeholder).toHaveAttribute('aria-hidden', 'true');
    expect(placeholder).toHaveClass('scene-slot');
    expect(placeholder.style.aspectRatio).toBe('3 / 2');

    await waitFor(() => expect(staticFrame(container)).not.toBeNull());
    expect(container.querySelector('[data-scene-slot]')).toBeNull();
    const frame = container.querySelector('[data-scene]') as HTMLElement;
    expect(frame).toHaveClass('scene-slot');
    expect(frame.style.aspectRatio).toBe('3 / 2');
  });

  it.each(SCENE_PAGE_KEYS)('loads the %s scene on demand and renders its static final frame', async (key) => {
    const Scene = PAGE_SCENES[key];
    const { container } = render(
      <Suspense fallback={null}>
        <Scene forceStatic />
      </Suspense>,
    );
    await waitFor(() => expect(staticFrame(container)).not.toBeNull());
  });
});
