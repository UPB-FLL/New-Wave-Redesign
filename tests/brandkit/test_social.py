from pathlib import Path

import pytest
from PIL import Image

from brandkit.cli import build
from brandkit.digital import (
    assert_safe_area,
    build_banner,
    build_profile_assets,
    export_social_assets,
)
from brandkit.social import (
    FORMATS,
    SOCIAL_FAMILIES,
    _select_feed_assets,
    build_social_template,
    export_social_templates,
)
from brandkit.spec import COLORS, PACKAGE_PATHS


@pytest.fixture()
def package_root(tmp_path: Path) -> Path:
    root = build(tmp_path / "new-wave-it-brand-package")
    export_social_assets(root)
    export_social_templates(root)
    return root


def test_profile_assets_use_the_contract_sizes_and_safe_icon_padding(package_root: Path) -> None:
    expected = {
        "linkedin-profile.png": (400, 400),
        "facebook-profile.png": (320, 320),
        "instagram-profile.png": (1080, 1080),
        "x-profile.png": (400, 400),
        "youtube-profile.png": (800, 800),
        "universal-profile.png": (1080, 1080),
    }
    profile_root = package_root / "07-social/profile"
    generated = build_profile_assets()

    assert set(generated) == set(expected)
    assert {path.name for path in profile_root.glob("*.png")} == set(expected)
    for filename, size in expected.items():
        with Image.open(profile_root / filename) as image:
            assert image.size == size
            assert image.mode == "RGBA"
            assert all(pixel[:3] != (0, 0, 0) for pixel in image.getdata())
            assert image.getpixel((0, 0))[:3] == _rgb(COLORS["current_navy"])
            bounds = _non_background_bounds(image, _rgb(COLORS["current_navy"]))
            assert bounds is not None
            left, top, right, bottom = bounds
            assert left >= int(size[0] * 0.16)
            assert top >= int(size[1] * 0.16)
            assert size[0] - right >= int(size[0] * 0.16)
            assert size[1] - bottom >= int(size[1] * 0.16)


def test_banner_builders_keep_all_meaningful_content_inside_platform_safe_areas() -> None:
    expected = {
        "linkedin": ((1584, 396), (96, 48, 1392, 300)),
        "facebook": ((820, 312), (56, 40, 708, 232)),
        "x": ((1500, 500), (96, 60, 1308, 380)),
        "youtube": ((2560, 1440), (508, 508, 1544, 423)),
    }

    for platform, (size, safe_area) in expected.items():
        image, meta = build_banner(platform)
        assert image.size == size
        assert image.mode == "RGBA"
        assert meta.safe_area == safe_area
        assert_safe_area(meta)
        assert all(pixel[:3] != (0, 0, 0) for pixel in image.getdata())


def test_social_exports_match_the_filename_contract_and_include_inspection_previews(package_root: Path) -> None:
    expected_banners = {
        "linkedin-banner-1584x396.png": (1584, 396),
        "facebook-cover-820x312.png": (820, 312),
        "x-header-1500x500.png": (1500, 500),
        "youtube-banner-2560x1440.png": (2560, 1440),
    }
    banner_root = package_root / "07-social/banners"
    assert {path.name for path in banner_root.glob("*.png")} == set(expected_banners)
    assert not list((package_root / "07-social").rglob("*.json"))
    for filename, size in expected_banners.items():
        with Image.open(banner_root / filename) as image:
            assert image.size == size
            assert image.mode == "RGBA"

    expected_previews = {
        "linkedin-banner-crop-preview.png",
        "facebook-cover-crop-preview.png",
        "x-header-crop-preview.png",
        "youtube-banner-crop-preview.png",
    }
    preview_root = package_root / "12-preview/platform-crops"
    assert {path.name for path in preview_root.glob("*.png")} == expected_previews
    assert set(PACKAGE_PATHS["social_banners"]) == {
        f"07-social/banners/{filename}" for filename in expected_banners
    }
    for preview in preview_root.glob("*.png"):
        with Image.open(preview) as image:
            assert image.mode == "RGBA"
            assert any(pixel[:3] == _rgb(COLORS["signal_cyan"]) for pixel in image.getdata())


def test_social_templates_cover_the_contract_with_safe_editable_exports(package_root: Path) -> None:
    expected = set(PACKAGE_PATHS["social_templates"])
    actual = {
        path.relative_to(package_root).as_posix()
        for path in (package_root / "07-social/templates").rglob("*")
        if path.is_file()
    }
    assert actual == expected
    assert len(actual) == 80

    allowed_colors = {color.lower() for color in COLORS.values()}
    for family in SOCIAL_FAMILIES:
        for format_name, spec in FORMATS.items():
            asset = build_social_template(family, format_name, {})
            assert asset.size == spec["size"]
            assert asset.safe_area == spec["safe_area"]
            assert set(asset.content_boxes) >= {"logo", "headline", "message", "cta"}
            for box in asset.content_boxes.values():
                assert _inside(box, asset.safe_area)

            svg_path = package_root / asset.svg_relative_path
            png_path = package_root / asset.png_relative_path
            svg = svg_path.read_text(encoding="utf-8").lower()
            assert "<text" in svg
            assert all(token not in svg for token in ("<script", "<image", "gradient", "url(", "http://", "https://", "@font-face"))
            assert "#000000" not in svg
            svg_colors = set(__import__("re").findall(r"#[0-9a-f]{6}", svg))
            assert svg_colors <= allowed_colors
            with Image.open(png_path) as image:
                assert image.size == spec["size"]
                assert image.mode == "RGBA"
                assert all(pixel[:3] != (0, 0, 0) for pixel in image.getdata())


def test_portrait_and_story_critical_content_stays_in_platform_safe_fields() -> None:
    for family in SOCIAL_FAMILIES:
        portrait = build_social_template(family, "instagram-portrait", {})
        story = build_social_template(family, "story-reel", {})
        for asset, lower, upper in ((portrait, 135, 1215), (story, 270, 1536)):
            for role in ("logo", "headline", "message", "cta"):
                _, y, _, height = asset.content_boxes[role]
                assert y >= lower
                assert y + height <= upper


def test_social_templates_are_differentiated_and_validate_public_inputs() -> None:
    rendered = {
        family: build_social_template(family, "square", {}).svg
        for family in SOCIAL_FAMILIES
    }
    assert len(set(rendered.values())) == len(SOCIAL_FAMILIES)
    assert "action required" in rendered["security-alert"].lower()
    assert "three ways" in rendered["educational-tip"].lower()
    assert "fort lauderdale" in rendered["local-insight"].lower()
    assert "photo placeholder" in rendered["team-announcement"].lower()
    assert "technology that keeps business moving" in rendered["brand-announcement"].lower()

    with pytest.raises(ValueError):
        build_social_template("unapproved", "square", {})
    with pytest.raises(ValueError):
        build_social_template("security-alert", "unapproved", {})
    with pytest.raises(TypeError):
        build_social_template("security-alert", "square", "not a mapping")


def test_social_feed_preview_is_a_twelve_tile_mobile_thumbnail_sheet(package_root: Path) -> None:
    preview = package_root / "12-preview/social-feed-preview.png"
    with Image.open(preview) as image:
        assert image.size == (1200, 1600)
        assert image.mode == "RGBA"
        assert all(pixel[:3] != (0, 0, 0) for pixel in image.getdata())
        colors = {pixel[:3] for pixel in image.resize((120, 160)).getdata()}
        assert len(colors) >= 5


def test_social_feed_preview_interleaves_all_template_families() -> None:
    assets = [
        build_social_template(family, format_name, {})
        for family in SOCIAL_FAMILIES
        for format_name in FORMATS
    ]
    selected = _select_feed_assets(assets)

    assert len(selected) == 12
    assert {asset.family for asset in selected} == set(SOCIAL_FAMILIES)
    assert len({asset.format for asset in selected}) >= 3
    assert _select_feed_assets(assets) == selected


def _rgb(color: str) -> tuple[int, int, int]:
    return tuple(int(color[index : index + 2], 16) for index in (1, 3, 5))


def _non_background_bounds(image: Image.Image, background: tuple[int, int, int]) -> tuple[int, int, int, int] | None:
    pixels = image.load()
    coordinates = [
        (x, y)
        for y in range(image.height)
        for x in range(image.width)
        if pixels[x, y][:3] != background
    ]
    if not coordinates:
        return None
    xs, ys = zip(*coordinates)
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def _inside(box: tuple[int, int, int, int], area: tuple[int, int, int, int]) -> bool:
    x, y, width, height = box
    area_x, area_y, area_width, area_height = area
    return x >= area_x and y >= area_y and x + width <= area_x + area_width and y + height <= area_y + area_height
