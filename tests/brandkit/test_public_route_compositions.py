from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]

PUBLIC_ROUTE_COMPOSITIONS = (
    "src/components/Stats.tsx",
    "src/components/Services.tsx",
    "src/components/WhyUs.tsx",
    "src/components/Testimonials.tsx",
    "src/components/About.tsx",
    "src/components/DynamicPricingBuilder.tsx",
    "src/components/brand/PublicPageHero.tsx",
    "src/components/brand/ServiceCategoryPage.tsx",
    "src/components/codenest/CodeNestHero.tsx",
    "src/components/codenest/CodeNestNav.tsx",
    "src/components/codenest/LiquidGlassCard.tsx",
    "src/components/codenest/VideoBackground.tsx",
    "src/components/cybersecurity/CybersecurityHero.tsx",
    "src/components/cybersecurity/SecurityStats.tsx",
    "src/components/cybersecurity/CybersecurityServices.tsx",
    "src/components/cybersecurity/ThreatProtection.tsx",
    "src/components/cybersecurity/SecurityProcess.tsx",
    "src/components/cybersecurity/ComplianceFrameworks.tsx",
    "src/components/cybersecurity/CyberSecurityCTA.tsx",
    "src/pages/PricingPage.tsx",
    "src/pages/BlogPage.tsx",
    "src/pages/CodeNestPage.tsx",
    "src/pages/SeoLandingPage.tsx",
    "src/pages/ServiceCategoryDetailPage.tsx",
    "src/pages/ServiceDetailPage.tsx",
    "src/pages/ServiceGuidePage.tsx",
    "src/pages/ThreatDetailPage.tsx",
    "src/pages/CybersecurityServicePage.tsx",
    "src/pages/LiveITSupportServicePage.tsx",
    "src/pages/ITRepairServicePage.tsx",
    "src/pages/ManagedITServicePage.tsx",
    "src/pages/CloudSolutionsServicePage.tsx",
    "src/pages/NetworkInfrastructureServicePage.tsx",
    "src/pages/FamilyOfficesServicePage.tsx",
    "src/pages/HealthcareServicePage.tsx",
    "src/pages/LuxuryServicePage.tsx",
    "src/pages/CellularDASPublicSafetyServicePage.tsx",
)

LEGACY_COLORS = ("#39CCCC", "#2db8b8", "#5EBC67", "#4da856", "#152232", "#0f1923")
DISALLOWED_EFFECTS = ("linear-gradient", "radial-gradient", "backdropFilter", "backdrop-filter")


def test_public_route_compositions_use_the_new_wave_semantic_system():
    for relative_path in PUBLIC_ROUTE_COMPOSITIONS:
        source = (REPOSITORY_ROOT / relative_path).read_text(encoding="utf-8")

        assert (
            "var(--nw-" in source
            or "text-brand-" in source
            or "ServiceCategoryPage" in source
            or "CurrentField" in source
        ), relative_path
        assert not any(color in source for color in LEGACY_COLORS), relative_path
        assert not any(effect in source for effect in DISALLOWED_EFFECTS), relative_path
