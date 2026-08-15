"""Artifact-tool presentation template builder and deterministic review renders."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

import cairosvg
from lxml import etree
from PIL import Image, ImageDraw

from brandkit.spec import COLORS


PRESENTATION_LAYOUTS = (
    "Title",
    "Section",
    "Content",
    "Comparison",
    "Process",
    "Quote",
    "Metric",
    "Closing",
)

PRESENTATION_FILENAME = "new-wave-it-presentation-template.pptx"
REVIEW_FILENAME = "new-wave-it-presentation-template-review.pdf"
CONTACT_SHEET_FILENAME = "new-wave-it-presentation-contact-sheet.png"

_PRESENTATION_NAMESPACE = "http://schemas.openxmlformats.org/presentationml/2006/main"
_DRAWING_NAMESPACE = "http://schemas.openxmlformats.org/drawingml/2006/main"
_ROOT = "08-documents-presentations"
_BUILD_ROOT = ".brand-build"
_EMU_PER_LAYOUT_UNIT = 9_525
_LAYOUT_PLACEHOLDER_GEOMETRY = {
    "Title": {"title": (84, 166, 600, 176), "body": (84, 370, 540, 118)},
    "Section": {"title": (84, 200, 610, 150), "body": (84, 376, 560, 104)},
    "Content": {"title": (84, 132, 570, 82), "body": (84, 256, 570, 250)},
    "Comparison": {"title": (84, 118, 720, 72), "body": (84, 258, 440, 222)},
    "Process": {"title": (84, 122, 760, 72), "body": (84, 224, 1000, 60)},
    "Quote": {"title": (152, 206, 948, 182), "body": (152, 444, 860, 62)},
    "Metric": {"title": (84, 122, 760, 72), "body": (84, 236, 470, 284)},
    "Closing": {"title": (84, 200, 606, 158), "body": (84, 400, 540, 84)},
}


def _runtime_path(name: str) -> Path:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} must be set to the bundled presentation runtime path.")
    path = Path(value)
    if not path.exists():
        raise RuntimeError(f"{name} does not exist: {path}")
    return path


def _ensure_runtime_junction(build_root: Path, node_modules: Path) -> None:
    """Create the documented local module junction without mutating the runtime."""
    link = build_root / "node_modules"
    if link.exists():
        return
    environment = os.environ.copy()
    environment["NEW_WAVE_NODE_MODULE_LINK"] = str(link)
    environment["NEW_WAVE_NODE_MODULE_TARGET"] = str(node_modules)
    script = "New-Item -ItemType Junction -Path $env:NEW_WAVE_NODE_MODULE_LINK -Target $env:NEW_WAVE_NODE_MODULE_TARGET | Out-Null"
    result = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
        capture_output=True,
        text=True,
        check=False,
        env=environment,
    )
    if result.returncode != 0 or not link.exists():
        details = (result.stderr or result.stdout).strip()
        raise RuntimeError(f"Could not create presentation build module junction. {details}")


def _xml_tag(namespace: str, name: str) -> str:
    return f"{{{namespace}}}{name}"


def _layout_placeholder(shape_id: int, name: str, placeholder_type: str, index: int | None, box: tuple[int, int, int, int]) -> etree._Element:
    left, top, width, height = (value * _EMU_PER_LAYOUT_UNIT for value in box)
    shape = etree.Element(_xml_tag(_PRESENTATION_NAMESPACE, "sp"))
    nonvisual = etree.SubElement(shape, _xml_tag(_PRESENTATION_NAMESPACE, "nvSpPr"))
    properties = etree.SubElement(nonvisual, _xml_tag(_PRESENTATION_NAMESPACE, "cNvPr"))
    properties.set("id", str(shape_id))
    properties.set("name", name)
    etree.SubElement(nonvisual, _xml_tag(_PRESENTATION_NAMESPACE, "cNvSpPr"))
    nonvisual_properties = etree.SubElement(nonvisual, _xml_tag(_PRESENTATION_NAMESPACE, "nvPr"))
    placeholder = etree.SubElement(nonvisual_properties, _xml_tag(_PRESENTATION_NAMESPACE, "ph"))
    placeholder.set("type", placeholder_type)
    if index is not None:
        placeholder.set("idx", str(index))

    shape_properties = etree.SubElement(shape, _xml_tag(_PRESENTATION_NAMESPACE, "spPr"))
    transform = etree.SubElement(shape_properties, _xml_tag(_DRAWING_NAMESPACE, "xfrm"))
    offset = etree.SubElement(transform, _xml_tag(_DRAWING_NAMESPACE, "off"))
    offset.set("x", str(left))
    offset.set("y", str(top))
    extent = etree.SubElement(transform, _xml_tag(_DRAWING_NAMESPACE, "ext"))
    extent.set("cx", str(width))
    extent.set("cy", str(height))
    geometry = etree.SubElement(shape_properties, _xml_tag(_DRAWING_NAMESPACE, "prstGeom"))
    geometry.set("prst", "rect")
    etree.SubElement(geometry, _xml_tag(_DRAWING_NAMESPACE, "avLst"))
    etree.SubElement(shape_properties, _xml_tag(_DRAWING_NAMESPACE, "noFill"))
    line = etree.SubElement(shape_properties, _xml_tag(_DRAWING_NAMESPACE, "ln"))
    etree.SubElement(line, _xml_tag(_DRAWING_NAMESPACE, "noFill"))

    text_body = etree.SubElement(shape, _xml_tag(_PRESENTATION_NAMESPACE, "txBody"))
    etree.SubElement(text_body, _xml_tag(_DRAWING_NAMESPACE, "bodyPr"))
    etree.SubElement(text_body, _xml_tag(_DRAWING_NAMESPACE, "lstStyle"))
    etree.SubElement(text_body, _xml_tag(_DRAWING_NAMESPACE, "p"))
    return shape


def _ensure_native_layout_placeholders(root: etree._Element) -> None:
    c_sld = root.find(_xml_tag(_PRESENTATION_NAMESPACE, "cSld"))
    if c_sld is None:
        return
    layout_name = c_sld.get("name")
    if layout_name not in _LAYOUT_PLACEHOLDER_GEOMETRY:
        return
    shape_tree = c_sld.find(_xml_tag(_PRESENTATION_NAMESPACE, "spTree"))
    if shape_tree is None:
        return
    existing_types = {
        placeholder.get("type", "object")
        for placeholder in shape_tree.xpath(".//*[local-name()='ph']")
    }
    missing = (
        ("title", 0, _LAYOUT_PLACEHOLDER_GEOMETRY[layout_name]["title"]),
        ("body", 1, _LAYOUT_PLACEHOLDER_GEOMETRY[layout_name]["body"]),
    )
    next_id = max(
        (int(node.get("id", "0")) for node in shape_tree.xpath(".//*[local-name()='cNvPr']")),
        default=1,
    ) + 1
    insertion_index = 2
    for placeholder_type, index, box in missing:
        if placeholder_type in existing_types:
            continue
        shape_tree.insert(
            insertion_index,
            _layout_placeholder(next_id, f"{placeholder_type.title()} Placeholder", placeholder_type, index, box),
        )
        insertion_index += 1
        next_id += 1


def _remove_presentation_debug_artifacts(target: Path) -> None:
    """Keep known local inspection leftovers out of the deliverable folder."""
    for candidate in (
        target.with_name(f"{target.stem}-debug{target.suffix}"),
        target.with_name(f"{target.stem}-debug{target.suffix}.inspect.ndjson"),
        target.with_suffix(target.suffix + ".inspect.ndjson"),
    ):
        candidate.unlink(missing_ok=True)


def _patch_presentation_xml(pptx: Path, slide_number: int) -> None:
    """Add native layout placeholders and remove unsupported default theme treatments."""
    member = f"ppt/slides/slide{slide_number}.xml"
    temporary = pptx.with_suffix(".hidden-reference.tmp")
    with zipfile.ZipFile(pptx) as source, zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as target:
        for info in source.infolist():
            payload = source.read(info.filename)
            if info.filename.endswith(".xml"):
                root = etree.fromstring(payload)
                if info.filename == member:
                    root.set("show", "0")
                if info.filename.startswith("ppt/slideLayouts/slideLayout"):
                    _ensure_native_layout_placeholders(root)
                for color in root.xpath("//*[local-name()='srgbClr']"):
                    if color.get("val", "").upper() == "000000":
                        color.set("val", COLORS["deep_current"].removeprefix("#"))
                for gradient in root.xpath("//*[local-name()='gradFill']"):
                    replacement = etree.Element(f"{{{_DRAWING_NAMESPACE}}}solidFill")
                    scheme = etree.SubElement(replacement, f"{{{_DRAWING_NAMESPACE}}}schemeClr")
                    scheme.set("val", "phClr")
                    gradient.getparent().replace(gradient, replacement)
                payload = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=False)
            target.writestr(info, payload)
    temporary.replace(pptx)


def _create_review_artifacts(target: Path, render_directory: Path) -> tuple[Path, Path]:
    renders = tuple(sorted(render_directory.glob("slide-*.png"), key=lambda path: int(path.stem.split("-")[1])))
    expected_count = len(PRESENTATION_LAYOUTS) + 1
    if len(renders) != expected_count:
        raise RuntimeError(f"Artifact-tool render count was {len(renders)}, expected {expected_count}.")

    images: list[Image.Image] = []
    try:
        for render in renders:
            with Image.open(render) as image:
                images.append(image.convert("RGB").copy())
        review = target.with_name(REVIEW_FILENAME)
        images[0].save(review, "PDF", save_all=True, append_images=images[1:], resolution=96.0)

        tile_width, tile_height = 400, 225
        label_height, columns = 34, 3
        rows = (len(images) + columns - 1) // columns
        canvas = Image.new("RGB", (columns * tile_width, rows * (tile_height + label_height)), COLORS["mist_gray"])
        draw = ImageDraw.Draw(canvas)
        for index, image in enumerate(images, start=1):
            copy = image.copy()
            copy.thumbnail((tile_width - 18, tile_height - 18))
            x = ((index - 1) % columns) * tile_width + (tile_width - copy.width) // 2
            y = ((index - 1) // columns) * (tile_height + label_height) + (tile_height - copy.height) // 2
            canvas.paste(copy, (x, y))
            label = "INTERNAL REFERENCE (HIDDEN)" if index == expected_count else PRESENTATION_LAYOUTS[index - 1].upper()
            draw.text((10 + ((index - 1) % columns) * tile_width, ((index - 1) // columns) * (tile_height + label_height) + tile_height + 9), f"{index:02d}  {label}", fill=COLORS["current_navy"])
        contact_sheet = target.with_name(CONTACT_SHEET_FILENAME)
        canvas.save(contact_sheet, format="PNG")
        return review, contact_sheet
    finally:
        for image in images:
            image.close()


def _private_presentation_build_root() -> Path:
    """Keep renderer dependencies and inspection files outside the customer package."""
    return Path(__file__).resolve().parents[1] / _BUILD_ROOT / "presentations"


def _remove_legacy_package_build_cache(package_root: Path) -> None:
    """Remove the cache location created by pre-release presentation builds only."""
    legacy_cache = package_root / _BUILD_ROOT
    if legacy_cache.is_dir():
        shutil.rmtree(legacy_cache)


def build_presentation_template(path: Path) -> Path:
    """Build the editable widescreen presentation with the bundled artifact-tool runtime."""
    target = path.resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    _remove_presentation_debug_artifacts(target)
    package_root = target.parents[1]
    _remove_legacy_package_build_cache(package_root)
    logo = package_root / "02-logos/png/new-wave-it-horizontal-full-color-512.png"
    pattern = package_root / "05-patterns-backgrounds/current-field-standard-dark.svg"
    if not logo.is_file() or not pattern.is_file():
        raise FileNotFoundError("Task 9 requires Task 4 logo and Task 5 pattern assets.")

    node = _runtime_path("RUNTIME_NODE")
    node_modules = _runtime_path("RUNTIME_NODE_MODULES")
    runtime_bin = _runtime_path("RUNTIME_BIN_DIR")
    build_parent = _private_presentation_build_root()
    build_parent.mkdir(parents=True, exist_ok=True)
    build_directory = Path(tempfile.mkdtemp(prefix="new-wave-it-presentation-", dir=build_parent))
    render_directory = build_directory / "renders"
    try:
        _ensure_runtime_junction(build_directory, node_modules)
        builder = build_directory / "presentation_builder.mjs"
        shutil.copy2(Path(__file__).with_name("presentation_builder.mjs"), builder)
        pattern_png = build_directory / "current-field-standard-dark.png"
        cairosvg.svg2png(url=str(pattern), write_to=str(pattern_png), output_width=1600, output_height=900)
        environment = os.environ.copy()
        environment.update(
            {
                "RUNTIME_NODE": str(node),
                "RUNTIME_NODE_MODULES": str(node_modules),
                "RUNTIME_BIN_DIR": str(runtime_bin),
                "PRESENTATION_OUTPUT": str(target),
                "PRESENTATION_RENDER_DIR": str(render_directory),
                "PRESENTATION_LOGO": str(logo),
                "PRESENTATION_PATTERN": str(pattern_png),
            }
        )
        result = subprocess.run(
            [str(node), str(builder)],
            cwd=build_directory,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
            timeout=900,
        )
        expected_renders = len(PRESENTATION_LAYOUTS) + 1
        rendered_files = tuple(render_directory.glob("slide-*.png"))
        has_complete_node_output = (
            target.is_file()
            and target.stat().st_size > 10_000
            and zipfile.is_zipfile(target)
            and len(rendered_files) == expected_renders
            and all(render.is_file() and render.stat().st_size > 1_000 for render in rendered_files)
        )
        if result.returncode != 0 and not has_complete_node_output:
            details = (result.stderr or result.stdout).strip()
            raise RuntimeError(f"Artifact-tool presentation build failed. {details}")
        if result.returncode != 0:
            (build_directory / "runtime-teardown-warning.txt").write_text(
                "Artifact-tool returned a nonzero status after saving the deck and all render files. "
                "The wrapper continued only after verifying the complete expected node output.\n",
                encoding="utf-8",
            )
        inspection = target.with_suffix(target.suffix + ".inspect.ndjson")
        inspection.unlink(missing_ok=True)
        if not target.is_file() or target.stat().st_size <= 10_000 or not zipfile.is_zipfile(target):
            raise RuntimeError("Artifact-tool did not create a usable presentation template.")
        _patch_presentation_xml(target, len(PRESENTATION_LAYOUTS) + 1)
        review, contact_sheet = _create_review_artifacts(target, render_directory)
        if not review.is_file() or not contact_sheet.is_file():
            raise RuntimeError("Presentation review artifacts were not generated.")
        return target
    finally:
        # Retain renderer evidence only in the repository-private build cache.
        pass
