from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]

SHARED_SURFACES = (
    "src/components/Navbar.tsx",
    "src/components/Footer.tsx",
    "src/components/Hero.tsx",
    "src/components/Contact.tsx",
    "src/components/QuoteModal.tsx",
    "src/components/TrustBar.tsx",
    "src/components/StatusIndicator.tsx",
    "src/components/WaveBackground.tsx",
    "src/components/FloatingNav.tsx",
    "src/components/legal/LegalPageLayout.tsx",
    "src/components/support/CustomerPortalCard.tsx",
    "src/components/support/SupportChatCard.tsx",
    "src/components/support/SupportEmailCard.tsx",
    "src/components/ui/border-beam.tsx",
    "src/components/ui/shimmer-button.tsx",
    "src/pages/SupportPage.tsx",
    "src/pages/StatusPage.tsx",
)

LEGACY_COLORS = ("#39CCCC", "#2db8b8", "#5EBC67", "#4da856", "#152232", "#0f1923")
DISALLOWED_EFFECTS = ("linear-gradient", "radial-gradient", "backdropFilter", "backdrop-filter")


def test_shared_surfaces_use_the_semantic_brand_system_without_legacy_effects():
    for relative_path in SHARED_SURFACES:
        source = (REPOSITORY_ROOT / relative_path).read_text(encoding="utf-8")

        assert "var(--nw-" in source or "text-brand-" in source, relative_path
        assert not any(color in source for color in LEGACY_COLORS), relative_path
        assert not any(effect in source for effect in DISALLOWED_EFFECTS), relative_path
