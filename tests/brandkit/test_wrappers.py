from pathlib import Path
import subprocess
import sys


def test_wrapper_scripts_build_and_verify_from_repository_root(tmp_path: Path) -> None:
    repository_root = Path(__file__).parents[2]
    package_root = tmp_path / "new-wave-it-brand-package"

    build = subprocess.run(
        [
            sys.executable,
            "scripts/build_brand_package.py",
            "--output-root",
            str(package_root),
        ],
        cwd=repository_root,
        capture_output=True,
        text=True,
    )
    assert build.returncode == 0, build.stderr
    assert (package_root / "00-read-me").is_dir()

    verify = subprocess.run(
        [
            sys.executable,
            "scripts/verify_brand_package.py",
            "--package-root",
            str(package_root),
        ],
        cwd=repository_root,
        capture_output=True,
        text=True,
    )
    assert verify.returncode == 0, verify.stderr
