"""First-party web-digital raster exports for the New Wave IT package."""

from __future__ import annotations

import json
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont

from brandkit.logo import build_icon_svg
from brandkit.spec import BRAND, COLORS, PACKAGE_PATHS, TYPOGRAPHY
from brandkit.typography import ensure_plus_jakarta_extrabold


@dataclass(frozen=True)
class SocialAssetMeta:
    """Deterministic layout data kept in code rather than social sidecar files."""

    platform: str
    filename: str
    size: tuple[int, int]
    safe_area: tuple[int, int, int, int]
    content_boxes: tuple[tuple[int, int, int, int], ...]


_PROFILE_SPECS = (
    ("linkedin-profile.png", (400, 400)),
    ("facebook-profile.png", (320, 320)),
    ("instagram-profile.png", (1080, 1080)),
    ("x-profile.png", (400, 400)),
    ("youtube-profile.png", (800, 800)),
    ("universal-profile.png", (1080, 1080)),
)

_BANNER_SPECS = {
    "linkedin": {
        "filename": "linkedin-banner-1584x396.png",
        "size": (1584, 396),
        "safe_area": (96, 48, 1392, 300),
    },
    "facebook": {
        "filename": "facebook-cover-820x312.png",
        "size": (820, 312),
        "safe_area": (56, 40, 708, 232),
    },
    "x": {
        "filename": "x-header-1500x500.png",
        "size": (1500, 500),
        "safe_area": (96, 60, 1308, 380),
    },
    "youtube": {
        "filename": "youtube-banner-2560x1440.png",
        "size": (2560, 1440),
        "safe_area": (508, 508, 1544, 423),
    },
}


def _font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ensure_plus_jakarta_extrabold()), size=size)


def _icon(size: int) -> Image.Image:
    payload = cairosvg.svg2png(bytestring=build_icon_svg("standard", "full-color"), output_width=size, output_height=size)
    with Image.open(BytesIO(payload)) as image:
        return image.convert("RGBA").copy()


def _line(draw: ImageDraw.ImageDraw, width: int, height: int, offset: int, color: str, opacity: int, stroke: int) -> None:
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    wave = ImageDraw.Draw(overlay)
    points = [(x, int(height * 0.68 + offset + 0.13 * height * __import__("math").sin((x / width) * 8.0))) for x in range(-80, width + 81, 16)]
    wave.line(points, fill=(*_rgb(color), opacity), width=stroke, joint="curve")
    draw._image.alpha_composite(overlay)


def _rgb(color: str) -> tuple[int, int, int]:
    return tuple(int(color[index : index + 2], 16) for index in (1, 3, 5))


def _current_field(image: Image.Image, strength: int = 1) -> None:
    draw = ImageDraw.Draw(image)
    _line(draw, image.width, image.height, -int(image.height * 0.08), COLORS["signal_cyan"], 130 * strength, max(5, image.width // 180))
    _line(draw, image.width, image.height, int(image.height * 0.04), COLORS["continuity_green"], 115 * strength, max(5, image.width // 190))
    _line(draw, image.width, image.height, int(image.height * 0.15), COLORS["tide_blue"], 125 * strength, max(5, image.width // 185))


def _write_metadata(output_path: Path, size: tuple[int, int], text_boxes: list[list[int]]) -> None:
    output_path.with_suffix(".json").write_text(
        json.dumps({"canvas": list(size), "text_boxes": text_boxes}, indent=2) + "\n",
        encoding="utf-8",
    )


def _write(image: Image.Image, output_path: Path, text_boxes: list[list[int]]) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGBA").save(output_path, format="PNG")
    _write_metadata(output_path, image.size, text_boxes)
    return output_path


def _box(bounds: tuple[int, int, int, int]) -> list[int]:
    """Convert Pillow's absolute bounding box to package metadata coordinates."""
    left, top, right, bottom = bounds
    return [left, top, right - left, bottom - top]


def _text_box(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    *,
    multiline: bool = False,
    spacing: int = 4,
) -> list[int]:
    if multiline:
        return _box(draw.multiline_textbbox(position, text, font=font, spacing=spacing))
    return _box(draw.textbbox(position, text, font=font))


def _draw_brand_lockup(image: Image.Image, origin: tuple[int, int], icon_size: int, label_size: int) -> list[int]:
    image.alpha_composite(_icon(icon_size), origin)
    draw = ImageDraw.Draw(image)
    position = (origin[0] + icon_size + icon_size // 3, origin[1] + icon_size // 5)
    font = _font(label_size)
    draw.text(position, "NEW WAVE IT", font=font, fill=COLORS["cloud_white"])
    return _text_box(draw, position, "NEW WAVE IT", font)


def build_og_image() -> tuple[Image.Image, list[list[int]]]:
    image = Image.new("RGBA", (1200, 630), COLORS["deep_current"])
    _current_field(image, 1)
    lockup_box = _draw_brand_lockup(image, (72, 60), 72, 30)
    draw = ImageDraw.Draw(image)
    promise = "Technology that keeps\nbusiness moving."
    promise_position = (72, 178)
    promise_font = _font(52)
    draw.multiline_text(promise_position, promise, font=promise_font, fill=COLORS["cloud_white"], spacing=5)
    service = "Managed IT, cybersecurity, cloud, and support\nbuilt around the way your business actually works."
    service_position = (72, 320)
    service_font = _font(23)
    draw.multiline_text(service_position, service, font=service_font, fill=COLORS["mist_gray"], spacing=7)
    location = "Fort Lauderdale / South Florida"
    location_position = (72, 495)
    location_font = _font(21)
    draw.text(location_position, location, font=location_font, fill=COLORS["signal_cyan"])
    return image, [
        lockup_box,
        _text_box(draw, promise_position, promise, promise_font, multiline=True, spacing=5),
        _text_box(draw, service_position, service, service_font, multiline=True, spacing=7),
        _text_box(draw, location_position, location, location_font),
    ]


def build_social_share_square() -> tuple[Image.Image, list[list[int]]]:
    image = Image.new("RGBA", (1200, 1200), COLORS["current_navy"])
    _current_field(image, 1)
    lockup_box = _draw_brand_lockup(image, (72, 72), 82, 34)
    draw = ImageDraw.Draw(image)
    promise = "Technology that keeps\nbusiness moving."
    promise_position = (72, 410)
    promise_font = _font(65)
    draw.multiline_text(promise_position, promise, font=promise_font, fill=COLORS["cloud_white"], spacing=12)
    service = "Managed IT. Cybersecurity. Cloud. Support."
    service_position = (72, 645)
    service_font = _font(27)
    draw.text(service_position, service, font=service_font, fill=COLORS["mist_gray"])
    return image, [
        lockup_box,
        _text_box(draw, promise_position, promise, promise_font, multiline=True, spacing=12),
        _text_box(draw, service_position, service, service_font),
    ]


def build_hero_current_field() -> tuple[Image.Image, list[list[int]]]:
    image = Image.new("RGBA", (2400, 1400), COLORS["deep_current"])
    _current_field(image, 1)
    lockup_box = _draw_brand_lockup(image, (96, 88), 96, 38)
    draw = ImageDraw.Draw(image)
    promise_position = (96, 430)
    promise_font = _font(94)
    draw.text(promise_position, BRAND["promise"], font=promise_font, fill=COLORS["cloud_white"])
    service_position = (96, 565)
    service_font = _font(38)
    draw.multiline_text(service_position, BRAND["service_statement"], font=service_font, fill=COLORS["mist_gray"], spacing=12)
    return image, [
        lockup_box,
        _text_box(draw, promise_position, BRAND["promise"], promise_font),
        _text_box(draw, service_position, BRAND["service_statement"], service_font, multiline=True, spacing=12),
    ]


def build_email_header() -> tuple[Image.Image, list[list[int]]]:
    image = Image.new("RGBA", (1200, 300), COLORS["current_navy"])
    _current_field(image, 1)
    return image, [_draw_brand_lockup(image, (60, 70), 74, 31)]


def build_support_app_icon() -> Image.Image:
    image = Image.new("RGBA", (512, 512), COLORS["deep_current"])
    icon = _icon(350)
    image.alpha_composite(icon, (81, 81))
    return image


def _union(*boxes: list[int]) -> tuple[int, int, int, int]:
    left = min(box[0] for box in boxes)
    top = min(box[1] for box in boxes)
    right = max(box[0] + box[2] for box in boxes)
    bottom = max(box[1] + box[3] for box in boxes)
    return left, top, right - left, bottom - top


def _inside(box: tuple[int, int, int, int], area: tuple[int, int, int, int]) -> bool:
    x, y, width, height = box
    area_x, area_y, area_width, area_height = area
    return (
        x >= area_x
        and y >= area_y
        and x + width <= area_x + area_width
        and y + height <= area_y + area_height
    )


def assert_safe_area(asset_meta: SocialAssetMeta) -> None:
    """Raise when social content escapes the platform-specific protected field."""
    if asset_meta.platform not in _BANNER_SPECS:
        raise ValueError(f"unknown social platform: {asset_meta.platform}")
    expected = _BANNER_SPECS[asset_meta.platform]
    if asset_meta.filename != expected["filename"] or asset_meta.size != expected["size"]:
        raise ValueError(f"{asset_meta.platform} metadata does not match the output contract")
    if asset_meta.safe_area != expected["safe_area"]:
        raise ValueError(f"{asset_meta.platform} safe area does not match the approved layout")
    if not asset_meta.content_boxes:
        raise ValueError("social banner metadata must identify meaningful content")
    if not all(_inside(box, asset_meta.safe_area) for box in asset_meta.content_boxes):
        raise ValueError(f"{asset_meta.platform} content exceeds its safe area")


def build_profile_assets() -> dict[str, Image.Image]:
    """Build standalone three-stroke profile marks with generous circular-crop clearance."""
    assets: dict[str, Image.Image] = {}
    for filename, size in _PROFILE_SPECS:
        width, height = size
        image = Image.new("RGBA", size, COLORS["current_navy"])
        icon_size = int(min(size) * 0.60)
        origin = ((width - icon_size) // 2, (height - icon_size) // 2)
        image.alpha_composite(_icon(icon_size), origin)
        assets[filename] = image
    return assets


def build_banner(platform: str) -> tuple[Image.Image, SocialAssetMeta]:
    """Build one contract-size social banner and retain its layout proof in memory."""
    try:
        spec = _BANNER_SPECS[platform]
    except KeyError as exc:
        raise ValueError(f"unknown social platform: {platform}") from exc

    size = spec["size"]
    safe_area = spec["safe_area"]
    image = Image.new("RGBA", size, COLORS["deep_current"])
    _current_field(image, 1)
    safe_x, safe_y, safe_width, safe_height = safe_area
    icon_size = max(46, int(safe_height * 0.27))
    label_size = max(20, int(safe_height * 0.105))
    lockup_origin = (safe_x, safe_y + max(8, int(safe_height * 0.04)))
    label_box = _draw_brand_lockup(image, lockup_origin, icon_size, label_size)
    lockup_box = _union(
        [lockup_origin[0], lockup_origin[1], icon_size, icon_size],
        label_box,
    )

    draw = ImageDraw.Draw(image)
    promise_font = _font(max(28, int(safe_height * 0.15)))
    promise_position = (safe_x, safe_y + int(safe_height * 0.43))
    draw.text(promise_position, BRAND["promise"], font=promise_font, fill=COLORS["cloud_white"])
    promise_box = _text_box(draw, promise_position, BRAND["promise"], promise_font)

    service = "Managed IT, cybersecurity, cloud, and support."
    service_font = _font(max(16, int(safe_height * 0.07)))
    service_position = (safe_x, safe_y + int(safe_height * 0.72))
    draw.text(service_position, service, font=service_font, fill=COLORS["mist_gray"])
    service_box = _text_box(draw, service_position, service, service_font)

    meta = SocialAssetMeta(
        platform=platform,
        filename=spec["filename"],
        size=size,
        safe_area=safe_area,
        content_boxes=(lockup_box, tuple(promise_box), tuple(service_box)),
    )
    assert_safe_area(meta)
    return image, meta


def _draw_preview_overlay(image: Image.Image, meta: SocialAssetMeta) -> Image.Image:
    """Mark protected crop fields visibly without altering a deliverable banner."""
    preview = image.copy()
    draw = ImageDraw.Draw(preview)
    x, y, width, height = meta.safe_area
    line_width = max(2, min(image.size) // 160)
    draw.rectangle((x, y, x + width, y + height), outline=COLORS["signal_cyan"], width=line_width)
    draw.rectangle(
        (line_width, line_width, image.width - line_width, image.height - line_width),
        outline=COLORS["mist_gray"],
        width=line_width,
    )
    if meta.platform in {"x", "youtube"}:
        diameter = max(32, min(image.size) // 7)
        draw.ellipse(
            (x + width - diameter, y + height - diameter, x + width, y + height),
            outline=COLORS["continuity_green"],
            width=line_width,
        )
    return preview


def export_social_assets(package_root: Path) -> None:
    """Write only the Task 6 profile, banner, and crop-preview deliverables."""
    profile_root = package_root / "07-social/profile"
    banner_root = package_root / "07-social/banners"
    preview_root = package_root / "12-preview/platform-crops"
    profile_root.mkdir(parents=True, exist_ok=True)
    banner_root.mkdir(parents=True, exist_ok=True)
    preview_root.mkdir(parents=True, exist_ok=True)

    for filename, image in build_profile_assets().items():
        image.save(profile_root / filename, format="PNG")

    for platform in _BANNER_SPECS:
        banner, meta = build_banner(platform)
        banner.save(banner_root / meta.filename, format="PNG")
        preview_filename = meta.filename.replace("-1584x396", "-crop-preview").replace(
            "-820x312", "-crop-preview"
        ).replace("-1500x500", "-crop-preview").replace("-2560x1440", "-crop-preview")
        preview_filename = preview_filename.replace("facebook-cover", "facebook-cover").replace(
            "linkedin-banner", "linkedin-banner"
        ).replace("x-header", "x-header").replace("youtube-banner", "youtube-banner")
        _draw_preview_overlay(banner, meta).save(preview_root / preview_filename, format="PNG")

    expected = tuple(PACKAGE_PATHS["social_profiles"]) + tuple(PACKAGE_PATHS["social_banners"])
    missing = [relative for relative in expected if not (package_root / relative).is_file()]
    if missing:
        raise RuntimeError(f"Task 6 social export missed artifacts: {missing}")


def _token_payload() -> dict[str, object]:
    return {
        "color": dict(COLORS),
        "typography": {
            "display": TYPOGRAPHY["display"]["family"],
            "body": TYPOGRAPHY["body"]["family"],
            "technical": TYPOGRAPHY["technical"]["family"],
        },
        "spacing_px": (8, 16, 24, 32, 48),
    }


def _export_token_files(package_root: Path) -> None:
    root = package_root / "04-tokens-typography"
    root.mkdir(parents=True, exist_ok=True)
    payload = _token_payload()
    (root / "new-wave-it-tokens.json").write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    css_lines = [":root {"]
    css_lines.extend(
        f"  --nw-{name.replace('_', '-')}: {value};" for name, value in COLORS.items()
    )
    css_lines.extend(
        (
            "  --nw-font-display: 'Plus Jakarta Sans', Inter, system-ui, sans-serif;",
            "  --nw-font-body: Inter, system-ui, sans-serif;",
            "  --nw-font-technical: 'IBM Plex Mono', ui-monospace, monospace;",
            "}",
            "",
        )
    )
    (root / "new-wave-it-tokens.css").write_text("\n".join(css_lines), encoding="utf-8")
    ts_payload = json.dumps(payload, indent=2, sort_keys=True)
    (root / "new-wave-it-tokens.ts").write_text(
        "export const newWaveTokens = " + ts_payload + " as const;\n"
        "export type NewWaveTokens = typeof newWaveTokens;\n",
        encoding="utf-8",
    )


def export_web_digital(package_root: Path) -> None:
    """Write Task 5 web-digital assets and their exact safe-layout metadata."""
    _export_token_files(package_root)
    output_root = package_root / "06-web-digital"
    for filename, builder in (
        ("open-graph-1200x630.png", build_og_image),
        ("social-share-square-1200x1200.png", build_social_share_square),
        ("website-hero-current-field-2400x1400.png", build_hero_current_field),
        ("email-header-1200x300.png", build_email_header),
    ):
        image, boxes = builder()
        _write(image, output_root / filename, boxes)
    icon_path = output_root / "support-portal-app-icon-512x512.png"
    icon_path.parent.mkdir(parents=True, exist_ok=True)
    build_support_app_icon().save(icon_path, format="PNG")
    expected = PACKAGE_PATHS["web_digital"]
    missing = [relative for relative in expected if not (package_root / relative).is_file()]
    if missing:
        raise RuntimeError(f"Task 5 digital export missed artifacts: {missing}")
