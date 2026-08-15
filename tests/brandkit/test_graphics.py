import json
import re
from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageFont

from brandkit.cli import build
from brandkit.logo import export_logo_family
from brandkit.patterns import export_patterns
from brandkit.render import export_raster_family
from brandkit.digital import export_web_digital
from brandkit.spec import COLORS, PACKAGE_PATHS
from brandkit.typography import ensure_plus_jakarta_extrabold


@pytest.fixture()
def package_root(tmp_path: Path) -> Path:
    root = build(tmp_path / "new-wave-it-brand-package")
    export_logo_family(root)
    export_raster_family(root)
    export_patterns(root)
    export_web_digital(root)
    return root


def test_pattern_contract_uses_only_approved_tokens(package_root: Path) -> None:
    approved = {color.lower() for color in COLORS.values()}
    for relative in PACKAGE_PATHS["patterns"]:
        path = package_root / relative
        content = path.read_text(encoding="utf-8").lower()
        colors = set(re.findall(r"#[0-9a-f]{6}", content))
        assert colors <= approved
        assert "<text" not in content
        assert "gradient" not in content
        assert 'viewbox="0 0 1600 900"' in content
        assert path.stat().st_size < 40 * 1024


def test_token_exports_are_machine_readable_and_share_approved_values(package_root: Path) -> None:
    token_root = package_root / "04-tokens-typography"
    json_path = token_root / "new-wave-it-tokens.json"
    css_path = token_root / "new-wave-it-tokens.css"
    ts_path = token_root / "new-wave-it-tokens.ts"
    assert {path.name for path in token_root.iterdir()} == {json_path.name, css_path.name, ts_path.name}

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert payload["color"]["deep_current"] == COLORS["deep_current"]
    assert payload["color"]["signal_cyan"] == COLORS["signal_cyan"]
    assert payload["typography"]["display"] == "Plus Jakarta Sans"
    assert payload["typography"]["body"] == "Inter"
    for color in COLORS.values():
        assert color in css_path.read_text(encoding="utf-8")
        assert color in ts_path.read_text(encoding="utf-8")


def test_technical_grids_remain_subordinate(package_root: Path) -> None:
    for tone in ("light", "dark"):
        content = (package_root / f"05-patterns-backgrounds/technical-grid-{tone}.svg").read_text(
            encoding="utf-8"
        )
        opacities = [float(value) for value in re.findall(r'stroke-opacity="([0-9.]+)"', content)]
        assert opacities
        assert all(opacity < 0.18 for opacity in opacities)


def test_web_digital_dimensions_and_safe_text_metadata(package_root: Path) -> None:
    expected = {
        "open-graph-1200x630.png": (1200, 630),
        "social-share-square-1200x1200.png": (1200, 1200),
        "website-hero-current-field-2400x1400.png": (2400, 1400),
        "email-header-1200x300.png": (1200, 300),
        "support-portal-app-icon-512x512.png": (512, 512),
    }
    asset_root = package_root / "06-web-digital"
    expected_metadata = {
        "open-graph-1200x630.json",
        "social-share-square-1200x1200.json",
        "website-hero-current-field-2400x1400.json",
        "email-header-1200x300.json",
    }
    assert {path.name for path in asset_root.glob("*.json")} == expected_metadata
    for filename, size in expected.items():
        with Image.open(asset_root / filename) as image:
            assert image.size == size
            assert image.mode == "RGBA"
            assert all(pixel[:3] != (0, 0, 0) for pixel in image.getdata())

    for metadata_path in asset_root.glob("*.json"):
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        width, height = metadata["canvas"]
        for x, y, box_width, box_height in metadata["text_boxes"]:
            assert x >= 48 and y >= 48
            assert x + box_width <= width - 48
            assert y + box_height <= height - 48
        for index, first in enumerate(metadata["text_boxes"]):
            for second in metadata["text_boxes"][index + 1 :]:
                assert not _overlap(first, second)


def test_hero_metadata_encloses_independently_measured_glyph_bounds(package_root: Path) -> None:
    metadata_path = package_root / "06-web-digital/website-hero-current-field-2400x1400.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    declared_boxes = metadata["text_boxes"]
    canvas = Image.new("RGBA", (2400, 1400), COLORS["deep_current"])
    draw = ImageDraw.Draw(canvas)
    font_path = ensure_plus_jakarta_extrabold()
    promise_font = ImageFont.truetype(str(font_path), size=94)
    service_font = ImageFont.truetype(str(font_path), size=38)
    measured = (
        _pillow_box(draw.textbbox((96, 430), "Technology that keeps business moving.", font=promise_font)),
        _pillow_box(
            draw.multiline_textbbox(
                (96, 565),
                "Managed IT, cybersecurity, cloud, and support built around the way your business actually works.",
                font=service_font,
                spacing=12,
            )
        ),
    )
    for glyph_bounds in measured:
        assert any(_encloses(declared, glyph_bounds) for declared in declared_boxes)


def _overlap(first: list[int], second: list[int]) -> bool:
    left, top, width, height = first
    other_left, other_top, other_width, other_height = second
    return not (
        left + width <= other_left
        or other_left + other_width <= left
        or top + height <= other_top
        or other_top + other_height <= top
    )


def _pillow_box(bounds: tuple[int, int, int, int]) -> list[int]:
    left, top, right, bottom = bounds
    return [left, top, right - left, bottom - top]


def _encloses(outer: list[int], inner: list[int]) -> bool:
    left, top, width, height = outer
    inner_left, inner_top, inner_width, inner_height = inner
    return (
        left <= inner_left
        and top <= inner_top
        and left + width >= inner_left + inner_width
        and top + height >= inner_top + inner_height
    )
