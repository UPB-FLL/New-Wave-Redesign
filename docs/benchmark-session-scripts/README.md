# Benchmark session scripts (2026-10-21)

The scripts used by hand for the first competitor benchmark, kept as reference for
porting into `api/_lib/groundswell/` per `docs/groundswell-competitor-benchmark.md`.
They are not wired into the build or the tests. Real identifiers are replaced by
`BUSINESS_DOMAIN`, `COMPETITOR_DOMAIN` and `BUSINESS_HANDLE`.

- `scan.cjs`: renders a site in Chromium with network capture and lists tags, third-party hosts and cookies (the Site current's tag scan, done dynamically).
- `adlib.cjs`: renders the Meta Ad Library UI and the Google Ads Transparency Center for a handle and domain and prints the body text.
- `textdump.cjs`: renders a list of URLs, writes each page's text and prints its dollar matches (the `pricing` step's extraction).
- `stats.cjs`: the per-account engagement figures from a reduced `data.json` (`{business, competitor}` with `followers` and `items`).
- `verify_fixtures.cjs`: recomputes the `social_depth` figures from the fixtures in `src/test/api/fixtures/groundswell-benchmark/` and checks them against `expected.json`.

They expect `playwright-core` installed next to them and Chromium at
`/opt/pw-browsers/chromium`; the engine uses puppeteer-core instead, so port the
logic, not the launcher.
