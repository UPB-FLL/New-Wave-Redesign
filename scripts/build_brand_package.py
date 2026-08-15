import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from brandkit.cli import build
from brandkit.digital import export_social_assets, export_web_digital
from brandkit.documents import export_documents
from brandkit.email_assets import export_email_support_assets
from brandkit.guide import export_guide
from brandkit.logo import export_logo_family
from brandkit.package import package_release
from brandkit.patterns import export_patterns
from brandkit.print_assets import export_print_assets
from brandkit.render import export_raster_family
from brandkit.slides import build_presentation_template
from brandkit.social import export_social_templates
from brandkit.web_contract import write_web_contract


def build_full_package(output_root: Path, *, project_root: Path | None = None) -> Path:
    """Run every ordered artifact stage before final metadata and archive packaging."""
    root = build(output_root)
    export_logo_family(root)
    export_raster_family(root)
    export_patterns(root)
    export_web_digital(root)
    export_social_assets(root)
    export_social_templates(root)
    export_documents(root)
    build_presentation_template(root / "08-documents-presentations/new-wave-it-presentation-template.pptx")
    export_print_assets(root)
    export_email_support_assets(root)
    export_guide(root)
    package_release(root)
    if project_root is not None:
        write_web_contract(project_root)
    return root


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the New Wave IT brand package.")
    parser.add_argument("--stage", choices=("all", "logos"), default="all")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("output/new-wave-it-brand-package"),
    )
    args = parser.parse_args()
    output_root = args.output_root
    if args.stage == "logos":
        export_logo_family(build(output_root))
    else:
        build_full_package(output_root, project_root=Path(__file__).resolve().parents[1])


if __name__ == "__main__":
    main()
