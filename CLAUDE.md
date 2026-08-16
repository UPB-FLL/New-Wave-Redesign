# New Wave IT Redesign Project

## Recent Changes

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
