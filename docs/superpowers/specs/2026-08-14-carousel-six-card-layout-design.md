# Carousel Six-Card Layout Design

**Date:** August 14, 2026
**Status:** Approved

## Latest Visual Override

The user-provided service-card reference at `C:\Users\JOSHBR~1\AppData\Local\Temp\codex-clipboard-620ca9fb-0a15-497e-97ac-c13f021d5518.png` supersedes the earlier dark-slide/white-card treatment:

- All three carousel slides use a pure-white background.
- Proof, tool, and service cards use the same `rgba(26, 47, 63, 0.8)` surface as the restored Services cards, which resolves to `#485965` over white.
- Cards use the restored Services card radius, subtle accent border and shadow, Mist Gray headings, muted light body copy, and translucent accent icon tiles.
- Signal Cyan and Continuity Green alternate as the card accents, matching the restored Services card family.
- The approved six/six/eight card counts, grid geometry, content, routes, carousel motion, fixed viewport heights, and CMS normalization remain unchanged.
**Scope:** Home-page Trusted Partner and What We Do carousel slides

## Purpose

Remove orphaned cards and uneven row staging from the two named carousel slides while preserving the existing brand, carousel motion, routes, and restored main Services graphic.

## Approved Direction

Both slides will use a six-card composition:

- Trusted Partner gains one truthful proof item: `24/7 Support` with the supporting line `Always available`.
- What We Do keeps its existing six service cards and service-category routes.
- Both grids use two columns on small screens and three columns from the medium breakpoint upward.
- Each grid therefore resolves to three rows of two cards on small screens and two rows of three cards on medium and desktop screens.

This creates a deliberate, repeatable rhythm without inventing a certification or changing the main Services bento.

## Approved Visual Unification

All three carousel slides use the current Your Stack slide as their shared visual foundation:

- Trusted Partner and What We Do switch from the light surface to the same dark carousel background used by Your Stack.
- Every proof, tool, and service card uses a white background with Current Navy text.
- Cards share the same radius, border treatment, internal padding, icon sizing, and full-height behavior.
- Your Stack keeps all eight existing tools and its `4 x 2` desktop grid; no platform content is removed.
- Trusted Partner and What We Do keep their approved six-card `3 x 2` medium-and-desktop grids.
- On small screens, all slides retain two-column layouts with stable fixed rows.
- Headings and supporting copy switch to the approved light foreground tokens on the dark slide background.
- Existing cyan and Tide Blue icon accents remain as small signals within the white cards.

The shared card language is the match point. The grid counts remain appropriate to each slide's content rather than deleting two useful tools solely to force identical counts.

## Layout Behavior

- Cards in each grid use fixed row sizing and fill their grid cell so titles or descriptions cannot change the row height.
- The carousel retains its existing fixed viewport heights at mobile, tablet, and desktop breakpoints.
- Slide headings remain in a consistent top zone.
- Trusted Partner logos remain below the proof grid.
- The What We Do call to action remains below the service grid.
- Existing carousel arrows, pagination, pause-on-hover/focus behavior, auto-advance timing, and reduced-motion behavior remain unchanged.

## Content and Interaction

- The sixth Trusted Partner card uses the existing `CheckCircle` icon and approved brand tokens.
- No new service, route, certification, partnership, or unsupported performance claim is introduced.
- All six What We Do cards remain keyboard-focusable links to their current service-category destinations.
- Trusted Partner proof cards remain informational rather than interactive.

## Responsive Rules

- Small screens: `2 x 3` card grid with equal rows.
- Medium and larger screens: `3 x 2` card grid with equal rows.
- Card content remains clipped or wrapped within stable dimensions and must not resize the carousel viewport.
- The page must not shift vertically when the carousel advances between slides.

## Accessibility

- Existing carousel region labels, arrow labels, pagination labels, focus pausing, and reduced-motion support are preserved.
- The new icon is decorative and does not replace the visible card label.
- Text contrast continues to use the approved New Wave IT semantic color tokens.

## Verification

- Add or update component tests to assert six Trusted Partner cards and six What We Do cards.
- Assert both grids use the approved responsive columns and equal-height row treatment.
- Retain the stable carousel viewport assertion.
- Run focused tests, targeted lint, the frontend suite, and a production build.
- Visually inspect slide transitions at mobile and desktop widths in the selected browser when browser capture is available.

## Boundaries

- Do not change the restored main Services bento or its motion.
- Do not alter other carousel slide content, global navigation, routes, CMS contracts, or page copy.
- Do not commit, push, publish, or deploy without separate authorization.
