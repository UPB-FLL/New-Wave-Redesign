# Website cookie, tracking, and privacy review (October 15, 2026)

A review of the New Wave IT website's Cookie Policy, Privacy Policy, and
Terms and Conditions against what the live site actually does. The policies
are operational drafts for New Wave IT LLC's attorney; nothing here is legal
advice.

## How the site was checked

- Source: every script, embed, storage call, CSP directive, and API route in
  this repository.
- Live scan: headless Chromium against `https://www.newwaveitfl.com` on
  October 15, 2026, unauthenticated, visiting `/`, `/contact`, `/support`,
  `/social-engineering`, and `/cookie-policy`, recording every request host,
  cookie, storage key, and console CSP report. The scan script is not in the
  repo; re-run one whenever a script, embed, or media source changes.

### What the scan found

| Observation | Detail |
| --- | --- |
| First-party cookies | None on any page |
| Local storage | `nw_content_v2:*` (CMS content cache) |
| Session storage | Empty until a support chat or portal session starts (`nwit.support.*`, `nw-chunk-reload-at`) |
| Scripts | the app bundle, `/_vercel/insights/script.js` (Vercel Web Analytics), `https://elfsightcdn.com/platform.js` (Elfsight) |
| Request hosts | `www.newwaveitfl.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `images.pexels.com`, `videos.pexels.com`, `elfsightcdn.com`, `*.supabase.co` |
| Third-party cookies | `__cf_bm` (30 min) and `_cfuvid` (session) on `.pexels.com`, set by Cloudflare for Pexels' media |
| Google Analytics / Tag Manager / ad pixels | None |
| CSP reports | `elfsightcdn.com/platform.js` is **refused** by the site's own `script-src` (`https://*.elfsight.com` does not cover `elfsightcdn.com`), so the chat widget never runs |

## Applicable law (U.S.-only site, Florida operator)

| Law | Applies? | Why | Handled by |
| --- | --- | --- | --- |
| CalOPPA (Cal. Bus. & Prof. Code 22575) | Yes, to any site collecting PII from California residents | No revenue threshold | Conspicuous footer link, categories collected, third parties, Do Not Track disclosure, change process, effective date |
| CCPA/CPRA | Unlikely (revenue and volume thresholds) | New Wave IT LLC is a small business | Rights-request channel, no sale/share statement, GPC statement, notice at collection under every form |
| Florida Digital Bill of Rights | Core duties no ($1B threshold); sensitive-data sale ban is broader | Site sells no data | "Does not sell sensitive personal data" statement |
| Texas, Virginia, Colorado, Connecticut and similar | Unlikely (volume thresholds or SBA small-business carve-out) | Same | Same rights-request channel and statements |
| CAN-SPAM | Yes | Marketing email | Opt-out sentence in the Privacy Policy |
| TCPA | Yes, for texting | The support chat texts the *technician*, not the visitor; the visitor's phone is for a call-back | Notice under the chat form; marketing texts only with consent (Terms) |
| COPPA | Yes | Not directed to children | Under-13 statement |
| FIPA (Fla. Stat. 501.171) | Yes | Breach-notification and reasonable security | Security section; no change needed |
| GDPR / UK GDPR / ePrivacy | No | U.S.-only offering, stated in every policy | n/a |

**Cookie banner**: not required. The site sets no first-party cookies, its
analytics is cookieless, and it has no advertising or cross-site tracking.
The only cookies are Cloudflare bot-protection cookies on the Pexels domain,
which are necessary to deliver the media. The Cookie Policy now says this
plainly. Revisit before activating Google Analytics, any ad pixel, or any
embed that tracks across sites.

## Gaps found and what changed

| # | Gap | Severity | Change |
| --- | --- | --- | --- |
| 1 | Both policies said the Elfsight chatbot is "active"; the CSP blocks it on every page | High (inaccurate disclosure) | Policies now describe the widget as something the page is built to load and say what Elfsight may do *when it loads* |
| 2 | Pexels/Cloudflare cookies (`__cf_bm`, `_cfuvid`) and Google Fonts requests were undisclosed | High | Listed in the Cookie Policy table and the Privacy Policy disclosure list |
| 3 | Vercel Analytics described vaguely ("may receive technical usage and interaction data") | Medium | Now states it is cookieless, lists the data points, and the 24-hour hash discard, per Vercel's documentation |
| 4 | No cookie/storage inventory | Medium | Inventory tables keyed to the scan date (`COOKIE_INVENTORY_REVIEWED`) |
| 5 | No Do Not Track disclosure (CalOPPA) | Medium | "Do Not Track and Global Privacy Control" section |
| 6 | No notice at collection on forms | Medium | `FormPrivacyNotice` under the contact, quote, support email, support chat, and portal sign-in forms |
| 7 | IP-based U.S.-only gate and spam screening on forms undisclosed | Low | Added to "Information We Collect" and "How We Use Information" |
| 8 | No marketing-email opt-out statement (CAN-SPAM) | Low | Added |
| 9 | No "sensitive data" statement (Florida, Texas) | Low | Added |

Effective dates: Privacy Policy and Cookie Policy moved to October 15, 2026.
The Terms and Conditions were reviewed and left unchanged (August 11, 2026).

## Terms and Conditions: review notes for the attorney

Reviewed from New Wave IT's side. Nothing required a change; these are
judgment calls worth an attorney's hour:

- **Limitation of liability** has no dollar cap when no signed agreement
  governs ("limited only to the maximum extent permitted by applicable
  law"). A cap tied to fees paid is the market norm; the design spec
  deliberately avoided inventing commercial terms.
- **No arbitration or class-action waiver**, by design. Fine for a B2B
  services firm; confirm the preference.
- **Changes by continued use** is a browsewrap-style acceptance, which
  courts enforce inconsistently. The form notice ("By submitting, you agree
  to our Terms") strengthens it for the forms, which is where the Terms
  matter most.
- **Indemnification** is one-sided (customer indemnifies New Wave IT) but
  narrow (misuse, infringing content, material breach). Market-standard for
  website terms.

## Follow-ups (not done here; outside a legal review)

1. **Elfsight is blocked by the site's own CSP.** `vercel.json` allows
   `script-src https://*.elfsight.com` but `ElfsightChatbot.tsx` loads
   `https://elfsightcdn.com/platform.js`. Either add `https://elfsightcdn.com`
   to `script-src` (and whatever hosts the widget then fetches) or remove the
   component. Decide deliberately: enabling it starts a third-party script
   that sets cookies and receives chat content. Re-scan and update the Cookie
   Policy table after either change.
   *Resolved the same day: the owner chose removal. The component, its CSP
   entries, and both policies' references are gone.*
2. Resolved the same day: the `stream.mux.com` `connect-src`/`media-src`
   entries, the unused `useHlsVideo.ts`, and the `hls.js` dependency are removed.
3. Resolved the same day: `Permissions-Policy` now sets `geolocation=()`.
4. Before Google Analytics or any ad pixel goes live, follow the activation
   gate in `docs/superpowers/specs/2026-08-11-legal-policies-design.md`.
