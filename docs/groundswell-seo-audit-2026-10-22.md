# GroundSwell SEO audit — October 22, 2026

Observed October 22 at 9:14 p.m. America/New_York (October 23, 01:14 UTC), after the final artwork and section colors were built. This pass uses GroundSwell’s actual `scanSite` and `parseSite` from `api/_lib/groundswell/currents/site.ts`, plus Chromium, through `scripts/audit-groundswell-seo.ts`.

The production marketing page returns HTTP 200 with its own title, description, canonical, Open Graph URL, valid JSON-LD, and sitemap entry. Its social image returns HTTP 200 as a 1200 × 630 PNG. `robots.txt` allows public pages; neither the response nor its meta directives prevents indexing. However, the initial HTML has an empty React root and a short `noscript` summary. The real marketing page requires JavaScript.

| GroundSwell Site Current observation | Live marketing page | Local candidate |
| --- | ---: | ---: |
| Body words in initial HTML | 0 | 3,658 |
| Body H1s in initial HTML | 0 | 1 |
| App shell detected | Yes | No |
| Technical findings | `app_shell` (medium), `missing_body_h1` (low) | None detected |
| FAQs in Chromium DOM | 6 | 6 |
| Browser JavaScript errors | 0 | 0 |

The body counts exclude head, comments, scripts, styles, templates, and `noscript`. They are diagnostic parser counts, not a quality score or target word count. The earlier parser counted the fallback as content, concealing the empty body.

The candidate now prerenders the actual GroundSwell React component into the built page. It shares the runtime content and page metadata, retains normal browser startup and interactions, and avoids maintaining a separate SEO copy. Build validation rejects a missing body or heading. Chromium with JavaScript disabled confirms one main region, one H1, and six FAQ elements. At 320px, the document stays 320px wide and native FAQ expansion works. With JavaScript enabled, the candidate has 3,086 main DOM text words; no duplicate title, canonical, or JSON-LD block appeared. Replaying the saved HTML response with current assets also mounts one main region and H1, contains no duplicate fallback, and activates the Research tab when clicked. The software schema now has the page’s existing description and is explicitly linked as the page’s main entity.

The engine also gained body-only parsing, structured technical findings, valid JSON-LD parsing, robots/header observations, and a detector for empty roots whose module script is in the head. Its report integration carries those observations and their limitations into the plan and reports. These changes address the diagnostic gap discovered while auditing the engine’s own page.

The homepage has the same empty-body pattern and is recorded as a follow-up. This change only prerenders GroundSwell’s public marketing body; extending actual component rendering to the homepage and other static routes remains broader work. The candidate has not been deployed. Production should be checked again after deployment. Google indexing, rankings, Search Console coverage, PageSpeed results, and field Core Web Vitals were not measured or inferred. FAQ markup alone does not establish rich-result eligibility.

Evidence:

- [Live marketing engine and Chromium observations](../artifacts/seo/2026-10-22/live-engine-audit.json)
- [Candidate engine, Chromium, and disabled-JavaScript observations](../artifacts/seo/2026-10-22/candidate-engine-audit.json)
- [Homepage engine observations](../artifacts/seo/2026-10-22/live-home-engine-audit.json)
- [Live initial marketing HTML](../artifacts/seo/2026-10-22/live-groundswell.raw.html) and [HTTP headers](../artifacts/seo/2026-10-22/live-groundswell.headers)

The JSON records source hashes and observation times. The 320px screenshot is kept outside the repository at `/tmp/candidate-engine-audit.no-js-320.png`; its path is recorded in the candidate JSON. For the candidate, HTTP 200 is explicitly a parser context for a built file, and the separate local browser response is verified against the file’s SHA-256. Production canonical URLs are retained as parser context for local previews.

Reproduce the live observation:

```bash
LD_LIBRARY_PATH=/tmp/al2023/lib npx vite-node scripts/audit-groundswell-seo.ts \
  --url https://www.newwaveitfl.com/social-engineering/groundswell \
  --out artifacts/seo/2026-10-22/live-engine-audit.json \
  --browser /tmp/chromium
```

Build with `npm run build`, then run `npm run preview -- --host 127.0.0.1 --port 4181 --strictPort`. In another terminal:

```bash
LD_LIBRARY_PATH=/tmp/al2023/lib npx vite-node scripts/audit-groundswell-seo.ts \
  --url https://www.newwaveitfl.com/social-engineering/groundswell \
  --html dist/social-engineering/groundswell/index.html \
  --render-url http://127.0.0.1:4181/social-engineering/groundswell/ \
  --out artifacts/seo/2026-10-22/candidate-engine-audit.json \
  --browser /tmp/chromium
```

The preview URL needs its trailing slash to serve the generated directory. The existing production Vercel rewrite already serves that file at the canonical URL without the slash. The audit command rejects previews serving a different document. Chromium paths above match this environment; supply the installed browser and library paths elsewhere, or omit `--browser` for a raw Site Current audit. Screenshots default to the OS temporary directory; `--screenshot <path>` can select another location outside the repository.

Verification: final production build, app and Vite configuration typechecks, scoped ESLint, 92 SEO tests across four files, saved-HTML startup, and both browser modes (including 320px without JavaScript) passed. Existing Browserslist age and bundle-size warnings remain.

Google recommends unique metadata, consistent canonical URLs, and server or prerendered content because some crawlers do not execute JavaScript. This implementation follows that guidance without changing responses by user agent. [Google JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [Google rendering guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering).
