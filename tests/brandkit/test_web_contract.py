from pathlib import Path
import json

from brandkit.web_contract import write_web_contract


def test_web_contract_is_deterministic_and_uses_the_canonical_brand_source(tmp_path: Path) -> None:
    project_root = tmp_path / "site"

    tokens_path, logo_paths_path = write_web_contract(project_root)
    first_tokens = tokens_path.read_text(encoding="utf-8")
    first_logo_paths = logo_paths_path.read_text(encoding="utf-8")

    assert "#31C6CF" in first_tokens
    assert "Plus Jakarta Sans" in first_tokens
    assert "STANDARD_CURRENT_STROKES" in first_logo_paths
    assert "WORDMARK_PATH" in first_logo_paths
    assert "linearGradient" not in first_logo_paths

    write_web_contract(project_root)

    assert tokens_path.read_text(encoding="utf-8") == first_tokens
    assert logo_paths_path.read_text(encoding="utf-8") == first_logo_paths


def test_website_tailwind_migration_aliases_resolve_through_approved_tokens() -> None:
    repository = Path(__file__).resolve().parents[2]
    brand_css = (repository / "src/styles/brand.css").read_text(encoding="utf-8")
    tailwind = (repository / "tailwind.config.js").read_text(encoding="utf-8")

    assert "--nw-signal-cyan: #31C6CF;" in brand_css
    assert "--nw-continuity-green: #62BE68;" in brand_css
    assert "--nw-current-navy: #101E2D;" in brand_css
    assert "cyan: 'var(--nw-signal-cyan)'" in tailwind
    assert "green: 'var(--nw-continuity-green)'" in tailwind
    assert "navy: 'var(--nw-current-navy)'" in tailwind
    assert "dark: 'var(--nw-deep-current)'" in tailwind
    assert "Migration-only aliases" in tailwind


def test_public_brand_assets_and_metadata_are_first_party() -> None:
    repository = Path(__file__).resolve().parents[2]
    public = repository / "public"
    index = (repository / "index.html").read_text(encoding="utf-8")
    page_meta = (repository / "src/lib/usePageMeta.ts").read_text(encoding="utf-8")
    manifest = json.loads((public / "site.webmanifest").read_text(encoding="utf-8"))
    og_url = "https://www.newwaveitfl.com/brand/og/open-graph-1200x630.png"
    logo_url = "https://www.newwaveitfl.com/brand/logos/new-wave-it-horizontal-on-light.svg"

    for relative in (
        "brand/logos/new-wave-it-horizontal-on-light.svg",
        "brand/logos/new-wave-it-horizontal-on-dark.svg",
        "brand/logos/new-wave-it-icon-on-light.svg",
        "brand/icons/pwa-icon-192.png",
        "brand/icons/pwa-icon-512.png",
        "brand/patterns/current-field-subtle-light.svg",
        "brand/patterns/current-field-subtle-dark.svg",
        "brand/og/open-graph-1200x630.png",
        "favicon.svg",
        "favicon.ico",
        "apple-touch-icon.png",
    ):
        assert (public / relative).is_file(), relative

    assert "images.squarespace-cdn.com" not in index
    assert "images.squarespace-cdn.com" not in page_meta
    assert og_url in index
    assert og_url in page_meta
    assert logo_url in index
    assert 'href="/favicon.ico"' in index
    assert manifest["theme_color"] == "#101E2D"
    assert {entry["src"] for entry in manifest["icons"]} >= {
        "/favicon.svg",
        "/apple-touch-icon.png",
        "/brand/icons/pwa-icon-192.png",
        "/brand/icons/pwa-icon-512.png",
        "/brand/icons/pwa-maskable-512.png",
    }

    for relative in (
        "apple-touch-icon.svg",
        "blog-cloud.svg",
        "blog-cybersecurity.svg",
        "blog-managed-it.svg",
    ):
        source = (public / relative).read_text(encoding="utf-8")
        assert not any(legacy in source for legacy in ("#39CCCC", "#5EBC67", "#152232", "#0f1923")), relative
