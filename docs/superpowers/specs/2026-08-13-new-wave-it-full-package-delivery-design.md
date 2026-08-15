# New Wave IT Full Package Delivery Design

**Date:** August 13, 2026
**Status:** Approved design direction; pending written-spec review
**Repository:** `UPB-FLL/New-Wave-Redesign`
**Branch:** `feat/new-wave-brand-package`

## Purpose

Deliver the approved New Wave IT identity as a complete, usable brand package and integrate its web-ready parts into the existing Vite/React website. This document records the user's approval of the full package scope and governs how the existing production brand specification and implementation plan will be carried forward.

It is a delivery design, not a replacement for the detailed identity specification at `docs/superpowers/specs/2026-08-12-new-wave-it-brand-package-design.md` or its implementation plan at `docs/superpowers/plans/2026-08-12-new-wave-it-brand-package.md`.

## Authority and Inputs

The work must follow these sources in order:

1. The approved brand reference package in `docs/brand/`, especially `new-wave-it-brand-guide.pdf` and `new-wave-it-brand-preview-2400x1800.png`.
2. The detailed controlled-evolution brand specification and approved package plan.
3. The existing website's routes, forms, analytics, Supabase integrations, and content contracts where they remain compatible with the approved identity.

The package is an evolution of New Wave IT, not a new identity. It retains the New Wave IT name, three-current mark, cyan and green signals, and the heritage line "Don't get lost in the current." It must not introduce an alternate logo, palette, wordmark treatment, or generic cyber-security visual language.

## Full Package Scope

The completed delivery includes all package categories defined in the approved plan:

- Canonical design tokens, logo geometry, color combinations, typography rules, and a governed asset inventory.
- Web, favicon, application-icon, Open Graph, and structured-data assets.
- Social profile and campaign templates with platform-safe layouts.
- Sales, proposal, presentation, invoice, support communication, email-signature, and print collateral templates.
- An accessible, responsive website refresh that consumes the same brand sources.
- Brand documentation, package verification, and visual QA evidence.

The website refresh must preserve working routes and functional behavior unless a change is specifically needed for the approved design. Existing lead-capture forms, integration boundaries, and analytics remain intact.

## Delivery Architecture

One canonical brand source produces all downstream assets:

```text
approved guide + delivery specification
              |
              v
        brandkit canonical source
              |
              +--> print, document, social, and presentation assets
              |
              +--> generated web token/module exports
                                |
                                v
                 public/brand assets + React brand components
                                |
                                v
                       existing Vite/React website
```

### Canonical Brand Layer

`brandkit/` is the authoritative machine-readable source for logo paths, tokens, approved copy, clear-space rules, output dimensions, and accessible color pairings. It is the only place where the core logo geometry and semantic palette are defined.

Generated or exported web artifacts may be consumed by the application, but must not become competing sources of truth. The public web root contains only the files that browsers need; source files and production collateral stay outside it.

### Website Integration Layer

The React application receives generated tokens and canonical logo components through a small, explicit surface such as `src/brand/`, `NewWaveLogo`, and `BrandMark`. The current `Logo` component remains as a compatible entry point where needed while its implementation is brought into alignment with the canonical system.

Shared site surfaces are migrated before individual routes: global styles, navigation, footer, buttons, form controls, cards, typography, metadata, and recurring call-to-action patterns. Route-specific content is then updated within the same system, without a broad rewrite of working application logic.

### Asset and Metadata Layer

The public web subset lives under `public/brand/` and includes only browser-consumable exports. Favicons, the web manifest, Open Graph images, social cards, page metadata, and organization structured data must reference first-party local assets rather than legacy externally hosted images.

## Required Design Rules

- Use the approved palette: Deep Current `#09131D`, Current Navy `#101E2D`, Signal Cyan `#31C6CF`, Continuity Green `#62BE68`, Tide Blue `#317B92`, Cloud White `#F7FAFB`, Mist Gray `#E8EFF1`, Slate `#526271`, and Pure White `#FFFFFF`.
- Pure black is permitted only for monochrome print/PDF logo exports. It is not a digital palette token and must not be used for website, social, or application-interface treatments.
- Use Plus Jakarta Sans for display, Inter for body and interface text, IBM Plex Mono for technical detail, and Instrument Serif only for rare editorial emphasis where the reference guide permits it.
- Preserve the approved positioning: "Technology that keeps business moving." The heritage line remains supporting copy rather than a permanent logo attachment.
- Keep the visual language calm, technical, local, and accountable. Avoid gradients, glow, glass effects, beach motifs, generic shields, padlocks, hacker imagery, fabricated dashboards, and decorative noise.
- Honor contrast guidance, including no ordinary white text directly on Signal Cyan or Continuity Green, and support `prefers-reduced-motion`.
- Maintain readable type, clear hierarchy, controlled motion, responsive layouts, and real source assets at every viewport.

## Delivery Gates

1. **Canonical identity**: tokens, mark geometry, typography, contrast map, and output inventory are testable and documented.
2. **Digital and social assets**: first-party web assets, metadata imagery, favicon family, social profiles, and templates are generated and reviewed at intended sizes.
3. **Operational communications**: document, presentation, print, invoice, support, and signature templates are usable and follow the same identity.
4. **Website integration**: shared components and routes consume canonical brand sources while preserving behavior, accessibility, and responsive usability.
5. **Package QA**: automated verification, visual inspection, and a final inventory confirm that each promised deliverable exists and is internally consistent.

## Validation Strategy

Implementation will use focused tests and build checks for generated brand contracts, React integration, and asset inventories. Visual QA will include desktop and mobile browser screenshots, content overflow checks, metadata inspection, contrast validation, and manual review of exported collateral at useful viewing sizes.

The final package is ready only when:

- The existing site builds and its relevant test suite passes.
- Brand generation and package verification pass from a clean checkout.
- Public metadata and manifest references resolve to first-party assets.
- The new identity is visibly consistent across web, social, and operational outputs.
- The package contains no placeholders, broken links, unlicensed substituted fonts, or unpublished external asset dependencies.

## Boundaries and Release Control

This work is local to the feature branch until separately authorized. It does not include a production deployment, external publication, domain change, or destructive replacement of archived legacy assets.

Creating a Git commit, pushing the branch, or deploying a preview is a distinct release action and requires explicit authorization. The supplied package's automatic commit script is intentionally not used during delivery work.

## Risks and Responses

| Risk | Response |
| --- | --- |
| Legacy colors, gradients, and external images remain in isolated routes. | Introduce semantic tokens and audit shared plus route-level surfaces before visual sign-off. |
| The current logo component and public assets diverge. | Route every new logo use through canonical geometry and maintain a compatibility wrapper during migration. |
| Full package outputs become one-off files with unclear provenance. | Keep generators, source data, output inventory, and verification together under the canonical brand layer. |
| A cosmetic refresh breaks working lead flow or integrations. | Preserve interaction contracts and cover shared components plus affected user flows with focused tests. |
| Approved visual rules weaken under rushed route-by-route edits. | Use the brand guide, token contracts, and screenshot QA as explicit acceptance gates. |

## Deferred Decisions

- A public production release date and hosting target are outside this delivery design.
- Final platform account uploads, print vendor selection, and font licensing procurement remain operational actions for the business owner.
- Any content rewrite beyond the approved messaging system is limited to the minimum needed for the refreshed pages and must retain accurate service claims.
