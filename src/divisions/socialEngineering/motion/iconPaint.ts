import type { DivisionIconPath } from '../icons/iconData';
import type { SceneColor } from './palette';

/** Source color roles expressed through the scene's light/dark palette. */
export function iconPaint(path: DivisionIconPath, line: SceneColor = 'line', accent: SceneColor = 'accent'): SceneColor {
  if (path.accent) return accent;
  if (path.tone === 'signal') return 'cyan';
  if (path.tone === 'tide') return 'tide';
  if (path.tone === 'highlight') return 'accent';
  return line;
}
