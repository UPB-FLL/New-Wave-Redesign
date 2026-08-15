"""Canonical New Wave IT vector logo family."""

from __future__ import annotations

from pathlib import Path

from brandkit.spec import BRAND, COLORS, PACKAGE_PATHS
from brandkit.svg import description, group, path, rect, serialize, svg, title
from brandkit.typography import ensure_plus_jakarta_extrabold, outline_text

_STANDARD_STROKES = (
    "M 8 18 C 17 8 29 8 39 18 S 51 28 56 16",
    "M 8 31 C 17 21 29 21 39 31 S 51 41 56 29",
    "M 8 44 C 17 34 29 34 39 44 S 51 54 56 42",
)
_MICRO_STROKES = (
    "M 8 23 C 19 12 38 14 56 23",
    "M 8 41 C 19 30 38 32 56 41",
)
_DIGITAL_COLORWAYS = {
    "full_color": {
        "strokes": (COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"]),
        "wordmark": COLORS["current_navy"],
        "tagline": COLORS["tide_blue"],
    },
    "current_navy": {"strokes": (COLORS["current_navy"],) * 3, "wordmark": COLORS["current_navy"], "tagline": COLORS["current_navy"]},
    "cloud_white": {"strokes": (COLORS["cloud_white"],) * 3, "wordmark": COLORS["cloud_white"], "tagline": COLORS["cloud_white"]},
    "on_light": {
        "strokes": (COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"]),
        "wordmark": COLORS["current_navy"],
        "tagline": COLORS["tide_blue"],
    },
    "on_dark": {
        "strokes": (COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"]),
        "wordmark": COLORS["cloud_white"],
        "tagline": COLORS["signal_cyan"],
    },
    "print_black": {"strokes": ("#000000",) * 3, "wordmark": "#000000", "tagline": "#000000"},
}


def _normalize_colorway(colorway: str) -> str:
    normalized = colorway.replace("-", "_")
    if normalized not in _DIGITAL_COLORWAYS:
        raise ValueError(f"unknown logo colorway: {colorway}")
    return normalized


def current_stroke_paths(variant: str) -> tuple[str, ...]:
    """Return the canonical paths for the standard or optical micro mark."""
    if variant == "standard":
        return _STANDARD_STROKES
    if variant == "micro":
        return _MICRO_STROKES
    raise ValueError(f"unknown icon variant: {variant}")


def _icon_group(parent, variant: str, colors: tuple[str, ...]) -> None:
    strokes = current_stroke_paths(variant)
    mark = group(parent, **{"data-role": "three-current-mark"})
    for index, d in enumerate(strokes):
        path(
            mark,
            d,
            **{
                "data-role": "current-stroke",
                "fill": "none",
                "stroke": colors[index],
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "stroke-width": "4",
            },
        )


def build_icon_svg(variant: str, colorway: str) -> bytes:
    """Build a direct-use standard or micro current-mark SVG."""
    if variant not in {"standard", "micro"}:
        raise ValueError(f"unknown icon variant: {variant}")
    palette = _DIGITAL_COLORWAYS[_normalize_colorway(colorway)]
    root = svg(
        "0 0 64 64",
        role="img",
        **({"data-optical-size": "micro-24-and-under"} if variant == "micro" else {}),
    )
    title(root, f"{BRAND['name']} {variant} icon")
    description(root, "Three current strokes moving forward from left to right.")
    _icon_group(root, variant, palette["strokes"])
    return serialize(root)


def build_wordmark_path(text: str, font_path: Path) -> str:
    """Return the approved Plus Jakarta Sans text as portable SVG path data."""
    return outline_text(text, font_path).d


def _outlined_label(parent, text: str, font_path: Path, x: float, baseline: float, height: float, fill: str, role: str) -> float:
    outlined = outline_text(text, font_path)
    scale = height / outlined.units_per_em
    path(
        parent,
        outlined.d,
        **{
            "data-role": role,
            "fill": fill,
            "transform": f"translate({x:.3f} {baseline:.3f}) scale({scale:.8f})",
        },
    )
    return outlined.advance * scale


def build_lockup_svg(layout: str, show_tagline: bool, colorway: str) -> bytes:
    """Build outlined wordmark and mark lockups with no live font dependency."""
    if layout not in {"horizontal", "stacked", "wordmark"}:
        raise ValueError(f"unknown lockup layout: {layout}")
    palette = _DIGITAL_COLORWAYS[_normalize_colorway(colorway)]
    font_path = ensure_plus_jakarta_extrabold()
    root = svg("0 0 360 120", role="img")
    title(root, BRAND["name"])
    description(root, "New Wave IT wordmark and three-current mark.")

    if layout == "wordmark":
        _outlined_label(root, "NEW WAVE IT", font_path, 20, 70, 42, palette["wordmark"], "wordmark-path")
        if show_tagline:
            _outlined_label(root, BRAND["heritage_line"], font_path, 20, 100, 13, palette["tagline"], "heritage-path")
    elif layout == "horizontal":
        icon = group(root, transform="translate(20 28) scale(0.92)")
        _icon_group(icon, "standard", palette["strokes"])
        _outlined_label(root, "NEW WAVE IT", font_path, 96, 69, 35, palette["wordmark"], "wordmark-path")
        if show_tagline:
            _outlined_label(root, BRAND["heritage_line"], font_path, 98, 96, 12, palette["tagline"], "heritage-path")
    else:
        icon = group(root, transform="translate(148 12) scale(0.92)")
        _icon_group(icon, "standard", palette["strokes"])
        outlined = outline_text("NEW WAVE IT", font_path)
        scale = 31 / outlined.units_per_em
        _outlined_label(root, "NEW WAVE IT", font_path, (360 - outlined.advance * scale) / 2, 98, 31, palette["wordmark"], "wordmark-path")
        if show_tagline:
            _outlined_label(root, BRAND["heritage_line"], font_path, 92, 116, 10, palette["tagline"], "heritage-path")
    return serialize(root)


def _construction_svg(font_path: Path) -> bytes:
    root = svg("0 0 640 460", role="img")
    title(root, "New Wave IT logo construction")
    description(root, "Technical construction sheet for the canonical three-current mark.")
    rect(root, 80, 70, 320, 320, fill="none", stroke=COLORS["slate"], **{"stroke-width": "1"})
    rect(root, 120, 110, 240, 240, fill="none", stroke=COLORS["tide_blue"], **{"stroke-dasharray": "5 5", "stroke-width": "1"})
    mark = group(root, transform="translate(80 70) scale(5)")
    _icon_group(mark, "standard", (COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"]))
    for y in (160, 225, 290):
        path(root, f"M 105 {y} H 375", fill="none", stroke=COLORS["mist_gray"], **{"stroke-width": "1"})
    path(root, "M 80 52 V 408", fill="none", stroke=COLORS["slate"], **{"stroke-width": "1"})
    path(root, "M 48 70 H 80 M 48 390 H 80", fill="none", stroke=COLORS["slate"], **{"stroke-width": "1"})
    _outlined_label(root, "64 x 64 MASTER VIEWBOX", font_path, 80, 38, 14, COLORS["current_navy"], "construction-label")
    _outlined_label(root, "48 x 48 OPTICAL FIELD", font_path, 415, 122, 12, COLORS["current_navy"], "construction-label")
    _outlined_label(root, "8u CLEAR SPACE (X)", font_path, 415, 160, 12, COLORS["current_navy"], "construction-label")
    _outlined_label(root, "STROKE CENTERS", font_path, 415, 198, 12, COLORS["current_navy"], "construction-label")
    _outlined_label(root, "MIN DIGITAL: 140px", font_path, 415, 262, 12, COLORS["current_navy"], "construction-label")
    _outlined_label(root, "WITH HERITAGE: 220px", font_path, 415, 292, 12, COLORS["current_navy"], "construction-label")
    _outlined_label(root, "MICRO MARK: 24px MAX", font_path, 415, 322, 12, COLORS["current_navy"], "construction-label")
    return serialize(root)


def export_logo_family(output_root: Path) -> None:
    """Write only Task 3 SVG logo deliverables from immutable contract paths."""
    font_path = ensure_plus_jakarta_extrabold()
    for relative in PACKAGE_PATHS["logo_vectors"]:
        target = output_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        filename = target.stem.removeprefix("new-wave-it-")
        if filename == "logo-construction":
            target.write_bytes(_construction_svg(font_path))
            continue
        if filename.endswith("-print-black"):
            layout = filename.removesuffix("-print-black")
            colorway = "print_black"
        else:
            layout, colorway = filename.rsplit("-", 1)
            colorway = colorway.replace("-", "_")
            if layout.endswith("-full"):
                layout = layout.removesuffix("-full")
                colorway = "full_color"
            elif layout.endswith("-current"):
                layout = layout.removesuffix("-current")
                colorway = "current_navy"
            elif layout.endswith("-cloud"):
                layout = layout.removesuffix("-cloud")
                colorway = "cloud_white"
            elif layout.endswith("-on"):
                layout = layout.removesuffix("-on")
                colorway = f"on_{colorway}"
        if layout == "icon":
            target.write_bytes(build_icon_svg("standard", colorway))
        elif layout == "micro-icon":
            target.write_bytes(build_icon_svg("micro", colorway))
        else:
            target.write_bytes(
                build_lockup_svg(
                    "horizontal" if layout.startswith("horizontal") else "stacked" if layout.startswith("stacked") else "wordmark",
                    layout.endswith("-tagline"),
                    colorway,
                )
            )
