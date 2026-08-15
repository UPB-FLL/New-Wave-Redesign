import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from brandkit.package import verify_archive, verify_package
from brandkit.spec import PACKAGE_PATHS


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify the New Wave IT brand package.")
    parser.add_argument(
        "--package-root",
        type=Path,
        default=Path("output/new-wave-it-brand-package"),
    )
    parser.add_argument("--archive", type=Path)
    args = parser.parse_args()
    archive = args.archive or args.package_root.parent / str(PACKAGE_PATHS["archive_filename"])
    result = {
        "package": verify_package(args.package_root, archive_path=archive),
        "archive": verify_archive(archive),
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
