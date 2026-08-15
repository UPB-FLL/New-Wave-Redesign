"""Editable New Wave IT social content templates and preview exports."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from html import escape
from pathlib import Path
from types import MappingProxyType

import cairosvg
from PIL import Image, ImageDraw

from brandkit.spec import BRAND, COLORS, PACKAGE_PATHS


Box = tuple[int, int, int, int]

SOCIAL_FAMILIES = (
    "security-alert",
    "service-spotlight",
    "educational-tip",
    "client-result",
    "status-update",
    "local-insight",
    "team-announcement",
    "brand-announcement",
)

FORMATS = MappingProxyType(
    {
        "instagram-portrait": {"size": (1080, 1350), "safe_area": (54, 135, 972, 1080)},
        "square": {"size": (1080, 1080), "safe_area": (54, 54, 972, 972)},
        "story-reel": {"size": (1080, 1920), "safe_area": (54, 270, 972, 1266)},
        "linkedin-square": {"size": (1200, 1200), "safe_area": (60, 60, 1080, 1080)},
        "linkedin-landscape": {"size": (1200, 627), "safe_area": (60, 60, 1080, 507)},
    }
)

_FONT_STACK = "Plus Jakarta Sans, Arial, sans-serif"
_BODY_STACK = "Inter, Arial, sans-serif"
_DIGITAL_COLORS = tuple(COLORS.values())

_DEFAULTS = MappingProxyType(
    {
        "security-alert": {
            "eyebrow": "SECURITY ADVISORY",
            "headline": "Action required: secure your Microsoft 365 access.",
            "message": "Review admin access before your next business day.",
            "cta": "Book a security check-in",
            "status": "ACTION REQUIRED",
        },
        "service-spotlight": {
            "eyebrow": "SERVICE SPOTLIGHT",
            "headline": "Managed IT that makes the workday feel lighter.",
            "message": "A named team that keeps systems moving and people supported.",
            "cta": "See managed IT support",
            "proof_points": "Named support lead|Clear response plan|Monthly technology review",
        },
        "educational-tip": {
            "eyebrow": "PRACTICAL TECHNOLOGY TIP",
            "headline": "Three ways to reduce support interruptions.",
            "message": "Start with the small habits that protect a busy team.",
            "cta": "Get the full checklist",
            "checklist": "Update shared passwords|Confirm backup alerts|Name an escalation owner",
        },
        "client-result": {
            "eyebrow": "CLIENT RESULT",
            "headline": "Less waiting. More momentum.",
            "message": "A South Florida operations team made room for higher-value work.",
            "cta": "Talk through your goals",
            "metric": "42%",
            "quote": "Our team spends less time chasing issues and more time serving clients.",
        },
        "status-update": {
            "eyebrow": "SERVICE STATUS",
            "headline": "Systems stable. Monitoring continues.",
            "message": "We completed the scheduled maintenance window with no business disruption.",
            "cta": "Read the service update",
            "timeline": "Completed 8:30 PM|Validation in progress|Next update 9:30 AM",
        },
        "local-insight": {
            "eyebrow": "SOUTH FLORIDA TECHNOLOGY NOTE",
            "headline": "Fort Lauderdale businesses need technology built for the weather, the work, and the pace.",
            "message": "Continuity planning belongs in the everyday operating rhythm.",
            "cta": "Plan your continuity check-in",
            "location": "FORT LAUDERDALE / SOUTH FLORIDA",
        },
        "team-announcement": {
            "eyebrow": "TEAM ANNOUNCEMENT",
            "headline": "Meet Maya, your new client success lead.",
            "message": "Maya helps turn technology priorities into clear next steps for growing teams.",
            "cta": "Meet the New Wave IT team",
            "placeholder": "PHOTO PLACEHOLDER / OPTIONAL",
        },
        "brand-announcement": {
            "eyebrow": "NEW WAVE IT",
            "headline": BRAND["promise"],
            "message": "Managed IT, cybersecurity, cloud, and support for the way your business works.",
            "cta": "Start a conversation",
        },
    }
)


@dataclass(frozen=True)
class SocialAsset:
    """A generated social template plus auditable, in-memory layout proof."""

    family: str
    format: str
    size: tuple[int, int]
    safe_area: Box
    content_boxes: Mapping[str, Box]
    svg: str
    svg_relative_path: str
    png_relative_path: str


def _normalize(value: str, allowed: tuple[str, ...] | Mapping[str, object], label: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{label} must be a string")
    normalized = value.strip().lower().replace("_", "-")
    if normalized not in allowed:
        raise ValueError(f"unknown social {label}: {value}")
    return normalized


def _inside(box: Box, area: Box) -> bool:
    x, y, width, height = box
    area_x, area_y, area_width, area_height = area
    return x >= area_x and y >= area_y and x + width <= area_x + area_width and y + height <= area_y + area_height


def _box_attr(box: Box) -> str:
    return ",".join(str(value) for value in box)


def _rect(x: int, y: int, width: int, height: int, *, fill: str, role: str, rx: int = 0, stroke: str | None = None, stroke_width: int = 0) -> str:
    stroke_attr = "" if stroke is None else f' stroke="{stroke}" stroke-width="{stroke_width}"'
    radius_attr = "" if not rx else f' rx="{rx}"'
    return f'<rect x="{x}" y="{y}" width="{width}" height="{height}" fill="{fill}" data-role="{role}"{radius_attr}{stroke_attr}/>'


def _text_lines(text: str, max_chars: int) -> list[str]:
    words = str(text).split()
    if not words:
        return [""]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > max_chars:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def _text_block(
    role: str,
    text: str,
    x: int,
    y: int,
    width: int,
    font_size: int,
    *,
    fill: str = COLORS["cloud_white"],
    weight: int = 700,
    max_lines: int = 4,
    family: str = _FONT_STACK,
) -> tuple[str, Box]:
    max_chars = max(10, int(width / max(font_size * 0.53, 1)))
    lines = _text_lines(text, max_chars)[:max_lines]
    line_height = int(font_size * 1.22)
    height = max(line_height, len(lines) * line_height)
    box = (x, y, width, height)
    spans = "".join(
        f'<tspan x="{x}" dy="{0 if index == 0 else line_height}">{escape(line)}</tspan>'
        for index, line in enumerate(lines)
    )
    markup = (
        f'<text x="{x}" y="{y + font_size}" fill="{fill}" font-family="{family}" '
        f'font-size="{font_size}" font-weight="{weight}" data-role="{role}" data-box="{_box_attr(box)}" '
        f'aria-label="{escape(str(text), quote=True)}">{spans}</text>'
    )
    return markup, box


def _brand_header(x: int, y: int, width: int, *, label: str = "NEW WAVE IT") -> tuple[str, Box]:
    mark_width = min(90, max(54, width // 10))
    height = max(48, mark_width // 2)
    paths = []
    for index, color in enumerate((COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"])):
        offset = index * 13
        paths.append(
            f'<path d="M {x} {y + 13 + offset} C {x + 18} {y + 1 + offset}, {x + 37} {y + 1 + offset}, '
            f'{x + 55} {y + 13 + offset} S {x + 78} {y + 27 + offset}, {x + mark_width} {y + 11 + offset}" '
            f'fill="none" stroke="{color}" stroke-width="7" stroke-linecap="round" data-role="current-mark"/>'
        )
    label_markup, label_box = _text_block(
        "logo-label", label, x + mark_width + 20, y + 2, width - mark_width - 20, max(20, width // 22), max_lines=1
    )
    logo_box = (x, y, min(width, mark_width + 20 + label_box[2]), max(height, label_box[3]))
    return "".join(paths) + label_markup, logo_box


def _current_frame(area: Box) -> str:
    x, y, width, height = area
    return _rect(x, y, width, height, fill="none", role="current-frame", stroke=COLORS["tide_blue"], stroke_width=3)


def _alert_strip(x: int, y: int, width: int, text: str) -> tuple[str, Box]:
    height = 42
    label, label_box = _text_block("alert-strip-text", text.upper(), x + 16, y + 5, width - 32, 17, fill=COLORS["current_navy"], weight=800, max_lines=1)
    return _rect(x, y, width, height, fill=COLORS["signal_cyan"], role="alert-strip", rx=4) + label, (x, y, width, max(height, label_box[3]))


def _cta(x: int, y: int, width: int, text: str) -> tuple[str, Box]:
    height = 52
    label, label_box = _text_block("cta", text, x + 18, y + 8, width - 36, 18, fill=COLORS["current_navy"], weight=800, max_lines=1)
    return _rect(x, y, width, height, fill=COLORS["continuity_green"], role="cta-panel", rx=4) + label, (x, y, width, max(height, label_box[3]))


def _footer(x: int, y: int, width: int) -> tuple[str, Box]:
    return _text_block("footer", "newwaveit.com  |  Fort Lauderdale / South Florida", x, y, width, 15, fill=COLORS["mist_gray"], weight=500, max_lines=1, family=_BODY_STACK)


def _metric_block(x: int, y: int, width: int, metric: str, *, compact: bool = False) -> tuple[str, Box]:
    height = 108 if compact else 170
    metric_text, metric_box = _text_block("metric", metric, x + 24, y + 14, width - 48, 68 if compact else 104, fill=COLORS["signal_cyan"], weight=800, max_lines=1)
    return _rect(x, y, width, height, fill=COLORS["current_navy"], role="metric-block", rx=4, stroke=COLORS["tide_blue"], stroke_width=2) + metric_text, (x, y, width, max(height, metric_box[3]))


def _quote_block(x: int, y: int, width: int, quote: str, *, compact: bool = False) -> tuple[str, Box]:
    quote_text, quote_box = _text_block("quote", f'“{quote}”', x + 18, y + 14, width - 36, 16 if compact else 24, fill=COLORS["cloud_white"], weight=600, family=_BODY_STACK, max_lines=2)
    height = max(76 if compact else 120, quote_box[3] + (28 if compact else 40))
    return _rect(x, y, width, height, fill=COLORS["deep_current"], role="quote-block", stroke=COLORS["signal_cyan"], stroke_width=2) + quote_text, (x, y, width, height)


def _checklist(x: int, y: int, width: int, values: str, *, compact: bool = False) -> tuple[str, Box]:
    entries = [value.strip() for value in values.split("|") if value.strip()][:3]
    parts: list[str] = []
    row_height = 42 if compact else 62
    badge = 30 if compact else 40
    for index, entry in enumerate(entries, start=1):
        row_y = y + (index - 1) * row_height
        parts.append(_rect(x, row_y, badge, badge, fill=COLORS["signal_cyan"], role="checklist-number", rx=badge // 2))
        number, _ = _text_block("checklist-index", str(index), x + (9 if compact else 13), row_y + 3, 20, 14 if compact else 18, fill=COLORS["current_navy"], weight=800, max_lines=1)
        item, _ = _text_block("checklist-item", entry, x + badge + 18, row_y + 1, width - badge - 18, 15 if compact else 19, fill=COLORS["cloud_white"], weight=600, max_lines=1, family=_BODY_STACK)
        parts.extend((number, item))
    height = max(row_height, len(entries) * row_height)
    return "".join(parts), (x, y, width, height)


def _timeline(x: int, y: int, width: int, values: str, *, compact: bool = False) -> tuple[str, Box]:
    entries = [value.strip() for value in values.split("|") if value.strip()][:3]
    segment = max(1, width // max(1, len(entries)))
    line_y = y + (13 if compact else 19)
    parts: list[str] = [f'<path d="M {x} {line_y} H {x + width}" stroke="{COLORS["tide_blue"]}" stroke-width="4" data-role="timeline-line"/>']
    for index, entry in enumerate(entries):
        point_x = x + index * segment + 12
        parts.append(f'<circle cx="{point_x}" cy="{line_y}" r="{7 if compact else 10}" fill="{COLORS["continuity_green"]}" data-role="timeline-point"/>')
        label, _ = _text_block("timeline-label", entry, point_x - 12, y + (29 if compact else 42), segment - 12, 12 if compact else 16, fill=COLORS["mist_gray"], weight=600, max_lines=2, family=_BODY_STACK)
        parts.append(label)
    return "".join(parts), (x, y, width, 64 if compact else 98)


def _location_line(x: int, y: int, width: int, location: str) -> tuple[str, Box]:
    return _text_block("location", location, x, y, width, 17, fill=COLORS["signal_cyan"], weight=800, max_lines=1)


def _team_placeholder(x: int, y: int, width: int, height: int, label: str) -> tuple[str, Box]:
    caption, _ = _text_block("photo-placeholder-label", label, x + 22, y + height - 52, width - 44, 15, fill=COLORS["mist_gray"], weight=700, max_lines=1)
    face = f'<circle cx="{x + width // 2}" cy="{y + height // 2 - 30}" r="54" fill="{COLORS["slate"]}" data-role="neutral-photo-mask"/>'
    shoulders = f'<path d="M {x + width // 2 - 96} {y + height - 76} Q {x + width // 2} {y + height - 170} {x + width // 2 + 96} {y + height - 76}" fill="none" stroke="{COLORS["slate"]}" stroke-width="56" stroke-linecap="round" data-role="neutral-photo-mask"/>'
    return _rect(x, y, width, height, fill=COLORS["current_navy"], role="photo-placeholder", rx=4, stroke=COLORS["tide_blue"], stroke_width=2) + face + shoulders + caption, (x, y, width, height)


def _content_for(family: str, content: Mapping[str, object]) -> dict[str, str]:
    if not isinstance(content, Mapping):
        raise TypeError("content must be a mapping")
    values = {key: str(value) for key, value in _DEFAULTS[family].items()}
    for key, value in content.items():
        if key in values and value is not None:
            values[str(key)] = str(value)
    return values


def _family_sections(family: str, values: Mapping[str, str], x: int, y: int, width: int, height: int) -> tuple[str, dict[str, Box]]:
    sections: list[str] = []
    boxes: dict[str, Box] = {}
    cursor = y
    compact = height < 650

    if compact and family == "client-result":
        metric, metric_box = _metric_block(x, cursor, 260, values["metric"], compact=True)
        quote, quote_box = _quote_block(x + 282, cursor, width - 282, values["quote"], compact=True)
        eyebrow, eyebrow_box = _text_block("eyebrow", values["eyebrow"], x, cursor + 132, width, 14, fill=COLORS["signal_cyan"], weight=800, max_lines=1)
        headline, headline_box = _text_block("headline", values["headline"], x, cursor + 156, width, 30, max_lines=1)
        message, message_box = _text_block("message", values["message"], x, cursor + 198, width, 16, fill=COLORS["mist_gray"], weight=500, max_lines=1, family=_BODY_STACK)
        sections.extend((metric, quote, eyebrow, headline, message))
        boxes.update({"metric": metric_box, "quote": quote_box, "eyebrow": eyebrow_box, "headline": headline_box, "message": message_box})
        return "".join(sections), boxes

    if family == "security-alert":
        strip, strip_box = _alert_strip(x, cursor, width, values["status"])
        sections.append(strip)
        boxes["status"] = strip_box
        cursor += 72
    elif family == "client-result":
        metric, metric_box = _metric_block(x, cursor, width, values["metric"], compact=compact)
        sections.append(metric)
        boxes["metric"] = metric_box
        cursor += metric_box[3] + (24 if compact else 24)
    elif family == "team-announcement":
        placeholder, placeholder_box = _team_placeholder(x, cursor, width, min(100 if compact else 230, max(88 if compact else 160, height // 4)), values["placeholder"])
        sections.append(placeholder)
        boxes["photo-placeholder"] = placeholder_box
        cursor += placeholder_box[3] + (14 if compact else 28)
    elif family == "local-insight":
        location, location_box = _location_line(x, cursor, width, values["location"])
        sections.append(location)
        boxes["location"] = location_box
        cursor += 26 if compact else 42

    eyebrow, eyebrow_box = _text_block("eyebrow", values["eyebrow"], x, cursor, width, 14 if compact else 17, fill=COLORS["signal_cyan"], weight=800, max_lines=1)
    sections.append(eyebrow)
    boxes["eyebrow"] = eyebrow_box
    cursor += 25 if compact else 42

    headline_size = 54 if height >= 900 else 30 if compact else 42
    if family == "brand-announcement":
        headline_size = 62 if height >= 900 else 34 if compact else 48
    headline, headline_box = _text_block("headline", values["headline"], x, cursor, width, headline_size, max_lines=2 if compact else 3)
    sections.append(headline)
    boxes["headline"] = headline_box
    cursor += headline_box[3] + (12 if compact else 28)

    if family == "educational-tip":
        checklist, checklist_box = _checklist(x, cursor, width, values["checklist"], compact=compact)
        sections.append(checklist)
        boxes["checklist"] = checklist_box
        cursor += checklist_box[3] + (8 if compact else 22)
    elif family == "client-result":
        quote, quote_box = _quote_block(x, cursor, width, values["quote"], compact=compact)
        sections.append(quote)
        boxes["quote"] = quote_box
        cursor += quote_box[3] + (8 if compact else 22)
    elif family == "service-spotlight":
        proof, proof_box = _checklist(x, cursor, width, values["proof_points"], compact=compact)
        sections.append(proof)
        boxes["proof-points"] = proof_box
        cursor += proof_box[3] + (8 if compact else 22)
    elif family == "status-update":
        timeline, timeline_box = _timeline(x, cursor, width, values["timeline"], compact=compact)
        sections.append(timeline)
        boxes["timeline"] = timeline_box
        cursor += timeline_box[3] + (8 if compact else 20)

    message, message_box = _text_block("message", values["message"], x, cursor, width, 16 if compact else 22, fill=COLORS["mist_gray"], weight=500, family=_BODY_STACK, max_lines=2 if compact else 4)
    sections.append(message)
    boxes["message"] = message_box
    return "".join(sections), boxes


def build_social_template(family: str, format: str, content: Mapping[str, object]) -> SocialAsset:
    """Build one editable SVG social template with deterministic safe-area metadata."""
    normalized_family = _normalize(family, SOCIAL_FAMILIES, "family")
    normalized_format = _normalize(format, FORMATS, "format")
    values = _content_for(normalized_family, content)
    spec = FORMATS[normalized_format]
    width, height = spec["size"]
    safe_area: Box = spec["safe_area"]
    safe_x, safe_y, safe_width, safe_height = safe_area
    body_x = safe_x + 34
    body_width = safe_width - 68
    header, logo_box = _brand_header(body_x, safe_y + 30, body_width)
    sections, boxes = _family_sections(
        normalized_family,
        values,
        body_x,
        safe_y + (98 if safe_height < 650 else 122),
        body_width,
        safe_height,
    )

    cta_y = safe_y + safe_height - 120
    cta, cta_box = _cta(body_x, cta_y, min(390, body_width), values["cta"])
    footer, footer_box = _footer(body_x, safe_y + safe_height - 42, body_width)
    boxes.update({"logo": logo_box, "cta": cta_box, "footer": footer_box})
    for role in ("logo", "headline", "message", "cta"):
        if not _inside(boxes[role], safe_area):
            raise ValueError(f"{normalized_family} {normalized_format} {role} exceeds the approved safe area")

    background = COLORS["deep_current"] if normalized_family in {"security-alert", "client-result", "brand-announcement", "local-insight"} else COLORS["current_navy"]
    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" '
        f'data-family="{normalized_family}" data-format="{normalized_format}" data-safe-area="{_box_attr(safe_area)}">'
        f'<title>New Wave IT {escape(normalized_family.replace("-", " "))} social template</title>'
        f'<desc>Editable social post template with a protected platform-safe content field.</desc>'
        f'{_rect(0, 0, width, height, fill=background, role="background")}'
        f'{_current_frame(safe_area)}{header}{sections}{cta}{footer}'
        '</svg>\n'
    )
    base = f"new-wave-it-{normalized_family}-{normalized_format}"
    directory = f"07-social/templates/{normalized_family}"
    return SocialAsset(
        family=normalized_family,
        format=normalized_format,
        size=(width, height),
        safe_area=safe_area,
        content_boxes=MappingProxyType(dict(boxes)),
        svg=svg,
        svg_relative_path=f"{directory}/{base}.svg",
        png_relative_path=f"{directory}/{base}.png",
    )


def _write_asset(package_root: Path, asset: SocialAsset) -> None:
    svg_path = package_root / asset.svg_relative_path
    png_path = package_root / asset.png_relative_path
    svg_path.parent.mkdir(parents=True, exist_ok=True)
    svg_path.write_text(asset.svg, encoding="utf-8")
    cairosvg.svg2png(bytestring=asset.svg.encode("utf-8"), write_to=str(png_path), output_width=asset.size[0], output_height=asset.size[1])
    with Image.open(png_path) as rendered:
        rendered.convert("RGBA").save(png_path, format="PNG")


def _select_feed_assets(assets: list[SocialAsset]) -> tuple[SocialAsset, ...]:
    """Choose a deterministic, mixed twelve-post sequence for the feed preview."""
    by_identity = {(asset.family, asset.format): asset for asset in assets}
    format_names = tuple(FORMATS)
    selected = [
        by_identity[(family, format_names[index % len(format_names)])]
        for index, family in enumerate(SOCIAL_FAMILIES)
    ]
    selected.extend(
        by_identity[(family, format_names[(index + 2) % len(format_names)])]
        for index, family in enumerate(SOCIAL_FAMILIES[:4])
    )
    return tuple(selected)


def _feed_preview(package_root: Path, assets: list[SocialAsset]) -> None:
    """Create a real mixed-feed contact sheet at a useful mobile thumbnail scale."""
    sheet = Image.new("RGBA", (1200, 1600), COLORS["cloud_white"])
    draw = ImageDraw.Draw(sheet)
    tile_width, tile_height = 340, 350
    margin_x, margin_y = 55, 76
    for index, asset in enumerate(_select_feed_assets(assets)):
        column, row = index % 3, index // 3
        x = margin_x + column * (tile_width + 35)
        y = margin_y + row * (tile_height + 32)
        with Image.open(package_root / asset.png_relative_path) as source:
            image = source.convert("RGBA")
            scale = min(tile_width / image.width, (tile_height - 26) / image.height)
            resized = image.resize((max(1, int(image.width * scale)), max(1, int(image.height * scale))), Image.Resampling.BILINEAR)
        draw.rounded_rectangle((x - 3, y - 3, x + tile_width + 3, y + tile_height + 3), radius=4, fill=COLORS["mist_gray"])
        sheet.alpha_composite(resized, (x + (tile_width - resized.width) // 2, y + (tile_height - 26 - resized.height) // 2))
        draw.text((x, y + tile_height - 17), f"{asset.family} / {asset.format}", fill=COLORS["slate"])
    target = package_root / "12-preview/social-feed-preview.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(target, format="PNG")


def export_social_templates(package_root: Path) -> None:
    """Write all 80 contract social-template deliverables and the feed preview."""
    assets: list[SocialAsset] = []
    for family in SOCIAL_FAMILIES:
        for format_name in FORMATS:
            asset = build_social_template(family, format_name, {})
            _write_asset(package_root, asset)
            assets.append(asset)
    _feed_preview(package_root, assets)

    expected = set(PACKAGE_PATHS["social_templates"])
    actual = {
        path.relative_to(package_root).as_posix()
        for path in (package_root / "07-social/templates").rglob("*")
        if path.is_file()
    }
    if actual != expected:
        missing = sorted(expected - actual)
        unexpected = sorted(actual - expected)
        raise RuntimeError(f"Task 7 social export mismatch; missing={missing}, unexpected={unexpected}")
