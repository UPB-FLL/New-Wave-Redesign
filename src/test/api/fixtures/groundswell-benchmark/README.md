# Groundswell competitor benchmark fixtures

Test data for the benchmark workflow in `docs/groundswell-competitor-benchmark.md`.

These files come from a real by-hand benchmark run on 2026-10-21 with every
identity replaced: two fictional accounts, `harborlightnutrition` (the business,
a licensed dietitian practice) and `fernandfield` (the competitor, a health
coaching practice). Handles, names, domains, page and ad IDs, bio links, captions,
ad copy and pricing-page context are invented or rewritten. Every date, like,
comment, play count, carousel size, follower count, price, policy flag and tag
finding is as observed, so the figures in `expected.json` are real outcomes of the
rules in the spec. Nothing here identifies the businesses it was derived from, and
nothing in it may be quoted as a fact about any real business.

| File | What it is | Spec step |
|---|---|---|
| `<handle>.profile.json` | `data.user` from `SCRAPECREATORS_GET_INSTAGRAM_PROFILE` (trim), reduced to the fields the engine reads | `social` |
| `<handle>.posts.json`, `<handle>.reels.json` | one page each of `LIST_INSTAGRAM_USER_POSTS` / `LIST_INSTAGRAM_USER_REELS` items, reduced to date, type, counts, carousel size, code/url and caption. The reels page repeats items that are also in the posts page, as the real API does. The competitor's placeholder `like_count: 3` marks hidden like counts, as the real API returns it. | `social_depth` |
| `ads/<name>.facebook.json` | the `adLibrary` block from `GET_FACEBOOK_PROFILE` and the `LIST_FACEBOOK_COMPANY_ADS` result by page ID | `ads_library` |
| `ads/<domain>.transparency.txt` | body text of the Google Ads Transparency Center page for the domain ("0 ads", any time) | `ads_library` |
| `ads/site-tags.json` | tags, third-party hosts, cookies and pixel findings from a headless render of each site | `site` / `ads_library` |
| `pricing/<handle>.prices.json` | every dollar match with 120 characters of context, per offer page, plus policy flags per page and per account | `pricing` |
| `expected.json` | the figures and classifications the rules in the spec must reproduce from these files, and the rules themselves | `social_depth`, `ads_library`, `pricing`, `authority`, `benchmark` |

In this repository, `src/test/api/groundswell-benchmark-fixtures.test.ts` runs
the engine's own rules on these files against `expected.json` and lists, with
reasons, where they give a different answer. The session's own checker,
`docs/benchmark-session-scripts/verify_fixtures.cjs`, is on the
`fixtures/groundswell-benchmark` branch; it recomputes the `social_depth`
figures and exits non-zero on any mismatch with `expected.json`:

```
node docs/benchmark-session-scripts/verify_fixtures.cjs src/test/api/fixtures/groundswell-benchmark
```

Two rule details learned while verifying, both in `expected.json.rules`:
the CTA keyword regex must be case-sensitive for the keyword (`Comment HEAL and`
must yield `HEAL`, not `HEAL and`), and the hidden-likes rule needs both halves
(the `comment_count >= 8` clause alone leaves four placeholder items counted as
3 real likes).
