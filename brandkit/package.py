"""Validation, manifests, reports, and deterministic archives for the brand package."""

from __future__ import annotations

import csv
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile
from xml.etree import ElementTree

import fitz
from PIL import Image, UnidentifiedImageError

from brandkit.color import contrast_ratio
from brandkit.spec import BRAND, COLORS, PACKAGE_PATHS, SOCIAL_SPECS, TYPOGRAPHY


PACKAGE_VERSION = "1.0.0"
MANIFEST_RELATIVE_PATH = "00-read-me/package-manifest.json"
CHECKSUMS_RELATIVE_PATH = "00-read-me/SHA256SUMS.txt"
BUILD_REPORT_RELATIVE_PATH = "build-report.json"
_GENERATED_METADATA = frozenset(
    {MANIFEST_RELATIVE_PATH, CHECKSUMS_RELATIVE_PATH, BUILD_REPORT_RELATIVE_PATH}
)
_FONT_SUFFIXES = frozenset({".ttf", ".otf", ".woff", ".woff2"})
_TEXT_SUFFIXES = frozenset({".css", ".csv", ".html", ".json", ".md", ".svg", ".ts", ".txt"})
_ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)
_CSS_URL = re.compile(r"url\(\s*['\"]?([^'\")\s]+)", re.IGNORECASE)
_ASSET_INDEX_COLUMNS = (
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
_SOCIAL_PROFILE_DIMENSIONS = {
    "07-social/profile/linkedin-profile.png": (
        SOCIAL_SPECS["linkedin_page_logo"]["width"],
        SOCIAL_SPECS["linkedin_page_logo"]["height"],
    ),
    "07-social/profile/facebook-profile.png": (
        SOCIAL_SPECS["facebook_page_profile"]["width"],
        SOCIAL_SPECS["facebook_page_profile"]["height"],
    ),
    "07-social/profile/instagram-profile.png": (
        SOCIAL_SPECS["profile_master"]["width"],
        SOCIAL_SPECS["profile_master"]["height"],
    ),
    "07-social/profile/x-profile.png": (
        SOCIAL_SPECS["x_profile"]["width"],
        SOCIAL_SPECS["x_profile"]["height"],
    ),
    "07-social/profile/youtube-profile.png": (
        SOCIAL_SPECS["youtube_profile"]["width"],
        SOCIAL_SPECS["youtube_profile"]["height"],
    ),
    "07-social/profile/universal-profile.png": (
        SOCIAL_SPECS["profile_master"]["width"],
        SOCIAL_SPECS["profile_master"]["height"],
    ),
}
_SOCIAL_TEMPLATE_DIMENSIONS = {
    "instagram-portrait": (
        SOCIAL_SPECS["instagram_portrait"]["width"],
        SOCIAL_SPECS["instagram_portrait"]["height"],
    ),
    "square": (
        SOCIAL_SPECS["instagram_square"]["width"],
        SOCIAL_SPECS["instagram_square"]["height"],
    ),
    "story-reel": (
        SOCIAL_SPECS["story"]["width"],
        SOCIAL_SPECS["story"]["height"],
    ),
    "linkedin-square": (
        SOCIAL_SPECS["linkedin_square"]["width"],
        SOCIAL_SPECS["linkedin_square"]["height"],
    ),
    "linkedin-landscape": (
        SOCIAL_SPECS["linkedin_landscape"]["width"],
        SOCIAL_SPECS["linkedin_landscape"]["height"],
    ),
}
_PROHIBITED_TEXT = (
    ("#39cccc", "legacy color #39CCCC"),
    ("#5ebc67", "legacy color #5EBC67"),
    ("#152232", "legacy color #152232"),
    ("#0f1923", "legacy color #0f1923"),
    ("squarespace-cdn", "external Squarespace asset"),
    ("lorem ipsum", "placeholder copy"),
    ("100% secure", "unsupported guarantee"),
    ("zero downtime", "unsupported guarantee"),
    ("never get hacked", "unsupported guarantee"),
)


class PackageValidationError(ValueError):
    """Raised when a proposed customer package violates the delivery contract."""


def _normalise_relative_path(value: str) -> str:
    relative = value.replace("\\", "/")
    candidate = Path(relative)
    if candidate.is_absolute() or ".." in candidate.parts or relative.startswith("/"):
        raise PackageValidationError(f"package path must be relative: {value}")
    return candidate.as_posix()


def _contract(required_files: tuple[str, ...] | list[str] | None) -> tuple[str, ...]:
    source = PACKAGE_PATHS["required_files"] if required_files is None else required_files
    return tuple(sorted(dict.fromkeys(_normalise_relative_path(path) for path in source)))


def _payload_contract(required_files: tuple[str, ...] | list[str] | None) -> tuple[str, ...]:
    return tuple(path for path in _contract(required_files) if path not in _GENERATED_METADATA)


def _package_path(root: Path, relative: str) -> Path:
    path = root / Path(relative)
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError as error:
        raise PackageValidationError(f"package path escapes root: {relative}") from error
    return path


def _require_paths(root: Path, relative_paths: tuple[str, ...]) -> tuple[Path, ...]:
    missing = [relative for relative in relative_paths if not _package_path(root, relative).is_file()]
    if missing:
        raise PackageValidationError(f"missing required package files: {missing}")
    empty = [relative for relative in relative_paths if _package_path(root, relative).stat().st_size == 0]
    if empty:
        raise PackageValidationError(f"empty package files: {empty}")
    return tuple(_package_path(root, relative) for relative in relative_paths)


def _local_name(value: str) -> str:
    return value.rsplit("}", 1)[-1]


def _is_external_reference(value: str) -> bool:
    lowered = value.strip().casefold()
    return lowered.startswith(("http://", "https://", "//", "file:", "javascript:", "data:"))


def _contains_external_url(value: str) -> bool:
    if _is_external_reference(value):
        return True
    return any(_is_external_reference(match.group(1)) for match in _CSS_URL.finditer(value))


def _validate_svg(path: Path) -> None:
    try:
        root = ElementTree.fromstring(path.read_bytes())
    except (ElementTree.ParseError, OSError) as error:
        raise PackageValidationError(f"invalid SVG: {path.name}") from error
    if _local_name(root.tag).casefold() != "svg":
        raise PackageValidationError(f"SVG root is not svg: {path.name}")
    view_box = root.attrib.get("viewBox")
    if view_box is None:
        raise PackageValidationError(f"SVG is missing a viewBox: {path.name}")
    try:
        values = [float(value) for value in view_box.replace(",", " ").split()]
    except ValueError as error:
        raise PackageValidationError(f"SVG has an invalid viewBox: {path.name}") from error
    if len(values) != 4 or values[2] <= 0 or values[3] <= 0:
        raise PackageValidationError(f"SVG has an invalid viewBox: {path.name}")
    for element in root.iter():
        element_name = _local_name(element.tag).casefold()
        if element_name == "script":
            raise PackageValidationError(f"SVG contains script content: {path.name}")
        if element_name == "style" and "@import" in (element.text or "").casefold():
            raise PackageValidationError(f"SVG contains an external reference: {path.name}")
        for attribute, value in element.attrib.items():
            if _contains_external_url(value):
                raise PackageValidationError(f"SVG contains an external reference: {path.name}")
        if element.text and _contains_external_url(element.text):
            raise PackageValidationError(f"SVG contains an external reference: {path.name}")


def _expected_png_size(path: Path, relative: str) -> tuple[int, int] | None:
    if relative in _SOCIAL_PROFILE_DIMENSIONS:
        return _SOCIAL_PROFILE_DIMENSIONS[relative]
    if relative.startswith("07-social/templates/"):
        for format_name in sorted(_SOCIAL_TEMPLATE_DIMENSIONS, key=len, reverse=True):
            if path.stem.endswith(f"-{format_name}"):
                return _SOCIAL_TEMPLATE_DIMENSIONS[format_name]
    match = re.search(r"-(\d+)x(\d+)$", path.stem)
    if match:
        return int(match.group(1)), int(match.group(2))
    match = re.search(r"-(\d+)$", path.stem)
    return (int(match.group(1)), 0) if match else None


def _validate_png(path: Path, relative: str) -> None:
    try:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            if image.format != "PNG" or image.width <= 0 or image.height <= 0:
                raise PackageValidationError(f"invalid PNG: {path.name}")
            expected = _expected_png_size(path, relative)
            if expected and (image.width != expected[0] or (expected[1] and image.height != expected[1])):
                raise PackageValidationError(f"PNG dimensions do not match filename: {path.name}")
            if relative.startswith("02-logos/png/") and image.mode not in {"RGBA", "LA"}:
                raise PackageValidationError(f"digital logo PNG must preserve alpha: {path.name}")
    except (UnidentifiedImageError, OSError) as error:
        raise PackageValidationError(f"invalid PNG: {path.name}") from error


def _validate_pdf(path: Path) -> None:
    try:
        document = fitz.open(path)
    except (fitz.FileDataError, OSError) as error:
        raise PackageValidationError(f"invalid PDF: {path.name}") from error
    try:
        if document.page_count <= 0:
            raise PackageValidationError(f"PDF has no pages: {path.name}")
        if "business-card-horizontal" in path.name:
            page = document[0]
            if (
                abs(page.trimbox.width / 72 - 3.5) > 0.02
                or abs(page.trimbox.height / 72 - 2.0) > 0.02
                or abs(page.bleedbox.width / 72 - 3.75) > 0.02
                or abs(page.bleedbox.height / 72 - 2.25) > 0.02
                or page.rect.width <= page.bleedbox.width
                or page.rect.height <= page.bleedbox.height
            ):
                raise PackageValidationError(f"horizontal business-card bleed is invalid: {path.name}")
        if "business-card-vertical" in path.name:
            page = document[0]
            if (
                abs(page.trimbox.width / 72 - 2.0) > 0.02
                or abs(page.trimbox.height / 72 - 3.5) > 0.02
                or abs(page.bleedbox.width / 72 - 2.25) > 0.02
                or abs(page.bleedbox.height / 72 - 3.75) > 0.02
                or page.rect.width <= page.bleedbox.width
                or page.rect.height <= page.bleedbox.height
            ):
                raise PackageValidationError(f"vertical business-card bleed is invalid: {path.name}")
    finally:
        document.close()


def _validate_office_container(path: Path, required_part: str) -> None:
    if not zipfile.is_zipfile(path):
        raise PackageValidationError(f"invalid Office container: {path.name}")
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
    required = {"[Content_Types].xml", "_rels/.rels", required_part}
    if not required <= names:
        raise PackageValidationError(f"Office container is missing core parts: {path.name}")


def _validate_html(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    lowered = text.casefold()
    if "<script" in lowered:
        raise PackageValidationError(f"HTML contains script content: {path.name}")
    if any(token in lowered for token in ("googletagmanager", "google-analytics", "doubleclick", "facebook.com/tr")):
        raise PackageValidationError(f"HTML contains an external tracker: {path.name}")


def _validate_token_payload(payload: object) -> None:
    expected_typography = {
        "display": TYPOGRAPHY["display"]["family"],
        "body": TYPOGRAPHY["body"]["family"],
        "technical": TYPOGRAPHY["technical"]["family"],
    }
    if not isinstance(payload, dict) or set(payload) != {"color", "spacing_px", "typography"}:
        raise PackageValidationError("token JSON schema is invalid")
    if payload["color"] != dict(COLORS):
        raise PackageValidationError("token color schema is invalid")
    if payload["spacing_px"] != [8, 16, 24, 32, 48]:
        raise PackageValidationError("token spacing schema is invalid")
    if payload["typography"] != expected_typography:
        raise PackageValidationError("token typography schema is invalid")


def _validate_build_report_payload(payload: object) -> None:
    required = {
        "archive",
        "brand",
        "build_timestamp",
        "contrast",
        "file_counts_by_format",
        "git",
        "git_commit",
        "package_version",
        "python_version",
        "safe_areas",
        "total_files",
        "validation",
    }
    if not isinstance(payload, dict) or set(payload) != required:
        raise PackageValidationError("build report schema is invalid")
    if payload["brand"] != BRAND["name"] or payload["package_version"] != PACKAGE_VERSION:
        raise PackageValidationError("build report brand metadata is invalid")
    if not isinstance(payload["build_timestamp"], str):
        raise PackageValidationError("build report timestamp is invalid")
    try:
        datetime.fromisoformat(payload["build_timestamp"].replace("Z", "+00:00"))
    except ValueError as error:
        raise PackageValidationError("build report timestamp is invalid") from error
    git = payload["git"]
    if not isinstance(git, dict) or set(git) != {"commit", "dirty", "status"}:
        raise PackageValidationError("build report git state is invalid")
    if git["status"] not in {"clean", "dirty", "unavailable"} or not isinstance(git["commit"], str):
        raise PackageValidationError("build report git state is invalid")
    if git["status"] == "unavailable":
        if git["commit"] != "unknown" or git["dirty"] is not None:
            raise PackageValidationError("build report git state is invalid")
    elif not isinstance(git["dirty"], bool) or not re.fullmatch(r"[0-9a-f]{40}", git["commit"]):
        raise PackageValidationError("build report git state is invalid")
    if payload["git_commit"] != git["commit"]:
        raise PackageValidationError("build report git commit is inconsistent")
    archive = payload["archive"]
    if not isinstance(archive, dict) or not {"filename", "payload_sha256", "payload_file_count"} <= set(archive):
        raise PackageValidationError("build report archive provenance is invalid")
    if set(archive) - {"filename", "payload_sha256", "payload_file_count", "sha256", "size_bytes"}:
        raise PackageValidationError("build report archive provenance is invalid")
    if (
        archive["filename"] != PACKAGE_PATHS["archive_filename"]
        or not isinstance(archive["payload_file_count"], int)
        or archive["payload_file_count"] < 0
        or not isinstance(archive["payload_sha256"], str)
        or not re.fullmatch(r"[0-9a-f]{64}", archive["payload_sha256"])
    ):
        raise PackageValidationError("build report archive provenance is invalid")
    has_outer_hash = "sha256" in archive or "size_bytes" in archive
    if has_outer_hash and (
        not isinstance(archive.get("sha256"), str)
        or not re.fullmatch(r"[0-9a-f]{64}", archive["sha256"])
        or not isinstance(archive.get("size_bytes"), int)
        or archive["size_bytes"] <= 0
    ):
        raise PackageValidationError("build report archive hash is invalid")
    if not isinstance(payload["total_files"], int) or payload["total_files"] <= 0:
        raise PackageValidationError("build report file count is invalid")
    if not isinstance(payload["file_counts_by_format"], dict) or not payload["file_counts_by_format"]:
        raise PackageValidationError("build report format counts are invalid")
    if payload["validation"] != {"passed": True}:
        raise PackageValidationError("build report validation status is invalid")


def _validate_json(path: Path, relative: str) -> None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        raise PackageValidationError(f"invalid JSON: {path.name}") from error
    if not isinstance(payload, (dict, list)) or not payload:
        raise PackageValidationError(f"JSON must contain a structured value: {path.name}")
    if relative == "04-tokens-typography/new-wave-it-tokens.json":
        _validate_token_payload(payload)
    if relative == BUILD_REPORT_RELATIVE_PATH:
        _validate_build_report_payload(payload)


def _validate_csv(path: Path, relative: str) -> None:
    with path.open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames or any(not field for field in reader.fieldnames):
            raise PackageValidationError(f"CSV is missing column headings: {path.name}")
        if relative == "00-read-me/new-wave-it-asset-index.csv" and tuple(reader.fieldnames) != _ASSET_INDEX_COLUMNS:
            raise PackageValidationError(f"asset index schema is invalid: {path.name}")
        list(reader)


def _validate_file(path: Path, relative: str) -> None:
    suffix = path.suffix.casefold()
    if suffix == ".svg":
        _validate_svg(path)
    elif suffix == ".png":
        _validate_png(path, relative)
    elif suffix == ".pdf":
        _validate_pdf(path)
    elif suffix == ".docx":
        _validate_office_container(path, "word/document.xml")
    elif suffix == ".pptx":
        _validate_office_container(path, "ppt/presentation.xml")
    elif suffix == ".html":
        _validate_html(path)
    elif suffix == ".json":
        _validate_json(path, relative)
    elif suffix == ".csv":
        _validate_csv(path, relative)
    elif suffix in {".txt", ".md"} and not path.read_text(encoding="utf-8").strip():
        raise PackageValidationError(f"text deliverable is empty: {path.name}")


def _scan_delivery_root(
    root: Path,
    required_files: tuple[str, ...],
    *,
    allowed_files: frozenset[str] = frozenset(),
) -> None:
    allowed = set(required_files) | set(allowed_files)
    for path in root.rglob("*"):
        relative = path.relative_to(root)
        if ".brand-build" in relative.parts:
            raise PackageValidationError("customer package contains internal build data")
        if path.is_file() and path.suffix.casefold() in _FONT_SUFFIXES:
            raise PackageValidationError(f"customer package contains font file: {relative.as_posix()}")
        if path.is_file() and path.name.endswith(".inspect.ndjson"):
            raise PackageValidationError(f"customer package contains inspection sidecar: {relative.as_posix()}")
        if path.is_file() and "-debug" in path.stem:
            raise PackageValidationError(f"customer package contains debug artifact: {relative.as_posix()}")
        if path.name == ".DS_Store" or path.name.startswith("~$") or path.suffix.casefold() == ".tmp":
            raise PackageValidationError(f"customer package contains temporary file: {relative.as_posix()}")
        if path.is_file() and relative.as_posix() not in allowed:
            raise PackageValidationError(f"customer package contains unexpected file: {relative.as_posix()}")

    for relative in required_files:
        path = _package_path(root, relative)
        if path.suffix.casefold() not in _TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding="utf-8").casefold()
        for token, description in _PROHIBITED_TEXT:
            if relative == "01-brand-guide/new-wave-it-quick-usage-guide.md" and token == "lorem ipsum":
                continue
            if token in text:
                raise PackageValidationError(f"{description} found in {relative}")
        if re.search(r"\b(?:tbd|todo)\b", text):
            raise PackageValidationError(f"placeholder content found in {relative}")


def _contrast_results() -> dict[str, object]:
    pairs = {
        "current_navy_on_cloud_white": contrast_ratio(COLORS["current_navy"], COLORS["cloud_white"]),
        "pure_white_on_current_navy": contrast_ratio(COLORS["pure_white"], COLORS["current_navy"]),
        "slate_on_cloud_white": contrast_ratio(COLORS["slate"], COLORS["cloud_white"]),
    }
    return {"pairs": {name: round(value, 2) for name, value in pairs.items()}, "passed": all(value >= 4.5 for value in pairs.values())}


def _safe_area_results(root: Path) -> dict[str, object]:
    metadata_paths = sorted((root / "06-web-digital").glob("*.json"))
    checked = 0
    for path in metadata_paths:
        payload = json.loads(path.read_text(encoding="utf-8"))
        canvas = payload.get("canvas", ())
        boxes = payload.get("text_boxes", ())
        if len(canvas) != 2 or not boxes:
            raise PackageValidationError(f"safe-area metadata is incomplete: {path.name}")
        width, height = canvas
        for x, y, box_width, box_height in boxes:
            if x < 0 or y < 0 or x + box_width > width or y + box_height > height:
                raise PackageValidationError(f"safe-area box exceeds canvas: {path.name}")
        checked += 1
    return {"metadata_files_checked": checked, "passed": True}


def verify_package(
    package_root: Path,
    *,
    required_files: tuple[str, ...] | list[str] | None = None,
    directories: tuple[str, ...] | list[str] | None = None,
    allow_generated_metadata: bool = False,
    archive_path: Path | None = None,
) -> dict[str, object]:
    """Validate the release root, files, formats, safety scan, contrast, and safe areas."""
    root = package_root.resolve()
    if not root.is_dir():
        raise PackageValidationError(f"package root is missing: {root}")
    expected_directories = PACKAGE_PATHS["directories"] if directories is None else directories
    missing_directories = [relative for relative in expected_directories if not _package_path(root, _normalise_relative_path(relative)).is_dir()]
    if missing_directories:
        raise PackageValidationError(f"missing package directories: {missing_directories}")
    contract = _contract(required_files)
    paths = _require_paths(root, contract)
    _scan_delivery_root(
        root,
        contract,
        allowed_files=_GENERATED_METADATA if allow_generated_metadata else frozenset(),
    )
    for path, relative in zip(paths, contract, strict=True):
        _validate_file(path, relative)
    _validate_manifest_integrity(root, contract)
    if archive_path is not None:
        _validate_root_archive_receipt(root, contract, archive_path)
    format_counts = Counter(path.suffix.removeprefix(".").casefold() or "none" for path in paths)
    contrast = _contrast_results()
    safe_areas = _safe_area_results(root)
    if not contrast["passed"] or not safe_areas["passed"]:
        raise PackageValidationError("package contrast or safe-area validation failed")
    return {
        "file_count": len(paths),
        "format_counts": dict(sorted(format_counts.items())),
        "validation": {"passed": True},
        "contrast": contrast,
        "safe_areas": safe_areas,
    }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _validate_manifest_integrity(root: Path, contract: tuple[str, ...]) -> None:
    """Check a package manifest and checksum list against the actual payload bytes."""
    has_manifest = MANIFEST_RELATIVE_PATH in contract
    has_checksums = CHECKSUMS_RELATIVE_PATH in contract
    if not has_manifest and not has_checksums:
        return
    if not has_manifest or not has_checksums:
        raise PackageValidationError("archive integrity metadata is incomplete")

    try:
        manifest = json.loads(_package_path(root, MANIFEST_RELATIVE_PATH).read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as error:
        raise PackageValidationError("archive manifest is invalid") from error
    expected_payload = _payload_contract(contract)
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1:
        raise PackageValidationError("archive manifest schema is invalid")
    entries = manifest.get("files")
    if not isinstance(entries, list) or len(entries) != len(expected_payload):
        raise PackageValidationError("archive manifest file list is invalid")

    records: list[tuple[str, str, int]] = []
    for entry, relative in zip(entries, expected_payload, strict=True):
        if not isinstance(entry, dict) or set(entry) != {"relative_path", "sha256", "size_bytes"}:
            raise PackageValidationError("archive manifest entry schema is invalid")
        if entry["relative_path"] != relative:
            raise PackageValidationError("archive manifest paths do not match the payload contract")
        digest = entry["sha256"]
        size = entry["size_bytes"]
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise PackageValidationError("archive manifest checksum is invalid")
        if not isinstance(size, int) or size < 0:
            raise PackageValidationError("archive manifest file size is invalid")
        path = _package_path(root, relative)
        if _sha256(path) != digest or path.stat().st_size != size:
            raise PackageValidationError(f"archive manifest checksum mismatch: {relative}")
        records.append((relative, digest, size))

    checksum_lines = _package_path(root, CHECKSUMS_RELATIVE_PATH).read_text(encoding="utf-8").splitlines()
    expected_lines = [f"{digest}  {relative}" for relative, digest, _ in records]
    if checksum_lines != expected_lines:
        raise PackageValidationError("archive checksum list does not match the manifest")


def _validate_embedded_payload_provenance(root: Path, contract: tuple[str, ...]) -> None:
    """Ensure the archive's own report records the immutable payload digest, not a stale ZIP hash."""
    if BUILD_REPORT_RELATIVE_PATH not in contract:
        return
    report = json.loads(_package_path(root, BUILD_REPORT_RELATIVE_PATH).read_text(encoding="utf-8"))
    archive = report["archive"]
    expected = _payload_provenance(root, required_files=contract)
    if archive["payload_sha256"] != expected["payload_sha256"] or archive["payload_file_count"] != expected["payload_file_count"]:
        raise PackageValidationError("archive build report payload provenance is stale")
    if "sha256" in archive or "size_bytes" in archive:
        raise PackageValidationError("archive build report must not claim an outer ZIP hash")


def _validate_root_archive_receipt(root: Path, contract: tuple[str, ...], archive_path: Path) -> None:
    """Verify the post-build root receipt against the exact downloadable archive bytes."""
    if BUILD_REPORT_RELATIVE_PATH not in contract:
        return
    archive_path = archive_path.resolve()
    if not archive_path.is_file():
        raise PackageValidationError(f"root build report archive is missing: {archive_path}")
    report = json.loads(_package_path(root, BUILD_REPORT_RELATIVE_PATH).read_text(encoding="utf-8"))
    archive = report["archive"]
    if "sha256" not in archive or "size_bytes" not in archive:
        raise PackageValidationError("root build report does not include the final ZIP hash")
    if (
        archive["filename"] != archive_path.name
        or archive["sha256"] != _sha256(archive_path)
        or archive["size_bytes"] != archive_path.stat().st_size
    ):
        raise PackageValidationError("root build report does not match the final ZIP")


def build_manifest(
    package_root: Path, *, required_files: tuple[str, ...] | list[str] | None = None
) -> dict[str, object]:
    """Write a deterministic content manifest and SHA-256 list for payload artifacts."""
    root = package_root.resolve()
    payload = _payload_contract(required_files)
    _require_paths(root, payload)
    _scan_delivery_root(root, payload, allowed_files=_GENERATED_METADATA)
    files = [
        {
            "relative_path": relative,
            "sha256": _sha256(_package_path(root, relative)),
            "size_bytes": _package_path(root, relative).stat().st_size,
        }
        for relative in payload
    ]
    manifest: dict[str, object] = {
        "schema_version": 1,
        "package_name": "New Wave IT Brand Package",
        "package_version": PACKAGE_VERSION,
        "files": files,
    }
    _write_json(root / MANIFEST_RELATIVE_PATH, manifest)
    checksum_lines = [f"{entry['sha256']}  {entry['relative_path']}" for entry in files]
    (root / CHECKSUMS_RELATIVE_PATH).write_text("\n".join(checksum_lines) + "\n", encoding="utf-8")
    return manifest


def _git_state() -> dict[str, object]:
    repository = Path(__file__).resolve().parents[1]
    try:
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repository,
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
        status = subprocess.run(
            ["git", "status", "--porcelain=v1", "--untracked-files=normal"],
            cwd=repository,
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except OSError:
        return {"commit": "unknown", "dirty": None, "status": "unavailable"}
    if commit.returncode != 0 or not commit.stdout.strip() or status.returncode != 0:
        return {"commit": "unknown", "dirty": None, "status": "unavailable"}
    dirty = bool(status.stdout.strip())
    return {"commit": commit.stdout.strip(), "dirty": dirty, "status": "dirty" if dirty else "clean"}


def _build_timestamp() -> str:
    value = os.environ.get("SOURCE_DATE_EPOCH")
    if value is not None:
        return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat().replace("+00:00", "Z")
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _payload_provenance(
    package_root: Path, *, required_files: tuple[str, ...] | list[str] | None = None
) -> dict[str, object]:
    root = package_root.resolve()
    payload = _payload_contract(required_files)
    _require_paths(root, payload)
    digest = hashlib.sha256()
    for relative in payload:
        path = _package_path(root, relative)
        file_digest = _sha256(path)
        digest.update(relative.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_digest.encode("ascii"))
        digest.update(b"\0")
        digest.update(str(path.stat().st_size).encode("ascii"))
        digest.update(b"\n")
    return {
        "filename": PACKAGE_PATHS["archive_filename"],
        "payload_sha256": digest.hexdigest(),
        "payload_file_count": len(payload),
    }


def _project_full_verification(payload_verification: dict[str, object], contract: tuple[str, ...]) -> dict[str, object]:
    """Project the final count/format evidence before the report itself exists in the root."""
    format_counts = Counter(Path(relative).suffix.removeprefix(".").casefold() or "none" for relative in contract)
    return {
        **payload_verification,
        "file_count": len(contract),
        "format_counts": dict(sorted(format_counts.items())),
    }


def write_build_report(
    package_root: Path,
    verification: dict[str, object],
    *,
    archive_path: Path | None = None,
    required_files: tuple[str, ...] | list[str] | None = None,
) -> dict[str, object]:
    """Write build provenance, including a self-contained payload digest for ZIP members."""
    archive = _payload_provenance(package_root, required_files=required_files)
    if archive_path is not None:
        archive.update(
            {
                "filename": archive_path.name,
                "sha256": _sha256(archive_path),
                "size_bytes": archive_path.stat().st_size,
            }
        )
    git = _git_state()
    report: dict[str, object] = {
        "build_timestamp": _build_timestamp(),
        "git": git,
        "git_commit": git["commit"],
        "python_version": sys.version.split()[0],
        "package_version": PACKAGE_VERSION,
        "brand": BRAND["name"],
        "total_files": verification["file_count"],
        "file_counts_by_format": verification["format_counts"],
        "validation": verification["validation"],
        "contrast": verification["contrast"],
        "safe_areas": verification["safe_areas"],
        "archive": archive,
    }
    _write_json(package_root.resolve() / BUILD_REPORT_RELATIVE_PATH, report)
    return report


def create_zip(
    package_root: Path,
    archive_path: Path | None = None,
    *,
    required_files: tuple[str, ...] | list[str] | None = None,
) -> Path:
    """Create a sorted, timestamp-normalized customer archive from declared deliverables only."""
    root = package_root.resolve()
    contract = _contract(required_files)
    paths = _require_paths(root, contract)
    _scan_delivery_root(root, contract, allowed_files=_GENERATED_METADATA)
    target = (
        archive_path.resolve()
        if archive_path is not None
        else root.parent / str(PACKAGE_PATHS["archive_filename"])
    )
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, relative in zip(paths, contract, strict=True):
            info = zipfile.ZipInfo(relative, date_time=_ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return target


def verify_archive(
    archive_path: Path, *, required_files: tuple[str, ...] | list[str] | None = None
) -> dict[str, object]:
    """Validate the final ZIP entry contract independently from the release directory."""
    target = archive_path.resolve()
    if not target.is_file() or not zipfile.is_zipfile(target):
        raise PackageValidationError(f"invalid package archive: {target}")
    contract = _contract(required_files)
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise PackageValidationError(f"corrupt archive member: {archive.testzip()}")
        entries = archive.infolist()
        names = [entry.filename for entry in entries]
        if names != list(contract):
            raise PackageValidationError("archive entries do not exactly match the required sorted contract")
        for entry in entries:
            if entry.date_time != _ZIP_TIMESTAMP:
                raise PackageValidationError(f"archive entry has a non-normalized timestamp: {entry.filename}")
            normalised = _normalise_relative_path(entry.filename)
            if normalised != entry.filename or entry.filename.startswith("/"):
                raise PackageValidationError(f"archive entry is not a normalized relative path: {entry.filename}")
            if Path(entry.filename).suffix.casefold() in _FONT_SUFFIXES or ".brand-build" in Path(entry.filename).parts:
                raise PackageValidationError(f"archive contains prohibited delivery data: {entry.filename}")
        with tempfile.TemporaryDirectory(prefix="new-wave-it-archive-") as temporary:
            root = Path(temporary)
            for entry in entries:
                path = _package_path(root, entry.filename)
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(archive.read(entry))
            for relative in contract:
                _validate_file(_package_path(root, relative), relative)
            _validate_manifest_integrity(root, contract)
            _validate_embedded_payload_provenance(root, contract)
    return {"file_count": len(contract), "entries": tuple(contract)}


def package_release(package_root: Path) -> dict[str, object]:
    """Generate metadata, validate the full release root, and archive every required artifact."""
    root = package_root.resolve()
    payload_verification = verify_package(
        root,
        required_files=_payload_contract(None),
        allow_generated_metadata=True,
    )
    manifest = build_manifest(root)
    write_build_report(root, _project_full_verification(payload_verification, _contract(None)))
    full_verification = verify_package(root)
    archive = create_zip(root)
    verify_archive(archive)
    report = write_build_report(root, full_verification, archive_path=archive)
    verify_package(root, archive_path=archive)
    return {"manifest": manifest, "verification": full_verification, "archive": archive, "report": report}
