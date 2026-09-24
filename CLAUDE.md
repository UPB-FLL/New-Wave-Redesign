# New Wave IT Redesign Project

## Recent Changes

### Prerendered page heads for every static route (2026-09-22)

Every static New Wave IT page now serves raw HTML with its own `<title>`,
description, canonical, and Open Graph/Twitter tags. Before this change, each
of them declared the homepage canonical until JavaScript ran.

- **One source of truth**: `src/lib/routeMeta.ts` (`IT_PAGE_META`) holds the
  metadata for 23 static routes. The 6 `/l/*` guides come from
  `src/lib/serviceGuides.ts`. Pages call
  `usePageMeta(IT_PAGE_META['/path'])` or spread that entry and add `jsonLd`,
  which stays runtime-only. To change a page's title or description, edit the
  registry, not the page.
- **Shared resolver**: `src/lib/pageMeta.ts` provides `resolvePageMeta()` and
  `headEntries()`. `usePageMeta` and the prerender both use them, so the raw
  head and the hydrated head cannot drift.
- **Build**: `src/lib/prerenderHead.ts` (`applyPageHead`, `renderRouteHtml`),
  called from the `vite.config.ts` plugin, writes `dist/<route>/index.html`.
  `vercel.json` has one exact rewrite per route before the catch-all. The
  division prerender uses the same module.
- **Keywords**: every page writes `meta[name="keywords"]`; pages without their
  own get `DEFAULT_KEYWORDS` (the shell's value, pinned by a test).
- **Not prerendered**: `/` (the untouched shell) and the data-driven routes
  `/service/:slug`, `/threat/:slug`, and `/blog/:slug`.
- **Adding a static page**: add it to `IT_PAGE_META`, use it in the page, add
  a `vercel.json` rewrite and a sitemap `<url>`. The tests fail until all of
  them agree.
- **Tests**:
  - `src/test/seo/it-prerender.test.ts` checks the raw head of each route.
  - `src/test/seo/it-route-parity.test.tsx` renders each page at its real
    `App.tsx` route and compares its runtime meta with the prerender.
  - `src/lib/pageMeta.test.ts` covers the resolver.

### New Wave: Social Engineering division (2026-09-22)

A new division lives in the `/social-engineering` subfolder: New Wave IT's
social media, brand development, website design, marketing, integration, and
digital oversight division ("Growth decisions made on data, not guesswork.").
No New Wave IT URL, title, canonical, or structured data changed. Full notes:
`docs/social-engineering-division.md`.

- **Positioning**: the first launch (#73) described security testing
  (phishing, vishing, awareness training), which was wrong. #74 took it
  offline; the relaunch rebuilt the content around six services. "Social
  Engineering" is the brand name only: never describe the division as
  security testing (a test in `pages.test.tsx` guards this). The four retired
  service URLs 308 to the hub (`RETIRED_SERVICE_SLUGS`).
- **Publish switch**: `DIVISION_PUBLISHED` in `site.ts` gates the routes, the
  prerender, and the IT navbar/footer entries. Flip it together with
  `vercel.json` and the sitemap; `division-integration.test.ts` holds them in
  step.

- **Code**: `src/divisions/socialEngineering/`. `site.ts` holds paths and
  constants, `content/` holds the copy, `seo.ts` the per-page SEO and JSON-LD,
  `prerender.ts` the build-time head rewrite, `useDivisionMeta.ts` its runtime
  twin, and `routes.tsx` the lazy route components. It also holds the division
  components and pages, plus `division.css`, which adds only Lure Amber and
  Lure Amber Deep.
- **Prerender**: a `vite.config.ts` plugin writes
  `dist/social-engineering/**/index.html` with each page's own title,
  canonical, OG tags, favicon, and JSON-LD. `vercel.json` rewrites each
  division URL to its file before the SPA catch-all. The build throws if
  `index.html` changes shape.
- **Brand assets**: `public/brand/social-engineering/` holds the kit's
  outlined SVG logos, icons, OG image, and manifest. Naming is "New Wave: Social
  Engineering" on first reference, then "NW Social Engineering", and never
  "NWSE".
- **Type (division only)**: `type.css` self-hosts Plus Jakarta Sans, Inter, and
  IBM Plex Mono (OFL, `public/brand/social-engineering/fonts/`) as
  `'NWSE Display/Text/Mono'`, scoped to `.nwse-root`. Headings, body, labels,
  and kickers use its `nwse-type-*` scale, not Tailwind font utilities.
  `.nwse-kicker` and `.nwse-label` set colour only.
- **Icons (division only)**: `icons/iconData.ts` (pure data, 35 icons) and
  `<NwseIcon name size title? accentColor? />`. The single amber accent wave
  follows `--nwse-icon-accent`. There is no `lucide-react` under
  `src/divisions`, and a test enforces it. The shared `Contact` takes an
  optional `icons` prop that defaults to Lucide. See the "Icons" section of
  the division doc.
- **Motion (division only)**: `motion/` holds the line-art scenes (SVG +
  framer-motion; the contract is `motion/SceneFrame.tsx`'s header comment).
  `motion/scenes/index.ts` (`PAGE_SCENES`) lazy-loads one scene per page;
  `SceneSlot` reserves the 3:2 box and loads a scene only near the viewport.
  Placed by `DivisionHero` (`scene`, `sceneOnPhones`, `sceneSize`) on the hub,
  the six service pages, and `/contact`, and by `PointGrid` in the hub's "What
  we gather" band. Scenes play once, hold the final frame, and render it
  statically under reduced motion (read live); they are `aria-hidden`, and
  left out in forced colours and print. A scene that fails to load leaves
  its empty box (`SceneSlot`'s own error boundary, fresh for every page) and
  never triggers main.tsx's stale-chunk reload: the registry loads scenes
  through `loadDecorativeChunk` (`src/lib/chunkReload.ts`). The hero's scene
  layout switches at em widths (48/64/80em), like the header, so enlarged
  text keeps the text column. No IT module reaches `motion/`, even through
  division modules; the registry and `SceneSlot` reach no other `motion/`
  module statically; and Tailwind skips the folder (`scenes.test.tsx`). See
  the "Motion" section of the division doc.
- **Section grounds (division only)**: every light `Band` and the shared
  contact section carry the division's currents faintly, as a background
  image (`components/bandCurrents.svg`, painted by `.nwse-band::before` in
  `division.css`). The cap on their strength is text contrast (4.5:1 wherever
  a current passes behind text), which `grounds.test.tsx` computes. The step
  timeline's band stays plain on phones, where its labels sit on the ground.
  Dark sections use the hero's currents (`DarkCurrents`).
- **IT touch points**: a Navbar Services-menu entry and mobile link, a Footer
  link ("Social Media & Marketing"), and sitemap entries. `App.tsx` hides the IT
  `WaveBackground` and `FloatingNav` on division paths.
- **Leads**: `Contact` accepts optional `inquiry`, `intro`, `icons`, and
  `details` props. The API allow-lists `inquiry: 'social-engineering'` and
  prefixes the notification subject.
- **Customers and Contact us** (`/social-engineering/customers`,
  `/social-engineering/contact-us`): linked from the header, phone sheet, and
  footer next to the amber "Book a discovery call" (`/contact`, which is
  unchanged apart from those links). Customers says what
  each business is, never what was done for it: no services, results,
  ratings, quotes, logos, or screenshots (`customers.test.ts`). Contact us
  takes phone, email, and address from the footer's CMS values and leaves out
  the Call row rather than show the placeholder `(954) 555-0100`
  (`contactDetails.ts`). See "Customers and Contact us" in the division doc.
- **Adding a service**: update the content file, `divisionServices`,
  `DIVISION_SERVICE_SLUGS`, the `vercel.json` rewrite, the sitemap, and a
  hero scene registered in `PAGE_SCENES` (`motion/scenes/index.ts`). The
  tests fail until all of them agree.
- **Adding a page**: a path in `site.ts`, content in `content/`, a
  `…PageSeo()` in `allDivisionPages()` (`seo.ts`), the page in `pages/`, its
  module in `divisionPageModule()` (`preload.ts`), a lazy route in
  `routes.tsx` and a `<Route>` in `App.tsx`'s `DIVISION_PUBLISHED` block, a
  `vercel.json` rewrite, a sitemap `<url>`, and header/footer links if needed.
  Follow Customers or Contact us; the tests fail until they agree.
- **Tests**: `src/divisions/socialEngineering/*.test.ts(x)` and
  `src/test/seo/division-integration.test.ts`, which pins every pre-existing
  sitemap URL and the IT homepage head.

### Rotating Hero Video (2026-09-09)

The home hero's animated WebGL wave (`HeroRibbonField` / `ribbonScene`) was
replaced with a full-bleed background video that rotates through muted
Pexels clips:

- **Clips** (`src/components/hero/heroVideoClips.ts`): seven curated
  Pexels videos covering IT services, managed services, and help desk,
  hotlinked from `videos.pexels.com` (720p/1080p, 960px under 640px) with
  Pexels poster frames; `CLIP_PLAY_SECONDS` and `CROSSFADE_MS` tune the
  rotation
- **Component** (`src/components/hero/HeroVideoRotator.tsx`): plays one
  clip at a time with the next clip preloading underneath, crossfades
  after `CLIP_PLAY_SECONDS` or when a clip ends, skips clips that error,
  pauses when off-screen or the tab is hidden, and applies a brand tint;
  reports `onReady` on the first playing clip and `onFailure` if every
  clip errors or Data Saver is on, so `Hero.tsx` keeps its static
  `CurrentField` fallback logic unchanged
- **CSP**: `vercel.json` `media-src` allows `https://videos.pexels.com`
- **Tests**: `src/components/hero/HeroVideoRotator.test.tsx`

### Contact Form Spam Prevention (2026-08-25)

Layered, server-enforced screening on `/api/send-contact-email`:

- **Shared checks** (`api/_lib/spam.ts`): stateless HMAC timing token
  (GET issues it, POST must return it aged 3s–6h; secret is
  `CONTACT_FORM_TOKEN_SECRET`, falling back to `RESEND_API_KEY`),
  honeypot field, gibberish-name and message-content heuristics,
  gmail-alias-collapsing email normalization
- **Route**: in-memory rate limits (5/10min per IP, 3/hour per mailbox),
  detected spam gets a fake success response and no email; the
  `contact_submissions` insert moved server-side (service role)
- **Contact.tsx**: fetches the token on mount, renders the hidden
  `company_website` honeypot, no longer inserts into Supabase directly
- **Migration** `20260825120000` drops the public INSERT policy on
  `contact_submissions` (apply after deploying the frontend)
- **Geo gate** (`api/_lib/geo.ts`): non-US traffic (per Vercel's
  `x-vercel-ip-country` header) is silently dropped on the contact, quote,
  and support-ticket endpoints; override with `GEO_ALLOWED_COUNTRIES`
  (comma-separated, `*` disables); fails open off-Vercel
- **Quote + support-ticket endpoints** also got the IP/mailbox rate limits
  (no honeypot/token yet — their forms are untouched)
- **Tests**: `src/test/api/` covers the token, heuristics, geo gate, and
  all three routes

### Unified Admin Dashboard (2026-08-16)

Implemented a unified admin dashboard with centralized content management:

- **Centralized ContentManager** (`src/admin/ContentManager.ts`)
  - Optimistic updates for instant UI feedback
  - Batch publish to Supabase
  - State subscription system for React components
  - Singleton pattern for app-wide state

- **BroadcastChannel Sync** (`src/lib/content.ts`)
  - Real-time cache updates across browser tabs
  - Polling fallback (30s) for production environments
  - Integrated into useContent hook for automatic sync

- **Unified Dashboard** (`/admin/unified`)
  - Sidebar navigation with 5 section groups
  - Integrated PublishBar for save actions
  - Hero and Services editors migrated
  - Graceful fallback for unimplemented sections

## Content Structure

Content is stored in Supabase `site_content` table:
- `section`: Content area (hero, services, etc.)
- `key`: Field name within section
- `value`: Text or JSON string

## Admin Editors

### Migrated Editors (Use ContentManager)
- HeroEditor - `/src/admin/editors/HeroEditor.tsx`
- ServicesEditor - `/src/admin/editors/ServicesEditor.tsx`

### Legacy Editors (To be migrated)
Located in `src/admin/editors/`:
- TrustBarEditor
- WhyUsEditor
- AboutEditor
- ContactEditor
- FooterEditor
- PricingEditor
- PricingUnitsEditor
- StatusEditor
- ServicesCategoryEditor
- ServicesDetailEditor
- ThreatsDetailEditor

### SEO Editors
- SeoPortal - `/src/admin/seo/SeoPortal.tsx`
- SeoPageEditor - `/src/admin/seo/SeoPageEditor.tsx`

## Key Components

### ContentManager
- **Location**: `src/admin/ContentManager.ts`
- **Pattern**: Singleton with subscription-based state management
- **Methods**:
  - `loadSection(section)` - Load content from Supabase
  - `updateField(section, key, value)` - Optimistic field update
  - `publishChanges()` - Batch publish pending changes
  - `discardChanges()` - Revert unsaved changes
  - `subscribe(listener)` - Subscribe to state updates

### useContent Hook
- **Location**: `src/lib/useContent.ts`
- **Features**:
  - Automatically loads section content
  - BroadcastChannel listener for real-time updates
  - Polling fallback for production environments
  - localStorage caching

## Testing

### Integration Tests
- **Location**: `src/test/integration/content-sync.test.ts`
- **Coverage**: ContentManager load, update, publish, discard, subscriptions
- **Run**: `npm test -- src/test/integration/content-sync.test.ts`

### All Tests
- **Run**: `npm test`
- **Framework**: Vitest

## Documentation

- **User Guide**: `docs/admin-guide.md` - How to use the unified admin dashboard
- **Migration Guide**: `docs/editor-migration-guide.md` - How to migrate remaining editors
- **Implementation Plan**: `docs/superpowers/plans/2026-08-16-unified-admin-dashboard.md`

## Development Workflow

### Adding New Section Editors

1. Create editor in `src/admin/editors/`
2. Follow ContentManager pattern (see HeroEditor example)
3. Add section to SidebarNavigation section groups
4. Add route case in UnifiedAdminDashboard
5. Test publish/discard functionality

### Running the Project

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Type checking
npm run typecheck

# Run tests
npm test

# Production build
npm run build
```

## Next Steps

1. Migrate remaining editors to ContentManager
2. Implement live preview pane (iframe-based)
3. Add version history support
4. Implement concurrent edit detection
5. Add keyboard shortcuts for common actions

## Architecture Notes

### State Management Flow
```
User Input → Editor Component → ContentManager.updateField()
                                                    ↓
                                            Optimistic UI Update
                                                    ↓
                                    User clicks "Publish Changes"
                                                    ↓
                                      ContentManager.publishChanges()
                                                    ↓
                                          Batch Supabase Upsert
                                                    ↓
                                    BroadcastChannel Update → Other Tabs
                                                    ↓
                                    Polling Fallback (30s) → Live Site
```

### Real-time Sync Mechanism
1. Admin publishes changes via ContentManager
2. Changes written to Supabase and localStorage
3. BroadcastChannel posts message to other tabs
4. useContent hook receives update
5. Component re-renders with new content
6. Polling fallback catches missed updates (production)

## Blog System (2026-08-16)

### Database
- `blog_posts` table with SEO-optimized fields
- Row Level Security: public read, authenticated write
- Indexes on published_at, category, slug

### API Endpoints
- `POST /api/blog/generate-post` - AI generation (admin auth)
- `GET /api/blog/list` - List/fetch posts with pagination
- `GET /api/blog/[id]` - Fetch single post
- `PUT /api/blog/[id]` - Update post (admin auth)
- `DELETE /api/blog/[id]` - Delete post (admin auth)

### Admin Components
- `src/admin/blog/BlogPostManager.tsx` - List view with actions
- `src/admin/blog/BlogEditor.tsx` - Edit/create with Markdown preview
- `src/admin/blog/BlogSettings.tsx` - AI parameters and schedule

### Frontend Pages
- `/blog` - Dynamic blog listing from database
- `/blog/:slug` - Individual post with SEO metadata

### AI Generation
- GPT-4o-mini for content generation
- Pexels API for featured images
- Weekly automation via Supabase pg_cron

### Utilities
- `src/lib/blog.ts` - Database operations and helpers
- `types/blog.ts` - TypeScript interfaces

## Git History

Recent commits for unified admin dashboard:
- `23f898b` docs: add admin dashboard guides
- `2ef8cb4` test: add integration tests for content sync
- `8fe6bfa` feat: add real-time cache sync to useContent hook
- `e02f314` feat: add link to unified dashboard from admin home
- `168a8e3` feat: add route for unified admin dashboard
- `751670c` feat: create UnifiedAdminDashboard component
- `6ce0f7a` refactor: ServicesEditor to use ContentManager
- `dc7756e` refactor: HeroEditor to use ContentManager
- `e5e94e9` feat: add SidebarNavigation component
- `fd68bd0` feat: add PublishBar component
- `859cdca` feat: create ContentManager for centralized state
- `79a68c4` fix: reuse BroadcastChannel instance to prevent resource leak
- `10d3c11` feat: add BroadcastChannel support for real-time content sync

Recent commits for blog system:
- `de177ca` feat: add weekly blog generation scheduling
- `8800d29` feat: integrate blog into unified admin dashboard
- `50fc049` feat: add blog settings component
- `57f8a0d` feat: add blog editor component
- `2b7ff27` feat: add blog post manager component
- `fd6b8a9` feat: add dynamic blog pages and individual post page
- `637ca63` feat: add AI blog post generation endpoint
- `4cf4600` feat: add blog CRUD API endpoint
- `90f7100` feat: add blog list API endpoint
- `b3f2ac9` feat: add blog utility functions
- `70eca85` feat: create blog_posts table with RLS policies
