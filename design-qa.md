# Design QA

## Comparison Target

- Services source visual: `C:\Users\JOSHBR~1\AppData\Local\Temp\codex-clipboard-f495f97e-c057-4fd1-9185-aceba3ee68f8.png`
- Carousel card source visual: `C:\Users\JOSHBR~1\AppData\Local\Temp\codex-clipboard-620ca9fb-0a15-497e-97ac-c13f021d5518.png`
- Your Stack responsive issue visual: `C:\Users\JOSHBR~1\AppData\Local\Temp\codex-clipboard-24ec75f5-3619-4552-8bfc-f569f2d506dc.png`
- Three-slide alignment issue visuals: `C:\Users\JOSHBR~1\AppData\Local\Temp\codex-clipboard-30474af4-ebf2-4edf-842f-899fe714df6a.png`, `C:\Users\JOSHBR~1\AppData\Local\Temp\codex-clipboard-a7f68e5d-963f-47d2-a1cb-873e62b97ac6.png`, and `C:\Users\JOSHBR~1\AppData\Local\Temp\codex-clipboard-399ae860-a43c-49a2-bf6a-9bf72d780c67.png`
- Implementation: `http://127.0.0.1:4173/`, home page Services section and three-slide carousel
- Implementation screenshot: unavailable because the selected in-app browser runtime failed during setup
- Intended state: restored Services bento plus a carousel with white slide backgrounds and matching translucent navy service-style cards

## Dimensions

- Services source pixels: 606 x 585 at 1x density
- Carousel card source pixels: 545 x 320 at 1x density
- Your Stack issue source pixels: 673 x 487 at 1x density
- Source CSS targets: 606 x 585 for Services; 545 x 320 for the focused carousel card comparison
- Implementation pixels: unavailable
- Implementation CSS viewport: intended 606 x 585 at device scale factor 1
- Density normalization: not performed because an implementation capture could not be produced

## Evidence

### Full View

Both source screenshots were opened at original resolution. The carousel reference was measured as a pure-white page surrounding a service card whose `rgba(26, 47, 63, 0.8)` fill resolves to `#485965`; its icon tile and border match the restored Services accent treatment. The implementation could not be captured through the selected in-app browser because browser setup failed before attachment, so a source-to-implementation comparison remains unavailable.

### Focused Regions

Not performed. The missing implementation screenshot blocks valid comparison of typography, grid spacing, colors, card proportions, motion state, and copy at readable scale.

## Findings

- [P1] Visual fidelity is not yet signed off.
  Location: home page Services section.
  Evidence: source visual is available, but there is no browser-rendered implementation capture to place beside it.
  Impact: exact screenshot fidelity, responsive behavior, and motion stability cannot be honestly confirmed from source code alone.
  Fix: capture the local page at 606 x 585 in the selected browser or obtain approval to use standalone Playwright, then compare both images in one QA input.
- [P1] Carousel visual unification is not yet signed off.
  Location: Trusted Partner, Your Stack, and What We Do carousel slides.
  Evidence: source-level assertions and automated tests confirm pure-white slide backgrounds, the restored Services card surface, six/six/eight card counts, grid classes, and Signal Cyan/Continuity Green accents, but no browser-rendered mobile or desktop captures are available.
  Impact: responsive card geometry, logo readability, stable slide height, pause behavior, focus treatment, and route activation have not been observed in the rendered interface.
  Fix: verify all three slides in the selected browser at mobile and desktop widths, or obtain approval to use standalone Playwright for the same checks.

## Source-Level Verification

- Restored the historical Services component that produced the reference layout.
- Preserved the animated cybersecurity beam, staggered card entrance, and hover lift.
- Preserved the 3-column bento with Cybersecurity spanning 2 columns and 2 rows.
- Preserved the two stacked right-side cards, three equal bottom cards, and four-card industry row.
- Added regression assertions for the bento spans, card counts, beam motion state, content, and routes.
- Applied pure-white backgrounds to Trusted Partner, Your Stack, and What We Do.
- Applied the restored Services card surface across proof, tool, and service cards: `rgba(26, 47, 63, 0.8)` fill, rounded service-card geometry, accent border/shadow, Mist Gray headings, muted light copy, and translucent icon tiles.
- Retained six proof cards, all eight tool cards, six service cards, existing routes, fixed slide heights, and alternating Signal Cyan/Continuity Green accents.
- Passed all 21 Vitest tests, targeted ESLint, and the production build.
- Normalized legacy five-item Trusted Partner CMS payloads to retain the approved six-card composition after cached or asynchronous content loads.
- Moved the Your Stack four-column layout to the medium breakpoint, constrained and centered the grid at `max-w-5xl`, and vertically centered each icon/text group to correct the oversized two-column intermediate-width presentation.
- Constrained Trusted Partner and What We Do to the same centered `max-w-5xl` grid used by Your Stack so all three slides share one visual centerline.
- Kept every card title on one line with overflow protection, including the compact `Azure & Entra ID` label.
- Reserved identical two-line description slots and vertically centered each card's icon/text group so short and long copy no longer shifts titles between rows or slides.

## Comparison History

1. Earlier implementation used one full-width Cybersecurity card followed by five standard cards, which materially differed from the reference.
2. The historical Services implementation was restored and covered by regression tests.
3. Post-fix browser evidence is unavailable because the in-app browser runtime failed before capture, so the earlier mismatch cannot yet be visually closed.
4. The three carousel slides were unified at source level and passed automated verification, but selected-browser setup failed before responsive visual and interaction QA.
5. The user supplied a final card reference that superseded the dark-slide/white-card direction. The carousel was updated to white slide backgrounds and the restored Services card language; browser evidence remains blocked.
6. A responsive screenshot showed oversized, top-aligned Your Stack cards at an intermediate width. Source and regression tests now enforce a centered, constrained four-column medium-width grid with vertically centered card content; post-fix browser capture remains blocked.
7. Three follow-up screenshots showed wrapped titles and inconsistent internal vertical alignment across all carousel slides. Source and regression tests now enforce shared grid width, single-line titles, fixed description slots, and centered card contents; selected-browser post-fix capture remains blocked.

## Implementation Checklist

- Capture the implementation at the source viewport and state.
- Compare source and implementation together.
- Check typography, spacing, colors, copy, motion, hover behavior, and responsive layout.
- Record any fixes and repeat the comparison until no P0, P1, or P2 differences remain.
- Capture all three carousel slides at mobile and desktop widths and verify card geometry, logos, motion stability, pause behavior, focus behavior, and service routes.

## Final Result

final result: blocked
