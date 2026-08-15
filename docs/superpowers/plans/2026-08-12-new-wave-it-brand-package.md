# New Wave IT Brand Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved controlled-evolution identity, generate the complete downloadable brand package, and migrate the existing New Wave IT website to the same canonical logo paths and brand tokens.

**Architecture:** A Python-based reproducible brand generator owns the canonical copy, colors, dimensions, logo geometry, vector exports, raster exports, PDFs, DOCX files, PPTX files, email assets, manifests, and ZIP packaging. The React site consumes a generated TypeScript token module and the same canonical SVG path data, while only web-ready outputs are copied into `public/brand/`. Generated customer deliverables live under `output/new-wave-it-brand-package/` and are not hand-edited.

**Tech Stack:** Python 3.11+, Pillow, CairoSVG, ReportLab, python-docx, python-pptx, fontTools, lxml, PyMuPDF, pytest, React 18, TypeScript, Tailwind CSS, Vitest, Testing Library, Vite, GitHub, Vercel.

**Delivery approval:** The full package scope and controlled-evolution architecture were approved on August 13, 2026. Read the companion delivery design at `docs/superpowers/specs/2026-08-13-new-wave-it-full-package-delivery-design.md` and the approved reference package in `docs/brand/` before beginning implementation.

## Global Constraints

- Preserve the New Wave IT name, three-current concept, cyan/green recognition, and the heritage line `Don’t get lost in the current`.
- Primary positioning line: `Technology that keeps business moving.`
- Supporting service statement: `Managed IT, cybersecurity, cloud, and support built around the way your business actually works.`
- Palette values are exact: Deep Current `#09131D`, Current Navy `#101E2D`, Signal Cyan `#31C6CF`, Continuity Green `#62BE68`, Tide Blue `#317B92`, Cloud White `#F7FAFB`, Mist Gray `#E8EFF1`, Slate `#526271`, Pure White `#FFFFFF`.
- Typography: Plus Jakarta Sans for display, Inter for body/interface, IBM Plex Mono for technical labels, Instrument Serif only as an optional editorial accent.
- Pure black `#000000` is permitted only for monochrome print/PDF logo exports. It is not a web, social, or application-interface brand token.
- Do not redistribute font files in the final package. Font files may be used only as internal build inputs.
- The standard icon has three strokes; the two-stroke optical variant is permitted only for outputs rendered at 24 px or smaller.
- Do not introduce shields, padlocks, hexagons, circuit-board filler, hooded-hacker imagery, neon cyberpunk effects, or generic stock-tech identity devices.
- White body text may not be placed directly on Signal Cyan or Continuity Green.
- Instagram portrait assets must keep critical content inside the centered `1080 × 1080` profile-grid preview.
- Story/Reel assets must keep critical content between `y=270` and `y=1536` on a `1080 × 1920` canvas.
- YouTube banner critical content must remain inside a centered `1544 × 423` safe area on a `2560 × 1440` canvas.
- X header critical content must avoid the top and bottom 60 pixels on a `1500 × 500` canvas.
- Website routes, Supabase behavior, forms, analytics, support functionality, legal content, and current service-page content remain unchanged unless a targeted brand migration requires a shared-style adjustment.
- Generated SVG, PNG, PDF, DOCX, PPTX, HTML, TXT, CSV, JSON, and ZIP assets must be validated before completion.
- The brand guide PDF and preview in `docs/brand/` are the visual authority. Do not recreate, replace, or reinterpret the approved identity outside the canonical brand source.
- Do not stage, commit, push, or deploy any changes without separate explicit user authorization. A plan step labeled "Commit" means prepare the exact file list and verification evidence for authorization; it does not grant authorization by itself.
- A Vercel preview is an optional release action. Request explicit authorization after local verification before invoking any deployment command.

---

## File Structure

```text
brandkit/
├── __init__.py                  # Package marker
├── spec.py                      # Immutable tokens, copy, dimensions, output contract
├── color.py                     # Contrast and color conversion helpers
├── svg.py                       # XML/SVG helpers and safe serialization
├── typography.py                # Font discovery and text-to-path conversion
├── logo.py                      # Canonical current mark and lockup builders
├── render.py                    # SVG → PNG/PDF rendering and image checks
├── patterns.py                  # Current fields, technical grids, signal points
├── digital.py                   # Web, Open Graph, profile, and banner assets
├── social.py                    # Social template families and safe-area layouts
├── documents.py                 # DOCX templates and operational one-sheets
├── slides.py                    # PPTX theme and slide layouts
├── print_assets.py              # Business cards and print-ready PDF exports
├── email_assets.py              # HTML signatures, notices, and email headers
├── guide.py                     # Brand guide PDF and preview sheet
├── package.py                   # Manifest, checksums, ZIP, and package verification
└── cli.py                       # Build and verify command-line interface

scripts/
├── build_brand_package.py       # Thin CLI entry point
└── verify_brand_package.py      # Thin verification entry point

tests/brandkit/
├── test_spec.py
├── test_color.py
├── test_logo.py
├── test_render.py
├── test_social.py
├── test_documents.py
├── test_slides.py
├── test_package.py
└── test_web_contract.py

src/brand/
├── tokens.ts                    # Generated semantic brand tokens
├── logoPaths.ts                 # Generated canonical path constants
└── index.ts                     # Public exports

src/components/brand/
├── NewWaveLogo.tsx              # Canonical responsive React logo
├── BrandMark.tsx                # Standalone icon component
├── CurrentField.tsx             # Decorative current-field component
├── NewWaveLogo.test.tsx
└── CurrentField.test.tsx

src/styles/
└── brand.css                    # CSS custom properties and shared utilities

public/brand/
├── logos/
├── icons/
├── patterns/
├── social/
└── og/

output/new-wave-it-brand-package/
└── ...                          # Full verified package from the approved spec
```

---

### Task 1: Establish the Brand Build Harness

**Files:**
- Create: `requirements-brand.txt`
- Create: `brandkit/__init__.py`
- Create: `brandkit/cli.py`
- Create: `scripts/build_brand_package.py`
- Create: `scripts/verify_brand_package.py`
- Create: `tests/brandkit/test_spec.py`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Python 3.11+ and the repository root.
- Produces: `brandkit.cli.build(output_root: Path) -> Path`, `brandkit.cli.verify(package_root: Path) -> None`, and npm scripts `brand:build`, `brand:verify`, and `brand:test`.

- [ ] **Step 1: Write the failing build-harness test**

```python
# tests/brandkit/test_spec.py
from pathlib import Path
from brandkit.cli import build


def test_build_creates_package_root(tmp_path: Path) -> None:
    root = build(tmp_path / "new-wave-it-brand-package")
    assert root.exists()
    assert (root / "00-read-me").is_dir()
```

- [ ] **Step 2: Run the test and confirm the import failure**

Run: `python -m pytest tests/brandkit/test_spec.py -q`

Expected: FAIL because `brandkit.cli` does not exist.

- [ ] **Step 3: Add the pinned brand-tool requirements**

```text
# requirements-brand.txt
Pillow==11.3.0
CairoSVG==2.8.2
reportlab==4.4.3
python-docx==1.2.0
python-pptx==1.0.2
fonttools==4.59.0
lxml==6.0.0
PyMuPDF==1.26.3
pytest==8.4.1
```

- [ ] **Step 4: Implement the minimal build and verify entry points**

```python
# brandkit/cli.py
from pathlib import Path

DIRECTORIES = (
    "00-read-me", "01-brand-guide", "02-logos/svg", "02-logos/png",
    "02-logos/print-pdf", "02-logos/monochrome", "03-favicons-app-icons",
    "04-tokens-typography", "05-patterns-backgrounds", "06-web-digital",
    "07-social/profile", "07-social/banners", "07-social/templates",
    "08-documents-presentations", "09-print", "10-email-support",
    "11-source", "12-preview",
)


def build(output_root: Path) -> Path:
    for relative in DIRECTORIES:
        (output_root / relative).mkdir(parents=True, exist_ok=True)
    return output_root


def verify(package_root: Path) -> None:
    missing = [p for p in DIRECTORIES if not (package_root / p).is_dir()]
    if missing:
        raise ValueError(f"missing package directories: {missing}")
```

- [ ] **Step 5: Add executable wrappers and npm scripts**

```python
# scripts/build_brand_package.py
from pathlib import Path
from brandkit.cli import build

if __name__ == "__main__":
    build(Path("output/new-wave-it-brand-package"))
```

```json
{
  "scripts": {
    "brand:build": "python scripts/build_brand_package.py",
    "brand:verify": "python scripts/verify_brand_package.py",
    "brand:test": "python -m pytest tests/brandkit -q"
  }
}
```

Merge those keys into the existing `scripts` object without removing current scripts.

- [ ] **Step 6: Ignore generated output but keep source and docs tracked**

Append:

```gitignore
/output/
/.brand-build/
```

- [ ] **Step 7: Run the harness test**

Run: `python -m pytest tests/brandkit/test_spec.py -q`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add requirements-brand.txt brandkit scripts tests/brandkit/test_spec.py package.json .gitignore
git commit -m "build: add reproducible brand package harness"
```

---

### Task 2: Define Canonical Tokens, Copy, Dimensions, and Contrast Rules

**Files:**
- Create: `brandkit/spec.py`
- Create: `brandkit/color.py`
- Create: `tests/brandkit/test_color.py`
- Expand: `tests/brandkit/test_spec.py`

**Interfaces:**
- Produces: `BRAND`, `COLORS`, `TYPOGRAPHY`, `SOCIAL_SPECS`, `PACKAGE_PATHS`, `hex_to_rgb()`, `contrast_ratio()`, and `assert_contrast()`.
- Later tasks must import these values rather than restating colors, copy, dimensions, or output paths.

- [ ] **Step 1: Add exact-token tests**

```python
from brandkit.spec import BRAND, COLORS, SOCIAL_SPECS


def test_approved_copy_and_palette_are_exact() -> None:
    assert BRAND["name"] == "New Wave IT"
    assert BRAND["promise"] == "Technology that keeps business moving."
    assert BRAND["heritage_line"] == "Don’t get lost in the current"
    assert COLORS["current_navy"] == "#101E2D"
    assert COLORS["signal_cyan"] == "#31C6CF"
    assert COLORS["continuity_green"] == "#62BE68"


def test_platform_dimensions_are_locked() -> None:
    assert SOCIAL_SPECS["instagram_portrait"] == {"width": 1080, "height": 1350, "safe_square_y": 135}
    assert SOCIAL_SPECS["story"] == {"width": 1080, "height": 1920, "safe_top": 270, "safe_bottom": 1536}
    assert SOCIAL_SPECS["youtube_banner"]["safe"] == {"width": 1544, "height": 423}
```

- [ ] **Step 2: Add contrast tests for approved combinations**

```python
from brandkit.color import contrast_ratio
from brandkit.spec import COLORS


def test_primary_text_pairs_meet_wcag_aa() -> None:
    assert contrast_ratio(COLORS["current_navy"], COLORS["cloud_white"]) >= 4.5
    assert contrast_ratio(COLORS["pure_white"], COLORS["current_navy"]) >= 4.5
    assert contrast_ratio(COLORS["slate"], COLORS["cloud_white"]) >= 4.5


def test_white_on_accent_is_not_documented_as_body_copy() -> None:
    assert contrast_ratio(COLORS["pure_white"], COLORS["signal_cyan"]) < 4.5
    assert contrast_ratio(COLORS["pure_white"], COLORS["continuity_green"]) < 4.5
```

- [ ] **Step 3: Run tests to verify failure**

Run: `python -m pytest tests/brandkit/test_spec.py tests/brandkit/test_color.py -q`

Expected: FAIL because the token and color modules do not exist.

- [ ] **Step 4: Implement immutable specification data**

Use `MappingProxyType` for dictionaries and tuples for ordered sets. Define every directory and asset filename from the approved specification, including all logo families, color variants, favicon sizes, social sizes, document names, presentation layouts, and package index files.

- [ ] **Step 5: Implement WCAG contrast calculations**

```python
def _linear(channel: int) -> float:
    value = channel / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def contrast_ratio(foreground: str, background: str) -> float:
    fr, fg, fb = hex_to_rgb(foreground)
    br, bg, bb = hex_to_rgb(background)
    lum_f = 0.2126 * _linear(fr) + 0.7152 * _linear(fg) + 0.0722 * _linear(fb)
    lum_b = 0.2126 * _linear(br) + 0.7152 * _linear(bg) + 0.0722 * _linear(bb)
    lighter, darker = max(lum_f, lum_b), min(lum_f, lum_b)
    return (lighter + 0.05) / (darker + 0.05)
```

- [ ] **Step 6: Run tests**

Run: `python -m pytest tests/brandkit/test_spec.py tests/brandkit/test_color.py -q`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add brandkit/spec.py brandkit/color.py tests/brandkit/test_spec.py tests/brandkit/test_color.py
git commit -m "feat: codify approved New Wave IT brand tokens"
```

---

### Task 3: Build the Canonical Logo Geometry and Vector Family

**Files:**
- Create: `brandkit/svg.py`
- Create: `brandkit/typography.py`
- Create: `brandkit/logo.py`
- Create: `tests/brandkit/test_logo.py`
- Modify: `scripts/build_brand_package.py`
- Create during build: `.brand-build/fonts/` internal-only font cache
- Generate: `output/new-wave-it-brand-package/02-logos/svg/*.svg`
- Generate: `output/new-wave-it-brand-package/02-logos/monochrome/*.svg`
- Generate: `output/new-wave-it-brand-package/11-source/logo-construction.svg`

**Interfaces:**
- Consumes: `COLORS`, `BRAND`, and an internal Plus Jakarta Sans ExtraBold font path.
- Produces: `build_icon_svg(variant, colorway)`, `build_lockup_svg(layout, show_tagline, colorway)`, `build_wordmark_path(text, font_path)`, and `export_logo_family(output_root)`.

- [ ] **Step 1: Write structural logo tests**

```python
from lxml import etree
from brandkit.logo import build_icon_svg, build_lockup_svg


def test_standard_icon_has_three_open_strokes() -> None:
    root = etree.fromstring(build_icon_svg("standard", "full_color"))
    paths = root.xpath("//*[local-name()='path']")
    wave_paths = [p for p in paths if p.get("data-role") == "current-stroke"]
    assert len(wave_paths) == 3
    assert all(p.get("fill") == "none" for p in wave_paths)
    assert all(p.get("stroke-linecap") == "round" for p in wave_paths)


def test_micro_icon_has_two_strokes_and_is_labeled_optical() -> None:
    root = etree.fromstring(build_icon_svg("micro", "current_navy"))
    assert root.get("data-optical-size") == "micro-24-and-under"
    assert len(root.xpath("//*[@data-role='current-stroke']")) == 2


def test_wordmark_is_outlined_not_live_text() -> None:
    root = etree.fromstring(build_lockup_svg("horizontal", True, "on_light"))
    assert not root.xpath("//*[local-name()='text']")
    assert root.xpath("//*[@data-role='wordmark-path']")
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `python -m pytest tests/brandkit/test_logo.py -q`

Expected: FAIL because the logo modules do not exist.

- [ ] **Step 3: Implement safe SVG primitives**

`brandkit/svg.py` must provide namespace-aware helpers for `<svg>`, `<g>`, `<path>`, `<rect>`, `<defs>`, metadata, and deterministic pretty serialization. Reject scripts, external references, gradient elements, and unsupported URL values. Approved logo assets use solid semantic colors only.

- [ ] **Step 4: Implement text outlining with fontTools**

Use `TTFont`, `SVGPathPen`, the font glyph set, cmap, hmtx metrics, and kerning/GPOS when available. Convert `NEW WAVE IT` and the heritage line to path data. Scale from units-per-em into the required lockup geometry. The exported SVGs must contain paths only; do not embed fonts or font files.

- [ ] **Step 5: Implement the approved three-current mark**

Use one `64 × 64` viewBox. Keep the visible geometry within `x=8..56` and `y=8..56`. Use identical stroke width, round caps, and round joins. Define three distinct cubic Bézier paths with balanced optical spacing and left-to-right forward motion. Define a separate two-path micro variant optimized for 16–24 px.

- [ ] **Step 6: Implement lockups and colorways**

Generate horizontal, horizontal-tagline, stacked, stacked-tagline, icon, micro-icon, and wordmark files in full color, Current Navy, Cloud White, print-only black, on-light, and on-dark variants. Add `<title>` and `<desc>` only to standalone assets intended for direct use; decorative website SVGs will use `aria-hidden` in React.

- [ ] **Step 7: Generate the construction sheet**

Create `logo-construction.svg` showing the `64 × 64` viewBox, optical field, stroke centers, clear-space `x`, and minimum-size notes. Use technical labels in IBM Plex Mono or the approved fallback, converted to paths for portability.

- [ ] **Step 8: Add the explicit logo build stage, then run tests and inspect source**

Extend `scripts/build_brand_package.py` with an `argparse` `--stage` option whose choices are `all` and `logos`, defaulting to `all`. Both modes create the package root; `logos` invokes `export_logo_family(output_root)` and returns without invoking later asset stages. Preserve repository-root execution and the existing no-argument behavior from Task 1.

Run: `python -m pytest tests/brandkit/test_logo.py -q`

Expected: PASS.

Run: `python scripts/build_brand_package.py --stage logos`

Expected: every required logo SVG exists and contains no `<text>`, `<image>`, `<script>`, or external URL.

- [ ] **Step 9: Commit**

```bash
git add brandkit/svg.py brandkit/typography.py brandkit/logo.py scripts/build_brand_package.py tests/brandkit/test_logo.py
git commit -m "feat: build canonical New Wave IT logo family"
```

---

### Task 4: Render PNG, PDF, Favicon, and App-Icon Outputs

**Files:**
- Create: `brandkit/render.py`
- Create: `tests/brandkit/test_render.py`
- Generate: `output/new-wave-it-brand-package/02-logos/png/*`
- Generate: `output/new-wave-it-brand-package/02-logos/print-pdf/*`
- Generate: `output/new-wave-it-brand-package/03-favicons-app-icons/*`

**Interfaces:**
- Consumes: vector exports from Task 3.
- Produces: `render_svg_png()`, `render_svg_pdf()`, `build_ico()`, `inspect_png()`, and `export_raster_family()`.

- [ ] **Step 1: Add raster-contract tests**

```python
from pathlib import Path

import pytest
from PIL import Image
from brandkit.cli import build
from brandkit.logo import export_logo_family
from brandkit.render import export_raster_family, inspect_png


@pytest.fixture()
def package_root(tmp_path: Path) -> Path:
    root = build(tmp_path / "new-wave-it-brand-package")
    export_logo_family(root)
    export_raster_family(root)
    return root


def test_transparent_logo_png_has_alpha(package_root: Path) -> None:
    png = next((package_root / "02-logos" / "png").glob("*.png"))
    info = inspect_png(png)
    assert info.mode == "RGBA"
    assert info.has_transparency is True


def test_favicon_contract_contains_required_sizes(package_root: Path) -> None:
    expected = {"favicon-16x16.png": (16, 16), "favicon-32x32.png": (32, 32), "favicon-48x48.png": (48, 48)}
    for name, size in expected.items():
        with Image.open(package_root / "03-favicons-app-icons" / name) as image:
            assert image.size == size
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `python -m pytest tests/brandkit/test_render.py -q`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic rendering**

Use CairoSVG for SVG-to-PNG/PDF rendering. Use Pillow only for post-render inspection, alpha checks, ICO assembly, and maskable-icon padding. Never resize an already rasterized logo upward; render every size directly from SVG.

- [ ] **Step 4: Export logo PNGs and vector PDFs**

Render transparent PNG widths `512`, `1024`, and `2048` for lockups; icon sizes `256`, `512`, `1024`, and `2048`; print PDFs from the vector masters.

- [ ] **Step 5: Export the favicon and app-icon family**

Create:

```text
favicon.svg
favicon.ico
favicon-16x16.png
favicon-32x32.png
favicon-48x48.png
apple-touch-icon.png
pwa-icon-192.png
pwa-icon-512.png
pwa-maskable-512.png
safari-pinned-tab.svg
```

Use the micro icon only for 16, 32, 48, and ICO layers. Use the three-stroke standard icon for 180 px and larger. The maskable icon must keep the visible symbol inside the central 80% safe zone.

- [ ] **Step 6: Run tests and inspect favicon contact sheet**

Run: `python -m pytest tests/brandkit/test_render.py -q`

Expected: PASS.

Generate a `12-preview/favicon-contact-sheet.png` with each favicon shown at native size and 8× nearest-neighbor zoom for manual inspection.

- [ ] **Step 7: Commit**

```bash
git add brandkit/render.py tests/brandkit/test_render.py
git commit -m "feat: export raster logos and application icons"
```

---

### Task 5: Build Patterns, Backgrounds, and Web-Digital Assets

**Files:**
- Create: `brandkit/patterns.py`
- Create: `brandkit/digital.py`
- Generate: `output/new-wave-it-brand-package/05-patterns-backgrounds/*`
- Generate: `output/new-wave-it-brand-package/06-web-digital/*`
- Generate/copy later: `public/brand/patterns/*`, `public/brand/og/*`, `public/brand/icons/*`

**Interfaces:**
- Produces: `current_field_svg(density, tone)`, `technical_grid_svg(tone)`, `signal_points_svg(tone)`, `build_og_image()`, `build_hero_current_field()`, `build_email_header()`, and `build_support_app_icon()`.

- [ ] **Step 1: Write pattern tests**

Verify the subtle, standard, and high-impact current fields use approved colors only; contain no text; have deterministic viewBoxes; and remain below 40 KB each. Verify the light and dark technical grids use opacity below 0.18.

- [ ] **Step 2: Implement three current-field densities**

Derive the line rhythm from the logo geometry. Vary line count, crop, and opacity rather than changing the core wave language. Add optional signal points only at intersections or purposeful endpoints.

- [ ] **Step 3: Implement technical-grid backgrounds**

Build light and dark SVGs using 8 px and 32 px grid intervals, measured labels, and sparse node points. Keep the grid subordinate to text.

- [ ] **Step 4: Build web assets**

Generate:

```text
open-graph-1200x630.png
social-share-square-1200x1200.png
website-hero-current-field-2400x1400.png
email-header-1200x300.png
support-portal-app-icon-512x512.png
```

Open Graph composition: icon/wordmark top-left, primary promise as the main message, service statement below, Fort Lauderdale/South Florida as a small location line, current field framing the right and bottom edges.

- [ ] **Step 5: Test output dimensions and text-safe margins**

Assert dimensions with Pillow. Add metadata in a sibling JSON file recording each text box and safe area; tests must verify all boxes are at least 48 px from the edge and do not overlap.

- [ ] **Step 6: Commit**

```bash
git add brandkit/patterns.py brandkit/digital.py tests/brandkit
git commit -m "feat: add New Wave IT graphic language and web assets"
```

---

### Task 6: Generate Social Profiles and Platform Banners

**Files:**
- Expand: `brandkit/digital.py`
- Create: `tests/brandkit/test_social.py`
- Generate: `output/new-wave-it-brand-package/07-social/profile/*`
- Generate: `output/new-wave-it-brand-package/07-social/banners/*`

**Interfaces:**
- Produces: `build_profile_assets()`, `build_banner(platform)`, and `assert_safe_area(asset_meta)`.

- [ ] **Step 1: Add dimension and safe-area tests**

Test the exact profile and banner dimensions from the approved specification. Test YouTube safe area `1544 × 423`, X 60 px top/bottom exclusion, and conservative centered copy fields for LinkedIn and Facebook.

- [ ] **Step 2: Build universal and platform profile assets**

Use the standalone standard icon centered on Current Navy. Maintain at least 16% outer padding. Do not include the wordmark in circular-crop profile images.

- [ ] **Step 3: Build platform banners**

Each banner must share the same composition grammar while respecting platform crops. Use the horizontal lockup, the primary promise, a concise service line, a controlled current field, and no fake interface screenshots.

- [ ] **Step 4: Generate crop previews**

Create preview PNGs showing desktop, mobile, and circular-profile overlays where applicable. Store these only in `12-preview/platform-crops/`.

- [ ] **Step 5: Run tests**

Run: `python -m pytest tests/brandkit/test_social.py -q`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add brandkit/digital.py tests/brandkit/test_social.py
git commit -m "feat: generate social profile and banner assets"
```

---

### Task 7: Build Eight Social Content Template Families

**Files:**
- Create: `brandkit/social.py`
- Expand: `tests/brandkit/test_social.py`
- Generate: `output/new-wave-it-brand-package/07-social/templates/**/*.svg`
- Generate: `output/new-wave-it-brand-package/07-social/templates/**/*.png`

**Interfaces:**
- Produces: `build_social_template(family, format, content) -> SocialAsset` for families `security_alert`, `service_spotlight`, `educational_tip`, `client_result`, `status_update`, `local_insight`, `team_announcement`, and `brand_announcement`.

- [ ] **Step 1: Write preview-safe tests**

For every portrait template, calculate bounding boxes for `logo`, `headline`, `message`, and `cta`. Assert all critical boxes stay within `y=135..1215`. For Story/Reel, assert critical boxes stay within `y=270..1536`.

- [ ] **Step 2: Implement shared template primitives**

Create semantic primitives for brand header, current-frame border, alert strip, metric block, quote block, numbered checklist, CTA, location line, and footer. Every family must compose these primitives without inventing new colors or logo variants.

- [ ] **Step 3: Implement eight differentiated template families**

Use varied hierarchy and geometry:

- Security alert: decisive status strip and concise action block
- Service spotlight: service title, outcome, and three proof points
- Educational tip: numbered or checklist format
- Client result: large metric and supporting quote
- Status update: current-state label, timeline, and next update
- Local insight: location line and editorial framing
- Team announcement: name/role area that can accept a real photo later
- Brand announcement: bold promise-led campaign composition

Do not use generated people. Photo placeholders must be labeled, optional, and use neutral masks.

- [ ] **Step 4: Export editable SVG and ready-to-post PNG examples**

Export portrait, square, Story/Reel, LinkedIn square, and LinkedIn landscape where applicable. Use realistic New Wave IT sample copy, not lorem ipsum.

- [ ] **Step 5: Generate a feed preview**

Create `12-preview/social-feed-preview.png` showing twelve mixed template examples at actual mobile thumbnail scale. Verify the set feels coherent without being repetitive.

- [ ] **Step 6: Run tests and commit**

```bash
python -m pytest tests/brandkit/test_social.py -q
git add brandkit/social.py tests/brandkit/test_social.py
git commit -m "feat: add branded social content template system"
```

---

### Task 8: Generate DOCX Operational and Sales Templates

**Files:**
- Create: `brandkit/documents.py`
- Create: `tests/brandkit/test_documents.py`
- Generate: `output/new-wave-it-brand-package/08-documents-presentations/*.docx`
- Generate: PDF review copies in the same directory

**Interfaces:**
- Produces: `build_letterhead()`, `build_proposal_template()`, `build_capabilities_sheet()`, `build_reach_us_sheet()`, `build_security_notice()`, `build_meeting_notes()`, and `build_project_status()`.

- [ ] **Step 1: Read and follow `/home/oai/skills/docx/SKILL.md` before implementation**

Apply its page-size, margin, typography, image, rendering, and verification requirements to every DOCX output.

- [ ] **Step 2: Add DOCX structural tests**

Use `zipfile` and `python-docx` to assert each file opens, uses US Letter, has the required header/footer relationships, includes the correct support email and website where applicable, and contains no legacy hex colors in DrawingML.

- [ ] **Step 3: Build reusable document theme helpers**

Define styles for Title, Subtitle, Heading 1–3, Body, Small Label, Technical Label, Callout, Table Header, and Footer. Use Plus Jakarta Sans/Inter font names, with graceful fallback when opened on systems without them. Do not embed or package font files.

- [ ] **Step 4: Generate seven editable templates**

Create:

```text
new-wave-it-letterhead.docx
new-wave-it-proposal-template.docx
new-wave-it-capabilities-sheet.docx
new-wave-it-how-to-reach-us.docx
new-wave-it-cybersecurity-notice.docx
new-wave-it-meeting-notes.docx
new-wave-it-project-status.docx
```

The “How to reach us” document must preserve `support@newwaveitfl.com`, the shared-inbox guidance, issue categories, required information, suggested subject line, and the warning not to email passwords, MFA codes, recovery codes, or sensitive credentials.

- [ ] **Step 5: Render and inspect review copies**

Convert every DOCX to PDF using the approved DOCX skill workflow. Inspect each page at full size and in a contact sheet. Fix clipping, widow/orphan issues, excessive whitespace, and broken header/footer positioning.

- [ ] **Step 6: Run tests and commit**

```bash
python -m pytest tests/brandkit/test_documents.py -q
git add brandkit/documents.py tests/brandkit/test_documents.py
git commit -m "feat: generate branded New Wave IT document templates"
```

---

### Task 9: Generate the 16:9 Presentation Template

**Files:**
- Create: `brandkit/slides.py`
- Create: `tests/brandkit/test_slides.py`
- Generate: `output/new-wave-it-brand-package/08-documents-presentations/new-wave-it-presentation-template.pptx`
- Generate: PDF and PNG review renders

**Interfaces:**
- Produces: `build_presentation_template(path: Path) -> Path` with named layouts `Title`, `Section`, `Content`, `Comparison`, `Process`, `Quote`, `Metric`, and `Closing`.

- [ ] **Step 1: Read and follow `/home/oai/skills/slides/SKILL.md` before implementation**

- [ ] **Step 2: Write structural tests**

Open the PPTX with `python-pptx` and assert widescreen dimensions, eight required layout examples, title and body placeholders, speaker-note guidance, and approved theme colors only.

- [ ] **Step 3: Build a controlled slide theme**

Use Current Navy and Cloud White as the dominant surfaces. Use Signal Cyan for primary emphasis and Continuity Green only for positive states. Use current fields as edge framing rather than full-slide decoration.

- [ ] **Step 4: Build eight representative layouts**

Include real sample content demonstrating the intended hierarchy. Add a final hidden reference slide with the palette, type scale, spacing, and logo rules for internal users.

- [ ] **Step 5: Render and inspect**

Render the PPTX using the slide-skill verification flow. Inspect every slide at full resolution and in a contact sheet. Verify no text overlaps, no clipped shapes, and sufficient contrast.

- [ ] **Step 6: Run tests and commit**

```bash
python -m pytest tests/brandkit/test_slides.py -q
git add brandkit/slides.py tests/brandkit/test_slides.py
git commit -m "feat: add New Wave IT presentation system"
```

---

### Task 10: Generate Print Assets and Email/Support Communications

**Files:**
- Create: `brandkit/print_assets.py`
- Create: `brandkit/email_assets.py`
- Expand: `tests/brandkit/test_documents.py`
- Generate: `output/new-wave-it-brand-package/09-print/*`
- Generate: `output/new-wave-it-brand-package/10-email-support/*`

**Interfaces:**
- Produces: business-card SVG/PDF files, invoice header/footer assets, responsive email signatures, plain-text signature, maintenance notice, incident update, welcome header, and support-email header/footer.

- [ ] **Step 1: Read and follow `/home/oai/skills/pdfs/SKILL.md` before producing print PDFs**

- [ ] **Step 2: Add print-size and bleed tests**

Assert business-card PDF trim is `3.5 × 2 in`, artboard includes `0.125 in` bleed on all sides, all critical text remains at least `0.125 in` inside trim, and crop marks are outside the bleed.

- [ ] **Step 3: Build horizontal and vertical business cards**

Use editable SVG masters and CMYK-target print PDFs. Create full-color and one-color variants. Use clear placeholders for employee name, role, phone, and email; keep company website and support email accurate.

- [ ] **Step 4: Build invoice assets**

Generate reusable SVG/PNG header and footer strips plus a one-page usage PDF documenting placement, minimum padding, and monochrome behavior.

- [ ] **Step 5: Build responsive email signatures**

Create an HTML table-based signature with inline CSS, a plain-text fallback, dark-text accessible links, and a PNG fallback logo. Do not rely on externally hosted SVG support. Include a short installation guide for Outlook desktop, Outlook web, Gmail, Apple Mail, and mobile clients without promising identical rendering.

- [ ] **Step 6: Build support and customer-notice assets**

Create maintenance notice, incident update, welcome/onboarding header, and support-email header/footer as HTML and PNG. Every incident/status layout must include fields for status, impact, affected service, started time, next update, and support contact.

- [ ] **Step 7: Verify and commit**

Run DOCX/PDF/image tests and inspect print PDFs at 100% zoom.

```bash
git add brandkit/print_assets.py brandkit/email_assets.py tests/brandkit
git commit -m "feat: add print, email, and support communication assets"
```

---

### Task 11: Build the Brand Guide, Quick Guide, Preview, and Asset Index

**Files:**
- Create: `brandkit/guide.py`
- Generate: `output/new-wave-it-brand-package/01-brand-guide/new-wave-it-brand-guide.pdf`
- Generate: `output/new-wave-it-brand-package/01-brand-guide/new-wave-it-quick-usage-guide.md`
- Generate: `output/new-wave-it-brand-package/12-preview/new-wave-it-brand-preview.png`
- Generate: `output/new-wave-it-brand-package/00-read-me/new-wave-it-asset-index.csv`
- Generate: `output/new-wave-it-brand-package/00-read-me/new-wave-it-read-me.txt`

**Interfaces:**
- Consumes: all approved assets from Tasks 2–10.
- Produces: a searchable 12-section PDF guide, concise Markdown guide, 2400 × 1800 preview sheet, asset index, and read-me.

- [ ] **Step 1: Read and follow `/home/oai/skills/pdfs/SKILL.md`**

Use vector artwork where possible, searchable text, embedded metadata, and the prescribed render-and-inspect verification flow.

- [ ] **Step 2: Build the 12-section guide**

Cover positioning, messaging, voice, logo family, construction, clear space, minimum size, incorrect use, colors, accessibility, typography, graphic language, photography, layout, motion, website usage, social safe areas, document/print usage, file organization, and export guidance.

- [ ] **Step 3: Build the quick-use guide**

Keep it operational: which logo to use, background rules, minimum sizes, copy standards, primary color pairs, type hierarchy, social safe areas, and the top ten prohibited uses.

- [ ] **Step 4: Build the preview sheet**

Compose the primary horizontal logo, stacked logo, icon, palette, typography sample, current field, Open Graph asset, social post/Story pair, business card, proposal cover, and presentation slide on one `2400 × 1800` board.

- [ ] **Step 5: Build the asset index**

CSV columns:

```text
relative_path,category,format,width_px,height_px,physical_size,background,colorway,editable,recommended_use,sha256
```

Do not create an XLSX file unless separately requested.

- [ ] **Step 6: Render and inspect the guide**

Render every guide page at 150 DPI, create a contact sheet, inspect all pages, and extract text. Confirm all required section headings and exact brand copy appear.

- [ ] **Step 7: Commit**

```bash
git add brandkit/guide.py
git commit -m "feat: generate New Wave IT brand guide and package index"
```

---

### Task 12: Package, Checksum, and Verify Every Deliverable

**Files:**
- Create: `brandkit/package.py`
- Create: `tests/brandkit/test_package.py`
- Generate: `output/new-wave-it-brand-package/build-report.json`
- Generate: `output/new-wave-it-brand-package.zip`

**Interfaces:**
- Produces: `build_manifest()`, `verify_package()`, `write_build_report()`, and `create_zip()`.

- [ ] **Step 1: Write package-contract tests**

Load the required-path list from `brandkit.spec.PACKAGE_PATHS`. Assert every path exists, is non-empty, and matches its expected type. Assert ZIP entries use forward slashes, contain no absolute paths, contain no font files, and contain no `.DS_Store`, temporary files, or internal `.brand-build` data.

- [ ] **Step 2: Add format-specific validators**

- SVG: parseable XML, valid viewBox, no scripts/external URLs
- PNG: exact dimensions, expected alpha behavior
- PDF: opens, nonzero page count, required page size where defined
- DOCX/PPTX: valid ZIP containers with required core files
- HTML: UTF-8, no script tags, no external trackers
- JSON/CSV: parseable and schema-complete
- ZIP: deterministic sorted entries and normalized timestamps

- [ ] **Step 3: Scan for prohibited content**

Fail if the package contains font file extensions, legacy colors `#39CCCC`, `#5EBC67`, `#152232`, or `#0f1923` outside a documented migration note, external Squarespace logo URLs, placeholder strings, lorem ipsum, or unsupported guarantees.

- [ ] **Step 4: Write the build report**

Include build timestamp, git commit, Python version, package version, total files, file counts by format, validation results, contrast results, safe-area results, and SHA-256 for the final ZIP.

- [ ] **Step 5: Run full brand verification**

```bash
npm run brand:test
npm run brand:build
npm run brand:verify
```

Expected: all tests pass and `output/new-wave-it-brand-package.zip` is created.

- [ ] **Step 6: Commit**

```bash
git add brandkit/package.py tests/brandkit/test_package.py scripts/verify_brand_package.py
git commit -m "build: verify and package complete New Wave IT brand system"
```

---

### Task 13: Generate the Website Brand Contract and React Components

**Files:**
- Create: `src/brand/tokens.ts`
- Create: `src/brand/logoPaths.ts`
- Create: `src/brand/index.ts`
- Create: `src/components/brand/NewWaveLogo.tsx`
- Create: `src/components/brand/BrandMark.tsx`
- Create: `src/components/brand/CurrentField.tsx`
- Create: `src/components/brand/NewWaveLogo.test.tsx`
- Create: `src/components/brand/CurrentField.test.tsx`
- Create: `src/styles/brand.css`
- Modify: `src/components/Logo.tsx`
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

**Interfaces:**
- Consumes: generated token and logo-path JSON from the Python pipeline.
- Produces: semantic tokens, canonical React logo components, and a backwards-compatible `Logo` wrapper.

- [ ] **Step 1: Read the build-web-apps React and frontend skills before implementation**

Read:

```text
skills://plugins/build-web-apps/react-best-practices/skill.md
skills://plugins/build-web-apps/frontend-app-builder/skill.md
```

Apply only the parts relevant to an existing Vite/React site; do not redesign unrelated features.

- [ ] **Step 2: Write the failing component tests**

```tsx
render(<NewWaveLogo tone="onLight" showTagline />);
expect(screen.getByLabelText('New Wave IT')).toBeInTheDocument();
expect(document.querySelectorAll('[data-role="current-stroke"]')).toHaveLength(3);
expect(document.querySelector('[data-role="wordmark-path"]')).toBeInTheDocument();
```

Also test `BrandMark opticalSize="micro"` renders two strokes and rejects sizes above 24 unless an explicit test-only override is supplied.

- [ ] **Step 3: Generate TypeScript tokens and paths**

The Python build must write deterministic TypeScript modules from the same source as the package. Do not manually duplicate path data or colors.

- [ ] **Step 4: Implement the React components**

`NewWaveLogo` props:

```ts
type NewWaveLogoProps = {
  tone?: 'onLight' | 'onDark' | 'oneColorNavy' | 'oneColorWhite';
  layout?: 'horizontal' | 'stacked';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
};
```

Use the approved solid semantic colors for all logo paths; do not introduce SVG color gradients. If an SVG definition ever needs a unique ID for a non-color purpose, use `useId()`. Decorative instances use `aria-hidden`; linked/navigation instances expose `aria-label="New Wave IT"` at the link level.

- [ ] **Step 5: Keep the existing import path working**

Replace `src/components/Logo.tsx` with a wrapper that forwards the current `tone`, `showTag`, and `className` API to `NewWaveLogo`. This prevents a large risky import migration in one commit.

- [ ] **Step 6: Add semantic CSS variables and Tailwind mapping**

Add `--nw-deep-current`, `--nw-current-navy`, and the remaining approved tokens. Update Tailwind semantic names while retaining legacy aliases temporarily:

```js
brand: {
  cyan: 'var(--nw-signal-cyan)',
  green: 'var(--nw-continuity-green)',
  navy: 'var(--nw-current-navy)',
  dark: 'var(--nw-deep-current)',
  muted: 'var(--nw-cloud-white)'
}
```

Document aliases as migration-only and test that they resolve to approved values.

- [ ] **Step 7: Run component tests, typecheck, and build**

```bash
npm test -- src/components/brand/NewWaveLogo.test.tsx src/components/brand/CurrentField.test.tsx
npm run typecheck
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/brand src/components/brand src/components/Logo.tsx src/styles/brand.css src/index.css tailwind.config.js
git commit -m "feat: integrate canonical New Wave IT brand components"
```

---

### Task 14: Replace Public Assets and First-Party Metadata

**Files:**
- Create: `public/brand/logos/*`
- Create: `public/brand/icons/*`
- Create: `public/brand/patterns/*`
- Create: `public/brand/og/*`
- Modify: `public/favicon.svg`
- Replace: `public/apple-touch-icon.svg` with `public/apple-touch-icon.png`
- Modify: `public/site.webmanifest`
- Modify: `index.html`
- Modify: `src/lib/usePageMeta.ts`
- Create: `tests/brandkit/test_web_contract.py`

**Interfaces:**
- Consumes: verified web exports from Tasks 4–6.
- Produces: first-party metadata and production web assets.

- [ ] **Step 1: Add metadata-contract tests**

Search `index.html`, `src/lib/usePageMeta.ts`, and built assets. Assert there is no `images.squarespace-cdn.com` logo reference. Assert Open Graph and structured-data logo URLs point to `https://www.newwaveitfl.com/brand/...`.

- [ ] **Step 2: Copy only approved web assets into `public/brand/`**

Do not commit the complete customer ZIP to the web root. Include only logos, icons, lightweight patterns, and Open Graph assets required by the site.

- [ ] **Step 3: Update favicon and manifest references**

Use the new SVG favicon, PNG Apple icon, 192/512 PWA icons, maskable icon, approved theme color, and correct icon purposes.

- [ ] **Step 4: Replace external metadata assets**

Update `og:image`, `twitter:image`, LocalBusiness logo/image, and Organization logo to first-party URLs. Preserve current titles, descriptions, canonical URLs, address, service areas, and legal/business details unless a separate verified correction is required.

- [ ] **Step 5: Run tests and build**

```bash
python -m pytest tests/brandkit/test_web_contract.py -q
npm run typecheck
npm test
npm run build
rg -n "squarespace-cdn|#39CCCC|#5EBC67|#152232|#0f1923" dist src public index.html tailwind.config.js
```

Expected: no external legacy logo URL; remaining legacy color hits must be limited to a documented compatibility test or migration comment.

- [ ] **Step 6: Commit**

```bash
git add public/brand public/favicon.svg public/apple-touch-icon.png public/site.webmanifest index.html src/lib/usePageMeta.ts tests/brandkit/test_web_contract.py
git commit -m "feat: replace legacy public branding with first-party assets"
```

---

### Task 15: Apply the Brand System to Shared Website Surfaces

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/Contact.tsx`
- Modify: `src/components/QuoteModal.tsx`
- Modify: `src/components/TrustBar.tsx`
- Modify: `src/components/StatusIndicator.tsx`
- Modify: `src/components/WaveBackground.tsx`
- Modify: `src/components/legal/LegalPageLayout.tsx`
- Modify: `src/pages/SupportPage.tsx`
- Modify: `src/pages/StatusPage.tsx`
- Modify as needed: shared service-page wrappers and CTA components
- Expand: existing React tests

**Interfaces:**
- Consumes: semantic tokens and brand components from Task 13.
- Produces: a consistent shared website identity without changing route behavior or data flow.

- [ ] **Step 1: Write regression tests for shared surfaces**

Verify navigation and footer still render legal/support links, support forms remain labeled, legal pages preserve semantic headings, status indicators still expose text labels, and no shared component renders legacy hard-coded colors.

- [ ] **Step 2: Update the navigation and footer**

Use the canonical logo, Plus Jakarta/Inter hierarchy, semantic colors, restrained shadows, and Current Navy/Cloud White contrast. Preserve all current menu items, routes, dropdown behavior, mobile behavior, and support CTA.

- [ ] **Step 3: Update the home-page hero and shared CTA style**

Use the primary promise as the approved hero hierarchy only where current CMS content permits without overwriting user-managed content. Replace excessive floating/glow effects with a controlled current field and meaningful signal motion. Respect reduced motion.

- [ ] **Step 4: Update forms, modals, trust, status, support, and legal surfaces**

Replace hard-coded colors with semantic tokens. Keep functionality intact. Use Continuity Green only for success/healthy states, Signal Cyan for primary action, Tide Blue for secondary information, and accessible dark text on accent fills.

- [ ] **Step 5: Update shared service-page treatments**

Change reusable wrappers and CTA components first. Do not manually restyle every page when the same result can be achieved through shared components and tokens.

- [ ] **Step 6: Run full frontend verification**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Record any pre-existing lint errors separately; no new error may be introduced.

- [ ] **Step 7: Commit**

```bash
git add src/components src/pages src/index.css
git commit -m "style: apply the New Wave IT brand system site-wide"
```

---

### Task 16: Visual QA, Preview Deployment, and Final Delivery

**Files:**
- Create: `docs/brand-package-qa.md`
- Generate: `.brand-build/site-screenshots/*`
- Generate: final `output/new-wave-it-brand-package.zip`
- Update: `output/new-wave-it-brand-package/build-report.json`

**Interfaces:**
- Consumes: complete package and branded website branch.
- Produces: verified ZIP, QA evidence, preview deployment, and production-ready branch.

- [ ] **Step 1: Read and follow `superpowers:verification-before-completion`**

No completion statement may be made until fresh verification evidence exists.

- [ ] **Step 2: Run the complete artifact build and verification**

```bash
npm run brand:test
npm run brand:build
npm run brand:verify
```

Record exact counts and failures in `docs/brand-package-qa.md`.

- [ ] **Step 3: Run the complete website verification**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 4: Render responsive website screenshots**

Capture home, services, cybersecurity, pricing, support, status, contact, privacy, and terms pages at `375`, `768`, `1280`, and `1440 px`. Inspect navigation, footer, logo, CTA, forms, text wrapping, safe areas, and reduced-motion behavior.

- [ ] **Step 5: Inspect every artifact category**

Open and review:

- Logo/favicons contact sheets
- Social feed and crop previews
- Every brand-guide page
- Every DOCX PDF review copy
- Every PPTX slide render
- Business-card print PDFs
- Email signature render
- Final package preview sheet

Document issues and rebuild until all checks pass.

- [ ] **Step 6: Request authorization, then create a preview deployment**

After local QA is complete, request explicit user authorization to deploy the branch to the existing Vercel project as a preview. If authorized, verify the preview uses first-party assets, has no broken routes, and preserves forms/support behavior. If not authorized, record that preview deployment remains deferred.

- [ ] **Step 7: Perform final source scans**

```powershell
rg -n "TBD|TODO|lorem ipsum|100% secure|zero downtime|never get hacked" output src public
rg -n "squarespace-cdn|#39CCCC|#5EBC67|#152232|#0f1923" output src public index.html tailwind.config.js
Get-ChildItem -LiteralPath "output/new-wave-it-brand-package" -File -Recurse | Sort-Object FullName | Select-Object -ExpandProperty FullName
Get-FileHash -Algorithm SHA256 "output/new-wave-it-brand-package.zip"
```

Expected: no placeholders or prohibited guarantees; legacy hits only where explicitly documented; all expected files present.

- [ ] **Step 8: Commit QA evidence**

```bash
git add docs/brand-package-qa.md
git commit -m "docs: record New Wave IT brand package QA"
```

- [ ] **Step 9: Final delivery**

Provide the user with:

- The verified ZIP download
- The brand guide PDF
- The preview sheet PNG
- The editable logo SVG folder or a secondary logo ZIP
- The DOCX templates
- The PPTX template
- The preview deployment URL
- A concise summary of website files changed and verification commands run

Do not claim production deployment unless the production target was explicitly promoted and freshly verified.
