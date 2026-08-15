from pathlib import Path
import subprocess
import sys

from lxml import etree
import pytest

from brandkit.logo import build_icon_svg, build_lockup_svg, export_logo_family
from brandkit.svg import SvgSafetyError, path, serialize, svg


def test_standard_icon_has_three_open_strokes() -> None:
    root = etree.fromstring(build_icon_svg("standard", "full_color"))
    wave_paths = root.xpath("//*[@data-role='current-stroke']")

    assert len(wave_paths) == 3
    assert all(item.get("fill") == "none" for item in wave_paths)
    assert all(item.get("stroke-linecap") == "round" for item in wave_paths)
    assert all(item.get("stroke-linejoin") == "round" for item in wave_paths)


def test_micro_icon_has_two_strokes_and_is_labeled_optical() -> None:
    root = etree.fromstring(build_icon_svg("micro", "current_navy"))

    assert root.get("data-optical-size") == "micro-24-and-under"
    assert len(root.xpath("//*[@data-role='current-stroke']")) == 2


def test_wordmark_is_outlined_not_live_text() -> None:
    root = etree.fromstring(build_lockup_svg("horizontal", True, "on_light"))

    assert not root.xpath("//*[local-name()='text']")
    assert root.xpath("//*[@data-role='wordmark-path']")


def test_svg_helpers_reject_external_or_gradient_values() -> None:
    document = svg("0 0 8 8")
    with pytest.raises(SvgSafetyError):
        path(document, "M0 0", fill="url(https://example.com/paint)")


def test_export_creates_only_contract_digital_colorways(tmp_path: Path) -> None:
    export_logo_family(tmp_path)

    digital = tmp_path / "02-logos" / "svg"
    generated_names = {item.name for item in digital.glob("*.svg")}
    assert len(generated_names) == 35
    assert all("print-black" not in name for name in generated_names)
    assert (digital / "new-wave-it-horizontal-full-color.svg").is_file()
    assert (digital / "new-wave-it-micro-icon-on-dark.svg").is_file()
    assert (tmp_path / "02-logos" / "monochrome" / "new-wave-it-wordmark-print-black.svg").is_file()
    assert (tmp_path / "11-source" / "logo-construction.svg").is_file()


def test_exported_svg_assets_are_portable_and_safe(tmp_path: Path) -> None:
    export_logo_family(tmp_path)

    for asset in tmp_path.rglob("*.svg"):
        root = etree.parse(str(asset)).getroot()
        assert not root.xpath("//*[local-name()='text' or local-name()='image' or local-name()='script']")
        assert not root.xpath("//*[local-name()='linearGradient' or local-name()='radialGradient']")
        external_values = [
            value
            for element in root.iter()
            for name, value in element.attrib.items()
            if "href" in name.lower()
            or "url(" in value.lower()
            or value.lower().startswith(("http:", "https:"))
        ]
        assert not external_values


def test_serialization_is_deterministic() -> None:
    first = svg("0 0 8 8")
    path(first, "M1 1 L7 7", fill="none", stroke="#101E2D")
    second = svg("0 0 8 8")
    path(second, "M1 1 L7 7", fill="none", stroke="#101E2D")

    assert serialize(first) == serialize(second)


def test_logo_stage_builds_from_repository_root() -> None:
    repository_root = Path(__file__).parents[2]
    package_root = repository_root / "output" / "new-wave-it-brand-package"

    result = subprocess.run(
        [
            r"C:\tmp\nw-brand-venv\Scripts\python.exe",
            "scripts/build_brand_package.py",
            "--stage",
            "logos",
        ],
        cwd=repository_root,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert (package_root / "02-logos" / "svg" / "new-wave-it-horizontal-full-color.svg").is_file()
