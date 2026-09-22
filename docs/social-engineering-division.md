# New Wave: Social Engineering — division launch

The human-risk division of New Wave IT, added to www.newwaveitfl.com without
changing any existing New Wave IT URL. Brand source: *NWSE Brand Guidelines
v1.0* (September 2026).

## URLs

| Page | URL |
|---|---|
| Division hub | `/social-engineering` |
| Phishing simulation | `/social-engineering/phishing-simulation` |
| Vishing & pretext testing | `/social-engineering/vishing-pretext-testing` |
| Physical social engineering | `/social-engineering/physical-social-engineering` |
| Security awareness training | `/social-engineering/security-awareness-training` |
| Contact | `/social-engineering/contact` |

## Why a subfolder

| Option | SEO effect on the division | Risk to New Wave IT | Cost |
|---|---|---|---|
| **Subfolder `/social-engineering` (chosen)** | Inherits the domain's authority from day one; one sitemap, one Search Console property | None: additive URLs only, no redirects | Code only |
| Subdomain `socialengineering.newwaveitfl.com` | Search engines treat it largely as a separate site that has to earn authority | None | DNS + Vercel domain + host-based routing in the SPA |
| Separate domain | Starts from zero authority and backlinks | None | Domain, hosting, second site to maintain |

The brand kit also lists newwaveitfl.com as the division's web address (email
signature, README), so the subfolder matches the brand architecture: the
division is a New Wave IT division, not a separate company.

## How the IT site's SEO is protected

- **No existing URL, title, description, canonical, or structured data
  changed.** `src/test/seo/division-integration.test.ts` pins all 30
  pre-existing sitemap URLs, the rewrite order in `vercel.json`, and the
  homepage identity in `index.html`.
- **Prerendered division heads.** The SPA serves one `index.html` whose head
  describes the IT homepage. Without intervention every division URL would ship
  the IT homepage's title and canonical until JavaScript ran — link previews
  (LinkedIn, Slack, Facebook) and non-JS crawlers would see IT-homepage
  duplicates. At build time `src/divisions/socialEngineering/prerender.ts`
  writes `dist/social-engineering/**/index.html` with each page's own title,
  description, canonical, Open Graph, favicon, manifest, and JSON-LD, and a
  `<noscript>` H1 fallback. `vercel.json` rewrites each division URL to its file
  ahead of the SPA catch-all. The build fails if `index.html` changes shape and
  a tag can't be found exactly once.
- **Runtime twin.** `useDivisionMeta` keeps the same values during in-app
  navigation and restores New Wave IT's favicon and metadata on the way out.
- **Entity linking, not impersonation.** Division pages drop the parent's
  `LocalBusiness` block and declare their own `Organization` with
  `parentOrganization` → `https://www.newwaveitfl.com/#organization`.
- **No keyword collisions.** Each division page targets one cluster (hub:
  social engineering testing; then phishing simulation, vishing/pretext,
  physical assessments, awareness training). The IT cybersecurity page's
  "Security Awareness" card now links to the division's training page, so the
  topic has one owner instead of two competing pages.
- **Performance.** Division pages are lazy-loaded chunks; IT pages download
  ~1.8 kB (gzip) of extra router code and nothing else.
- **Internal links.** The IT navbar Services menu, the IT footer, and the
  cybersecurity page link into the division; every division page links back to
  New Wave IT (endorsement bar, breadcrumbs, footer).

## Brand implementation

- Tokens: `src/divisions/socialEngineering/division.css` adds only Lure Amber
  (`--nwse-lure-amber`, graphics and text on dark) and Lure Amber Deep
  (`--nwse-lure-amber-deep`, text/links/buttons on light). Everything else
  inherits `--nw-*`.
- Logos: the kit's outlined SVGs are served from
  `public/brand/social-engineering/` and rendered by `DivisionLogo`, which
  clamps to the guide's minimum widths. Reversed art is used only on Current
  Navy / Deep Current.
- Parent + division together (`FamilyLockup`, footer): parent leads, division
  below or to the right, sized so both "NEW WAVE" wordmarks share a cap height.
- Naming: "New Wave: Social Engineering" on first reference; "NW Social
  Engineering" after; never "NWSE" — enforced by `seo.test.ts`.
- Leads from `/social-engineering/contact` arrive with the subject prefixed
  `[New Wave: Social Engineering]` and a "Division" line in the notification.

## Editing

- Copy lives in `src/divisions/socialEngineering/content/`. Tests enforce
  unique titles/H1s, description lengths, the naming rule, sentence-case
  headlines, and no `%` claims.
- To add a service: add a content file, add it to `divisionServices` in
  `content/index.ts`, add its slug to `DIVISION_SERVICE_SLUGS` in `site.ts`, add
  a rewrite in `vercel.json` and a `<url>` in `public/sitemap.xml`. The tests
  fail until all five agree.

## Launch checklist (owner)

1. **Review the copy** — it states process commitments the business must
   honor (written authorization before any test, coaching not discipline, no
   targeting of personal accounts, private coaching, re-tests, report
   contents). Adjust anything that isn't how you operate.
2. After deploy, confirm the prerendered heads are live:
   `curl -s https://www.newwaveitfl.com/social-engineering | grep -E '<title>|canonical'`
   should show the division title and `…/social-engineering` canonical.
3. Search Console: resubmit `sitemap.xml`; URL-inspect the hub and one service
   page; request indexing.
4. Rich Results Test / Schema validator on the hub (Organization, Breadcrumb,
   FAQ) and one service page (Service).
5. LinkedIn Post Inspector on the hub URL to refresh the link-preview card.
6. Google Business Profile: add the division's services to the existing New
   Wave IT profile rather than creating a second listing at the same address.
7. Social profiles: use `03_Social` from the brand kit; link to
   `/social-engineering`.

## Follow-ups (not in this change)

- ~~IT pages share the homepage's pre-JavaScript canonical.~~ Fixed. Every
  static New Wave IT route is now prerendered too (see "Prerendered page heads"
  in `CLAUDE.md`).
- The homepage shell's raw meta description (`index.html`) differs from the
  one `HomePage` sets at runtime. The title and canonical match.
- The Elfsight chat widget is global and appears on division pages too.
