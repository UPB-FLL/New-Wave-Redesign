"""Approved New Wave IT brand data shared by every package generator."""

from types import MappingProxyType
from typing import Any


def _freeze(value: Any) -> Any:
    """Recursively expose specification data without caller mutation paths."""
    if isinstance(value, dict):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, tuple):
        return tuple(_freeze(item) for item in value)
    return value


BRAND = _freeze(
    {
        "name": "New Wave IT",
        "legal_name": "New Wave IT LLC",
        "website": "newwaveitfl.com",
        "support_email": "support@newwaveitfl.com",
        "promise": "Technology that keeps business moving.",
        "heritage_line": "Don’t get lost in the current",
        "service_statement": (
            "Managed IT, cybersecurity, cloud, and support built around the way "
            "your business actually works."
        ),
        "calls_to_action": (
            "Request an assessment",
            "Talk to the team",
            "Get support",
            "View services",
        ),
    }
)

COLORS = _freeze(
    {
        "deep_current": "#09131D",
        "current_navy": "#101E2D",
        "signal_cyan": "#31C6CF",
        "continuity_green": "#62BE68",
        "tide_blue": "#317B92",
        "cloud_white": "#F7FAFB",
        "mist_gray": "#E8EFF1",
        "slate": "#526271",
        "pure_white": "#FFFFFF",
    }
)

TYPOGRAPHY = _freeze(
    {
        "display": {
            "family": "Plus Jakarta Sans",
            "weights": (600, 700, 800),
            "fallbacks": ("Inter", "system-ui", "sans-serif"),
        },
        "body": {
            "family": "Inter",
            "weights": (400, 500, 600, 700),
            "fallbacks": ("system-ui", "sans-serif"),
        },
        "technical": {
            "family": "IBM Plex Mono",
            "weights": (400, 500, 600),
            "fallbacks": ("ui-monospace", "monospace"),
        },
        "editorial": {
            "family": "Instrument Serif",
            "fallbacks": ("Georgia", "serif"),
        },
    }
)

SOCIAL_SPECS = _freeze(
    {
        "profile_master": {"width": 1080, "height": 1080},
        "linkedin_page_logo": {"width": 400, "height": 400},
        "linkedin_page_cover": {"width": 4200, "height": 700},
        "facebook_page_profile": {"width": 320, "height": 320},
        "facebook_page_cover": {"width": 851, "height": 315},
        "facebook_page_cover_high_resolution": {"width": 1702, "height": 630},
        "x_profile": {"width": 400, "height": 400},
        "x_header": {
            "width": 1500,
            "height": 500,
            "safe_top": 60,
            "safe_bottom": 440,
        },
        "youtube_profile": {"width": 800, "height": 800},
        "youtube_banner": {
            "width": 2560,
            "height": 1440,
            "safe": {"width": 1544, "height": 423},
        },
        "instagram_portrait": {"width": 1080, "height": 1350, "safe_square_y": 135},
        "instagram_square": {"width": 1080, "height": 1080},
        "story": {"width": 1080, "height": 1920, "safe_top": 270, "safe_bottom": 1536},
        "linkedin_square": {"width": 1200, "height": 1200},
        "linkedin_landscape": {"width": 1200, "height": 627},
    }
)

DIMENSIONS = _freeze(
    {
        "logo": {
            "master_viewbox": {"width": 64, "height": 64},
            "optical_field": {"width": 48, "height": 48},
            "surrounding_space": 8,
            "standard_strokes": 3,
            "micro_strokes": 2,
            "micro_max_rendered_px": 24,
            "minimum_digital_width": {"horizontal": 140, "with_heritage_line": 220},
            "minimum_print_width_inches": {"horizontal": 1.25, "with_heritage_line": 2},
        },
        "layout": {
            "base_spacing_px": 4,
            "content_rhythm_px": 8,
            "corner_radii_px": (12, 18, 24),
            "desktop_content_max_width_px": 1280,
            "long_form_reading_width_px": (720, 780),
            "desktop_columns": 12,
            "mobile_columns": 4,
        },
        "motion": {"standard_ms": (180, 300), "section_entrance_max_ms": 500},
        "preview": {"width": 2400, "height": 1800},
        "web_assets": {
            "open_graph": {"width": 1200, "height": 630},
            "social_share_square": {"width": 1200, "height": 1200},
            "website_hero": {"width": 2400, "height": 1400},
            "email_header_field": {"width": 1200, "height": 300},
            "support_portal_icon": {"width": 512, "height": 512},
        },
        "business_card_inches": {"width": 3.5, "height": 2, "bleed": 0.125},
    }
)

_DIRECTORIES = (
    "00-read-me",
    "01-brand-guide",
    "02-logos/svg",
    "02-logos/png",
    "02-logos/print-pdf",
    "02-logos/monochrome",
    "03-favicons-app-icons",
    "04-tokens-typography",
    "05-patterns-backgrounds",
    "06-web-digital",
    "07-social/profile",
    "07-social/banners",
    "07-social/templates",
    "08-documents-presentations",
    "09-print",
    "10-email-support",
    "11-source",
    "12-preview",
)

_LOGO_LAYOUTS = (
    "horizontal",
    "horizontal-tagline",
    "stacked",
    "stacked-tagline",
    "icon",
    "micro-icon",
    "wordmark",
)
_DIGITAL_LOGO_COLORWAYS = (
    "full-color",
    "current-navy",
    "cloud-white",
    "on-light",
    "on-dark",
)

_LOGO_VECTORS = tuple(
    f"02-logos/svg/new-wave-it-{layout}-{colorway}.svg"
    for layout in _LOGO_LAYOUTS
    for colorway in _DIGITAL_LOGO_COLORWAYS
) + tuple(
    f"02-logos/monochrome/new-wave-it-{layout}-print-black.svg"
    for layout in _LOGO_LAYOUTS
) + ("11-source/logo-construction.svg",)

_LOGO_RASTERS = tuple(
    f"02-logos/png/new-wave-it-{layout}-full-color-{width}.png"
    for layout in (
        "horizontal",
        "horizontal-tagline",
        "stacked",
        "stacked-tagline",
        "wordmark",
    )
    for width in (512, 1024, 2048)
) + tuple(
    f"02-logos/png/new-wave-it-{layout}-full-color-{width}.png"
    for layout in ("icon", "micro-icon")
    for width in (256, 512, 1024, 2048)
)

_LOGO_PRINT_PDFS = tuple(
    f"02-logos/print-pdf/new-wave-it-{layout}-print-black.pdf"
    for layout in _LOGO_LAYOUTS
)

_FAVICON_FILES = (
    "03-favicons-app-icons/favicon.svg",
    "03-favicons-app-icons/favicon.ico",
    "03-favicons-app-icons/favicon-16x16.png",
    "03-favicons-app-icons/favicon-32x32.png",
    "03-favicons-app-icons/favicon-48x48.png",
    "03-favicons-app-icons/apple-touch-icon.png",
    "03-favicons-app-icons/pwa-icon-192.png",
    "03-favicons-app-icons/pwa-icon-512.png",
    "03-favicons-app-icons/pwa-maskable-512.png",
    "03-favicons-app-icons/safari-pinned-tab.svg",
)

_PATTERN_FILES = (
    "05-patterns-backgrounds/current-field-subtle-light.svg",
    "05-patterns-backgrounds/current-field-subtle-dark.svg",
    "05-patterns-backgrounds/current-field-standard-light.svg",
    "05-patterns-backgrounds/current-field-standard-dark.svg",
    "05-patterns-backgrounds/current-field-high-impact-light.svg",
    "05-patterns-backgrounds/current-field-high-impact-dark.svg",
    "05-patterns-backgrounds/technical-grid-light.svg",
    "05-patterns-backgrounds/technical-grid-dark.svg",
    "05-patterns-backgrounds/signal-points-light.svg",
    "05-patterns-backgrounds/signal-points-dark.svg",
)

_WEB_DIGITAL_FILES = (
    "04-tokens-typography/new-wave-it-tokens.json",
    "04-tokens-typography/new-wave-it-tokens.css",
    "04-tokens-typography/new-wave-it-tokens.ts",
    "06-web-digital/open-graph-1200x630.png",
    "06-web-digital/open-graph-1200x630.json",
    "06-web-digital/social-share-square-1200x1200.png",
    "06-web-digital/social-share-square-1200x1200.json",
    "06-web-digital/website-hero-current-field-2400x1400.png",
    "06-web-digital/website-hero-current-field-2400x1400.json",
    "06-web-digital/email-header-1200x300.png",
    "06-web-digital/email-header-1200x300.json",
    "06-web-digital/support-portal-app-icon-512x512.png",
)

_SOCIAL_PROFILE_FILES = (
    "07-social/profile/linkedin-profile.png",
    "07-social/profile/facebook-profile.png",
    "07-social/profile/instagram-profile.png",
    "07-social/profile/x-profile.png",
    "07-social/profile/youtube-profile.png",
    "07-social/profile/universal-profile.png",
)
_SOCIAL_BANNER_FILES = (
    "07-social/banners/linkedin-banner-1584x396.png",
    "07-social/banners/facebook-cover-820x312.png",
    "07-social/banners/x-header-1500x500.png",
    "07-social/banners/youtube-banner-2560x1440.png",
)
_SOCIAL_TEMPLATE_FILES = tuple(
    f"07-social/templates/{family}/new-wave-it-{family}-{format}.{extension}"
    for family in (
        "security-alert",
        "service-spotlight",
        "educational-tip",
        "client-result",
        "status-update",
        "local-insight",
        "team-announcement",
        "brand-announcement",
    )
    for format in (
        "instagram-portrait",
        "square",
        "story-reel",
        "linkedin-square",
        "linkedin-landscape",
    )
    for extension in ("svg", "png")
)

_DOCUMENT_FILES = tuple(
    f"08-documents-presentations/{name}.docx"
    for name in (
        "new-wave-it-letterhead",
        "new-wave-it-proposal-template",
        "new-wave-it-capabilities-sheet",
        "new-wave-it-how-to-reach-us",
        "new-wave-it-cybersecurity-notice",
        "new-wave-it-meeting-notes",
        "new-wave-it-project-status",
    )
) + tuple(
    f"08-documents-presentations/{name}-review.pdf"
    for name in (
        "new-wave-it-letterhead",
        "new-wave-it-proposal-template",
        "new-wave-it-capabilities-sheet",
        "new-wave-it-how-to-reach-us",
        "new-wave-it-cybersecurity-notice",
        "new-wave-it-meeting-notes",
        "new-wave-it-project-status",
    )
) + (
    "08-documents-presentations/new-wave-it-presentation-template.pptx",
    "08-documents-presentations/new-wave-it-presentation-template-review.pdf",
    "08-documents-presentations/new-wave-it-presentation-contact-sheet.png",
)

_PRINT_FILES = tuple(
    f"09-print/new-wave-it-business-card-{orientation}-{colorway}.{extension}"
    for orientation in ("horizontal", "vertical")
    for colorway in ("full-color", "print-black")
    for extension in ("svg", "pdf")
) + (
    "09-print/new-wave-it-invoice-header.svg",
    "09-print/new-wave-it-invoice-header.png",
    "09-print/new-wave-it-invoice-footer.svg",
    "09-print/new-wave-it-invoice-footer.png",
    "09-print/new-wave-it-invoice-asset-usage.pdf",
)

_EMAIL_SUPPORT_FILES = (
    "10-email-support/new-wave-it-email-signature.html",
    "10-email-support/new-wave-it-email-signature.txt",
    "10-email-support/new-wave-it-email-signature.png",
    "10-email-support/new-wave-it-email-signature-installation-guide.md",
    "10-email-support/new-wave-it-support-email-header.html",
    "10-email-support/new-wave-it-support-email-header.png",
    "10-email-support/new-wave-it-support-email-footer.html",
    "10-email-support/new-wave-it-support-email-footer.png",
    "10-email-support/new-wave-it-maintenance-notice.html",
    "10-email-support/new-wave-it-maintenance-notice.png",
    "10-email-support/new-wave-it-incident-update.html",
    "10-email-support/new-wave-it-incident-update.png",
    "10-email-support/new-wave-it-welcome-header.html",
    "10-email-support/new-wave-it-welcome-header.png",
)

_GUIDE_AND_INDEX_FILES = (
    "00-read-me/new-wave-it-asset-index.csv",
    "00-read-me/new-wave-it-read-me.txt",
    "00-read-me/package-manifest.json",
    "00-read-me/SHA256SUMS.txt",
    "01-brand-guide/new-wave-it-brand-guide.pdf",
    "01-brand-guide/new-wave-it-quick-usage-guide.md",
    "12-preview/new-wave-it-brand-preview.png",
    "12-preview/favicon-contact-sheet.png",
    "12-preview/social-feed-preview.png",
    "12-preview/document-review-contact-sheet.png",
    "12-preview/brand-guide-contact-sheet.png",
    "12-preview/platform-crops/linkedin-banner-crop-preview.png",
    "12-preview/platform-crops/facebook-cover-crop-preview.png",
    "12-preview/platform-crops/x-header-crop-preview.png",
    "12-preview/platform-crops/youtube-banner-crop-preview.png",
)

_PACKAGE_METADATA_FILES = (
    "build-report.json",
)


def _unique_paths(*groups: tuple[str, ...]) -> tuple[str, ...]:
    return tuple(dict.fromkeys(path for group in groups for path in group))


_REQUIRED_FILES = _unique_paths(
    _LOGO_VECTORS,
    _LOGO_RASTERS,
    _LOGO_PRINT_PDFS,
    _FAVICON_FILES,
    _PATTERN_FILES,
    _WEB_DIGITAL_FILES,
    _SOCIAL_PROFILE_FILES,
    _SOCIAL_BANNER_FILES,
    _SOCIAL_TEMPLATE_FILES,
    _DOCUMENT_FILES,
    _PRINT_FILES,
    _EMAIL_SUPPORT_FILES,
    _GUIDE_AND_INDEX_FILES,
    _PACKAGE_METADATA_FILES,
)

PRINT_ONLY_EXCEPTIONS = _freeze(
    {
        "pure_black_logo": {
            "hex": "#000000",
            "allowed_directories": ("02-logos/print-pdf", "02-logos/monochrome"),
            "allowed_formats": ("PDF", "SVG"),
            "excluded_treatments": ("digital", "web", "social", "application"),
            "required_files": tuple(
                path
                for path in _LOGO_VECTORS + _LOGO_PRINT_PDFS
                if "print-black" in path
            ),
        },
        "print_black_business_cards": {
            "allowed_directories": ("09-print",),
            "allowed_formats": ("PDF", "SVG"),
            "excluded_treatments": ("digital", "web", "social", "application"),
            "required_files": tuple(
                path for path in _PRINT_FILES if "print-black" in path
            ),
        },
    }
)

PACKAGE_PATHS = _freeze(
    {
        "directories": _DIRECTORIES,
        "logo_vectors": _LOGO_VECTORS,
        "logo_rasters": _LOGO_RASTERS,
        "logo_print_pdfs": _LOGO_PRINT_PDFS,
        "favicons": _FAVICON_FILES,
        "patterns": _PATTERN_FILES,
        "web_digital": _WEB_DIGITAL_FILES,
        "social_profiles": _SOCIAL_PROFILE_FILES,
        "social_banners": _SOCIAL_BANNER_FILES,
        "social_templates": _SOCIAL_TEMPLATE_FILES,
        "documents_presentations": _DOCUMENT_FILES,
        "print": _PRINT_FILES,
        "email_support": _EMAIL_SUPPORT_FILES,
        "guides_preview_index": _GUIDE_AND_INDEX_FILES,
        "package_metadata": _PACKAGE_METADATA_FILES,
        "required_files": _REQUIRED_FILES,
        "archive_filename": "new-wave-it-brand-package.zip",
        "archive_relative_to_package_root": "../new-wave-it-brand-package.zip",
    }
)
