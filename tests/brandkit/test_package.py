from __future__ import annotations

import hashlib
import json
from pathlib import Path
import zipfile

import fitz
from PIL import Image
import pytest

from brandkit.package import (
    CHECKSUMS_RELATIVE_PATH,
    MANIFEST_RELATIVE_PATH,
    PackageValidationError,
    build_manifest,
    create_zip,
    verify_archive,
    verify_package,
    write_build_report,
)


_CONTRACT = (
    "assets/clean.svg",
    "assets/tile.png",
    "assets/review.pdf",
    "assets/template.docx",
    "assets/template.pptx",
    "assets/message.html",
    "assets/data.json",
    "assets/data.csv",
    "assets/notes.txt",
)


def _write_office_container(path: Path, document_part: str) -> None:
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("_rels/.rels", "<Relationships/>")
        archive.writestr(document_part, "<document/>")


def _write_fixture(root: Path) -> None:
    assets = root / "assets"
    assets.mkdir(parents=True)
    (assets / "clean.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect width="20" height="10" fill="#09131D"/></svg>',
        encoding="utf-8",
    )
    Image.new("RGBA", (20, 10), "#31C6CF").save(assets / "tile.png")
    document = fitz.open()
    document.new_page(width=72, height=72)
    document.save(assets / "review.pdf")
    document.close()
    _write_office_container(assets / "template.docx", "word/document.xml")
    _write_office_container(assets / "template.pptx", "ppt/presentation.xml")
    (assets / "message.html").write_text("<table><tr><td>Current</td></tr></table>", encoding="utf-8")
    (assets / "data.json").write_text(json.dumps({"name": "New Wave IT"}), encoding="utf-8")
    (assets / "data.csv").write_text("name,value\ncurrent,1\n", encoding="utf-8")
    (assets / "notes.txt").write_text("Technology that keeps business moving.\n", encoding="utf-8")


def _verify(root: Path) -> dict[str, object]:
    return verify_package(root, required_files=_CONTRACT, directories=("assets",))


def test_package_manifest_validation_report_and_zip_are_deterministic(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)

    verification = _verify(root)
    assert verification["file_count"] == len(_CONTRACT)
    assert verification["format_counts"] == {
        "csv": 1,
        "docx": 1,
        "html": 1,
        "json": 1,
        "pdf": 1,
        "png": 1,
        "pptx": 1,
        "svg": 1,
        "txt": 1,
    }

    manifest = build_manifest(root, required_files=_CONTRACT)
    manifest_path = root / "00-read-me/package-manifest.json"
    sums_path = root / "00-read-me/SHA256SUMS.txt"
    assert manifest_path.is_file()
    assert sums_path.is_file()
    assert [entry["relative_path"] for entry in manifest["files"]] == sorted(_CONTRACT)
    assert manifest["files"][0]["sha256"] == hashlib.sha256((root / _CONTRACT[0]).read_bytes()).hexdigest()

    first_zip = create_zip(root, root.parent / "first.zip", required_files=_CONTRACT)
    second_zip = create_zip(root, root.parent / "second.zip", required_files=_CONTRACT)
    assert first_zip.read_bytes() == second_zip.read_bytes()
    with zipfile.ZipFile(first_zip) as archive:
        assert archive.namelist() == sorted(_CONTRACT)
        assert {entry.date_time for entry in archive.infolist()} == {(1980, 1, 1, 0, 0, 0)}
    assert verify_archive(first_zip, required_files=_CONTRACT)["file_count"] == len(_CONTRACT)

    report = write_build_report(root, verification, archive_path=first_zip, required_files=_CONTRACT)
    report_path = root / "build-report.json"
    assert report_path.is_file()
    assert report["archive"]["sha256"] == hashlib.sha256(first_zip.read_bytes()).hexdigest()
    assert report["validation"]["passed"] is True


def test_package_rejects_unsafe_svg_content(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)
    (root / "assets/clean.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><script>alert(1)</script></svg>',
        encoding="utf-8",
    )

    with pytest.raises(PackageValidationError, match="script"):
        _verify(root)


def test_package_allows_the_quick_guide_to_document_prohibited_lorem_ipsum(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    guide = root / "01-brand-guide/new-wave-it-quick-usage-guide.md"
    guide.parent.mkdir(parents=True)
    guide.write_text("Unsupported guarantees, fabricated metrics, or lorem ipsum.\n", encoding="utf-8")

    verification = verify_package(
        root,
        required_files=("01-brand-guide/new-wave-it-quick-usage-guide.md",),
        directories=("01-brand-guide",),
    )

    assert verification["validation"]["passed"] is True


def test_package_accepts_crop_mark_media_with_correct_trim_and_bleed(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    assets = root / "assets"
    assets.mkdir(parents=True)
    card = assets / "business-card-horizontal.pdf"
    document = fitz.open()
    page = document.new_page(width=4 * 72, height=2.5 * 72)
    page.set_trimbox(fitz.Rect(0.25 * 72, 0.25 * 72, 3.75 * 72, 2.25 * 72))
    page.set_bleedbox(fitz.Rect(0.125 * 72, 0.125 * 72, 3.875 * 72, 2.375 * 72))
    document.save(card)
    document.close()

    verification = verify_package(
        root,
        required_files=("assets/business-card-horizontal.pdf",),
        directories=("assets",),
    )

    assert verification["validation"]["passed"] is True


def test_archive_rejects_member_tampering_against_its_embedded_manifest(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)
    contract = _CONTRACT + (MANIFEST_RELATIVE_PATH, CHECKSUMS_RELATIVE_PATH)
    build_manifest(root, required_files=contract)
    archive = create_zip(root, root.parent / "original.zip", required_files=contract)
    tampered = root.parent / "tampered.zip"

    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(tampered, "w", compression=zipfile.ZIP_DEFLATED) as target:
        for entry in source.infolist():
            payload = b"tampered" if entry.filename == "assets/notes.txt" else source.read(entry.filename)
            info = zipfile.ZipInfo(entry.filename, date_time=entry.date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(info, payload)

    with pytest.raises(PackageValidationError, match="checksum|manifest"):
        verify_archive(tampered, required_files=contract)


def test_package_rejects_payload_tampering_against_its_manifest(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)
    contract = _CONTRACT + (MANIFEST_RELATIVE_PATH, CHECKSUMS_RELATIVE_PATH)
    build_manifest(root, required_files=contract)
    (root / "assets/notes.txt").write_text("tampered", encoding="utf-8")

    with pytest.raises(PackageValidationError, match="checksum|manifest"):
        verify_package(root, required_files=contract, directories=("assets", "00-read-me"))


def test_archive_rejects_stale_embedded_payload_provenance(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)
    verification = _verify(root)
    contract = _CONTRACT + (MANIFEST_RELATIVE_PATH, CHECKSUMS_RELATIVE_PATH, "build-report.json")
    build_manifest(root, required_files=contract)
    write_build_report(root, verification, required_files=contract)
    report_path = root / "build-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["archive"]["payload_sha256"] = "0" * 64
    report_path.write_text(json.dumps(report), encoding="utf-8")
    archive = create_zip(root, root.parent / "stale-provenance.zip", required_files=contract)

    with pytest.raises(PackageValidationError, match="payload provenance"):
        verify_archive(archive, required_files=contract)


def test_package_checks_the_final_zip_against_the_root_receipt(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)
    verification = _verify(root)
    archive = create_zip(root, root.parent / "new-wave-it-brand-package.zip", required_files=_CONTRACT)
    contract = _CONTRACT + ("build-report.json",)
    write_build_report(root, verification, archive_path=archive, required_files=contract)

    assert verify_package(
        root,
        required_files=contract,
        directories=("assets",),
        archive_path=archive,
    )["validation"]["passed"] is True

    tampered = root.parent / "tampered.zip"
    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(tampered, "w", compression=zipfile.ZIP_DEFLATED) as target:
        for entry in source.infolist():
            payload = b"tampered" if entry.filename == "assets/notes.txt" else source.read(entry.filename)
            info = zipfile.ZipInfo(entry.filename, date_time=entry.date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            target.writestr(info, payload)

    with pytest.raises(PackageValidationError, match="root build report"):
        verify_package(root, required_files=contract, directories=("assets",), archive_path=tampered)


def test_package_rejects_external_svg_style_references(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    assets = root / "assets"
    assets.mkdir(parents=True)
    (assets / "clean.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><style>@import url(https://example.invalid/style.css)</style></svg>',
        encoding="utf-8",
    )

    with pytest.raises(PackageValidationError, match="external"):
        verify_package(root, required_files=("assets/clean.svg",), directories=("assets",))


def test_package_rejects_wrong_social_profile_dimensions(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    profile = root / "07-social/profile"
    profile.mkdir(parents=True)
    Image.new("RGBA", (1, 1), "#31C6CF").save(profile / "facebook-profile.png")

    with pytest.raises(PackageValidationError, match="dimensions"):
        verify_package(
            root,
            required_files=("07-social/profile/facebook-profile.png",),
            directories=("07-social/profile",),
        )


def test_package_accepts_the_canonical_linkedin_square_template_dimensions(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    template = root / "07-social/templates/brand-announcement"
    template.mkdir(parents=True)
    Image.new("RGBA", (1200, 1200), "#31C6CF").save(
        template / "new-wave-it-brand-announcement-linkedin-square.png"
    )

    verification = verify_package(
        root,
        required_files=(
            "07-social/templates/brand-announcement/new-wave-it-brand-announcement-linkedin-square.png",
        ),
        directories=("07-social/templates/brand-announcement",),
    )

    assert verification["validation"]["passed"] is True


def test_package_rejects_an_unlisted_customer_file(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)
    (root / "unlisted.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><script>alert(1)</script></svg>',
        encoding="utf-8",
    )

    with pytest.raises(PackageValidationError, match="unexpected"):
        _verify(root)


def test_package_rejects_incomplete_generated_token_schema(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    token_root = root / "04-tokens-typography"
    token_root.mkdir(parents=True)
    (token_root / "new-wave-it-tokens.json").write_text(
        json.dumps({"unexpected": True}),
        encoding="utf-8",
    )

    with pytest.raises(PackageValidationError, match="token"):
        verify_package(
            root,
            required_files=("04-tokens-typography/new-wave-it-tokens.json",),
            directories=("04-tokens-typography",),
        )


def test_build_report_captures_git_state_and_payload_provenance(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    _write_fixture(root)
    verification = _verify(root)

    report = write_build_report(root, verification, required_files=_CONTRACT)

    assert report["git"]["status"] in {"clean", "dirty", "unavailable"}
    assert "commit" in report["git"]
    assert report["archive"]["payload_sha256"]
    assert report["archive"]["payload_file_count"] == len(_CONTRACT)


def test_package_rejects_incomplete_build_report_schema(tmp_path: Path) -> None:
    root = tmp_path / "new-wave-it-brand-package"
    root.mkdir()
    (root / "build-report.json").write_text(json.dumps({"unexpected": True}), encoding="utf-8")

    with pytest.raises(PackageValidationError, match="build report"):
        verify_package(root, required_files=("build-report.json",), directories=())
