# Unified Admin Dashboard Design

**Date:** 2026-08-16
**Author:** Claude Code
**Status:** Approved

## Problem Statement

The current admin panel has two critical issues:

1. **Data not updating on live site:** When content is updated via admin, changes don't appear on the live site
2. **Scattered fields:** Admin functionality is spread across 13+ separate pages with no logical grouping

## Solution Overview

Build a unified admin dashboard with:
- Centralized content management with reliable cache invalidation
- Logical grouping of sections (Homepage, Services, Company, Contact, SEO)
- Live preview mode showing changes in real-time
- Single-page interface with tabbed navigation

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UnifiedAdminDashboard                      │
├───────────────┬───────────────────────────┬────────────────┤
│   Sidebar     │      Main Content Area     │  Live Preview  │
│  Navigation   │                           │                │
│               │                           │                │
│ • Homepage    │  ┌─────────────────────┐  │  ┌──────────┐  │
│ • Services    │  │ Form Fields for     │  │  │ Rendered │  │
│ • About       │  │ Selected Section   │──│──│ Site      │  │
│ • Contact     │  └─────────────────────┘  │  │ Preview  │  │
│ • SEO         │                           │  │          │  │
│               │  [Save Draft] [Publish]   │  └──────────┘  │
└───────────────┴───────────────────────────┴────────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                           │
                    ┌─────▼─────┐
                    │ Content   │
                    │ Manager   │
                    └───────────┘
                           │
                    ┌─────▼─────┐
                    │ Supabase  │
                    └───────────┘
```

### Key Components

1. **ContentManager** - Centralized state management for all site content
2. **UnifiedAdminDashboard** - Main layout with sidebar + content + preview
3. **SectionForm** - Dynamic form rendering for content types
4. **LivePreview** - Live site preview pane
5. **SidebarNavigation** - Left nav with section groups

## Content Organization

### Section Grouping

```
Homepage Content
├── Hero (badge, headline, stats, feature cards)
├── Trust Bar (certifications, partnership badges)
├── Stats Section
└── Testimonials

Services Content
├── Services Overview (section label, headline, cards)
├── Service Categories (category detail pages with SEO)
├── Service Details (individual service pages)
└── Threat Details (threat pages)

Company Content
├── Why Us (proof points, feature cards)
├── About (company story, years, team)
└── Pricing (tiers, plans, features)

Contact & Footer
├── Contact (phone, email, address, messages)
└── Footer (tagline, contact info, links)

SEO & Settings
├── SEO Portal (local landing pages, competitor research)
└── Status/Settings
```

### Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  New Wave IT Admin                [Preview] [Publish]│
├─────────────────┬───────────────────────────────┤
│ ▼ Homepage       │ Hero Section                   │
│   Hero          │ ┌─────────────────────────┐   │
│   Trust Bar     │ │ Badge: [24/7 IT Support] │   │
│   Stats         │ │ Headline Part 1: [When]  │   │
│   Testimonials  │ │ Accent 1: [technology]   │   │
│                 │ │ Headline Part 2: [...]    │   │
│ ▶ Services      │ │ Subheadline: [...]       │   │
│ ▶ Company       │ │                           │   │
│ ▶ Contact       │ │ Statistics:               │   │
│ ▶ SEO           │ │ ┌─────────────────────┐ │   │
│                 │ │ │ [500+ Clients]     │ │   │
│                 │ │ │ [99.9% Uptime]     │ │   │
│                 │ │ └─────────────────────┘ │   │
│                 │ └─────────────────────────┘   │
│                 │ [Save to Draft]  [Publish]    │
└─────────────────┴───────────────────────────────┘
```

## Data Flow & Cache Management

### The Current Cache Problem

The existing system has a race condition:
1. Admin updates Supabase ✅
2. Admin updates localStorage cache ✅
3. Live site reads from **its own** localStorage cache ❌
4. Live site doesn't know data changed

### Solution: Centralized Content Manager

```typescript
class ContentManager {
  // Unified cache state
  private cache: Map<string, ContentMap> = new Map();

  // Load all sections on initialization
  async initialize() {
    const sections = ['hero', 'navbar', 'services', 'whyus', 'about', 'contact', 'footer'];
    await Promise.all(sections.map(s => this.loadSection(s)));
  }

  // Optimistic update pattern
  async updateContent(section: string, key: string, value: string) {
    // 1. Update local state immediately (UI updates)
    this.cache.set(section, { ...this.cache.get(section), [key]: value });

    // 2. Persist to Supabase
    await supabase.from('site_content').upsert({ section, key, value });

    // 3. Broadcast to other tabs/windows
    this.broadcastChange({ section, key, value });
  }

  // Broadcast channel for multi-tab sync
  private broadcastChange(change: ContentChange) {
    const channel = new BroadcastChannel('content_updates');
    channel.postMessage(change);
  }
}
```

### Live Site Update Flow

1. **Admin saves change** → BroadcastChannel message sent
2. **Live site tab receives message** → Invalidates cache for that section
3. **Next render reads fresh data** → Either from updated cache or refetches from Supabase

### Fallback: Polling for Deployed Environments

```typescript
// For production where BroadcastChannel doesn't work across origins
useEffect(() => {
  const interval = setInterval(async () => {
    const fresh = await fetchSectionContent('hero');
    const cached = readContentCache('hero');
    if (JSON.stringify(fresh) !== JSON.stringify(cached)) {
      // Data changed, refresh component
      setContent(fresh);
    }
  }, 30000); // Check every 30 seconds
  return () => clearInterval(interval);
}, []);
```

## Component Design

### File Structure

```
src/admin/
├── UnifiedAdminDashboard.tsx       # Main layout with sidebar + content + preview
├── ContentManager.ts                # Centralized state management
├── components/
│   ├── SidebarNavigation.tsx       # Left nav with section groups
│   ├── SectionForm.tsx             # Dynamic form for content type
│   ├── LivePreview.tsx             # Live site preview pane
│   ├── PublishBar.tsx              # Save/Publish actions
│   └── editors/                    # Existing editors (refactored)
│       ├── HeroEditor.tsx          # Refactored to use ContentManager
│       ├── ServicesEditor.tsx
│       └── ...
```

### Component Interfaces

```typescript
// ContentManager - Central state
interface ContentManager {
  state: {
    sections: Record<string, ContentMap>;
    pendingChanges: Record<string, Partial<ContentMap>>;
    publishStatus: 'idle' | 'saving' | 'saved';
  };
  loadSection(section: string): Promise<ContentMap>;
  updateField(section: string, key: string, value: string): void;
  publishChanges(): Promise<void>;
  discardChanges(): void;
}

// UnifiedAdminDashboard - Main layout
interface UnifiedAdminDashboardProps {
  initialSection?: string;
}

// SectionForm - Dynamic form rendering
interface SectionFormProps {
  section: string;
  content: ContentMap;
  onChange: (key: string, value: string) => void;
}

// LivePreview - Preview pane
interface LivePreviewProps {
  activeSection: string;
  content: ContentMap;
  refreshKey: number; // Force re-render
}
```

### Live Preview Component

The preview will use an iframe to show the actual live site with a special query param:

```typescript
function LivePreview({ activeSection, refreshKey }) {
  return (
    <iframe
      src={`/?preview=true&section=${activeSection}&refresh=${refreshKey}`}
      className="w-full h-full border-0"
    />
  );
}
```

## Error Handling

### Error States

1. **Network Errors** - Supabase connection failures
   - Show toast notification with retry option
   - Preserve draft in localStorage for recovery
   - Allow offline editing with queue for later sync

2. **Validation Errors** - Invalid data formats
   - JSON parsing failures for complex fields (stats, cards)
   - Required field validation
   - Show inline error messages

3. **Concurrent Edits** - Multiple admins editing same section
   - "Last write wins" with warning
   - Show "Last edited by X at Y" indicator
   - Optional: Implement optimistic locking

4. **Publish Failures** - Partial updates
   - Rollback UI state on failure
   - Show which sections failed to publish
   - Retry specific failed sections

### User Feedback UI

```typescript
// Toast notifications
<PublishBar
  status={publishStatus}
  onSave={() => contentManager.saveDraft()}
  onPublish={() => contentManager.publishChanges()}
  errorCount={Object.keys(errors).length}
/>

// Status indicators
<div className="flex items-center gap-2">
  <StatusIndicator status={publishStatus} />
  <span>{publishStatus === 'saved' ? 'All changes published' : 'Unsaved changes'}</span>
</div>
```

## Testing Strategy

### Testing Levels

1. **Unit Tests** - ContentManager core logic
   - Cache invalidation on updates
   - BroadcastChannel message handling
   - Draft state management

2. **Integration Tests** - Admin → Supabase → Live Site
   - Publish flow: Admin save → Supabase update → Cache refresh
   - Preview updates when form changes
   - Multi-tab sync via BroadcastChannel

3. **E2E Tests** - Critical user paths
   - Login → Edit Hero → Publish → Verify on live site
   - Edit multiple sections → Batch publish
   - Error recovery (network failure)

### Test Infrastructure

```typescript
// Mock Supabase for tests
const mockSupabase = {
  from: () => ({
    upsert: jest.fn().mockResolvedValue({ error: null }),
    select: jest.fn().mockResolvedValue({ data: mockData, error: null })
  })
};

// Test BroadcastChannel isolation
const mockChannel = {
  postMessage: jest.fn(),
  addEventListener: jest.fn()
};
```

### Critical Test Case

```typescript
describe('Admin Update → Live Site Sync', () => {
  it('should publish changes and invalidate cache', async () => {
    // 1. Admin updates hero headline
    await adminPage.updateField('hero', 'headline', 'New Headline');

    // 2. Verify Supabase updated
    const dbData = await supabase.from('site_content').select('*').eq('section', 'hero');
    expect(dbData.data.find(r => r.key === 'headline').value).toBe('New Headline');

    // 3. Verify cache invalidated
    const cache = readContentCache('hero');
    expect(cache.headline).toBe('New Headline');

    // 4. Verify live site renders new data
    const liveSite = render(<Hero />);
    expect(liveSite.getByText('New Headline')).toBeInTheDocument();
  });
});
```

## Implementation Phases

### Phase 1: Foundation (Fix Core Issue)
- Create ContentManager with centralized state
- Implement BroadcastChannel for multi-tab sync
- Add cache invalidation logic
- **Goal:** Fix the "not updating on live site" issue

### Phase 2: Unified Layout (Organization)
- Build UnifiedAdminDashboard with sidebar
- Implement section grouping (Homepage, Services, Company, etc.)
- Migrate existing editors to use ContentManager
- Add navigation between sections
- **Goal:** Better organization in one interface

### Phase 3: Live Preview (Real-time Feedback)
- Implement LivePreview component
- Add preview mode to live site components
- Connect form changes to preview updates
- Add refresh mechanism
- **Goal:** See changes as you edit

### Phase 4: Polish & Testing (Production Ready)
- Error handling and user feedback
- Loading states and animations
- Full testing coverage
- Documentation
- **Goal:** Production-ready solution

## Success Criteria

1. **Reliability:** Admin changes appear on live site within 30 seconds of publishing
2. **Organization:** All content fields accessible within 2 clicks from dashboard
3. **Visibility:** Live preview updates within 1 second of form change
4. **Performance:** Dashboard loads all section data within 3 seconds
5. **Error Recovery:** Network failures don't lose unsaved changes

## Technical Constraints

- Must work with existing Supabase `site_content` table structure
- Must support existing content sections without migration
- Must maintain backward compatibility with live site components
- Should work in existing hosting environment (Vercel)
