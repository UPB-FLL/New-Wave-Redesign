// Scene toolkit for the New Wave: Social Engineering line-art stories.
// Read the contract at the top of SceneFrame.tsx before writing a scene.
export { SceneFrame, SceneOverrides, type SceneFrameProps } from './SceneFrame';
export {
  Appear,
  Check,
  Draw,
  Icon,
  Travel,
  Wave,
  type AppearProps,
  type CheckProps,
  type DrawProps,
  type IconProps,
  type SceneEaseName,
  type TravelProps,
  type WaveProps,
} from './primitives';
export {
  SCENE_DEFAULT_DURATION,
  SCENE_MAX_DURATION,
  SCENE_VIEW_AMOUNT,
  useSceneState,
  type SceneOverrideOptions,
  type ScenePhase,
  type SceneProps,
  type SceneState,
} from './sceneState';
export { useScenePlayback, type ScenePlayback, type ScenePlaybackOptions } from './useScenePlayback';
export { SCENE_PALETTES, sceneColor, type SceneColor, type SceneTone } from './palette';
export {
  LOGO_WAVE_D,
  checkPath,
  fromIconGrid,
  pathEndpoints,
  pathSignature,
  ringPath,
  wavePath,
  type Point,
  type WaveGeometry,
} from './geometry';
export { DIVISION_ICONS, DIVISION_ICON_NAMES, type DivisionIconName } from '../icons/iconData';
