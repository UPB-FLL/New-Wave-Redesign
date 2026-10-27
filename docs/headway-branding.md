# Headway

Headway is GroundSwell's implementation service, by New Wave: the one service
the Social Engineering division sells, with the six kinds of work (social
media, brand development, website design, smart advertising, integrations &
data, analytics & oversight) listed under it. GroundSwell finds and plans;
Headway carries the plan out, through the client's own linked accounts where a
tool exists and through the team where none should, every action approved
first.

## Name and voice

- **Headway**, capital H, one word. First reference in copy: "Headway, by
  GroundSwell" (or "Headway · by GroundSwell" as a kicker); then "Headway".
  Never "the Headway", never "HW".
- Tagline: **Progress you can measure.** Descriptor beside the wordmark: **The
  plan, carried out.**
- The name is nautical: headway is the forward motion a vessel makes, and the
  progress it stands for. It sits beside GroundSwell (the deep movement) and
  the Currents (the data) without copying their water imagery; the crest in
  the mark is the only shared element.
- Voice: plain, measured, specific. Headway states what will be done and what
  it needs; it never promises results, speed, or rankings. Every sentence
  about an action is checkable against the plan it came from.
- Family line, when all three are named: "GroundSwell finds and plans; Headway
  carries it out." The division stays New Wave: Social Engineering.
- The name was chosen on 2026-10-26 and is held in one place
  (`src/lib/headway.ts`: `HEADWAY_NAME`, `HEADWAY_TAGLINE`,
  `HEADWAY_DESCRIPTOR`) with its paths in `src/groundswell/headwayBrand.ts`,
  so a rename touches the constants, this folder, and the page slug. Check
  the USPTO register and the state's business names before any outward
  launch; nothing here was cleared.

## Masters

All paths are under `/brand/social-engineering/headway/`.

| Item | File |
| --- | --- |
| Mark, light surfaces | `Headway_Mark_Color.svg` (navy bars, amber crest) |
| Mark, navy surfaces | `Headway_Mark_Reverse.svg` (white bars, amber crest) |
| Wordmark, light surfaces | `Headway_Primary_Color.svg`, reference render `Headway_Primary_Color.png` |
| Wordmark, navy surfaces | `Headway_Primary_Reverse.svg`, reference render `Headway_Primary_Reverse.png` |
| Share image and its source | `Headway_OG_1200x630.png`, `Headway_OG_1200x630.svg` |

The mark is an H whose crossbar is the New Wave crest, the same path the
GroundSwell GS monogram carries, scaled to span the two bars and stroked in
Lure Amber. The wordmark's text is live type (Plus Jakarta Sans 700 for the
name, IBM Plex Mono 500 for "by GroundSwell · New Wave"), so the SVG files
set correctly wherever the division's fonts are installed or loaded; the PNG
renders beside them are the references for anyone without the fonts, made
with Chromium from the self-hosted faces. Minimum widths: the mark 24px, the
wordmark 200px. Clear space: half the mark's height on every side.

## Colour and type

Headway uses the GroundSwell palette: navy `#09131D`, foam/white `#F7FAFB`,
cyan `#31C6CF` for the endorsement line on navy, slate `#526271` for it on
light. Its own accent is **Lure Amber `#F2A33A`**, the division's action
colour: the crest in the mark, and the "go" of an approval. Amber marks
Headway where cyan marks GroundSwell. Type follows GroundSwell: Plus Jakarta
Sans for display, Inter for body, IBM Plex Mono for labels.

## Where it appears

- The public page `/social-engineering/headway` (content in
  `src/divisions/socialEngineering/content/headway.ts`; the catalogue of
  services, what runs on its own and what the team carries out, and the
  setup items come from `src/lib/headway.ts`, so the page cannot describe
  something the platform does not do).
- The division navigation: the services menu is Headway's (the page at its
  head, the six kinds of work under it), the footer's services column is
  headed Headway, the hub's services band and every service page place the
  work under it.
- The Groundswell portal: the Headway panel on a customer's page
  (`src/groundswell/workspace/HeadwayPanel.tsx`), for the partner and for
  staff, with the mark beside the heading.

## Alternatives considered (2026-10-26)

- **Surge**: says growth, but reads as a spike and is widely used.
- **Tide**: in the water family, but passive and a household trademark.
- **Essor / Élan** (French, to pair with Croissance): Croissance is now a
  legacy name, and Élan collides with a US card issuer.
