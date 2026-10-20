# The three reports

Every audit produces three PDFs in the business's own brand (colors, fonts and logo from
`findings.json` → `brand`), each marked "Prepared by New Wave: Social Engineering · <date>":

| File in Drive | Built by | Pages | Links inside |
|---|---|---|---|
| `<Business> - Marketing Audit Summary.pdf` | `build_onepager.py` → `render_pdf.cjs summary` | 1 (Letter) | deck PDF (each "Slide N →"), audit PDF, Drive folder |
| `<Business> - Marketing Audit Slides.pdf` | a deck script using `slidekit.py` → `render_pdf.cjs deck` | 11 (1920×1080) | the audit PDF, on the closing slide |
| `<Business> - Full Marketing Audit.pdf` | `build_audit.py` → `render_pdf.cjs audit` | 10 (1440 wide) | none |

**Links are Google Drive links only.** No claude.ai, no website or source URLs as links (name sources in
text instead). `check_links.py` must pass on all three before anything is reported done.

## Build order (links depend on uploads)

1. Build and measure the full audit; print it; upload it → audit PDF link.
2. Build the deck with that link on the closing slide; check it; print it; upload it → deck PDF link.
3. Build the summary with the deck link, audit link and folder link; print it; upload it.
4. `check_links.py` on the three local PDFs, which are the bytes that were uploaded.

## Full audit: ten boards (`build_audit.py` spec)

Spec keys: `company`, `canvas_title`, `report_label`, `footer_label`, `prepared_by`, `created_at`,
`per_row`, `theme`, `boards`. Theme: `fonts` {display, body, label?, mono?, href (Google Fonts CSS URL)},
`radius`, `display_weight`, `display_weight_2`, `logo` {src, alt, h_small, h_cover}, and `colors` with every
key used in `examples/sample/audit_spec.py`. Check text colors against their backgrounds (4.5:1).

Images: use `"src": "asset:<name>"` and list each in `<out_root>/assets_map.json`
(`{"asset:logo.png": "/abs/path/brand/logo.png"}`); the renderers embed them.

Board (`file`, `name`, `kicker`, `title`, `dek?`, `cover?`, `blocks`). Blocks: `kpis`, `cards`, `table`,
`list`, `timeline`, `bars`, `heading`, `callout`, `note`, `image`, `row` (columns of blocks). Their options
are the keys read in `scripts/build_audit.py`.

| # | file | What it covers |
|---|---|---|
| 1 | Main (cover) | Headline verdict, 3–4 KPIs, what's working vs. what's costing them, base-case return |
| 2 | History | Dated marketing timeline (site, profile, social, ads) with sources |
| 3 | Google | Maps positions by search and area, ratings by platform, profile posts, listing fixes |
| 4 | Social | Instagram (followers, median likes, best post), other platforms, rivals' followers |
| 5 | Website | Organic traffic, keywords, DR, first mobile screen, tracking tags, fixes in order |
| 6 | Ads | Ads on record for the business and rivals, the campaign we'd run, benchmarks |
| 7 | Competitors | 4–6 rivals: distance, rating, reviews, ads, Instagram, differentiator |
| 8 | Keywords | Demand by theme, terms by area, keyword-to-page changes |
| 9 | Plan | What's working, where to improve (prioritized), weeks 1–2 / 3–6 / 7–12 |
| 10 | ROI | Scenario table, assumptions with sources, unmodeled upside, stop-loss |

Run `measure_audit.cjs` (writes `heights.json`; exit 2 = overflow or a broken image), fix, rebuild with
`--heights`, and look at the `--shots` screenshots before printing.

## Deck: eleven slides (`slidekit.py`)

Ids, in order: `cover`, `glance`, `google`, `social`, `website`, `ads`, `competitors`, `keywords`, `plan`,
`roi`, `next`. The summary links `glance`, `roi`, `plan` and the five finding slides by id, so keep the
ids. Fonts ≥ 24px; content must stay above the footer line; `check_slides.cjs` must print `ok` for every
slide (exit 2 otherwise). Shorten text rather than shrink type. The closing slide's only link is
`("Full audit (PDF)", <audit PDF Drive link>)`. Reuse the audit theme with `theme_from_audit()`.

## Summary (`build_onepager.py`)

Headline, four KPIs, five findings each tied to a slide id, the three ROI scenarios, three 90-day steps,
and a footer with the deck, audit and folder links. It must fit one Letter page (`render_pdf.cjs` exits 2
otherwise).

## Writing rules

- Plain words; numbers with their source and date; "about" for estimates.
- Say what the data can't show ("needs owner access: Google Business Profile Performance").
- Never describe as active what the business doesn't do, and never call a missing account "none" unless the
  research brief's tie rule was met.
- People are named only as the business itself names them publicly; use they/them unless stated.
