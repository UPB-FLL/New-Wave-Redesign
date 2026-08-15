"""Brand guide, quick reference, preview board, and asset-index generator."""

from __future__ import annotations

import csv
import hashlib
import io
import textwrap
from pathlib import Path
from xml.etree import ElementTree

import fitz
from PIL import Image, ImageDraw, ImageFont, UnidentifiedImageError
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

from brandkit.spec import BRAND, COLORS, DIMENSIONS
from brandkit.typography import ensure_inter_regular, ensure_plus_jakarta_extrabold


BRAND_GUIDE_FILENAME = "new-wave-it-brand-guide.pdf"
QUICK_GUIDE_FILENAME = "new-wave-it-quick-usage-guide.md"
BRAND_PREVIEW_FILENAME = "new-wave-it-brand-preview.png"
GUIDE_CONTACT_SHEET_FILENAME = "brand-guide-contact-sheet.png"
ASSET_INDEX_FILENAME = "new-wave-it-asset-index.csv"
README_FILENAME = "new-wave-it-read-me.txt"
_SITE = "newwaveit.com"
_GUIDE_DISPLAY_FONT = "NewWaveGuideDisplay"
_GUIDE_BODY_FONT = "NewWaveGuideBody"
_FONT_SUFFIXES = frozenset({".ttf", ".otf", ".woff", ".woff2"})

_GUIDE_SECTIONS = (
    (
        "Positioning and messaging",
        (
            f"Primary promise: {BRAND['promise']}",
            f"Heritage line: {BRAND['heritage_line']}",
            "Lead with dependable outcomes, practical accountability, and the next operational step.",
        ),
    ),
    (
        "Voice and copy standards",
        (
            "Write directly, calmly, and specifically. Name a decision, a responsibility, or a clear next move.",
            "Use verified facts. Do not invent response times, guarantees, customer outcomes, or security claims.",
            "Avoid fear language, technical theater, beach metaphors, and generic cybersecurity slogans.",
        ),
    ),
    (
        "Logo family and construction",
        (
            "Use the canonical horizontal lockup for most communications, the stacked mark for narrow fields, and the micro mark only at small icon sizes.",
            "Do not redraw the mark, add effects, stretch it, or attach the heritage line permanently.",
            "Use the supplied SVG or PNG export that matches the intended surface and size.",
        ),
    ),
    (
        "Clear space, minimum size, and incorrect use",
        (
            "Preserve the clear space defined by the master mark. Keep nearby type, rules, and imagery outside that field.",
            "Minimum widths: 140 px for the digital horizontal logo and 1.25 in for the printed horizontal logo.",
            "Do not place the mark on a busy field, use unapproved colors, or turn the current lines into decorative waves.",
        ),
    ),
    (
        "Colors and accessibility",
        (
            "Deep Current and Current Navy are the dominant dark surfaces. Cloud White and Mist Gray are the dominant light surfaces.",
            "Signal Cyan is the primary emphasis. Continuity Green communicates a verified positive state, not decoration.",
            "Never use white body copy on Signal Cyan or Continuity Green. Check contrast before using small text.",
        ),
    ),
    (
        "Typography",
        (
            "Use Plus Jakarta Sans for display hierarchy, Inter for body and interface copy, and IBM Plex Mono for technical labels.",
            "Use a simple 8 / 16 / 24 / 32 / 48 spacing rhythm. Keep body text readable and avoid condensed or novelty type.",
            "Fonts are build inputs and should not be distributed with the package.",
        ),
    ),
    (
        "Graphic language and photography",
        (
            "Use the three-current field as restrained edge framing, not a full-page spectacle.",
            "Use clear, real operational imagery when photography is needed. Keep the subject inspectable and relevant.",
            "Avoid gradients, glow, glass panels, beach scenes, generic shields, padlocks, hacker imagery, and decorative noise.",
        ),
    ),
    (
        "Layout and motion",
        (
            "Use generous margins, stable grids, and a clear reading order. Let one primary action or message lead each composition.",
            "Keep labels compact and technical. Reserve large type for actual headline moments.",
            "Motion, when present, should be short, functional, and respectful of reduced-motion preferences.",
        ),
    ),
    (
        "Website usage",
        (
            "Use the local canonical assets in the public brand directory. Preserve working routes, forms, integrations, and metadata behavior.",
            "Use the primary promise in hero hierarchy and keep direct calls to action grounded in accurate service language.",
            "Do not use external logo hosts or legacy Squarespace image URLs.",
        ),
    ),
    (
        "Website and social safe areas",
        (
            "Respect the supplied platform-specific safe areas for profile, banner, feed, and story formats.",
            "Keep profile marks simple and centered. Keep social messages concise, useful, and legible at preview size.",
            "Use prebuilt social templates as editable starting points instead of rebuilding layouts ad hoc.",
        ),
    ),
    (
        "Documents, print, and email",
        (
            "Use editable DOCX and presentation templates for operational work. Keep support communications measured and complete.",
            "Full-color and print-black business cards are separate outputs. Pure black is allowed only on approved print/PDF monochrome card and logo files.",
            "Email signatures and support headers use local PNG fallbacks and table-based HTML for broad client compatibility.",
        ),
    ),
    (
        "File organization and export guidance",
        (
            "Keep source, generated exports, and review assets in their supplied folders. Preserve lowercase kebab-case filenames.",
            "Use SVG for editable vector masters, PNG for digital fallbacks, and PDF for print-ready review or vendor handoff.",
            "Run the package verifier before delivery; do not include local build directories, inspection sidecars, distributed font files, or temporary exports.",
        ),
    ),
)


def _hex(value: str) -> HexColor:
    return HexColor(value)


def _font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(ensure_plus_jakarta_extrabold()), size=size)
    except OSError:
        return ImageFont.load_default()


def _body_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype(str(ensure_inter_regular()), size=size)
    except OSError:
        return ImageFont.load_default()


def _register_guide_fonts() -> None:
    registered = set(pdfmetrics.getRegisteredFontNames())
    if _GUIDE_DISPLAY_FONT not in registered:
        pdfmetrics.registerFont(TTFont(_GUIDE_DISPLAY_FONT, str(ensure_plus_jakarta_extrabold())))
    if _GUIDE_BODY_FONT not in registered:
        pdfmetrics.registerFont(TTFont(_GUIDE_BODY_FONT, str(ensure_inter_regular())))


def _guide_styles() -> dict[str, ParagraphStyle]:
    _register_guide_fonts()
    styles = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle(
            "GuideCoverTitle",
            parent=styles["Title"],
            fontName=_GUIDE_DISPLAY_FONT,
            fontSize=28,
            leading=34,
            textColor=_hex(COLORS["deep_current"]),
            spaceAfter=12,
        ),
        "cover_copy": ParagraphStyle(
            "GuideCoverCopy",
            parent=styles["BodyText"],
            fontName=_GUIDE_BODY_FONT,
            fontSize=12,
            leading=18,
            textColor=_hex(COLORS["slate"]),
            spaceAfter=9,
        ),
        "section_title": ParagraphStyle(
            "GuideSectionTitle",
            parent=styles["Heading1"],
            fontName=_GUIDE_DISPLAY_FONT,
            fontSize=22,
            leading=27,
            textColor=_hex(COLORS["deep_current"]),
            spaceAfter=16,
        ),
        "body": ParagraphStyle(
            "GuideBody",
            parent=styles["BodyText"],
            fontName=_GUIDE_BODY_FONT,
            fontSize=11,
            leading=16,
            textColor=_hex(COLORS["current_navy"]),
            spaceAfter=12,
            alignment=TA_LEFT,
        ),
        "label": ParagraphStyle(
            "GuideLabel",
            parent=styles["BodyText"],
            fontName=_GUIDE_DISPLAY_FONT,
            fontSize=8,
            leading=10,
            textColor=_hex(COLORS["tide_blue"]),
            spaceAfter=8,
        ),
    }


def _guide_page(canvas, document) -> None:
    _register_guide_fonts()
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(_hex(COLORS["cloud_white"]))
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(_hex(COLORS["signal_cyan"]))
    canvas.rect(0.75 * inch, 0.55 * inch, width - 1.5 * inch, 2, fill=1, stroke=0)
    canvas.setFillColor(_hex(COLORS["slate"]))
    canvas.setFont(_GUIDE_BODY_FONT, 7.5)
    canvas.drawString(0.75 * inch, 0.36 * inch, "NEW WAVE IT  /  BRAND GUIDE")
    canvas.drawRightString(width - 0.75 * inch, 0.36 * inch, f"{document.page:02d}")
    canvas.restoreState()


def _write_brand_guide(target: Path) -> None:
    styles = _guide_styles()
    document = SimpleDocTemplate(
        str(target),
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.82 * inch,
        bottomMargin=0.78 * inch,
        title="New Wave IT Brand Guide",
        author=BRAND["legal_name"],
        subject="New Wave IT identity, usage, and export guidance",
    )
    story = [
        Spacer(1, 1.1 * inch),
        Paragraph("New Wave IT Brand Guide", styles["cover_title"]),
        Paragraph(BRAND["promise"], styles["cover_title"]),
        Paragraph("A practical system for clear conversations, decisions, and follow-through.", styles["cover_copy"]),
        Spacer(1, 0.35 * inch),
        Paragraph("FORT LAUDERDALE  /  SOUTH FLORIDA", styles["label"]),
        Paragraph(
            f"Website: {_SITE}<br/>Support: {BRAND['support_email']}<br/>Heritage line: {BRAND['heritage_line']}",
            styles["cover_copy"],
        ),
        PageBreak(),
    ]
    for number, (title, paragraphs) in enumerate(_GUIDE_SECTIONS, start=1):
        story.append(Paragraph(f"{number:02d}  /  {title}", styles["label"]))
        story.append(Paragraph(title, styles["section_title"]))
        for paragraph in paragraphs:
            story.append(Paragraph(paragraph, styles["body"]))
        story.append(PageBreak())
    document.build(story, onFirstPage=_guide_page, onLaterPages=_guide_page)


def _quick_usage_markdown() -> str:
    prohibited = (
        "Redrawing, stretching, or effecting the logo.",
        "Using unapproved colors or gradients.",
        "White body copy on Signal Cyan or Continuity Green.",
        "Pure black in any digital, web, social, or application treatment.",
        "Beach scenes, shields, padlocks, hacker imagery, or fabricated dashboards.",
        "External logo hosts, embedded font files, or inspection sidecars.",
        "Unsupported guarantees, fabricated metrics, or lorem ipsum.",
        "Busy imagery behind small logo or body copy.",
        "Ignoring social safe areas or print trim and bleed.",
        "Promising identical HTML email rendering in every client.",
    )
    lines = [
        "# New Wave IT quick usage guide",
        "",
        f"## Promise",
        "",
        BRAND["promise"],
        "",
        f"## Website and support",
        "",
        f"- Website: {_SITE}",
        f"- Support: {BRAND['support_email']}",
        "",
        "## Logo and backgrounds",
        "",
        "- Default to the full-color horizontal logo on Cloud White or a clean light surface.",
        "- Use the reverse logo only on Deep Current or Current Navy.",
        "- Minimum logo width: 140 px for digital use and 1.25 in for standard printed horizontal use.",
        "- Preserve clear space. Do not redraw, stretch, or add effects.",
        "- Use the Current Field as restrained edge framing rather than a decorative background.",
        "",
        "## Color and type",
        "",
        "- Deep Current / Cloud White and Current Navy / Cloud White are primary pairs.",
        "- Signal Cyan is emphasis. Continuity Green signals a verified positive state.",
        "- Never use white body copy on Signal Cyan or Continuity Green.",
        "- Display: Plus Jakarta Sans. Body: Inter. Technical labels: IBM Plex Mono.",
        "",
        "## Social, documents, and print",
        "",
        "- Use the supplied platform safe areas and editable social templates.",
        "- Use the editable DOCX and presentation layouts for operational work.",
        "- Use full-color cards for standard color print and print-black cards only for monochrome print/PDF work.",
        "",
        "## Prohibited uses",
        "",
    ]
    lines.extend(f"{index}. {item}" for index, item in enumerate(prohibited, start=1))
    lines.extend(
        [
            "",
            "## Final check",
            "",
            "Use the generated asset index to find an approved file, then run package verification before delivery.",
            "",
        ]
    )
    return "\n".join(lines)


def _open_image(path: Path) -> Image.Image | None:
    if not path.is_file():
        return None
    try:
        with Image.open(path) as source:
            if source.mode in {"RGBA", "LA"} or (source.mode == "P" and "transparency" in source.info):
                foreground = source.convert("RGBA")
                background = Image.new("RGBA", foreground.size, COLORS["cloud_white"])
                background.alpha_composite(foreground)
                return background.convert("RGB")
            return source.convert("RGB").copy()
    except UnidentifiedImageError:
        return None


def _render_pdf_first_page(path: Path) -> Image.Image | None:
    if not path.is_file():
        return None
    document = fitz.open(path)
    try:
        if document.page_count == 0:
            return None
        pixmap = document[0].get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False)
        return Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGB")
    finally:
        document.close()


def _first_existing_image(root: Path, relatives: tuple[str, ...]) -> Image.Image | None:
    for relative in relatives:
        image = _open_image(root / relative)
        if image is not None:
            return image
    return None


def _wave_field(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = bounds
    width, height = right - left, bottom - top
    for index, color in enumerate((COLORS["signal_cyan"], COLORS["continuity_green"], COLORS["tide_blue"])):
        points = []
        for step in range(101):
            x = left + int(width * step / 100)
            y = top + int(height * (0.33 + index * 0.18)) + int(height * 0.08 * __import__("math").sin(step / 100 * 6.1))
            points.append((x, y))
        draw.line(points, fill=color, width=5)


def _fit_paste(canvas: Image.Image, source: Image.Image | None, box: tuple[int, int, int, int], fallback: str) -> None:
    left, top, right, bottom = box
    draw = ImageDraw.Draw(canvas)
    if source is None:
        draw.rectangle(box, fill=fallback)
        _wave_field(draw, box)
        return
    image = source.copy()
    image.thumbnail((right - left, bottom - top))
    x = left + ((right - left) - image.width) // 2
    y = top + ((bottom - top) - image.height) // 2
    canvas.paste(image, (x, y))
    image.close()


def _write_preview(root: Path, target: Path) -> None:
    width, height = DIMENSIONS["preview"]["width"], DIMENSIONS["preview"]["height"]
    canvas = Image.new("RGB", (width, height), COLORS["cloud_white"])
    draw = ImageDraw.Draw(canvas)
    display = _font(64)
    body = _body_font(28)
    label = _font(18)
    draw.rectangle((0, 0, width, 110), fill=COLORS["deep_current"])
    draw.text((80, 30), "NEW WAVE IT  /  BRAND PREVIEW", font=display, fill=COLORS["cloud_white"])
    draw.text((80, 145), BRAND["promise"], font=_font(50), fill=COLORS["deep_current"])
    draw.text((80, 215), "Core identity, operational templates, and approved usage in one board.", font=body, fill=COLORS["slate"])

    blocks = (
        ("HORIZONTAL LOGO", (80, 330, 760, 580), ("02-logos/png/new-wave-it-horizontal-full-color-512.png",)),
        ("STACKED LOGO", (820, 330, 1160, 710), ("02-logos/png/new-wave-it-stacked-full-color-512.png",)),
        ("APP ICON", (1220, 330, 1480, 590), ("03-favicons-app-icons/pwa-icon-512.png",)),
        ("CURRENT FIELD", (1540, 330, 2320, 590), ()),
        ("OPEN GRAPH", (80, 760, 760, 1120), ("06-web-digital/open-graph-1200x630.png",)),
        ("SOCIAL POST", (820, 760, 1160, 1100), ("07-social/templates/educational-tip/new-wave-it-educational-tip-square.png",)),
        ("SOCIAL STORY", (1220, 760, 1480, 1222), ("07-social/templates/educational-tip/new-wave-it-educational-tip-story-reel.png",)),
        ("BUSINESS CARD", (1540, 760, 2000, 1023), ()),
        ("PROPOSAL REVIEW", (2060, 760, 2320, 1123), ()),
        ("PRESENTATION", (80, 1300, 760, 1660), ()),
    )
    images = {
        "HORIZONTAL LOGO": _first_existing_image(root, blocks[0][2]),
        "STACKED LOGO": _first_existing_image(root, blocks[1][2]),
        "APP ICON": _first_existing_image(root, blocks[2][2]),
        "OPEN GRAPH": _first_existing_image(root, blocks[4][2]),
        "SOCIAL POST": _first_existing_image(root, blocks[5][2]),
        "SOCIAL STORY": _first_existing_image(root, blocks[6][2]),
        "BUSINESS CARD": _render_pdf_first_page(root / "09-print/new-wave-it-business-card-horizontal-full-color.pdf"),
        "PROPOSAL REVIEW": _render_pdf_first_page(root / "08-documents-presentations/new-wave-it-proposal-template-review.pdf"),
        "PRESENTATION": _render_pdf_first_page(root / "08-documents-presentations/new-wave-it-presentation-template-review.pdf"),
    }
    for title, box, _ in blocks:
        draw.text((box[0], box[1] - 30), title, font=label, fill=COLORS["tide_blue"])
        _fit_paste(canvas, images.get(title), box, COLORS["mist_gray"])
    draw.rectangle((820, 1300, 2320, 1660), fill=COLORS["deep_current"])
    _wave_field(draw, (860, 1360, 2260, 1590))
    draw.text((880, 1410), "PALETTE", font=label, fill=COLORS["signal_cyan"])
    palette = (
        ("DEEP", COLORS["deep_current"]),
        ("NAVY", COLORS["current_navy"]),
        ("CYAN", COLORS["signal_cyan"]),
        ("GREEN", COLORS["continuity_green"]),
        ("TIDE", COLORS["tide_blue"]),
    )
    for index, (name, color) in enumerate(palette):
        x = 880 + index * 260
        draw.rectangle((x, 1480, x + 170, 1570), fill=color)
        draw.text((x, 1590), name, font=label, fill=COLORS["cloud_white"])
    draw.text((80, 1690), "TYPE SYSTEM", font=label, fill=COLORS["tide_blue"])
    draw.text((330, 1678), BRAND["promise"], font=_font(34), fill=COLORS["deep_current"])
    draw.text(
        (330, 1728),
        "Plus Jakarta Sans for display. Inter for operational detail.",
        font=_body_font(22),
        fill=COLORS["slate"],
    )
    canvas.save(target)


def _image_dimensions(path: Path) -> tuple[str, str]:
    try:
        with Image.open(path) as image:
            return str(image.width), str(image.height)
    except UnidentifiedImageError:
        return "", ""


def _pdf_physical_size(path: Path) -> str:
    document = fitz.open(path)
    try:
        if document.page_count == 0:
            return ""
        page = document[0]
        return f"{page.rect.width / 72:.2f} x {page.rect.height / 72:.2f} in"
    finally:
        document.close()


def _svg_dimensions(path: Path) -> tuple[str, str]:
    try:
        root = ElementTree.fromstring(path.read_bytes())
    except ElementTree.ParseError:
        return "", ""
    view_box = root.get("viewBox")
    if not view_box:
        return "", ""
    parts = view_box.replace(",", " ").split()
    if len(parts) != 4:
        return "", ""
    return parts[2], parts[3]


def _asset_metadata(root: Path, path: Path) -> dict[str, str]:
    relative = path.relative_to(root).as_posix()
    suffix = path.suffix.casefold()
    width, height, physical = "", "", ""
    if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        width, height = _image_dimensions(path)
    elif suffix == ".svg":
        width, height = _svg_dimensions(path)
    elif suffix == ".pdf":
        physical = _pdf_physical_size(path)
    category = relative.split("/", 1)[0]
    colorway = "print-black" if "print-black" in relative else "full-color" if "full-color" in relative else "standard"
    editable = "yes" if suffix in {".svg", ".html", ".md", ".txt", ".docx", ".pptx"} else "no"
    use_map = {
        "02-logos": "canonical identity",
        "03-favicons-app-icons": "browser and app identity",
        "05-patterns-backgrounds": "background framing",
        "06-web-digital": "web and metadata",
        "07-social": "platform social publishing",
        "08-documents-presentations": "operational templates",
        "09-print": "print and invoice use",
        "10-email-support": "email and support communications",
        "01-brand-guide": "brand reference",
    }
    background = "transparent" if suffix == ".svg" and "pattern" not in relative else "varies"
    return {
        "relative_path": relative,
        "category": category,
        "format": suffix.removeprefix(".").upper(),
        "width_px": width,
        "height_px": height,
        "physical_size": physical,
        "background": background,
        "colorway": colorway,
        "editable": editable,
        "recommended_use": use_map.get(category, "package reference"),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def _write_asset_index(root: Path, target: Path) -> None:
    excluded = {
        target.resolve(),
        (root / "00-read-me" / README_FILENAME).resolve(),
        (root / "00-read-me" / "package-manifest.json").resolve(),
        (root / "00-read-me" / "SHA256SUMS.txt").resolve(),
        (root / "build-report.json").resolve(),
    }
    paths = sorted(
        (
            path
            for path in root.rglob("*")
            if path.is_file() and ".brand-build" not in path.parts and path.resolve() not in excluded
        ),
        key=lambda path: path.relative_to(root).as_posix(),
    )
    columns = (
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
    )
    with target.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        writer.writerows(_asset_metadata(root, path) for path in paths)


def _write_readme(target: Path) -> None:
    target.write_text(
        "\n".join(
            (
                "NEW WAVE IT BRAND PACKAGE",
                "",
                BRAND["promise"],
                "",
                "START HERE",
                "- Read 01-brand-guide/new-wave-it-quick-usage-guide.md for practical day-to-day rules.",
                "- Use 00-read-me/new-wave-it-asset-index.csv to locate an approved deliverable.",
                "- Use editable SVG, DOCX, PPTX, HTML, and Markdown sources where a revision is expected.",
                "",
                "CONTACT",
                f"Website: {_SITE}",
                f"Support: {BRAND['support_email']}",
                "",
                "PACKAGE HYGIENE",
                "- Do not distribute build caches, inspection sidecars, debug decks, or font files.",
                "- Keep pure black limited to approved monochrome print/PDF logo and card files.",
                "- Run verification before handoff.",
                "",
            )
        ),
        encoding="utf-8",
    )


def _write_contact_sheet(pdf_path: Path, target: Path) -> None:
    document = fitz.open(pdf_path)
    images: list[Image.Image] = []
    try:
        for page in document:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(150 / 72, 150 / 72), alpha=False)
            images.append(Image.open(io.BytesIO(pixmap.tobytes("png"))).convert("RGB"))
    finally:
        document.close()

    tile_width, tile_height, label_height, columns = 420, 544, 32, 3
    rows = (len(images) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * tile_width, rows * (tile_height + label_height)), COLORS["mist_gray"])
    draw = ImageDraw.Draw(sheet)
    for index, image in enumerate(images, start=1):
        copy = image.copy()
        copy.thumbnail((tile_width - 18, tile_height - 18))
        x = ((index - 1) % columns) * tile_width + (tile_width - copy.width) // 2
        y = ((index - 1) // columns) * (tile_height + label_height) + (tile_height - copy.height) // 2
        sheet.paste(copy, (x, y))
        draw.text(
            (12 + ((index - 1) % columns) * tile_width, ((index - 1) // columns) * (tile_height + label_height) + tile_height + 9),
            f"{index:02d}  BRAND GUIDE",
            fill=COLORS["current_navy"],
        )
        image.close()
    sheet.save(target)


def _assert_delivery_root_clean(package_root: Path) -> None:
    """Reject private build data before it can be indexed or handed to a customer."""
    if (package_root / ".brand-build").exists():
        raise RuntimeError("customer package contains internal build data")
    for path in package_root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.casefold() in _FONT_SUFFIXES:
            raise RuntimeError(f"customer package contains font file: {path.name}")
        if path.name.endswith(".inspect.ndjson"):
            raise RuntimeError(f"customer package contains inspection sidecar: {path.name}")
        if "-debug" in path.stem:
            raise RuntimeError(f"customer package contains debug artifact: {path.name}")


def export_guide(package_root: Path) -> tuple[Path, ...]:
    """Generate the searchable guide, quick guide, preview sheet, index, and read-me."""
    _assert_delivery_root_clean(package_root)
    guide_root = package_root / "01-brand-guide"
    preview_root = package_root / "12-preview"
    readme_root = package_root / "00-read-me"
    for directory in (guide_root, preview_root, readme_root):
        directory.mkdir(parents=True, exist_ok=True)

    guide = guide_root / BRAND_GUIDE_FILENAME
    quick = guide_root / QUICK_GUIDE_FILENAME
    preview = preview_root / BRAND_PREVIEW_FILENAME
    contact_sheet = preview_root / GUIDE_CONTACT_SHEET_FILENAME
    index = readme_root / ASSET_INDEX_FILENAME
    readme = readme_root / README_FILENAME

    _write_brand_guide(guide)
    quick.write_text(_quick_usage_markdown(), encoding="utf-8")
    _write_preview(package_root, preview)
    _write_contact_sheet(guide, contact_sheet)
    _write_asset_index(package_root, index)
    _write_readme(readme)

    targets = (guide, quick, preview, contact_sheet, index, readme)
    substantial = (guide, preview, contact_sheet)
    textual = (quick, index, readme)
    if not (
        all(path.is_file() and path.stat().st_size > 1_000 for path in substantial)
        and all(path.is_file() and path.stat().st_size > 0 for path in textual)
    ):
        raise RuntimeError("Task 11 guide export did not produce every required artifact.")
    return targets
