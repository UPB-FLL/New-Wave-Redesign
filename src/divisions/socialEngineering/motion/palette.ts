// Scene palette. Scenes never hard-code colours: they paint with sceneColor(),
// which reads the CSS variables <SceneFrame> sets for its tone, so one scene
// works on the dark hero band and on light sections.

export type SceneTone = 'dark' | 'light';

/**
 * - line: primary line work (Cloud White on dark, Current Navy on light)
 * - line2: secondary line work (55% Cloud White on dark, Slate on light)
 * - accent: Lure Amber, the brand wave, the one signature accent
 * - cyan / tide: Signal Cyan and Tide Blue, the other two logo waves, sparingly
 * - ground: the section background, for knock-out fills that hide lines behind
 */
export type SceneColor = 'line' | 'line2' | 'accent' | 'cyan' | 'tide' | 'ground';

export const SCENE_PALETTES: Record<SceneTone, Record<SceneColor, string>> = {
  dark: {
    line: '#F7FAFB',
    line2: 'rgba(247, 250, 251, 0.55)',
    accent: '#F2A33A',
    cyan: '#31C6CF',
    tide: '#317B92',
    ground: '#09131D',
  },
  light: {
    line: '#101E2D',
    line2: '#526271',
    accent: '#F2A33A',
    cyan: '#31C6CF',
    tide: '#317B92',
    ground: '#FFFFFF',
  },
};

export const SCENE_COLOR_VARS: Record<SceneColor, string> = {
  line: '--scene-line',
  line2: '--scene-line-2',
  accent: '--scene-accent',
  cyan: '--scene-cyan',
  tide: '--scene-tide',
  ground: '--scene-ground',
};

/** `var(--scene-…)` for a palette role, for stroke/fill props inside a scene. */
export function sceneColor(color: SceneColor): string {
  return `var(${SCENE_COLOR_VARS[color]})`;
}

/** The CSS custom properties <SceneFrame> sets for a tone. */
export function scenePaletteVars(tone: SceneTone, ground?: string): Record<string, string> {
  const palette = SCENE_PALETTES[tone];
  const vars: Record<string, string> = {};
  for (const role of Object.keys(SCENE_COLOR_VARS) as SceneColor[]) {
    vars[SCENE_COLOR_VARS[role]] = role === 'ground' && ground ? ground : palette[role];
  }
  return vars;
}
