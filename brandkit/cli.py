from pathlib import Path

from brandkit.spec import PACKAGE_PATHS

DIRECTORIES = PACKAGE_PATHS["directories"]


def build(output_root: Path) -> Path:
    for relative in DIRECTORIES:
        (output_root / relative).mkdir(parents=True, exist_ok=True)
    return output_root


def verify(package_root: Path) -> None:
    missing = [p for p in DIRECTORIES if not (package_root / p).is_dir()]
    if missing:
        raise ValueError(f"missing package directories: {missing}")


def verify_required_files(package_root: Path) -> None:
    """Verify the full artifact contract after every package stage has run."""
    verify(package_root)
    missing = [
        relative
        for relative in PACKAGE_PATHS["required_files"]
        if not (package_root / relative).is_file()
    ]
    if missing:
        raise ValueError(f"missing package files: {missing}")
