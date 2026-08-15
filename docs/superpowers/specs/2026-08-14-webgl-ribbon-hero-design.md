# WebGL Ribbon Hero Design

## Status

Approved visual direction: translucent 3D ribbon meshes with slow autonomous motion.

## Goal

Replace the home-page hero's static current-line artwork with a full-bleed Three.js scene that turns the existing wave motif into dimensional translucent ribbons. The hero must feel active and polished without competing with its copy or changing its content, calls to action, statistics, spacing, or brand palette.

## Scope

- Change only the home-page hero background layer.
- Preserve the existing hero copy, CMS bindings, routes, buttons, statistics, entrance motion, dimensions, and stacking order.
- Preserve the existing `CurrentField` SVG as the reduced-motion and WebGL-failure fallback.
- Add no cursor, touch, scroll, or click interaction to the scene.
- Do not change `WaveBackground` or other pages that use `CurrentField`.

## Visual Composition

The scene uses three broad ribbon meshes in Signal Cyan, Continuity Green, and Tide Blue. Each mesh is translucent, softly lit, and offset in depth so overlaps produce visible spatial layering. A faint edge highlight gives each ribbon definition without turning it into a glowing neon effect.

The ribbons occupy the full hero but carry their strongest depth and brightness through the center-right portion of the frame. A dark left-to-right readability veil remains above the canvas and below the content so the headline, supporting copy, buttons, and statistics retain their current contrast.

The hero background remains Deep Current. No decorative objects, particles, or additional color families are introduced.

## Motion

Each ribbon follows an independent sine-based surface deformation with a long 18-24 second cycle. Phase, amplitude, and depth differ slightly between ribbons so the movement does not look synchronized or mechanical.

The motion is continuous and autonomous. It should read as a slow current rather than a looping banner animation. Camera position remains fixed; all perceived motion comes from ribbon deformation and gentle longitudinal drift.

The animation pauses when the hero is outside the viewport or the document is hidden. It resumes from the current phase without a visible jump.

## Architecture

### `HeroRibbonField`

A new isolated React component owns the WebGL canvas and Three.js lifecycle. It creates and disposes the renderer, scene, camera, geometries, shader materials, resize observer, visibility listeners, intersection observer, and animation frame.

Three.js is dynamically imported from this component so the main application bundle does not absorb the full rendering engine. The component renders a stable full-size canvas container with `pointer-events: none` and an explicit decorative role.

### Ribbon Geometry

Each ribbon starts as a moderately segmented plane. A small vertex shader displaces the surface in two axes using time, UV coordinates, amplitude, and phase uniforms. A fragment shader controls brand color, center transparency, edge highlight, and depth fade.

Three meshes share shader source but use separate uniforms. Transparent rendering uses controlled opacity and depth settings to avoid hard sorting artifacts.

### Hero Integration

`Hero` keeps the static `CurrentField` mounted beneath the WebGL layer until the renderer reports its first successful frame. The static field then fades out. If initialization or rendering fails, the WebGL layer is removed and the static field remains visible.

The existing hero content stays above a readability veil, which stays above both background layers.

## Responsive Behavior

- Desktop and tablet use the full three-ribbon scene.
- Mobile keeps all three ribbons but reduces plane segmentation and caps renderer resolution.
- Device pixel ratio is capped at 1.5 on desktop and 1.25 on compact screens.
- The camera and mesh scale respond to the hero container rather than the browser window so the scene remains full-bleed without changing hero height.
- Resize updates do not recreate the scene or restart motion.

## Accessibility And Failure Handling

- The canvas is decorative and hidden from assistive technology.
- When `prefers-reduced-motion: reduce` is active, Three.js is not loaded and the existing static `CurrentField` remains visible.
- If WebGL is unavailable, context creation fails, or the renderer loses its context, the static SVG remains visible.
- No pointer handlers, keyboard focus, controls, or announcements are added.

## Performance Constraints

- Dynamically import Three.js only when motion is allowed and the hero is eligible to render.
- Use one renderer, one camera, three meshes, and shared shader source.
- Avoid shadows, post-processing, textures, particles, and per-frame React state.
- Update shader uniforms directly inside `requestAnimationFrame`.
- Stop the frame loop while offscreen or while the document is hidden.
- Dispose all GPU resources and observers on unmount.

## Testing

### Automated

- Add a failing component test before implementation that verifies the hero preserves its static fallback and exposes the WebGL background mount without changing content or actions.
- Add focused tests for reduced-motion behavior, first-frame readiness, failure fallback, and cleanup behavior where practical.
- Run the full Vitest suite, targeted ESLint, TypeScript checking, and the production build.

### Rendered Verification

- Verify at desktop and mobile viewports that the canvas is nonblank, full-bleed, and behind all hero content.
- Capture two frames at least one second apart and confirm canvas pixels change while hero layout pixels remain stable.
- Confirm the ribbons remain visible but subdued behind the left-aligned text.
- Confirm no overlap, cropping, layout shift, console errors, or WebGL context warnings.
- Verify reduced-motion mode renders the static current field with no active canvas animation.

## Acceptance Criteria

- The static current lines in the home hero are replaced during normal rendering by three translucent brand-color 3D ribbons.
- The ribbons move slowly on their own and do not respond to pointer, touch, or scroll input.
- Hero content, dimensions, routes, and CMS behavior are unchanged.
- Text remains readable at mobile and desktop widths.
- Reduced-motion and WebGL-failure users receive the existing static SVG treatment.
- The scene is nonblank, moves between frames, produces no layout shift, and releases its rendering resources cleanly.

## Non-Goals

- No changes to global page backgrounds or non-home heroes.
- No user controls, audio, particles, bloom, camera orbit, or mouse parallax.
- No redesign of hero copy, typography, buttons, statistics, or navigation.
- No deployment, publication, commit, or staging operation as part of this task.
