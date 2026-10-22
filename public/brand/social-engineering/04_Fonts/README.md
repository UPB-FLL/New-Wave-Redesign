# GroundSwell typography files

## Font roles

| Role | Family | Recommended weights |
| --- | --- | --- |
| Headlines and display | Plus Jakarta Sans | 600, 700, 800 |
| Body copy, presentations and interface text | Inter | 400, 500, 600 |
| Small labels, metrics and utility details | IBM Plex Mono | 400, 500 |

These are existing, openly licensed typefaces selected for the GroundSwell identity. They retain their original names and authorship. A custom GroundSwell logo is separate vector artwork; it is not a new font family.

## Desktop use

Install the `.ttf` files inside each family folder. Plus Jakarta Sans and Inter are supplied as variable fonts, so one upright file contains the full weight range. Their italic variable files are also included. IBM Plex Mono is provided in Regular and Medium.

On Windows, open the font file and choose Install. On macOS, open it in Font Book and choose Install Font. Restart an already-open design application if the new family does not appear.

## Website use

Keep this folder structure and load `fonts.css`. It references the included Latin WOFF2 files and uses `font-display: swap`.

```css
h1, h2, h3 {
  font-family: "Plus Jakarta Sans", sans-serif;
}
body {
  font-family: "Inter", sans-serif;
}
.label, .metric {
  font-family: "IBM Plex Mono", monospace;
}
```

The WOFF2 files are Latin subsets for compact web delivery. Use the complete TTF files for desktop artwork, or obtain the matching additional language subsets from Google Fonts when building a multilingual site. The included website CSS covers upright styles; desktop italic styles are supplied as TTF.

## License and provenance

All three families are bundled under the SIL Open Font License 1.1. Each family folder includes its full `OFL.txt` copyright and license notice. Keep those notices with the font files when redistributing them. Font binaries have not been edited or rebranded; only the variable-font filenames have been made easier to read.

- Plus Jakarta Sans: https://github.com/tokotype/PlusJakartaSans
- Inter: https://github.com/rsms/inter
- IBM Plex: https://github.com/IBM/plex
- Distribution source: https://github.com/google/fonts

`sources.json` records each exact download URL, byte size and SHA-256 checksum. Desktop files were retrieved from the official Google Fonts repository. Web files were retrieved through the official Google Fonts CSS service and its fonts.gstatic.com font URLs.

Prepared for the GroundSwell brand package on October 22, 2026.
