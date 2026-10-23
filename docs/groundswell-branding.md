# GroundSwell

GroundSwell is both the growth audit engine and its app. Use the capital G and S, with “by New Wave” as the endorsement. The supplied v2 package in `public/brand/social-engineering` is the visual source of truth; its guide, token JSON, font licenses, and outlined logo masters govern future changes.

The public product page is `/social-engineering/groundswell`. Partners sign in at `/groundswell`; staff use `/groundswell/admin`. The former `/social-engineering/croissance` page redirects permanently to the product page. Old partner invitation and password URLs retain their redirects. Croissance is a legacy name, kept only where compatibility or historical records require it.

| Item | Production asset |
| --- | --- |
| Primary logo, light surfaces | `01_Logos/SVG/GroundSwell_Primary_Color.svg` |
| Primary logo, navy surfaces | `01_Logos/SVG/GroundSwell_Primary_Reverse.svg` |
| Email logo | `01_Logos/PNG/GroundSwell_Primary_Color.png` |
| App mark | `01_Logos/SVG/GroundSwell_Mark_Reverse.svg` |
| Small SVG favicon | `01_Logos/SVG/GroundSwell_Micro_Navy.svg` |
| Digital icons and manifest | `06_Digital` |
| Share image and editable vector source | `06_Digital/GroundSwell_OG_1200x630.png` and `.svg` |
| Decorative contour field | `02_Graphics/GroundSwell_Contours_Dark.svg` |
| Original licensed web fonts | `04_Fonts/fonts.css` |
| Colors and type roles | `06_Digital/GroundSwell_Brand_Tokens.json` |

All asset paths above are relative to `/brand/social-engineering/`. Served logo and contour files are unchanged copies of the supplied masters. The share image uses those masters and the bundled fonts; the SVG embeds both so it can be exported without remote assets. Retain the original font family names and OFL license files.

Use Plus Jakarta Sans for display, Inter for body and controls, and IBM Plex Mono for utility labels and metrics. Use navy `#09131D`, cyan `#31C6CF`, and the supplied neutral palette. Primary actions use amber `#F2A33A` with navy text. Use tide `#317B92` for links on light surfaces. Primary logos stay at least 220px wide, scale uniformly, and retain clear space of half the visible monogram height.

Shared brand variables live under `.gs-branding`; staff, partner, and public product layouts use `.gs-admin`, `.gs-portal`, and `.gs-marketing`. Browser icons and font stylesheets are owned while a GroundSwell layout is mounted and restore on exit, including a cold load of the prerendered product page.

Portal branding is separate from report branding. Customer reports keep the business’s identity and the partner’s “Prepared by” name and logo. Both the current and legacy engine names are removed from white-label narrative text. Invitations and password resets use GroundSwell branding and the existing private account flows.

The Social Engineering hub and its six service pages use GroundSwell as their shared research and planning engine. The public engine explorer follows the existing Growth audit, Competitor plan, and Integrated plan phases; its links lead to the real sample audit and the existing partner workspace. It explains the workflow without starting runs or reading client accounts. The division remains New Wave: Social Engineering; GroundSwell identifies the engine behind the work.

Division surfaces use the supplied navy, foam, cyan, tide, and amber palette, original font families, and unchanged contour master. The original icon SVGs are restored under `03_Icons`; the website's accessible icon component normalizes their geometry, retaining their colors at larger sizes and using a legible single color for compact controls. The navigation, service cards, engine flow, and related diagrams share that family. See `public/brand/social-engineering/03_Icons/website-provenance.md` for source and adaptation details.
