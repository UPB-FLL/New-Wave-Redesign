from pathlib import Path

import pytest

from brandkit.cli import build, verify


def test_build_creates_package_root(tmp_path: Path) -> None:
    root = build(tmp_path / "new-wave-it-brand-package")
    assert root.exists()
    assert (root / "00-read-me").is_dir()


def test_approved_copy_and_palette_are_exact() -> None:
    from brandkit.spec import BRAND, COLORS

    assert BRAND["name"] == "New Wave IT"
    assert BRAND["promise"] == "Technology that keeps business moving."
    assert BRAND["heritage_line"] == "Don’t get lost in the current"
    assert COLORS["current_navy"] == "#101E2D"
    assert COLORS["signal_cyan"] == "#31C6CF"
    assert COLORS["continuity_green"] == "#62BE68"


def test_platform_dimensions_are_locked() -> None:
    from brandkit.spec import SOCIAL_SPECS

    assert SOCIAL_SPECS["instagram_portrait"] == {
        "width": 1080,
        "height": 1350,
        "safe_square_y": 135,
    }
    assert SOCIAL_SPECS["story"] == {
        "width": 1080,
        "height": 1920,
        "safe_top": 270,
        "safe_bottom": 1536,
    }
    assert SOCIAL_SPECS["youtube_banner"]["safe"] == {
        "width": 1544,
        "height": 423,
    }


def test_specification_data_cannot_be_mutated() -> None:
    from brandkit.spec import BRAND, PACKAGE_PATHS, SOCIAL_SPECS

    assert isinstance(PACKAGE_PATHS["directories"], tuple)
    with pytest.raises(TypeError):
        BRAND["name"] = "Changed"  # type: ignore[index]
    with pytest.raises(TypeError):
        SOCIAL_SPECS["youtube_banner"]["safe"]["width"] = 1  # type: ignore[index]


def test_spec_excludes_gradient_and_atmosphere_treatments() -> None:
    import brandkit.spec as spec

    assert not hasattr(spec, "GRADIENTS")
    assert "hero_atmosphere" not in spec.DIMENSIONS["web_assets"]


def test_black_is_a_print_pdf_only_logo_exception() -> None:
    from brandkit.spec import COLORS, PRINT_ONLY_EXCEPTIONS

    assert "#000000" not in COLORS.values()
    black = PRINT_ONLY_EXCEPTIONS["pure_black_logo"]
    assert black["hex"] == "#000000"
    assert black["allowed_directories"] == (
        "02-logos/print-pdf",
        "02-logos/monochrome",
    )
    assert black["allowed_formats"] == ("PDF", "SVG")
    assert black["excluded_treatments"] == ("digital", "web", "social", "application")
    assert all("print-black" in path for path in black["required_files"])
    assert all(path.startswith("02-logos/") for path in black["required_files"])


def test_print_black_business_cards_are_explicit_print_only_exceptions() -> None:
    from brandkit.spec import PRINT_ONLY_EXCEPTIONS

    cards = PRINT_ONLY_EXCEPTIONS["print_black_business_cards"]
    assert cards["allowed_directories"] == ("09-print",)
    assert cards["allowed_formats"] == ("PDF", "SVG")
    assert cards["excluded_treatments"] == ("digital", "web", "social", "application")
    assert all(path.startswith("09-print/") for path in cards["required_files"])
    assert all("print-black" in path for path in cards["required_files"])


def test_output_contract_uses_concrete_immutable_filenames() -> None:
    from brandkit.spec import PACKAGE_PATHS

    required_files = PACKAGE_PATHS["required_files"]
    assert isinstance(required_files, tuple)
    assert "logo_family_stems" not in PACKAGE_PATHS
    assert all("*" not in relative and Path(relative).suffix for relative in required_files)
    assert "02-logos/svg/new-wave-it-horizontal-full-color.svg" in required_files
    assert "02-logos/svg/new-wave-it-micro-icon-on-dark.svg" in required_files
    assert "02-logos/monochrome/new-wave-it-horizontal-print-black.svg" in required_files
    assert "02-logos/print-pdf/new-wave-it-horizontal-print-black.pdf" in required_files
    assert "02-logos/png/new-wave-it-horizontal-full-color-2048.png" in required_files
    assert "02-logos/png/new-wave-it-icon-full-color-256.png" in required_files
    assert "03-favicons-app-icons/favicon.ico" in required_files
    assert "05-patterns-backgrounds/current-field-subtle-light.svg" in required_files
    assert "06-web-digital/open-graph-1200x630.png" in required_files
    assert "06-web-digital/website-hero-current-field-2400x1400.png" in required_files
    assert "06-web-digital/website-hero-atmosphere-2400x1400.png" not in required_files
    assert "07-social/profile/linkedin-profile.png" in required_files
    assert "07-social/banners/youtube-banner-2560x1440.png" in required_files
    assert "07-social/templates/security-alert/new-wave-it-security-alert-instagram-portrait.svg" in required_files
    assert "08-documents-presentations/new-wave-it-presentation-template.pptx" in required_files
    assert "08-documents-presentations/new-wave-it-letterhead-review.pdf" in required_files
    assert "09-print/new-wave-it-business-card-horizontal-full-color.pdf" in required_files
    assert "09-print/new-wave-it-business-card-horizontal-print-black.pdf" in required_files
    assert "10-email-support/new-wave-it-email-signature.html" in required_files
    assert "01-brand-guide/new-wave-it-brand-guide.pdf" in required_files
    assert "12-preview/social-feed-preview.png" in required_files
    assert "build-report.json" in required_files
    assert "00-read-me/package-manifest.json" in required_files
    assert "00-read-me/SHA256SUMS.txt" in required_files
    assert PACKAGE_PATHS["archive_filename"] == "new-wave-it-brand-package.zip"
    assert PACKAGE_PATHS["archive_relative_to_package_root"] == "../new-wave-it-brand-package.zip"


def test_required_file_verification_is_opt_in(tmp_path: Path) -> None:
    from brandkit.cli import verify_required_files

    root = build(tmp_path / "new-wave-it-brand-package")
    verify(root)
    with pytest.raises(ValueError, match="missing package files"):
        verify_required_files(root)


def test_required_file_verification_accepts_complete_contract(tmp_path: Path) -> None:
    from brandkit.cli import verify_required_files
    from brandkit.spec import PACKAGE_PATHS

    root = build(tmp_path / "new-wave-it-brand-package")
    for relative in PACKAGE_PATHS["required_files"]:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"required artifact")

    verify_required_files(root)
