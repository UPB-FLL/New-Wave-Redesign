"""Font-cache and outline utilities used only by the brand build."""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

PLUS_JAKARTA_EXTRABOLD_URL = (
    "https://raw.githubusercontent.com/tokotype/PlusJakartaSans/master/"
    "fonts/ttf/PlusJakartaSans-ExtraBold.ttf"
)
FONT_FILENAME = "PlusJakartaSans-ExtraBold.ttf"
INTER_REGULAR_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf"
INTER_FILENAME = "Inter-Variable.ttf"


@dataclass(frozen=True)
class OutlinedText:
    d: str
    advance: float
    units_per_em: int


def font_cache_dir() -> Path:
    return Path(__file__).resolve().parents[1] / ".brand-build" / "fonts"


def ensure_plus_jakarta_extrabold() -> Path:
    """Download the approved TTF to the private build cache once."""
    cache = font_cache_dir()
    cache.mkdir(parents=True, exist_ok=True)
    font_path = cache / FONT_FILENAME
    if not font_path.is_file():
        with urlopen(PLUS_JAKARTA_EXTRABOLD_URL, timeout=30) as response:
            font_path.write_bytes(response.read())

    digest = hashlib.sha256(font_path.read_bytes()).hexdigest()
    (cache / "metadata.json").write_text(
        json.dumps(
            {
                "filename": FONT_FILENAME,
                "sha256": digest,
                "source": PLUS_JAKARTA_EXTRABOLD_URL,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    return font_path


def ensure_inter_regular() -> Path:
    """Download Inter's variable font to the private build cache for body copy."""
    cache = font_cache_dir()
    cache.mkdir(parents=True, exist_ok=True)
    font_path = cache / INTER_FILENAME
    if not font_path.is_file():
        with urlopen(INTER_REGULAR_URL, timeout=30) as response:
            font_path.write_bytes(response.read())
    return font_path


def _legacy_kern(font: TTFont, left: str, right: str) -> int:
    if "kern" not in font:
        return 0
    for table in font["kern"].kernTables:
        if getattr(table, "format", None) == 0:
            return int(table.kernTable.get((left, right), 0))
    return 0


def _value_advance(value: object | None) -> int:
    return int(getattr(value, "XAdvance", 0) or 0)


def _pair_positioning(font: TTFont, left: str, right: str) -> int:
    """Return simple GPOS pair positioning when the font supplies it."""
    if "GPOS" not in font:
        return 0
    lookup_list = font["GPOS"].table.LookupList
    if lookup_list is None:
        return 0
    for lookup in lookup_list.Lookup:
        subtables = lookup.SubTable
        if lookup.LookupType == 9:
            subtables = [subtable.ExtSubTable for subtable in subtables]
        if lookup.LookupType not in (2, 9):
            continue
        for subtable in subtables:
            if getattr(subtable, "LookupType", 2) not in (None, 2):
                continue
            coverage = getattr(getattr(subtable, "Coverage", None), "glyphs", ())
            if left not in coverage:
                continue
            if getattr(subtable, "Format", None) == 1:
                index = coverage.index(left)
                for pair in subtable.PairSet[index].PairValueRecord:
                    if pair.SecondGlyph == right:
                        return _value_advance(pair.Value1)
            if getattr(subtable, "Format", None) == 2:
                first_class = subtable.ClassDef1.classDefs.get(left, 0)
                second_class = subtable.ClassDef2.classDefs.get(right, 0)
                return _value_advance(
                    subtable.Class1Record[first_class].Class2Record[second_class].Value1
                )
    return 0


def outline_text(text: str, font_path: Path) -> OutlinedText:
    """Convert text to a single SVG path in native font units."""
    font = TTFont(str(font_path))
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"].metrics
    units_per_em = int(font["head"].unitsPerEm)
    cursor = 0
    fragments: list[str] = []
    previous: str | None = None

    for character in text:
        glyph_name = cmap.get(ord(character), ".notdef")
        if previous is not None:
            adjustment = _pair_positioning(font, previous, glyph_name)
            cursor += adjustment if adjustment else _legacy_kern(font, previous, glyph_name)
        pen = SVGPathPen(glyph_set)
        transform_pen = TransformPen(pen, (1, 0, 0, -1, cursor, 0))
        glyph_set[glyph_name].draw(transform_pen)
        fragments.append(pen.getCommands())
        cursor += int(hmtx[glyph_name][0])
        previous = glyph_name

    return OutlinedText(" ".join(part for part in fragments if part), cursor, units_per_em)
