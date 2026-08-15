"""Small, safe SVG construction helpers for portable brand assets."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from lxml import etree

SVG_NS = "http://www.w3.org/2000/svg"
_NSMAP = {None: SVG_NS}
_BLOCKED_TAGS = {"script", "image", "use", "linearGradient", "radialGradient"}
_BLOCKED_VALUE_MARKERS = ("url(", "http://", "https://", "//")


class SvgSafetyError(ValueError):
    """Raised when an SVG helper receives an unsafe asset value."""


def _tag(name: str) -> str:
    if name in _BLOCKED_TAGS:
        raise SvgSafetyError(f"unsupported SVG element: {name}")
    return f"{{{SVG_NS}}}{name}"


def _attributes(values: Mapping[str, Any]) -> dict[str, str]:
    attributes: dict[str, str] = {}
    for name, value in sorted(values.items()):
        if value is None:
            continue
        text = str(value)
        if name in {"href", "xlink:href"} or any(
            marker in text.lower() for marker in _BLOCKED_VALUE_MARKERS
        ):
            raise SvgSafetyError(f"unsupported SVG value for {name}: {text}")
        attributes[name] = text
    return attributes


def svg(view_box: str, **attributes: Any) -> etree._Element:
    """Create an SVG document root with a normalized viewBox."""
    root = etree.Element(_tag("svg"), nsmap=_NSMAP)
    root.set("viewBox", view_box)
    for name, value in _attributes(attributes).items():
        root.set(name, value)
    return root


def group(parent: etree._Element, **attributes: Any) -> etree._Element:
    return etree.SubElement(parent, _tag("g"), attrib=_attributes(attributes))


def path(parent: etree._Element, d: str, **attributes: Any) -> etree._Element:
    return etree.SubElement(parent, _tag("path"), attrib=_attributes({"d": d, **attributes}))


def rect(parent: etree._Element, x: float, y: float, width: float, height: float, **attributes: Any) -> etree._Element:
    return etree.SubElement(
        parent,
        _tag("rect"),
        attrib=_attributes({"x": x, "y": y, "width": width, "height": height, **attributes}),
    )


def defs(parent: etree._Element, **attributes: Any) -> etree._Element:
    return etree.SubElement(parent, _tag("defs"), attrib=_attributes(attributes))


def metadata(parent: etree._Element, value: str) -> etree._Element:
    element = etree.SubElement(parent, _tag("metadata"))
    element.text = value
    return element


def title(parent: etree._Element, value: str) -> etree._Element:
    element = etree.SubElement(parent, _tag("title"))
    element.text = value
    return element


def description(parent: etree._Element, value: str) -> etree._Element:
    element = etree.SubElement(parent, _tag("desc"))
    element.text = value
    return element


def serialize(root: etree._Element) -> bytes:
    """Return stable, readable XML for generated SVG assets."""
    return etree.tostring(
        root,
        encoding="UTF-8",
        xml_declaration=True,
        pretty_print=True,
    )
