"""WCAG color conversion and contrast helpers for approved brand tokens."""


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    """Convert a six-digit RGB hex color to its integer channels."""
    if not isinstance(value, str) or len(value) != 7 or not value.startswith("#"):
        raise ValueError("hex color must use the #RRGGBB format")
    try:
        return tuple(int(value[index : index + 2], 16) for index in (1, 3, 5))  # type: ignore[return-value]
    except ValueError as error:
        raise ValueError("hex color must use the #RRGGBB format") from error


def _linear(channel: int) -> float:
    value = channel / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def contrast_ratio(foreground: str, background: str) -> float:
    """Return the WCAG relative-luminance contrast ratio for two hex colors."""
    fr, fg, fb = hex_to_rgb(foreground)
    br, bg, bb = hex_to_rgb(background)
    lum_f = 0.2126 * _linear(fr) + 0.7152 * _linear(fg) + 0.0722 * _linear(fb)
    lum_b = 0.2126 * _linear(br) + 0.7152 * _linear(bg) + 0.0722 * _linear(bb)
    lighter, darker = max(lum_f, lum_b), min(lum_f, lum_b)
    return (lighter + 0.05) / (darker + 0.05)


def assert_contrast(foreground: str, background: str, minimum: float = 4.5) -> None:
    """Raise when a text/background pair does not meet its required contrast."""
    ratio = contrast_ratio(foreground, background)
    if ratio < minimum:
        raise ValueError(
            f"contrast ratio {ratio:.2f} for {foreground} on {background} "
            f"does not meet {minimum:.2f}"
        )
