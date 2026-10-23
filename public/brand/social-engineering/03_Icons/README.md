# GroundSwell custom icons

Twelve original service icons, drawn for GroundSwell on a 32 × 32 coordinate grid.

## Files

- `SVG/color`: Deep Current, Signal Cyan, Tide Blue and an Amber highlight.
- `SVG/navy`: one-color Deep Current, #09131D.
- `SVG/white`: one-color white, #FFFFFF, for dark backgrounds.
- `PNG_256`: matching 256 × 256 transparent exports in all three variants.
- `groundswell-icons-sprite.svg`: monochrome SVG symbols using `currentColor`.
- `GroundSwell_Icon_Contact_Sheet.svg` and `.png`: labeled overview.

## Construction and use

Every icon uses a 32-unit viewBox and a 1.8-unit stroke with rounded caps and joins.
Use a 32 px rendered size for primary interface usage; 24 px is the compact size.
For tiny controls, use the navy or white version. Keep the viewBox intact and scale
uniformly. Leave clear space around the icon; do not stretch, add shadows or mix
stroke widths. The color variants work best on Cloud White (#F7FAFB).

The icon names describe design subjects, not contractual service commitments.
Use clear visible labels and accessible names in interfaces. Decorative icons
should be hidden from assistive technology.

## Sprite usage

Embed the sprite content once into an HTML page, then reference its symbols:

```html
<svg width="32" height="32" role="img" aria-label="Brand strategy"
     style="color:#09131D">
  <use href="#gs-icon-strategy"></use>
</svg>
```

All geometry is editable vector artwork. Contact-sheet lettering is outlined;
the selected font families and licenses are provided elsewhere in the package.
