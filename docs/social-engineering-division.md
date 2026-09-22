# New Wave: Social Engineering — division

New Wave IT's social media, brand development, website design, marketing,
integration, and digital oversight division, served from www.newwaveitfl.com
without changing any existing New Wave IT URL.

- **Brand line**: "Growth decisions made on data, not guesswork."
- **Descriptor**: Social · Brand · Web · Marketing
- **Primary call to action**: Book a discovery call
- **Method**: Discover → Prioritize → Build. Discovery maps every touchpoint
  against the customer journey, the roadmap runs in three phases, and the work
  is measured against bookings and inquiries.

Brand source: *NWSE Brand Guidelines v1.0* (September 2026) for the logos,
colors, and naming. The guide's positioning page and tagline describe security
testing and are superseded by this document (see "History").

## URLs

| Page | URL |
|---|---|
| Division hub | `/social-engineering` |
| Social media | `/social-engineering/social-media` |
| Brand development | `/social-engineering/brand-development` |
| Website design | `/social-engineering/website-design` |
| Marketing | `/social-engineering/marketing` |
| Integration | `/social-engineering/integration` |
| Digital oversight | `/social-engineering/digital-oversight` |
| Contact (book a discovery call) | `/social-engineering/contact` |

Retired first-launch URLs, each a permanent (308) redirect to the hub:
`/social-engineering/phishing-simulation`, `/vishing-pretext-testing`,
`/physical-social-engineering`, `/security-awareness-training`.

## History

1. **#73** launched the division as a security-testing ("human risk") practice,
   taking the brand kit's copy at face value. That positioning was wrong.
2. **#74** took the division offline (`DIVISION_PUBLISHED = false`, temporary
   redirects to `/`, sitemap entries removed).
3. **The relaunch** rebuilt the content model and every page around the six
   services above, working from the business's own planning deck (method and
   data only; no client is named or described).

## Search positioning

"Social engineering" is also a security term, and the security meaning
dominates search results for it. The division keeps the name as its brand but
never targets it as a keyword: titles, descriptions, and H1s lead with
marketing terms (social media, branding, web design, marketing agency, Fort
Lauderdale / South Florida). Expect branded searches to reach the division and
generic "social engineering" searches not to.

## Why a subfolder

| Option | SEO effect on the division | Risk to New Wave IT | Cost |
|---|---|---|---|
| **Subfolder `/social-engineering` (chosen)** | Inherits the domain's authority from day one; one sitemap, one Search Console property | None: additive URLs only, no redirects | Code only |
| Subdomain `socialengineering.newwaveitfl.com` | Search engines treat it largely as a separate site that has to earn authority | None | DNS + Vercel domain + host-based routing in the SPA |
| Separate domain | Starts from zero authority and backlinks | None | Domain, hosting, second site to maintain |

The brand kit also lists newwaveitfl.com as the division's web address (email
signature, README), so the subfolder matches the brand architecture: the
division is a New Wave IT division, not a separate company.

## How the IT site's SEO is protected

- **No existing URL, title, description, canonical, or structured data
  changed.** `src/test/seo/division-integration.test.ts` pins all 30
  pre-existing sitemap URLs, the rewrite order in `vercel.json`, and the
  homepage identity in `index.html`.
- **Prerendered division heads.** The SPA serves one `index.html` whose head
  describes the IT homepage. Without intervention every division URL would ship
  the IT homepage's title and canonical until JavaScript ran — link previews
  (LinkedIn, Slack, Facebook) and non-JS crawlers would see IT-homepage
  duplicates. At build time `src/divisions/socialEngineering/prerender.ts`
  writes `dist/social-engineering/**/index.html` with each page's own title,
  description, canonical, Open Graph, favicon, manifest, and JSON-LD, and a
  `<noscript>` H1 fallback. `vercel.json` rewrites each division URL to its file
  ahead of the SPA catch-all. The build fails if `index.html` changes shape and
  a tag can't be found exactly once.
- **Runtime twin.** `useDivisionMeta` keeps the same values during in-app
  navigation and restores New Wave IT's favicon and metadata on the way out.
- **Entity linking, not impersonation.** Division pages drop the parent's
  `LocalBusiness` block and declare their own `Organization` with
  `parentOrganization` → `https://www.newwaveitfl.com/#organization`.
- **No keyword collisions.** Division pages target marketing clusters
  (hub: marketing agency Fort Lauderdale; then social media, branding, web
  design, marketing, integration, digital presence). None overlaps a New Wave
  IT page's cluster.
- **Performance.** Division pages are lazy-loaded chunks; IT pages download
  ~1.8 kB (gzip) of extra router code and nothing else.
- **Internal links.** The IT navbar Services menu and the IT footer ("Social
  Media & Marketing") link into the division; every division page links back
  to New Wave IT (the endorsement bar, which moves into the menu on phones;
  breadcrumbs; footer).

## Brand implementation

- Tokens: `src/divisions/socialEngineering/division.css` adds only Lure Amber
  (`--nwse-lure-amber`, graphics and text on dark) and Lure Amber Deep
  (`--nwse-lure-amber-deep`, text/links/buttons on light). Everything else
  inherits `--nw-*`.
- Logos: the kit's outlined SVGs are served from
  `public/brand/social-engineering/` and rendered by `DivisionLogo`, which
  clamps to the guide's minimum widths. Reversed art is used only on Current
  Navy / Deep Current.
- Parent + division together (`FamilyLockup`, footer): parent leads, division
  below or to the right, sized so both "NEW WAVE" wordmarks share a cap height.
- Naming: "New Wave: Social Engineering" on first reference; "NW Social
  Engineering" after; never "NWSE" — enforced by `seo.test.ts`.
- Leads from `/social-engineering/contact` arrive with the subject prefixed
  `[New Wave: Social Engineering]` and a "Division" line in the notification.

## Phones and tablets

Desktop (1024px and up) renders exactly as it did before the phone and tablet
layouts; every small-screen rule is either a `max-width` media query in
`division.css` or a Tailwind class whose `lg:` twin restores the desktop value
(`responsive.test.tsx` guards the CSS half).

- **Header.** `--nwse-header-height` is 57px on phones (56px nav + border),
  97px on tablets (32px endorsement bar + 64px nav + border), and 117px on
  desktop. The page offset follows the token, and so does the root's
  `scroll-padding-top`, which keeps in-page anchors and keyboard focus (in
  either direction) below the header. Browsers without `:has()` get a
  `scroll-margin-top` on `.nwse-root [id]` instead (an `@supports not
  selector(:has(a))` block), never both. On phones the endorsement bar is
  hidden and its content ("A New Wave IT division" and the link to New Wave
  IT) sits at the foot of the menu, which opens as a full-height sheet; tablets
  keep the bar and open the menu over a dimmed page. While the menu is open the
  page behind it and the site-wide chat launcher are `inert`, the document does
  not scroll, and focus leaving the header closes the menu. Below 1024px the
  header rows, logo (160px), and menu toggle are sized in px, not rem, so the
  header still matches the token when the reader enlarges text and the toggle
  stays on screen.
- **Landscape phones.** Tablet widths (640–1023px) at most 500px tall get the
  phone header (57px, the endorsement in the menu, the menu's services in two
  columns), a 36px H1, and the phone hero spacing: one media query,
  `(min-width: 640px) and (max-width: 1023.98px) and (max-height: 500px)`, in
  `division.css` and `type.css`, and `max-lg:[@media(max-height:500px)]:`
  classes in the markup.
- **Component classes** (styled in `division.css`, because it loads after the
  Tailwind utilities and its `.nwse-card`/`.nwse-btn`/`.nwse-icon` rules win
  over same-specificity utilities):
  - `nwse-actions`: hero and CTA-band buttons, full width and 48px on phones.
  - `nwse-rowlist`: services, related services, and FAQ as one grouped list
    below 768px (where the 2-column grids begin); each service row is a single
    link (icon, title, arrow, summary).
  - `nwse-labelrows`: reporting labels as a grouped list below 1024px.
  - `nwse-hairlines`: "What we gather" / "What's included" as hairline rows
    below 768px.
  - `nwse-timeline`: steps as a timeline below 768px, with the icon tile or an
    amber node (`data-markers`) on the rail.
  - `nwse-roadmap`: compact phase cards below 768px, their items flowing in
    rows at natural width; on tablets the three cards share row tracks
    (subgrid), so their dividers line up when a title wraps.
  - `nwse-familycard`: the hub's "Part of New Wave IT" card, flush on the
    gutter on phones (so is the contact form).
  - `nwse-journey`: the customer journey as one sideways-scrolling row below
    1024px, a Tab stop only while it overflows. In print it wraps and drops
    the edge fade (`print:` classes and an `@media print` rule), since paper
    cannot scroll.
- **Enlarged text.** Below 1024px `.nwse-root` sets `overflow-wrap:
  break-word`, and the list grids use `grid-cols-1` / `minmax(0, 1fr)` tracks,
  so at 200% text no page is wider than the screen (a wider page would carry
  the fixed header's toggle off-screen).
- **Hidden below a breakpoint** (decorative or repeated, never unique copy):
  the hub hero's service chips and descriptor (repeated by the services list
  and the footer), "Learn more" on service cards (the whole row is the link),
  the intro brand mark, and the family lockup on phones (the footer carries
  it).
- **Contact form.** `components/Contact.tsx` carries `data-contact-*`
  attributes only; `division.css` uses them below 1024px for a left-aligned
  intro, grouped contact methods whose Call and Email rows are whole-row links,
  and 16px inputs (no iOS zoom on focus). New Wave IT pages are unchanged.
- **Hero animation (future).** On phones it belongs after the actions, at most
  `min(200px, 56vw)` tall on the hub; omit it or cap it at about 120px on
  service pages, whose summaries already run 9–13 lines at 320–390px.

## Editing

- Copy lives in `src/divisions/socialEngineering/content/`. Tests enforce
  unique titles/H1s, description lengths, the naming rule, sentence-case
  headlines, no `%` claims, and no security-testing wording on any rendered
  division page.
- To add a service: add a content file, add it to `divisionServices` in
  `content/index.ts`, add its slug to `DIVISION_SERVICE_SLUGS` in `site.ts`, add
  a rewrite in `vercel.json` and a `<url>` in `public/sitemap.xml`. The tests
  fail until all five agree.
- To retire a service URL: remove it as above, add its slug to
  `RETIRED_SERVICE_SLUGS`, and add a permanent redirect to the hub in
  `vercel.json` (the integration test expects exactly those redirects).
- To take the division offline: set `DIVISION_PUBLISHED = false` and, in the
  same change, replace the division's rewrites with temporary redirects to `/`
  and remove its sitemap URLs (see #74).

## Launch checklist (owner)

1. **Review the copy.** It describes how engagements run (discovery before
   recommendations, a three-phase roadmap, reporting against bookings and
   inquiries, reply within one business day). Change anything that isn't how
   you operate.
2. After deploy, confirm the prerendered heads are live:
   `curl -s https://www.newwaveitfl.com/social-engineering | grep -E '<title>|canonical'`
   should show the division title and `…/social-engineering` canonical.
3. Search Console: resubmit `sitemap.xml`; URL-inspect the hub and one service
   page; request indexing.
4. Rich Results Test / Schema validator on the hub (Organization, Breadcrumb,
   FAQ) and one service page (Service).
5. LinkedIn Post Inspector and the Facebook Sharing Debugger on the hub URL to
   refresh the link-preview card (the OG image moved to
   `og/og-image-v2-1200x630.png` with the new brand line).
6. Google Business Profile: add the division's services to the existing New
   Wave IT profile rather than creating a second listing at the same address.
7. Social profiles: use the banners and avatars in the brand kit's `03_Social`,
   but not its `og-image-1200x630.*`, which still describes security testing.
   For share or link images use
   `public/brand/social-engineering/og/og-image-v2-1200x630.png`. Link to
   `/social-engineering`.

## Follow-ups (not in this change)

- ~~IT pages share the homepage's pre-JavaScript canonical.~~ Fixed. Every
  static New Wave IT route is now prerendered too (see "Prerendered page heads"
  in `CLAUDE.md`).
- The homepage shell's raw meta description (`index.html`) differs from the
  one `HomePage` sets at runtime. The title and canonical match.
- The Elfsight chat widget is global and appears on division pages too.
- The brand guide PDF's positioning page, tagline, and the kit's
  `03_Social/og-image-1200x630.*` still describe security testing. The site
  uses a regenerated OG image; the guide itself needs updating by its owner.

## Typography

The division renders in self-hosted copies of the three brand families, with a
defined type scale. New Wave IT pages are unchanged: they still load the same
Google Fonts stylesheet, and their prerendered HTML is byte-identical apart
from hashed asset names.

### Files

`public/brand/social-engineering/fonts/`: the latin subsets exactly as the
Google Fonts css2 API serves them (fetched 2026-09-22, unmodified):

| File | Family | Weights | Size |
|---|---|---|---|
| `plus-jakarta-sans-latin-var.woff2` | Plus Jakarta Sans v2.071 (gf v12) | 200–800 variable | 27 kB |
| `inter-latin-var.woff2` | Inter v4.001 (gf v20) | 100–900 variable | 48 kB |
| `ibm-plex-mono-latin-{400,500,600}.woff2` | IBM Plex Mono v2.3 (gf v20) | 400, 500, 600 static | 15 kB each |

- **Licences**: all three families are SIL OFL 1.1. `OFL-<family>.txt` sits
  beside each file (from `google/fonts`, `ofl/<family>/OFL.txt`).
  IBM Plex has the Reserved Font Name "Plex", so don't re-subset or otherwise
  modify the Plex files yourself. Replace them with Google's builds.
- **Coverage**: Google's latin block, `U+0000-00FF, U+0131, U+0152-0153,
  U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F,
  U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`. That covers
  ASCII, curly quotes, en and em dashes, `·`, `•`, `…`, `€`, and `™`, but
  not `→` (U+2192). Use `<NwseIcon name="arrow-right" />` (see "Icons");
  the copy has none today.

### How it's wired

- `src/divisions/socialEngineering/type.css` is imported by `DivisionLayout`,
  so it ships only in the division's lazy chunk. IT pages never download it.
- Family names are division-only: `'NWSE Display'`, `'NWSE Text'`, and
  `'NWSE Mono'`. They can never override the parent's Google-hosted
  `'Inter'` or `'Plus Jakarta Sans'`. These are internal CSS names that
  readers never see, so the "never NWSE" naming rule, which covers copy, is
  unaffected.
- `.nwse-root` redefines `--nw-font-display`, `--nw-font-body`, and
  `--nw-font-technical`, and re-declares `font-family`. The type classes,
  Tailwind's `font-display`, and the shared Contact form therefore use the
  self-hosted files. Nothing is
  declared on `:root`, `html`, or `body`; `type.test.ts` enforces this.
- **Metric-matched fallbacks**: `'NWSE Display Fallback'`,
  `'NWSE Text Fallback'`, and `'NWSE Mono Fallback'` sit next in each stack.
  They are `local()` Arial and Courier New (or their metric twins Liberation,
  Arimo, and Cousine) with `size-adjust` and ascent, descent, and line-gap
  overrides computed the way next/font does. Regular and bold weights get
  separate values, and the numbers and method are in the `type.css` header.
  With the web fonts blocked, the hub's hero renders at identical box sizes;
  measured layout shift on load is 0.
- **Prerender** (`prerender.ts`, division pages only):
  - Adds `<link rel="preload" as="font" type="font/woff2" crossorigin>` for
    the Jakarta and Inter files (`DIVISION_CRITICAL_FONTS`, which must match
    the `url()`s in `type.css`). Plex Mono loads on demand.
  - Makes the parent's Google Fonts `<link>` non-blocking with
    `media="print" onload="this.media='all'"`, plus a `<noscript>` copy of the
    original. It still loads because a client-side navigation to an IT page
    needs it. The site CSP already allows both (`script-src 'unsafe-inline'`,
    `style-src https://fonts.googleapis.com`).
  - The build throws unless the shell has exactly one Google Fonts stylesheet
    link without a `media` or `onload` attribute.

### Type scale

The tokens are `--nwse-type-<style>-{family,size,line-height,tracking,weight}`
on `.nwse-root`, and the classes are `.nwse-type-<style>`. Every division
heading, hero summary, body paragraph, label, and kicker uses them in place of
the Tailwind font utilities in the "Replaces" column. Each class reproduces the
computed style it replaced from 640px up, so the swap caused no visual jump
there. Checked on the hub, a service page, and the contact page at 1440px
(and at 390px before the phone scale below existed): apart from the new
icons, the only change is a footer blurb about 2px shorter, because its
descriptor label now uses the label line height (18px) instead of inheriting
the paragraph's 1.625 (19.5px). Phones (below 640px) deliberately use their
own tighter scale.

- Colour stays separate. `.nwse-kicker` (Lure Amber Deep),
  `.nwse-kicker-on-dark` (Lure Amber), and `.nwse-label` (Tide Blue) in
  `division.css` now set colour only, so write `nwse-type-kicker nwse-kicker`
  or `nwse-type-label nwse-label`, or put the colour on the element.
  `.nwse-display` is gone; use `nwse-type-display-1` or `-2`.
- Don't stack a Tailwind font utility (`font-medium`, `text-lg`, `leading-*`)
  on an element that has a type class. `type.css` loads after the IT
  stylesheet, so the type class wins. Change the token, or leave the element
  on plain utilities.
- Deliberately left on Tailwind utilities: nav links, the endorsement-bar link
  (`text-xs font-medium`, since caption is 400), footer links, FAQ questions,
  related-service titles, roadmap list items, and buttons.
- `type.test.ts` fails if a kicker or label class loses its type class, if a
  division component uses `leading-*` or a `text-lg`-or-larger size, or if
  `.nwse-display` comes back.

| Class | Family | Size / line height | Weight, tracking | Replaces |
|---|---|---|---|---|
| `nwse-type-display-1` | Display | phones 32px at 1.06; from 640px `clamp(2.25rem, 1.59rem + 2.7vw, 3.75rem)` at 1 (landscape phones 36px) | 800, −0.01em; word-spacing 0.06em from 640px | hero H1 `text-4xl leading-[1.05] sm:text-5xl lg:text-6xl` |
| `nwse-type-display-2` | Display | phones 24/28.8px; 36/40px from 640px | 800, −0.01em; word-spacing 0.06em from 640px | section H2 `text-3xl leading-tight sm:text-4xl` |
| `nwse-type-title-1` | Text | phones 18/24px; 20/28px from 640px | 700 | `text-xl font-bold` card H3 |
| `nwse-type-title-2` | Text | phones 17/24px; 18/28px from 640px | 700 | `text-lg font-bold` card and step H3 |
| `nwse-type-lead` | Text | phones 16px at 1.55; 18/28px from 640px | 400 | hero summary `text-base leading-relaxed sm:text-lg` |
| `nwse-type-body` | Text | phones 16px at 1.6; 16/26px from 640px | 400 | `text-base leading-relaxed` |
| `nwse-type-body-small` | Text | phones 14px at 1.55; 14/22.75px from 640px | 400 | `text-sm leading-relaxed` |
| `nwse-type-caption` | Text | 12/16px | 400 | `text-xs` (breadcrumbs) |
| `nwse-type-label` | Mono, caps | 12/18px | 500, 0.12em | `.nwse-label` |
| `nwse-type-kicker` | Mono, caps | 12/18px | 600, 0.14em | `.nwse-kicker` type properties; keep `.nwse-kicker` or `.nwse-kicker-on-dark` for the amber |
| `nwse-type-numeric` | any | — | `tabular-nums` | figures that must align |

- Phones (below 640px) get their own tighter scale in the base tokens (H1 32
  / H2 24 / card titles 18: about a 1.33 step, so a section head never reads
  as a second headline); the `@media (min-width: 640px)` block restores the
  tablet and desktop values, which `type.test.ts` pins. From 640px, `display-1` is the only fluid style:
  60px from 1280px and within about 7px of the replaced steps in between.
- `display-1` and `display-2` add 0.06em of word spacing from 640px (Plus
  Jakarta Sans ExtraBold's word space is narrow). Phones keep normal spacing.
- The 640px line heights are what today's pages actually render. Tailwind's
  `sm:text-*` utilities carry their own line height, which overrides the
  `leading-*` class. To restore the intended leading (1.05, 1.25, 1.625),
  change the token in the `@media (min-width: 640px)` block.
- OpenType features stay at the family defaults. Inter's `cv11`
  (single-storey a) is deliberately off, and tabular figures appear only in
  `nwse-type-numeric`.

### Updating the fonts

1. Request
   `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&family=Inter:wght@100..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap`
   with a current Chrome User-Agent and download the `/* latin */` block's
   files under NEW file names that carry the Google Fonts version (for example
   `inter-v21-latin-var.woff2`), and update the `url()`s in `type.css`,
   `DIVISION_CRITICAL_FONTS` in `prerender.ts`, and the file list in
   `type.test.ts`. `vercel.json` serves these files with a one-year immutable
   cache, so reusing a name would leave returning visitors on the old file.
2. Recompute the fallback values if the fonts' metrics changed. Use fonttools
   to average advance widths weighted by capsize's English "latin" frequency
   table (`@capsizecss/unpack`), then apply the formulas in the `type.css`
   header. Arial and Courier New widths can be measured on Liberation Sans and
   Liberation Mono.
3. Run `npx vitest run src/divisions/socialEngineering`. `type.test.ts` checks
   the files, licences, family names, and scoping; `prerender.test.ts` checks
   the preloads and the deferred Google stylesheet.

## Icons

The division draws with its own 35-icon set. New Wave IT pages keep Lucide.

### Files

- `src/divisions/socialEngineering/icons/iconData.ts`: pure data with no
  React, so `types.ts` and the content modules can name icons. It exports
  `DIVISION_ICONS` (name → `{ label, group, paths: { d, accent? }[] }`),
  `type DivisionIconName`, and `DIVISION_ICON_NAMES` in display order. Groups
  are `services`, `phases`, `method`, `journey`, `metrics`, and `ui`.
- `src/divisions/socialEngineering/icons/NwseIcon.tsx`: the component.
- The same icons ship as SVG files in the brand kit. `iconData.ts` was
  converted from those files, and the two must stay identical.

### Using `NwseIcon`

```tsx
<NwseIcon name="service-web" size={20} className="text-[var(--nwse-lure-amber-deep)]" />
<NwseIcon name="map-pin" title="Service area" /> {/* meaningful: role="img" + <title> */}
```

- `size` sets the rendered size in px (default 24). The grid is always 24 x 24,
  with `stroke="currentColor"`, a 1.75 stroke, and round caps and joins. Set the
  colour with a `text-*` class or an inherited `color`.
- The accent (the brand wave) is stroked with
  `var(--nwse-icon-accent, currentColor)`. `.nwse-root` sets
  `--nwse-icon-accent` to Lure Amber in `division.css`. Pass `accentColor`, or
  set the variable on a parent, to change it.
- By default an icon is decorative: `aria-hidden="true"` and
  `focusable="false"`. Give it a `title` only when the icon itself carries
  meaning that no nearby text states. It then renders `role="img"`,
  `aria-labelledby`, and a `<title>`. Icon-only buttons put their name on the
  button (`aria-label`), as the header menu toggle does.
- Sizes in use (the 1.75 stroke is lighter than Lucide's 2, so the two
  smallest uses went up a step to stay crisp on 1x screens):
  - 14: inline link arrows, the endorsement-bar arrow, journey chevrons.
  - 15: check bullets.
  - 16: the Services dropdown chevron, footer contact rows, the CTA arrow,
    related-card arrows.
  - 20: Services dropdown icons (in their 32px tile).
  - 18: the FAQ chevron, hub service-card arrows, related-service icons, the
    contact form.
  - 20: hub service tiles.
  - 24: menu and close.
  - 32: contact success.

  The new content icons (steps, phases, metrics) are 24.

### Where the icons appear

| Place | Icons |
|---|---|
| Service cards, dropdown, related services (`ServiceIcon`) | `service-*`, mapped from `DivisionServiceIcon` (`social` → `service-social` …) |
| Hub "How we work" (`StepList`) | `method-*`, via `hubContent.method[].icon`; a 24px icon in a 48px `.nwse-icon` tile beside the step label |
| Hub roadmap (`RoadmapGrid`) | `phase-*`, via `hubContent.roadmap[].icon`; same tile |
| Hub "What we measure" | `metric-*`, via `hubContent.metrics[].icon`; 24px, Cloud White with the amber accent, inline with the label |
| Header, footer, FAQ, CTAs, check lists | `arrow-right`, `arrow-up-right`, `chevron-down`, `chevron-right`, `menu`, `close`, `check`, `phone`, `mail`, `map-pin` |
| Contact page (shared IT form) | `phone`, `mail`, `map-pin`, `send`, `check-circle`, through `Contact`'s `icons` prop |

- `DivisionPoint.icon` and `DivisionRoadmapPhase.icon` are optional.
  `StepList` and `RoadmapGrid` show the tile only when an item has one, so the
  service pages' process steps keep their numbered cards from 768px up; below
  768px they are a timeline with amber nodes (`data-markers="node"`).
- The journey strip has no icons. At chip size (16px) the ticket and the
  two-person icons turn muddy and the accent waves shrink to amber specks next
  to the step numbers. The chips would also get wider, which only lengthens
  the strip (one sideways-scrolling row below 1024px), and `journey-discover`
  is the only journey icon without an accent. The `journey-*` icons remain in the set and the brand kit
  for larger uses.
- `components/Contact.tsx` takes an optional
  `icons?: Partial<Record<'phone' | 'mail' | 'mapPin' | 'send' | 'success', ReactNode>>`.
  Each slot falls back to the Lucide icon IT pages have always used, so IT
  pages render exactly as before. `Contact.test.tsx` pins that.

### The accent rule

- Each icon has at most one accent: one or two paths, drawn last, marked
  `accent: true` (`data-accent="true"` in the SVG). The accent is the brand
  wave, an S-curve echoing the logo, such as `c2.2-2.4 4.8-2.4 7 0s4.8 2.4 7 0`
  for a 14-unit run. It is never the logo's hook shape.
- The accent is decorative. Every icon must still read in one colour.
- UI arrows, chevrons, close, and check never have an accent. The contact
  glyphs (`phone`, `mail`, `map-pin`, `send`) don't either.
- No security metaphors, ever: no locks, shields, hooks, fishing, masks, or
  hackers. This division is social, brand, web, and marketing work, not
  security testing.

### Adding an icon

1. Draw it to the spec: one SVG, `viewBox="0 0 24 24"`, root attributes
   `fill="none" stroke="currentColor" stroke-width="1.75"
   stroke-linecap="round" stroke-linejoin="round"`, and only `<path d>`
   elements. That means no circle, rect, or line elements (use arcs), and no
   transforms, fills, text, masks, or per-path stroke widths. Keep all ink,
   including the stroke, inside 2–22 on both axes, and leave at least 2 units
   between parallel strokes. Circles are about 18 across, rounded corners are
   r2.5, and dots are zero-length segments (`M12 17h.01`).
2. Check it at 16, 24, and 48px on white and on Deep Current, in full colour
   and in one colour.
3. Add the SVG and its manifest entry (name, group, label) to the brand kit.
4. Add it to `iconData.ts` at its group's position. Each `<path d>` becomes
   `{ d: '…' }`, and accent paths become `{ d: '…', accent: true }` at the end.
   Keep the `d` strings exactly as they are in the SVG.
5. Run `npx vitest run src/divisions/socialEngineering`. `icons.test.ts` checks:
   - every path parses and stays on the grid;
   - accents are 1–2 curved paths, drawn last, and absent from UI glyphs;
   - labels are unique within a group;
   - names and labels use no security wording;
   - every icon name used in code or content exists;
   - no file under `src/divisions` imports `lucide-react`.

   `NwseIcon.test.tsx` covers rendering and accessibility, and
   `pages.test.tsx` checks the rendered pages.
