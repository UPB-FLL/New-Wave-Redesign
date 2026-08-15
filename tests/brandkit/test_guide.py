from __future__ import annotations

import csv
import hashlib
from pathlib import Path

import fitz
from PIL import Image, ImageChops
import pytest

from brandkit.cli import build
from brandkit.guide import (
    ASSET_INDEX_FILENAME,
    BRAND_GUIDE_FILENAME,
    BRAND_PREVIEW_FILENAME,
    GUIDE_CONTACT_SHEET_FILENAME,
    QUICK_GUIDE_FILENAME,
    README_FILENAME,
    export_guide,
)
from brandkit.spec import BRAND, DIMENSIONS


def _seed_png(path: Path, size: tuple[int, int], color: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color).save(path)


def _seed_guide_inputs(root: Path) -> None:
    _seed_png(root / "02-logos/png/new-wave-it-horizontal-full-color-512.png", (512, 128), "#F7FAFB")
    _seed_png(root / "02-logos/png/new-wave-it-stacked-full-color-512.png", (512, 512), "#E8EFF1")
    _seed_png(root / "03-favicons-app-icons/pwa-icon-512.png", (512, 512), "#31C6CF")
    _seed_png(root / "06-web-digital/open-graph-1200x630.png", (1200, 630), "#101E2D")
    _seed_png(root / "07-social/templates/educational-tip/new-wave-it-educational-tip-square.png", (1080, 1080), "#09131D")
    _seed_png(root / "07-social/templates/educational-tip/new-wave-it-educational-tip-story-reel.png", (1080, 1920), "#62BE68")


def test_guide_exports_are_searchable_indexed_and_rendered(tmp_path: Path) -> None:
    root = build(tmp_path / "new-wave-it-brand-package")
    _seed_guide_inputs(root)

    targets = export_guide(root)

    guide_root = root / "01-brand-guide"
    preview_root = root / "12-preview"
    readme_root = root / "00-read-me"
    expected = {
        guide_root / BRAND_GUIDE_FILENAME,
        guide_root / QUICK_GUIDE_FILENAME,
        preview_root / BRAND_PREVIEW_FILENAME,
        preview_root / GUIDE_CONTACT_SHEET_FILENAME,
        readme_root / ASSET_INDEX_FILENAME,
        readme_root / README_FILENAME,
    }
    assert set(targets) == expected
    assert all(path.is_file() and path.stat().st_size > 0 for path in expected)
    assert all(path.stat().st_size > 1_000 for path in (guide_root / BRAND_GUIDE_FILENAME, preview_root / BRAND_PREVIEW_FILENAME, preview_root / GUIDE_CONTACT_SHEET_FILENAME))

    guide = fitz.open(guide_root / BRAND_GUIDE_FILENAME)
    try:
        assert guide.page_count == 13
        text = "\n".join(page.get_text() for page in guide)
        font_names = {entry[3] for page in guide for entry in page.get_fonts(full=True)}
    finally:
        guide.close()
    for heading in (
        "Positioning and messaging",
        "Voice and copy standards",
        "Logo family and construction",
        "Clear space, minimum size, and incorrect use",
        "Colors and accessibility",
        "Typography",
        "Graphic language and photography",
        "Layout and motion",
        "Website usage",
        "Website and social safe areas",
        "Documents, print, and email",
        "File organization and export guidance",
    ):
        assert heading in text
    assert BRAND["promise"] in text
    assert BRAND["heritage_line"] in text
    assert any("PlusJakartaSans-ExtraBold" in name for name in font_names)
    assert any("Inter-Regular" in name for name in font_names)

    quick_guide = (guide_root / QUICK_GUIDE_FILENAME).read_text(encoding="utf-8")
    assert BRAND["promise"] in quick_guide
    assert "newwaveit.com" in quick_guide
    assert "white body copy on Signal Cyan or Continuity Green" in quick_guide
    assert "140 px" in quick_guide
    assert "1.25 in" in quick_guide

    with Image.open(preview_root / BRAND_PREVIEW_FILENAME) as image:
        assert image.size == (DIMENSIONS["preview"]["width"], DIMENSIONS["preview"]["height"])
        preview = image.convert("RGB")
        assert preview.getpixel((990, 930)) == (9, 19, 29)
        assert preview.getpixel((1350, 991)) == (98, 190, 104)
        type_sample = preview.crop((0, 1680, preview.width, preview.height))
        assert ImageChops.difference(type_sample, Image.new("RGB", type_sample.size, "#F7FAFB")).getbbox()
    with Image.open(preview_root / GUIDE_CONTACT_SHEET_FILENAME) as image:
        assert image.width >= 900 and image.height >= 600

    with (readme_root / ASSET_INDEX_FILENAME).open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert rows
    assert list(rows[0]) == [
        "relative_path",
        "category",
        "format",
        "width_px",
        "height_px",
        "physical_size",
        "background",
        "colorway",
        "editable",
        "recommended_use",
        "sha256",
    ]
    for row in rows:
        artifact = root / row["relative_path"]
        assert artifact.is_file()
        assert row["sha256"] == hashlib.sha256(artifact.read_bytes()).hexdigest()
    logo_row = next(row for row in rows if row["relative_path"] == "02-logos/png/new-wave-it-horizontal-full-color-512.png")
    assert logo_row["width_px"] == "512"
    assert logo_row["height_px"] == "128"
    assert logo_row["editable"] == "no"

    readme = (readme_root / README_FILENAME).read_text(encoding="utf-8")
    assert "newwaveit.com" in readme
    assert BRAND["promise"] in readme


@pytest.mark.parametrize(
    ("relative_path", "expected_message"),
    (
        (".brand-build/cache.txt", "internal build data"),
        ("stray-font.ttf", "font file"),
        ("08-documents-presentations/template.inspect.ndjson", "inspection sidecar"),
        ("08-documents-presentations/template-debug.pptx", "debug artifact"),
    ),
)
def test_guide_rejects_internal_delivery_artifacts(
    tmp_path: Path, relative_path: str, expected_message: str
) -> None:
    root = build(tmp_path / "new-wave-it-brand-package")
    _seed_guide_inputs(root)
    artifact = root / relative_path
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_text("internal", encoding="utf-8")

    with pytest.raises(RuntimeError, match=expected_message):
        export_guide(root)
