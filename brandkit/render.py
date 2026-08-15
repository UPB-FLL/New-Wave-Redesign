"""Deterministic raster and print exports from canonical New Wave IT SVGs."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import cairosvg
from PIL import Image, ImageDraw

from brandkit.spec import COLORS, PACKAGE_PATHS


@dataclass(frozen=True)
class PngInfo:
    """Small, stable inspection result for a generated PNG."""

    mode: str
    size: tuple[int, int]
    has_transparency: bool


_LOCKUP_LAYOUTS = (
    "horizontal",
    "horizontal-tagline",
    "stacked",
    "stacked-tagline",
    "wordmark",
)
_ICON_LAYOUTS = ("icon", "micro-icon")
_RASTER_WIDTHS = (512, 1024, 2048)
_ICON_WIDTHS = (256, 512, 1024, 2048)
_ICO_SIZES = (16, 32, 48)
_SAFE_ZONE = 0.8


def _read_svg(svg_path: Path) -> bytes:
    if not svg_path.is_file():
        raise FileNotFoundError(f"canonical SVG is missing: {svg_path}")
    return svg_path.read_bytes()


def render_svg_png(svg_path: Path, output_path: Path, width: int) -> Path:
    """Render an SVG directly at its requested output width with alpha preserved."""
    if width <= 0:
        raise ValueError("width must be positive")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2png(bytestring=_read_svg(svg_path), write_to=str(output_path), output_width=width)
    return output_path


def render_svg_pdf(svg_path: Path, output_path: Path) -> Path:
    """Render a vector SVG master as a PDF without rasterizing it first."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cairosvg.svg2pdf(bytestring=_read_svg(svg_path), write_to=str(output_path))
    return output_path


def build_ico(images: Iterable[Image.Image], output_path: Path) -> Path:
    """Assemble directly rendered micro-mark PNG frames into a favicon ICO."""
    frames = [image.convert("RGBA") for image in images]
    if {image.size for image in frames} != {(size, size) for size in _ICO_SIZES}:
        raise ValueError("ICO frames must be direct 16, 32, and 48 pixel renders")
    frames.sort(key=lambda image: image.width, reverse=True)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        output_path,
        format="ICO",
        sizes=[(size, size) for size in _ICO_SIZES],
        append_images=frames[1:],
    )
    return output_path


def inspect_png(png_path: Path) -> PngInfo:
    """Inspect dimensions, mode, and actual alpha presence without mutating a PNG."""
    with Image.open(png_path) as image:
        image.load()
        mode = image.mode
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        has_transparency = alpha is not None and alpha.getextrema() != (255, 255)
        return PngInfo(mode=mode, size=image.size, has_transparency=has_transparency)


def _digital_svg(package_root: Path, layout: str) -> Path:
    return package_root / "02-logos/svg" / f"new-wave-it-{layout}-full-color.svg"


def _print_svg(package_root: Path, layout: str) -> Path:
    return package_root / "02-logos/monochrome" / f"new-wave-it-{layout}-print-black.svg"


def _render_icon(svg_path: Path, size: int) -> Image.Image:
    png_bytes = cairosvg.svg2png(bytestring=_read_svg(svg_path), output_width=size, output_height=size)
    from io import BytesIO

    with Image.open(BytesIO(png_bytes)) as image:
        return image.convert("RGBA").copy()


def _write_png(image: Image.Image, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, format="PNG", optimize=False)
    return output_path


def _export_logo_pngs(package_root: Path) -> None:
    target_root = package_root / "02-logos/png"
    for layout in _LOCKUP_LAYOUTS:
        source = _digital_svg(package_root, layout)
        for width in _RASTER_WIDTHS:
            render_svg_png(source, target_root / f"new-wave-it-{layout}-full-color-{width}.png", width)
    for layout in _ICON_LAYOUTS:
        source = _digital_svg(package_root, layout)
        for width in _ICON_WIDTHS:
            render_svg_png(source, target_root / f"new-wave-it-{layout}-full-color-{width}.png", width)


def _export_print_pdfs(package_root: Path) -> None:
    target_root = package_root / "02-logos/print-pdf"
    for layout in (*_LOCKUP_LAYOUTS[:4], "icon", "micro-icon", "wordmark"):
        render_svg_pdf(
            _print_svg(package_root, layout),
            target_root / f"new-wave-it-{layout}-print-black.pdf",
        )


def _export_favicons(package_root: Path) -> None:
    icon_root = package_root / "03-favicons-app-icons"
    micro_svg = _digital_svg(package_root, "micro-icon")
    standard_svg = _digital_svg(package_root, "icon")

    icon_root.mkdir(parents=True, exist_ok=True)
    # These browser-facing vector icons remain digital full-color, never the print black master.
    icon_root.joinpath("favicon.svg").write_bytes(_read_svg(standard_svg))
    icon_root.joinpath("safari-pinned-tab.svg").write_bytes(_read_svg(standard_svg))

    ico_frames: list[Image.Image] = []
    for size in _ICO_SIZES:
        rendered = _render_icon(micro_svg, size)
        _write_png(rendered, icon_root / f"favicon-{size}x{size}.png")
        ico_frames.append(rendered)
    build_ico(ico_frames, icon_root / "favicon.ico")

    for name, size in (("apple-touch-icon.png", 180), ("pwa-icon-192.png", 192), ("pwa-icon-512.png", 512)):
        _write_png(_render_icon(standard_svg, size), icon_root / name)

    safe_size = int(512 * _SAFE_ZONE)
    maskable = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    inset = (512 - safe_size) // 2
    maskable.alpha_composite(_render_icon(standard_svg, safe_size), (inset, inset))
    _write_png(maskable, icon_root / "pwa-maskable-512.png")


def _export_contact_sheet(package_root: Path) -> None:
    icon_root = package_root / "03-favicons-app-icons"
    sheet = Image.new("RGBA", (1800, 1000), COLORS["cloud_white"])
    draw = ImageDraw.Draw(sheet)
    small_entries = (
        ("favicon-16x16.png", 70),
        ("favicon-32x32.png", 360),
        ("favicon-48x48.png", 800),
    )
    for name, x in small_entries:
        with Image.open(icon_root / name) as source:
            icon = source.convert("RGBA")
        draw.text((x, 30), name.removesuffix(".png"), fill=COLORS["current_navy"])
        sheet.alpha_composite(icon, (x, 60))
        zoom = icon.resize((icon.width * 8, icon.height * 8), Image.Resampling.NEAREST)
        sheet.alpha_composite(zoom, (x, 130))

    native_entries = (
        ("apple-touch-icon.png", 1280, 55),
        ("pwa-icon-192.png", 1280, 330),
        ("pwa-icon-512.png", 80, 430),
        ("pwa-maskable-512.png", 760, 430),
    )
    for name, x, y in native_entries:
        with Image.open(icon_root / name) as source:
            icon = source.convert("RGBA")
        draw.text((x, y - 24), name.removesuffix(".png"), fill=COLORS["current_navy"])
        sheet.alpha_composite(icon, (x, y))
    _write_png(sheet, package_root / "12-preview/favicon-contact-sheet.png")


def export_raster_family(package_root: Path) -> None:
    """Write only Task 4 PNG, PDF, favicon, app-icon, and preview outputs."""
    _export_logo_pngs(package_root)
    _export_print_pdfs(package_root)
    _export_favicons(package_root)
    _export_contact_sheet(package_root)

    expected = (
        *PACKAGE_PATHS["logo_rasters"],
        *PACKAGE_PATHS["logo_print_pdfs"],
        *PACKAGE_PATHS["favicons"],
        "12-preview/favicon-contact-sheet.png",
    )
    missing = [relative for relative in expected if not (package_root / relative).is_file()]
    if missing:
        raise RuntimeError(f"Task 4 export missed required artifacts: {missing}")
