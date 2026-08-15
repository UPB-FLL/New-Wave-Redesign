"""Solid-color SVG patterns derived from the canonical three-current mark."""

from __future__ import annotations

from pathlib import Path

from brandkit.spec import COLORS, PACKAGE_PATHS
from brandkit.svg import path, rect, serialize, svg

_CURRENT_STROKES = (
    "M -180 270 C 80 80 270 80 480 270 S 850 460 1080 270 S 1450 80 1780 270",
    "M -180 450 C 80 260 270 260 480 450 S 850 640 1080 450 S 1450 260 1780 450",
    "M -180 630 C 80 440 270 440 480 630 S 850 820 1080 630 S 1450 440 1780 630",
)
_DENSITIES = {
    "subtle": ((0.10, 0.08, 0.08), 5),
    "standard": ((0.18, 0.14, 0.14), 7),
    "high-impact": ((0.28, 0.22, 0.20), 9),
}


def _tone(tone: str) -> tuple[str, str]:
    if tone == "light":
        return COLORS["cloud_white"], COLORS["current_navy"]
    if tone == "dark":
        return COLORS["deep_current"], COLORS["cloud_white"]
    raise ValueError(f"unknown pattern tone: {tone}")


def current_field_svg(density: str, tone: str) -> bytes:
    """Return a 1600x900 current field using the mark's three-wave rhythm."""
    if density not in _DENSITIES:
        raise ValueError(f"unknown current-field density: {density}")
    background, neutral = _tone(tone)
    opacities, stroke_width = _DENSITIES[density]
    root = svg("0 0 1600 900", role="img", **{"aria-label": "Current field pattern"})
    rect(root, 0, 0, 1600, 900, fill=background)
    colors = (COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"])
    for d, color, opacity in zip(_CURRENT_STROKES, colors, opacities, strict=True):
        path(
            root,
            d,
            fill="none",
            stroke=color,
            **{
                "stroke-width": stroke_width,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "stroke-opacity": opacity,
            },
        )
    if density != "subtle":
        path(
            root,
            "M 1020 270 h 1 M 1020 450 h 1 M 1020 630 h 1",
            fill="none",
            stroke=neutral,
            **{"stroke-width": 10 if density == "high-impact" else 7, "stroke-linecap": "round", "stroke-opacity": 0.28},
        )
    return serialize(root)


def technical_grid_svg(tone: str) -> bytes:
    """Return a quiet 8/32-unit technical grid without text labels."""
    background, foreground = _tone(tone)
    root = svg("0 0 1600 900", role="img", **{"aria-label": "Technical grid pattern"})
    rect(root, 0, 0, 1600, 900, fill=background)
    for coordinate in range(0, 1601, 32):
        path(root, f"M {coordinate} 0 V 900", fill="none", stroke=foreground, **{"stroke-width": 1, "stroke-opacity": 0.12})
    for coordinate in range(0, 901, 32):
        path(root, f"M 0 {coordinate} H 1600", fill="none", stroke=foreground, **{"stroke-width": 1, "stroke-opacity": 0.12})
    for coordinate in range(0, 1601, 8):
        path(root, f"M {coordinate} 0 V 900", fill="none", stroke=foreground, **{"stroke-width": 1, "stroke-opacity": 0.045})
    for coordinate in range(0, 901, 8):
        path(root, f"M 0 {coordinate} H 1600", fill="none", stroke=foreground, **{"stroke-width": 1, "stroke-opacity": 0.045})
    for x, y, color in ((320, 256, COLORS["signal_cyan"]), (800, 448, COLORS["continuity_green"]), (1280, 640, COLORS["tide_blue"])):
        path(root, f"M {x - 4} {y} H {x + 4}", fill="none", stroke=color, **{"stroke-width": 8, "stroke-linecap": "round", "stroke-opacity": 0.16})
    return serialize(root)


def signal_points_svg(tone: str) -> bytes:
    """Return sparse signal points placed on the current-field intersections."""
    background, _ = _tone(tone)
    root = svg("0 0 1600 900", role="img", **{"aria-label": "Signal points pattern"})
    rect(root, 0, 0, 1600, 900, fill=background)
    for d, color in zip(_CURRENT_STROKES, (COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"]), strict=True):
        path(root, d, fill="none", stroke=color, **{"stroke-width": 3, "stroke-linecap": "round", "stroke-opacity": 0.14})
    for x, y, color in ((480, 270, COLORS["signal_cyan"]), (1080, 450, COLORS["continuity_green"]), (1450, 630, COLORS["tide_blue"])):
        path(root, f"M {x - 5} {y} H {x + 5}", fill="none", stroke=color, **{"stroke-width": 10, "stroke-linecap": "round"})
    return serialize(root)


def export_patterns(package_root: Path) -> None:
    """Write the ten immutable Task 5 pattern artifacts."""
    output_root = package_root / "05-patterns-backgrounds"
    for density in ("subtle", "standard", "high-impact"):
        for tone in ("light", "dark"):
            (output_root / f"current-field-{density}-{tone}.svg").write_bytes(current_field_svg(density, tone))
    for tone in ("light", "dark"):
        (output_root / f"technical-grid-{tone}.svg").write_bytes(technical_grid_svg(tone))
        (output_root / f"signal-points-{tone}.svg").write_bytes(signal_points_svg(tone))
    missing = [relative for relative in PACKAGE_PATHS["patterns"] if not (package_root / relative).is_file()]
    if missing:
        raise RuntimeError(f"Task 5 pattern export missed artifacts: {missing}")
