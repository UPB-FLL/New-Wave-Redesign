"""Print-ready business cards and reusable invoice artwork."""

from __future__ import annotations

from html import escape
from pathlib import Path

import cairosvg
import fitz
from reportlab.lib.colors import CMYKColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from brandkit.spec import BRAND, COLORS, PACKAGE_PATHS
from brandkit.typography import ensure_inter_regular, ensure_plus_jakarta_extrabold


PRINT_FILENAMES = tuple(Path(relative).name for relative in PACKAGE_PATHS["print"])
_SITE = "newwaveit.com"
_DISPLAY_FONT_STACK = "'Plus Jakarta Sans', Arial, sans-serif"
_BODY_FONT_STACK = "Inter, Arial, sans-serif"
_DISPLAY_PDF_FONT = "NewWavePlusJakarta"
_BODY_PDF_FONT = "NewWaveInter"

_CMYK = {
    COLORS["deep_current"]: (70, 33, 0, 88),
    COLORS["current_navy"]: (64, 33, 0, 82),
    COLORS["signal_cyan"]: (76, 0, 0, 19),
    COLORS["continuity_green"]: (48, 0, 45, 25),
    COLORS["tide_blue"]: (76, 17, 0, 43),
    COLORS["cloud_white"]: (2, 1, 1, 0),
    COLORS["mist_gray"]: (8, 4, 3, 0),
    COLORS["slate"]: (58, 33, 20, 38),
    COLORS["pure_white"]: (0, 0, 0, 0),
    "#000000": (0, 0, 0, 100),
}


def _cmyk(hex_color: str) -> CMYKColor:
    cyan, magenta, yellow, key = _CMYK[hex_color]
    return CMYKColor(cyan / 100, magenta / 100, yellow / 100, key / 100)


def _card_geometry(orientation: str) -> dict[str, float]:
    if orientation == "horizontal":
        width, height = 288.0, 180.0
        trim_width, trim_height = 252.0, 144.0
    elif orientation == "vertical":
        width, height = 180.0, 288.0
        trim_width, trim_height = 144.0, 252.0
    else:
        raise ValueError(f"Unknown card orientation: {orientation}")
    return {
        "width": width,
        "height": height,
        "trim_x": 18.0,
        "trim_y": 18.0,
        "trim_width": trim_width,
        "trim_height": trim_height,
        "bleed_x": 9.0,
        "bleed_y": 9.0,
        "bleed_width": trim_width + 18.0,
        "bleed_height": trim_height + 18.0,
    }


def _crop_marks(geometry: dict[str, float], color: str) -> str:
    tx, ty = geometry["trim_x"], geometry["trim_y"]
    tw, th = geometry["trim_width"], geometry["trim_height"]
    bx, by = geometry["bleed_x"], geometry["bleed_y"]
    bw, bh = geometry["bleed_width"], geometry["bleed_height"]
    marks = (
        (bx - 7, ty, bx - 1, ty),
        (tx, by - 7, tx, by - 1),
        (bx + bw + 1, ty, bx + bw + 7, ty),
        (tx + tw, by - 7, tx + tw, by - 1),
        (bx - 7, ty + th, bx - 1, ty + th),
        (tx, by + bh + 1, tx, by + bh + 7),
        (bx + bw + 1, ty + th, bx + bw + 7, ty + th),
        (tx + tw, by + bh + 1, tx + tw, by + bh + 7),
    )
    return "".join(
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
        f'stroke-width="0.8" data-role="crop-mark"/>'
        for x1, y1, x2, y2 in marks
    )


def _mark_svg(x: float, y: float, scale: float, *, dark: bool, reverse: bool = False) -> str:
    if reverse:
        colors = ("#FFFFFF",) * 3
    else:
        colors = (
            COLORS["signal_cyan"] if not dark else "#000000",
            COLORS["continuity_green"] if not dark else "#000000",
            COLORS["tide_blue"] if not dark else "#000000",
        )
    paths = []
    for index, color in enumerate(colors):
        offset = index * scale * 0.26
        paths.append(
            f'<path d="M {x} {y + offset + scale * 0.22} C {x + scale * 0.32} {y + offset}, '
            f'{x + scale * 0.62} {y + offset}, {x + scale} {y + offset + scale * 0.22}" '
            f'fill="none" stroke="{color}" stroke-width="{scale * 0.08}" stroke-linecap="round"/>'
        )
    return "".join(paths)


def _safe_text(
    text: str,
    x: float,
    y: float,
    *,
    fill: str,
    size: float,
    weight: int = 400,
    anchor: str = "start",
    family: str = _BODY_FONT_STACK,
) -> str:
    return (
        f'<text x="{x}" y="{y}" fill="{fill}" font-family="{family}" '
        f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" data-role="safe-text">'
        f'{escape(text)}</text>'
    )


def business_card_svg(orientation: str, colorway: str) -> str:
    """Return an editable SVG master with explicit print-production geometry."""
    if colorway not in {"full-color", "print-black"}:
        raise ValueError(f"Unknown card colorway: {colorway}")
    geometry = _card_geometry(orientation)
    width, height = geometry["width"], geometry["height"]
    trim_x, trim_y = geometry["trim_x"], geometry["trim_y"]
    trim_width, trim_height = geometry["trim_width"], geometry["trim_height"]
    bleed_x, bleed_y = geometry["bleed_x"], geometry["bleed_y"]
    bleed_width, bleed_height = geometry["bleed_width"], geometry["bleed_height"]
    is_black = colorway == "print-black"
    ink = "#000000" if is_black else COLORS["current_navy"]
    pale = "#FFFFFF" if is_black else COLORS["cloud_white"]
    muted = "#000000" if is_black else COLORS["slate"]
    accent = "#000000" if is_black else COLORS["signal_cyan"]
    identity_fill = "#FFFFFF"

    if orientation == "horizontal":
        split = 132.0
        background = (
            f'<rect x="0" y="0" width="{width}" height="{height}" fill="{pale}"/>'
            f'<rect x="0" y="0" width="{split}" height="{height}" fill="{ink}" data-role="contrast-panel"/>'
        )
        body = (
            _mark_svg(30, 34, 32, dark=is_black, reverse=is_black)
            + _safe_text("JORDAN LEE", 30, 78, fill=identity_fill, size=14, weight=700, family=_DISPLAY_FONT_STACK)
            + _safe_text("Client Success Lead", 30, 96, fill=identity_fill, size=8)
            + _safe_text("954 555 0148", 134, 72, fill=ink, size=8.2, weight=700)
            + _safe_text("jordan.lee@newwaveitfl.com", 134, 90, fill=muted, size=7.1)
            + _safe_text(BRAND["support_email"], 134, 117, fill=ink, size=7.1)
            + _safe_text(_SITE, 134, 138, fill=accent, size=8.2, weight=700)
        )
    else:
        split = 118.0
        background = (
            f'<rect x="0" y="0" width="{width}" height="{height}" fill="{pale}"/>'
            f'<rect x="0" y="0" width="{width}" height="{split}" fill="{ink}"/>'
        )
        body = (
            _mark_svg(30, 34, 32, dark=is_black, reverse=is_black)
            + _safe_text("JORDAN LEE", 30, 82, fill=identity_fill, size=14, weight=700, family=_DISPLAY_FONT_STACK)
            + _safe_text("Client Success Lead", 30, 100, fill=identity_fill, size=8)
            + _safe_text("954 555 0148", 30, 156, fill=ink, size=8.2, weight=700)
            + _safe_text("jordan.lee@newwaveitfl.com", 30, 177, fill=muted, size=7.1)
            + _safe_text(BRAND["support_email"], 30, 205, fill=ink, size=7.1)
            + _safe_text(_SITE, 30, 234, fill=accent, size=8.2, weight=700)
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}pt" height="{height}pt" role="img" aria-label="New Wave IT {orientation} business card">'
        f'<title>New Wave IT {orientation} business card, {colorway}</title>'
        f'<rect x="{bleed_x}" y="{bleed_y}" width="{bleed_width}" height="{bleed_height}" '
        'fill="none" stroke="none" data-role="bleed-box"/>'
        f'<rect x="{trim_x}" y="{trim_y}" width="{trim_width}" height="{trim_height}" '
        'fill="none" stroke="none" data-role="trim-box"/>'
        f'{background}{body}{_crop_marks(geometry, ink)}</svg>'
    )


def _draw_crop_marks(pdf: canvas.Canvas, geometry: dict[str, float], color: CMYKColor) -> None:
    pdf.setStrokeColor(color)
    pdf.setLineWidth(0.8)
    tx, ty = geometry["trim_x"], geometry["trim_y"]
    tw, th = geometry["trim_width"], geometry["trim_height"]
    bx, by = geometry["bleed_x"], geometry["bleed_y"]
    bw, bh = geometry["bleed_width"], geometry["bleed_height"]
    marks = (
        (bx - 7, ty, bx - 1, ty),
        (tx, by - 7, tx, by - 1),
        (bx + bw + 1, ty, bx + bw + 7, ty),
        (tx + tw, by - 7, tx + tw, by - 1),
        (bx - 7, ty + th, bx - 1, ty + th),
        (tx, by + bh + 1, tx, by + bh + 7),
        (bx + bw + 1, ty + th, bx + bw + 7, ty + th),
        (tx + tw, by + bh + 1, tx + tw, by + bh + 7),
    )
    for x1, y1, x2, y2 in marks:
        pdf.line(x1, y1, x2, y2)


def _draw_pdf_mark(pdf: canvas.Canvas, x: float, y: float, scale: float, color: CMYKColor) -> None:
    pdf.setStrokeColor(color)
    pdf.setLineWidth(scale * 0.08)
    for index in range(3):
        offset = index * scale * 0.26
        path = pdf.beginPath()
        path.moveTo(x, y + offset + scale * 0.22)
        path.curveTo(x + scale * 0.32, y + offset, x + scale * 0.62, y + offset, x + scale, y + offset + scale * 0.22)
        pdf.drawPath(path, stroke=1, fill=0)


def _register_print_fonts() -> tuple[str, str]:
    """Register approved build-input fonts without distributing raw font files."""
    registered = set(pdfmetrics.getRegisteredFontNames())
    if _DISPLAY_PDF_FONT not in registered:
        pdfmetrics.registerFont(TTFont(_DISPLAY_PDF_FONT, str(ensure_plus_jakarta_extrabold())))
    if _BODY_PDF_FONT not in registered:
        pdfmetrics.registerFont(TTFont(_BODY_PDF_FONT, str(ensure_inter_regular())))
    return _DISPLAY_PDF_FONT, _BODY_PDF_FONT


def _set_print_boxes(pdf_path: Path, geometry: dict[str, float]) -> None:
    document = fitz.open(pdf_path)
    try:
        page = document[0]
        page.set_trimbox(
            fitz.Rect(
                geometry["trim_x"],
                geometry["trim_y"],
                geometry["trim_x"] + geometry["trim_width"],
                geometry["trim_y"] + geometry["trim_height"],
            )
        )
        page.set_bleedbox(
            fitz.Rect(
                geometry["bleed_x"],
                geometry["bleed_y"],
                geometry["bleed_x"] + geometry["bleed_width"],
                geometry["bleed_y"] + geometry["bleed_height"],
            )
        )
        document.saveIncr()
    finally:
        document.close()


def _business_card_pdf(target: Path, orientation: str, colorway: str) -> None:
    geometry = _card_geometry(orientation)
    width, height = geometry["width"], geometry["height"]
    is_black = colorway == "print-black"
    ink = _cmyk("#000000" if is_black else COLORS["current_navy"])
    pale = _cmyk("#FFFFFF" if is_black else COLORS["cloud_white"])
    accent = _cmyk("#000000" if is_black else COLORS["signal_cyan"])
    muted = _cmyk("#000000" if is_black else COLORS["slate"])
    identity = _cmyk("#FFFFFF")
    mark = _cmyk("#FFFFFF" if is_black else COLORS["signal_cyan"])
    display_font, body_font = _register_print_fonts()

    pdf = canvas.Canvas(str(target), pagesize=(width, height), pageCompression=1)
    pdf.setTitle(f"New Wave IT {orientation} business card")
    pdf.setAuthor(BRAND["legal_name"])
    if orientation == "horizontal":
        split = 132.0
        pdf.setFillColor(pale)
        pdf.rect(0, 0, width, height, fill=1, stroke=0)
        pdf.setFillColor(ink)
        pdf.rect(0, 0, split, height, fill=1, stroke=0)
        _draw_pdf_mark(pdf, 30, 124, 32, mark)
        pdf.setFillColor(identity)
        pdf.setFont(display_font, 14)
        pdf.drawString(30, 102, "JORDAN LEE")
        pdf.setFont(body_font, 8)
        pdf.drawString(30, 86, "Client Success Lead")
        pdf.setFillColor(ink)
        pdf.setFont(display_font, 8.2)
        pdf.drawString(134, 108, "954 555 0148")
        pdf.setFont(body_font, 7.1)
        pdf.setFillColor(muted)
        pdf.drawString(134, 90, "jordan.lee@newwaveitfl.com")
        pdf.setFillColor(ink)
        pdf.drawString(134, 63, BRAND["support_email"])
        pdf.setFillColor(accent)
        pdf.setFont(display_font, 8.2)
        pdf.drawString(134, 42, _SITE)
    else:
        split = 118.0
        pdf.setFillColor(pale)
        pdf.rect(0, 0, width, height, fill=1, stroke=0)
        pdf.setFillColor(ink)
        pdf.rect(0, height - split, width, split, fill=1, stroke=0)
        _draw_pdf_mark(pdf, 30, height - 66, 32, mark)
        pdf.setFillColor(identity)
        pdf.setFont(display_font, 14)
        pdf.drawString(30, height - 92, "JORDAN LEE")
        pdf.setFont(body_font, 8)
        pdf.drawString(30, height - 108, "Client Success Lead")
        pdf.setFillColor(ink)
        pdf.setFont(display_font, 8.2)
        pdf.drawString(30, height - 156, "954 555 0148")
        pdf.setFont(body_font, 7.1)
        pdf.setFillColor(muted)
        pdf.drawString(30, height - 177, "jordan.lee@newwaveitfl.com")
        pdf.setFillColor(ink)
        pdf.drawString(30, height - 205, BRAND["support_email"])
        pdf.setFillColor(accent)
        pdf.setFont(display_font, 8.2)
        pdf.drawString(30, height - 234, _SITE)
    _draw_crop_marks(pdf, geometry, ink)
    pdf.showPage()
    pdf.save()
    _set_print_boxes(target, geometry)


def _invoice_header_svg() -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 220" role="img" aria-label="New Wave IT invoice header">
  <rect width="1200" height="220" fill="{COLORS["cloud_white"]}"/>
  <rect y="214" width="1200" height="6" fill="{COLORS["signal_cyan"]}"/>
  {_mark_svg(70, 62, 58, dark=False)}
  <text x="150" y="102" fill="{COLORS["current_navy"]}" font-family="{_DISPLAY_FONT_STACK}" font-size="28" font-weight="700">NEW WAVE IT</text>
  <text x="150" y="134" fill="{COLORS["slate"]}" font-family="{_BODY_FONT_STACK}" font-size="16">Technology that keeps business moving.</text>
  <text x="1130" y="102" text-anchor="end" fill="{COLORS["current_navy"]}" font-family="{_DISPLAY_FONT_STACK}" font-size="22" font-weight="700">INVOICE</text>
  <text x="1130" y="134" text-anchor="end" fill="{COLORS["slate"]}" font-family="{_BODY_FONT_STACK}" font-size="15">{_SITE}</text>
</svg>'''


def _invoice_footer_svg() -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" role="img" aria-label="New Wave IT invoice footer">
  <rect width="1200" height="120" fill="{COLORS["mist_gray"]}"/>
  <rect width="1200" height="4" fill="{COLORS["signal_cyan"]}"/>
  <text x="70" y="68" fill="{COLORS["current_navy"]}" font-family="{_DISPLAY_FONT_STACK}" font-size="16" font-weight="700">{_SITE}</text>
  <text x="1130" y="68" text-anchor="end" fill="{COLORS["slate"]}" font-family="{_BODY_FONT_STACK}" font-size="15">{BRAND["support_email"]}</text>
</svg>'''


def _invoice_usage_pdf(target: Path) -> None:
    display_font, body_font = _register_print_fonts()
    pdf = canvas.Canvas(str(target), pagesize=(612, 792), pageCompression=1)
    pdf.setTitle("New Wave IT invoice asset usage")
    pdf.setFillColor(_cmyk(COLORS["cloud_white"]))
    pdf.rect(0, 0, 612, 792, fill=1, stroke=0)
    pdf.setFillColor(_cmyk(COLORS["signal_cyan"]))
    pdf.rect(54, 714, 504, 5, fill=1, stroke=0)
    pdf.setFillColor(_cmyk(COLORS["deep_current"]))
    pdf.setFont(display_font, 23)
    pdf.drawString(54, 670, "Invoice asset usage")
    pdf.setFillColor(_cmyk(COLORS["slate"]))
    pdf.setFont(body_font, 11)
    lines = (
        "Place the header at the top of the invoice page and keep 0.25 in of minimum padding",
        "between the artwork and invoice fields. Keep the footer clear of remittance and tax detail.",
        "Use the full-color files for standard digital or color-print invoices. For monochrome",
        "printing, use the supplied print-black logo only; do not convert the email or web assets.",
        f"Support contact: {BRAND['support_email']} | {_SITE}",
    )
    y = 620
    for line in lines:
        pdf.drawString(54, y, line)
        y -= 24
    pdf.setStrokeColor(_cmyk(COLORS["mist_gray"]))
    pdf.setLineWidth(1)
    pdf.line(54, 410, 558, 410)
    pdf.setFillColor(_cmyk(COLORS["current_navy"]))
    pdf.setFont(display_font, 12)
    pdf.drawString(54, 378, "Header placement")
    pdf.drawString(54, 314, "Footer placement")
    pdf.setFillColor(_cmyk(COLORS["slate"]))
    pdf.setFont(body_font, 10)
    pdf.drawString(54, 354, "Align to the invoice content column, not the page edge.")
    pdf.drawString(54, 290, "Use once per page when a multi-page invoice needs continuing contact detail.")
    pdf.showPage()
    pdf.save()


def export_print_assets(package_root: Path) -> tuple[Path, ...]:
    """Export editable card masters, print PDFs, and invoice assets."""
    root = package_root / "09-print"
    root.mkdir(parents=True, exist_ok=True)
    for orientation in ("horizontal", "vertical"):
        for colorway in ("full-color", "print-black"):
            stem = f"new-wave-it-business-card-{orientation}-{colorway}"
            (root / f"{stem}.svg").write_text(business_card_svg(orientation, colorway), encoding="utf-8")
            _business_card_pdf(root / f"{stem}.pdf", orientation, colorway)

    invoice_assets = {
        "new-wave-it-invoice-header": _invoice_header_svg(),
        "new-wave-it-invoice-footer": _invoice_footer_svg(),
    }
    for stem, markup in invoice_assets.items():
        svg_target = root / f"{stem}.svg"
        png_target = root / f"{stem}.png"
        svg_target.write_text(markup, encoding="utf-8")
        size = (1200, 220) if stem.endswith("header") else (1200, 120)
        cairosvg.svg2png(bytestring=markup.encode("utf-8"), write_to=str(png_target), output_width=size[0], output_height=size[1])
    _invoice_usage_pdf(root / "new-wave-it-invoice-asset-usage.pdf")

    targets = tuple(root / filename for filename in PRINT_FILENAMES)
    missing = [target.name for target in targets if not target.is_file()]
    if missing:
        raise RuntimeError(f"Task 10 print export missed artifacts: {missing}")
    return targets
