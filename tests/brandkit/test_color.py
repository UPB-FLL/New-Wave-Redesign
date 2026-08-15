import pytest

from brandkit.color import assert_contrast, contrast_ratio, hex_to_rgb
from brandkit.spec import COLORS


def test_hex_to_rgb_decodes_approved_tokens() -> None:
    assert hex_to_rgb(COLORS["current_navy"]) == (16, 30, 45)


def test_primary_text_pairs_meet_wcag_aa() -> None:
    assert contrast_ratio(COLORS["current_navy"], COLORS["cloud_white"]) >= 4.5
    assert contrast_ratio(COLORS["pure_white"], COLORS["current_navy"]) >= 4.5
    assert contrast_ratio(COLORS["slate"], COLORS["cloud_white"]) >= 4.5


def test_white_on_accent_is_not_documented_as_body_copy() -> None:
    assert contrast_ratio(COLORS["pure_white"], COLORS["signal_cyan"]) < 4.5
    assert contrast_ratio(COLORS["pure_white"], COLORS["continuity_green"]) < 4.5


def test_assert_contrast_rejects_insufficient_pair() -> None:
    with pytest.raises(ValueError, match="does not meet"):
        assert_contrast(COLORS["pure_white"], COLORS["signal_cyan"])
