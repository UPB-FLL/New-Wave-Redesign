"""Email signatures and support-communication templates with local image fallbacks."""

from __future__ import annotations

import math
import textwrap
from html import escape
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from brandkit.spec import BRAND, COLORS, PACKAGE_PATHS
from brandkit.typography import ensure_inter_regular, ensure_plus_jakarta_extrabold


EMAIL_SUPPORT_FILENAMES = tuple(Path(relative).name for relative in PACKAGE_PATHS["email_support"])
_SITE = "newwaveit.com"
_SUPPORT = BRAND["support_email"]
_DISPLAY_FONT_STACK = "'Plus Jakarta Sans', Arial, sans-serif"
_BODY_FONT_STACK = "Inter, Arial, sans-serif"


def _font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ensure_plus_jakarta_extrabold()), size=size)


def _body_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ensure_inter_regular()), size=size)


def _draw_current_mark(draw: ImageDraw.ImageDraw, x: int, y: int, scale: int, *, monochrome: bool = False) -> None:
    colors = (COLORS["current_navy"],) * 3 if monochrome else (
        COLORS["signal_cyan"],
        COLORS["continuity_green"],
        COLORS["tide_blue"],
    )
    for index, color in enumerate(colors):
        offset = index * max(4, scale // 4)
        points = []
        for step in range(25):
            progress = step / 24
            points.append(
                (
                    x + int(progress * scale),
                    y + offset + int(math.sin(progress * math.pi) * max(2, scale * 0.13)),
                )
            )
        draw.line(points, fill=color, width=max(1, scale // 16), joint="curve")


def _draw_current_field(draw: ImageDraw.ImageDraw, width: int, height: int, *, dark: bool) -> None:
    colors = (
        COLORS["signal_cyan"],
        COLORS["continuity_green"],
        COLORS["tide_blue"],
    )
    alpha = 255
    for index, color in enumerate(colors):
        baseline = int(height * (0.38 + index * 0.18))
        points = []
        for x in range(width // 2, width + 2, 8):
            phase = (x - width // 2) / max(width // 2, 1) * math.pi * 1.45
            points.append((x, baseline + int(math.sin(phase) * height * 0.10)))
        draw.line(points, fill=color if dark else color, width=3)
    point_color = COLORS["mist_gray"] if dark else COLORS["slate"]
    for y in (int(height * 0.38), int(height * 0.56), int(height * 0.74)):
        draw.ellipse((int(width * 0.88), y - 2, int(width * 0.88) + 2, y + 2), fill=point_color)


def _wrap(draw: ImageDraw.ImageDraw, value: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if line and draw.textlength(candidate, font=font) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def _draw_multiline(
    draw: ImageDraw.ImageDraw,
    value: str,
    position: tuple[int, int],
    font: ImageFont.FreeTypeFont,
    fill: str,
    width: int,
    *,
    spacing: int = 8,
    max_lines: int = 3,
) -> int:
    lines = _wrap(draw, value, font, width)[:max_lines]
    x, y = position
    line_height = font.size + spacing
    for index, line in enumerate(lines):
        draw.text((x, y + index * line_height), line, font=font, fill=fill)
    return y + len(lines) * line_height


def _signature_png() -> Image.Image:
    image = Image.new("RGB", (960, 220), COLORS["cloud_white"])
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 14, 220), fill=COLORS["signal_cyan"])
    _draw_current_mark(draw, 54, 45, 62)
    draw.text((54, 104), "NEW WAVE IT", font=_font(22), fill=COLORS["current_navy"])
    draw.line((305, 36, 305, 184), fill=COLORS["mist_gray"], width=2)
    draw.text((340, 38), "Jordan Lee", font=_font(31), fill=COLORS["deep_current"])
    draw.text((340, 82), "Client Success Lead", font=_body_font(18), fill=COLORS["slate"])
    draw.text((340, 126), "954 555 0148  |  jordan.lee@newwaveitfl.com", font=_body_font(15), fill=COLORS["current_navy"])
    draw.text((340, 156), f"{_SITE}  |  {_SUPPORT}", font=_body_font(15), fill=COLORS["tide_blue"])
    return image


def _communication_image(
    title: str,
    body: str,
    *,
    size: tuple[int, int],
    dark: bool = False,
    fields: tuple[tuple[str, str], ...] = (),
) -> Image.Image:
    width, height = size
    background = COLORS["deep_current"] if dark else COLORS["cloud_white"]
    headline = COLORS["cloud_white"] if dark else COLORS["deep_current"]
    body_color = COLORS["mist_gray"] if dark else COLORS["slate"]
    image = Image.new("RGB", size, background)
    draw = ImageDraw.Draw(image)
    _draw_current_field(draw, width, height, dark=dark)
    _draw_current_mark(draw, 64, 42, 45)
    draw.text((124, 53), "NEW WAVE IT", font=_font(18), fill=headline)
    draw.text((width - 220, 55), "SUPPORT COMMUNICATION", font=_font(11), fill=COLORS["signal_cyan"])
    text_end = _draw_multiline(draw, title, (64, 120), _font(42), headline, width - 128, max_lines=2)
    body_end = _draw_multiline(draw, body, (64, text_end + 16), _body_font(18), body_color, width - 128, max_lines=3)
    if fields:
        column_width = (width - 128 - 24) // 2
        field_top = min(height - 144, body_end + 28)
        for index, (label, value) in enumerate(fields):
            column, row = index % 2, index // 2
            x = 64 + column * (column_width + 24)
            y = field_top + row * 46
            draw.rectangle((x, y, x + column_width, y + 36), fill=COLORS["current_navy"] if dark else COLORS["mist_gray"])
            draw.text((x + 10, y + 7), f"{label}: {value}", font=_body_font(12), fill=COLORS["cloud_white"] if dark else COLORS["current_navy"])
    draw.rectangle((64, height - 24, width - 64, height - 20), fill=COLORS["signal_cyan"])
    return image


def _footer_image() -> Image.Image:
    image = Image.new("RGB", (1200, 120), COLORS["mist_gray"])
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 1200, 4), fill=COLORS["signal_cyan"])
    _draw_current_mark(draw, 60, 42, 34)
    draw.text((118, 46), _SITE, font=_font(15), fill=COLORS["current_navy"])
    detail = f"{_SUPPORT}  |  Fort Lauderdale / South Florida"
    right = draw.textlength(detail, font=_body_font(14))
    draw.text((1140 - right, 48), detail, font=_body_font(14), fill=COLORS["slate"])
    return image


def _html_table(
    title: str,
    body: str,
    image_name: str,
    *,
    fields: tuple[tuple[str, str], ...] = (),
    dark: bool = False,
) -> str:
    background = COLORS["deep_current"] if dark else COLORS["cloud_white"]
    headline = COLORS["cloud_white"] if dark else COLORS["deep_current"]
    body_color = COLORS["mist_gray"] if dark else COLORS["slate"]
    field_rows = "".join(
        f'<tr><td style="padding:8px 12px;border-top:1px solid {COLORS["mist_gray"]};font:600 13px {_DISPLAY_FONT_STACK};color:{headline};">{escape(label)}</td>'
        f'<td style="padding:8px 12px;border-top:1px solid {COLORS["mist_gray"]};font:13px {_BODY_FONT_STACK};color:{body_color};">{escape(value)}</td></tr>'
        for label, value in fields
    )
    field_table = (
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:18px;border-collapse:collapse;">{field_rows}</table>'
        if fields
        else ""
    )
    return f'''<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:{COLORS["mist_gray"]};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;margin:0 auto;background:{background};border-collapse:collapse;">
      <tr><td style="padding:28px 32px 0;">
        <img src="{image_name}" width="600" alt="New Wave IT" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
      </td></tr>
      <tr><td style="padding:22px 32px 32px;border-left:5px solid {COLORS["signal_cyan"]};">
        <div style="font:700 26px {_DISPLAY_FONT_STACK};line-height:1.18;color:{headline};">{escape(title)}</div>
        <div style="padding-top:12px;font:16px {_BODY_FONT_STACK};line-height:1.5;color:{body_color};">{escape(body)}</div>
        {field_table}
        <div style="padding-top:18px;font:600 13px {_DISPLAY_FONT_STACK};color:{COLORS["tide_blue"]};">{_SITE} | {_SUPPORT}</div>
      </td></tr>
    </table>
  </body>
</html>
'''


def _signature_html() -> str:
    return f'''<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;border-collapse:collapse;font-family:{_BODY_FONT_STACK};color:{COLORS["current_navy"]};">
      <tr>
        <td style="padding:0 0 14px;vertical-align:top;"><img src="new-wave-it-email-signature.png" width="480" alt="New Wave IT signature fallback" style="display:block;width:100%;max-width:480px;height:auto;border:0;"></td>
      </tr>
      <tr>
        <td style="padding:8px 0 0 18px;border-left:3px solid {COLORS["signal_cyan"]};vertical-align:top;">
          <div style="font:700 20px {_DISPLAY_FONT_STACK};line-height:1.2;color:{COLORS["deep_current"]};">Jordan Lee</div>
          <div style="padding-top:3px;font:14px {_BODY_FONT_STACK};line-height:1.4;color:{COLORS["slate"]};">Client Success Lead</div>
          <div style="padding-top:12px;font:13px {_BODY_FONT_STACK};line-height:1.5;color:{COLORS["current_navy"]};">954 555 0148 | jordan.lee@newwaveitfl.com</div>
          <div style="padding-top:3px;font:13px {_BODY_FONT_STACK};line-height:1.5;color:{COLORS["tide_blue"]};"><a href="mailto:{_SUPPORT}" style="color:{COLORS["tide_blue"]};text-decoration:none;">{_SUPPORT}</a> | <a href="https://{_SITE}" style="color:{COLORS["tide_blue"]};text-decoration:none;">{_SITE}</a></div>
        </td>
      </tr>
    </table>
  </body>
</html>
'''


def _installation_guide() -> str:
    return f'''# New Wave IT email signature installation

Use the HTML signature as the primary option. The PNG is a local fallback for
clients that remove table formatting or block complex styling. Do not host the
logo from a third-party service.

## Outlook desktop

Create a new signature, paste the HTML in the signature editor, then confirm the
local PNG remains attached before sending a test message.

## Outlook web

Create a signature in Settings, paste the HTML, and send a test message to a
desktop and mobile recipient.

## Gmail

Open Settings, add a new signature, paste the HTML, and verify the local PNG
renders after saving.

## Apple Mail

Create a signature, paste the HTML, and confirm the fallback image is embedded
rather than linked remotely.

## Mobile clients

Use the plain-text signature when the mobile client cannot preserve the HTML
table layout. Mobile clients vary, so do not promise identical rendering.

Support: {_SUPPORT}
Website: {_SITE}
'''


def export_email_support_assets(package_root: Path) -> tuple[Path, ...]:
    """Write local email signature and support-communication templates."""
    root = package_root / "10-email-support"
    root.mkdir(parents=True, exist_ok=True)

    _signature_png().save(root / "new-wave-it-email-signature.png")
    (root / "new-wave-it-email-signature.html").write_text(_signature_html(), encoding="utf-8")
    (root / "new-wave-it-email-signature.txt").write_text(
        f"Jordan Lee\nClient Success Lead\n954 555 0148\njordan.lee@newwaveitfl.com\n{_SUPPORT}\n{_SITE}\n",
        encoding="utf-8",
    )
    (root / "new-wave-it-email-signature-installation-guide.md").write_text(_installation_guide(), encoding="utf-8")

    communications = {
        "new-wave-it-support-email-header": (
            "Support that keeps work moving.",
            "Use this header for support replies and planned service updates.",
            (1200, 300),
            True,
            (),
        ),
        "new-wave-it-support-email-footer": (
            "Connected support.",
            f"Contact {_SUPPORT} for help that needs a clear next step.",
            (1200, 120),
            False,
            (),
        ),
        "new-wave-it-maintenance-notice": (
            "Scheduled maintenance notice",
            "Use this template to set expectations before an approved maintenance window.",
            (1200, 540),
            False,
            (
                ("Status", "Scheduled"),
                ("Impact", "Intermittent access may occur"),
                ("Affected service", "Name the service"),
                ("Started", "Date and time"),
                ("Next update", "Date and time"),
                ("Support contact", _SUPPORT),
            ),
        ),
        "new-wave-it-incident-update": (
            "Service incident update",
            "Use measured language and share only verified operational detail.",
            (1200, 600),
            True,
            (
                ("Status", "Investigating"),
                ("Impact", "Describe verified impact"),
                ("Affected service", "Name the service"),
                ("Started", "Date and time"),
                ("Next update", "Date and time"),
                ("Support contact", _SUPPORT),
            ),
        ),
        "new-wave-it-welcome-header": (
            "Welcome to a clearer technology partnership.",
            "Use this header for customer onboarding and early success communications.",
            (1200, 300),
            False,
            (),
        ),
    }
    for stem, (title, body, size, dark, fields) in communications.items():
        image_name = f"{stem}.png"
        if stem.endswith("footer"):
            image = _footer_image()
        else:
            image = _communication_image(title, body, size=size, dark=dark, fields=fields)
        image.save(root / image_name)
        (root / f"{stem}.html").write_text(
            _html_table(title, body, image_name, fields=fields, dark=dark),
            encoding="utf-8",
        )

    targets = tuple(root / filename for filename in EMAIL_SUPPORT_FILENAMES)
    missing = [target.name for target in targets if not target.is_file()]
    if missing:
        raise RuntimeError(f"Task 10 email/support export missed artifacts: {missing}")
    return targets
