# GroundSwell website icon provenance

The SVG files in `SVG/color`, `SVG/navy`, and `SVG/white` are the original
GroundSwell drawings, restored without edits from:

`GroundSwell_Brand_Package.zip` → `GroundSwell_Brand_Package/03_Icons`

The working copy was recovered from
`/mnt/c/Users/joshn/Downloads/GroundSwell_Brand_Package/GroundSwell_Brand_Package/03_Icons`.
Their bytes and SHA-256 hashes match the supplied
`00_Start_Here/File_Manifest.json`. The supplied sprite, vector contact sheet,
manifest, and README are retained. The PNG variants described by the original
README are available in the source archive; this website keeps vector assets.

## Website conversion

`src/divisions/socialEngineering/icons/iconData.ts` normalizes the twelve
original color drawings uniformly from 32 × 32 to the shared 24 × 24 scene grid.
Every coordinate and radius is multiplied by 0.75, and the original 1.8 stroke
becomes 1.35. Circles and rounded rectangles are expressed as SVG paths so the
existing scene renderers can share the same geometry. Solid circles with a
matching stroke include half that stroke in their radius, preserving their
visible silhouette. Disconnected cyan outlines may share one compound path for
the scene draw sequence. Original artwork remains unchanged in `SVG`.

Primary outlines inherit the surrounding text color. At 24 pixels and above,
the icon component preserves the source cyan, Tide Blue, and Amber roles. Below
24 pixels, it uses a single color and a slightly stronger 1.65-unit stroke for
navigation legibility, following the source README's compact-use direction.
`accentColor` continues to override the primary cyan detail at larger sizes.

The six service icons use the supplied social media, brand identity, web design,
campaigns, integrations, and analytics drawings. The supplied strategy,
automation, audience insight, content, community, and momentum drawings also
appear in the page methods, phases, journeys, and metrics.

Foundation, booking, return, inquiry, lead-cost, and conversion are website
companion drawings. They use the original family's open frames, rounded ends,
current contours, and restrained signal details. Utility arrows, chevrons,
menu, close, check, phone, email, location, and send are monochrome companion
glyphs designed for 14–24-pixel controls. These companion drawings are website
extensions, not supplied brand-package originals. No logo was changed.

The existing `NwseIcon` props and registry names are retained. A supplied subject
records its original slug in `source`; each path may carry `tone`, `fill`, and
the existing `accent` flag. Meaningful icons need a visible label or `title`;
unlabeled icons remain hidden from assistive technology.
