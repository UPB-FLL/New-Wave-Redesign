from pathlib import Path

import pytest
from PIL import Image

from brandkit.cli import build
from brandkit.logo import export_logo_family
from brandkit.render import export_raster_family, inspect_png
from brandkit.spec import PACKAGE_PATHS


@pytest.fixture()
def package_root(tmp_path: Path) -> Path:
    root = build(tmp_path / "new-wave-it-brand-package")
    export_logo_family(root)
    export_raster_family(root)
    return root


def test_transparent_logo_png_has_alpha(package_root: Path) -> None:
    png = package_root / "02-logos/png/new-wave-it-horizontal-full-color-512.png"
    info = inspect_png(png)
    assert info.mode == "RGBA"
    assert info.has_transparency is True
    assert info.size == (512, 171)


def test_raster_contract_has_direct_rendered_logo_inventory(package_root: Path) -> None:
    paths = tuple(package_root / relative for relative in PACKAGE_PATHS["logo_rasters"])
    assert len(paths) == 23
    assert all(path.is_file() and path.stat().st_size > 0 for path in paths)

    with Image.open(package_root / "02-logos/png/new-wave-it-icon-full-color-2048.png") as image:
        assert image.size == (2048, 2048)
        assert image.mode == "RGBA"


def test_print_black_pdfs_are_confined_to_print_location(package_root: Path) -> None:
    paths = tuple(package_root / relative for relative in PACKAGE_PATHS["logo_print_pdfs"])
    assert len(paths) == 7
    assert all(path.is_file() and path.read_bytes().startswith(b"%PDF-") for path in paths)
    assert not tuple((package_root / "02-logos/png").glob("*print-black*"))


def test_favicon_contract_contains_required_sizes_and_ico_layers(package_root: Path) -> None:
    expected = {
        "favicon-16x16.png": (16, 16),
        "favicon-32x32.png": (32, 32),
        "favicon-48x48.png": (48, 48),
        "apple-touch-icon.png": (180, 180),
        "pwa-icon-192.png": (192, 192),
        "pwa-icon-512.png": (512, 512),
    }
    icon_root = package_root / "03-favicons-app-icons"
    for name, size in expected.items():
        with Image.open(icon_root / name) as image:
            assert image.size == size
            assert image.mode == "RGBA"

    with Image.open(icon_root / "favicon.ico") as icon:
        assert set(icon.ico.sizes()) == {(16, 16), (32, 32), (48, 48)}


def test_maskable_icon_symbol_is_inside_central_safe_zone(package_root: Path) -> None:
    with Image.open(package_root / "03-favicons-app-icons/pwa-maskable-512.png") as image:
        assert image.size == (512, 512)
        alpha_box = image.getchannel("A").getbbox()
    assert alpha_box is not None
    left, top, right, bottom = alpha_box
    assert left >= 51 and top >= 51
    assert right <= 461 and bottom <= 461


def test_favicon_contact_sheet_exists(package_root: Path) -> None:
    with Image.open(package_root / "12-preview/favicon-contact-sheet.png") as contact_sheet:
        assert contact_sheet.size == (1800, 1000)
