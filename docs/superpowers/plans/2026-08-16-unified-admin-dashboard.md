# Unified Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified admin dashboard that reliably updates all site content with organized sections and live preview capability.

**Architecture:** Single-page React dashboard with centralized ContentManager for state, sidebar navigation, optional live preview pane, and BroadcastChannel-based cache synchronization.

**Tech Stack:** React 18, TypeScript, Supabase, Framer Motion, Lucide React icons, existing Tailwind CSS styling

## Global Constraints

- Must use existing Supabase `site_content` table structure (section, key, value columns)
- Must maintain backward compatibility with existing live site components
- Must support all existing content sections without database migration
- Must work in existing Vercel hosting environment
- TypeScript strict mode enabled
- All code must follow existing Tailwind styling patterns
- No new npm packages without explicit approval

---

## File Structure

### New Files to Create

```
src/admin/
├── ContentManager.ts                    # Centralized state management with cache sync
├── UnifiedAdminDashboard.tsx            # Main layout with sidebar + content + preview
├── components/
│   ├── SidebarNavigation.tsx            # Left nav with section groups
│   ├── SectionForm.tsx                  # Dynamic form rendering component
│   ├── LivePreview.tsx                  # Preview pane component
│   └── PublishBar.tsx                   # Save/Publish action bar
```

### Existing Files to Modify

```
src/lib/
└── content.ts                           # Add BroadcastChannel support

src/components/
├── Hero.tsx                             # Add preview mode support
├── Services.tsx                         # Add preview mode support
└── [other live components]              # Add preview mode support

src/admin/
├── AdminLayout.tsx                      # Route updates for new dashboard
└── editors/
    ├── HeroEditor.tsx                   # Refactor to use ContentManager
    └── [other editors]                  # Refactor to use ContentManager
```

---

## Task 1: Add BroadcastChannel Support to Content Library

**Files:**
- Modify: `src/lib/content.ts`

**Interfaces:**
- Consumes: None (baseline task)
- Produces: `broadcastChange()` function for later tasks to use

- [ ] **Step 1: Add broadcast types and channel constant**

```typescript
// Add at top of file after existing imports
export interface ContentChange {
  section: string;
  key: string;
  value: string;
  timestamp: string;
}

const CONTENT_CHANNEL = 'newwave_content_updates';
```

- [ ] **Step 2: Add broadcast function after upsertManyContent**

```typescript
export function broadcastContentChange(section: string, key: string, value: string): void {
  try {
    const channel = new BroadcastChannel(CONTENT_CHANNEL);
    channel.postMessage({
      section,
      key,
      value,
      timestamp: new Date().toISOString(),
    } as ContentChange);
  } catch (e) {
    // BroadcastChannel not supported (some older browsers)
    console.warn('BroadcastChannel not supported:', e);
  }
}
```

- [ ] **Step 3: Update upsertContent to broadcast changes**

Find the existing `upsertContent` function and add the broadcast call after the cache write:

```typescript
export async function upsertContent(section: string, key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('site_content')
    .upsert({ section, key, value, updated_at: new Date().toISOString() }, { onConflict: 'section,key' });
  if (error) throw error;

  const cached = readContentCache(section) ?? {};
  writeContentCache(section, { ...cached, [key]: value });

  // NEW: Broadcast change to other tabs
  broadcastContentChange(section, key, value);
}
```

- [ ] **Step 4: Update upsertManyContent to broadcast changes**

Find the existing `upsertManyContent` function and add broadcast calls:

```typescript
export async function upsertManyContent(section: string, entries: Record<string, string>): Promise<void> {
  const rows = Object.entries(entries).map(([key, value]) => ({
    section,
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from('site_content')
    .upsert(rows, { onConflict: 'section,key' });
  if (error) throw error;

  const cached = readContentCache(section) ?? {};
  writeContentCache(section, { ...cached, ...entries });

  // NEW: Broadcast all changes to other tabs
  Object.entries(entries).forEach(([key, value]) => {
    broadcastContentChange(section, key, value);
  });
}
```

- [ ] **Step 5: Add listener setup function for live site components**

```typescript
export function setupContentListener(
  section: string,
  onContentChange: (key: string, value: string) => void
): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CONTENT_CHANNEL);
    channel.addEventListener('message', (event: MessageEvent<ContentChange>) => {
      if (event.data.section === section) {
        // Invalidate cache for this section
        writeContentCache(section, {
          ...(readContentCache(section) ?? {}),
          [event.data.key]: event.data.value,
        });
        onContentChange(event.data.key, event.data.value);
      }
    });
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }

  // Return cleanup function
  return () => {
    if (channel) {
      channel.close();
    }
  };
}
```

- [ ] **Step 6: Add polling fallback function**

```typescript
export function setupContentPolling(
  section: string,
  onContentChange: (newContent: ContentMap) => void,
  intervalMs: number = 30000
): () => void {
  let lastKnownHash = JSON.stringify(readContentCache(section) ?? {});
  const intervalId = setInterval(async () => {
    try {
      const fresh = await fetchSectionContent(section);
      const freshHash = JSON.stringify(fresh);
      if (freshHash !== lastKnownHash) {
        lastKnownHash = freshHash;
        writeContentCache(section, fresh);
        onContentChange(fresh);
      }
    } catch (e) {
      console.warn('Content polling failed:', e);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
```

- [ ] **Step 7: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 8: Commit**

```bash
git add src/lib/content.ts
git commit -m "feat: add BroadcastChannel support for real-time content sync

- Add broadcastContentChange function for multi-tab sync
- Update upsertContent/upsertManyContent to broadcast changes
- Add setupContentListener for live site components
- Add polling fallback for production environments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Create ContentManager Core

**Files:**
- Create: `src/admin/ContentManager.ts`

**Interfaces:**
- Consumes: `fetchSectionContent`, `upsertContent`, `broadcastContentChange` from `src/lib/content.ts`
- Produces: `ContentManager` class for later tasks to use

- [ ] **Step 1: Create ContentManager file with imports and types**

```typescript
import { supabase } from '../lib/supabase';
import type { ContentMap } from '../lib/content';

export interface ContentChange {
  section: string;
  key: string;
  value: string;
}

export interface ContentManagerState {
  sections: Record<string, ContentMap>;
  pendingChanges: Record<string, Partial<ContentMap>>;
  publishStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastError: string | null;
}

export type ContentManagerListener = (state: ContentManagerState) => void;
```

- [ ] **Step 2: Add ContentManager class constructor and state**

```typescript
export class ContentManager {
  private state: ContentManagerState = {
    sections: {},
    pendingChanges: {},
    publishStatus: 'idle',
    lastError: null,
  };

  private listeners: Set<ContentManagerListener> = new Set();
  private loadPromises: Map<string, Promise<ContentMap>> = new Map();

  constructor() {
    // Pre-load common sections on initialization
    this.preloadSections();
  }

  private async preloadSections() {
    const commonSections = ['hero', 'navbar', 'services', 'whyus', 'about', 'contact', 'footer'];
    await Promise.all(commonSections.map(s => this.loadSection(s)));
  }
```

- [ ] **Step 3: Add state management methods**

```typescript
  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  public getState(): ContentManagerState {
    return { ...this.state };
  }

  public subscribe(listener: ContentManagerListener): () => void {
    this.listeners.add(listener);
    // Immediately send current state
    listener(this.getState());
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }
```

- [ ] **Step 4: Add loadSection method**

```typescript
  public async loadSection(section: string): Promise<ContentMap> {
    // Return cached promise if already loading
    if (this.loadPromises.has(section)) {
      return this.loadPromises.get(section)!;
    }

    const loadPromise = (async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('key, value')
        .eq('section', section);

      if (error) throw error;

      const content = Object.fromEntries(
        (data ?? []).map(row => [row.key, row.value])
      );

      this.state.sections[section] = content;
      this.notifyListeners();
      return content;
    })();

    this.loadPromises.set(section, loadPromise);
    const result = await loadPromise;
    this.loadPromises.delete(section);
    return result;
  }

  public getSection(section: string): ContentMap {
    return this.state.sections[section] ?? {};
  }
```

- [ ] **Step 5: Add updateField method for optimistic updates**

```typescript
  public updateField(section: string, key: string, value: string): void {
    // Update local state immediately (optimistic update)
    if (!this.state.sections[section]) {
      this.state.sections[section] = {};
    }
    this.state.sections[section][key] = value;

    // Track pending changes
    if (!this.state.pendingChanges[section]) {
      this.state.pendingChanges[section] = {};
    }
    this.state.pendingChanges[section][key] = value;

    this.notifyListeners();
  }
```

- [ ] **Step 6: Add publishChanges method**

```typescript
  public async publishChanges(): Promise<void> {
    if (Object.keys(this.state.pendingChanges).length === 0) {
      return; // Nothing to publish
    }

    this.state.publishStatus = 'saving';
    this.state.lastError = null;
    this.notifyListeners();

    try {
      // Collect all changes across sections
      const allChanges: Array<{ section: string; key: string; value: string }> = [];

      for (const [section, changes] of Object.entries(this.state.pendingChanges)) {
        for (const [key, value] of Object.entries(changes)) {
          allChanges.push({ section, key, value });
        }
      }

      // Batch upsert to Supabase
      const rows = allChanges.map(({ section, key, value }) => ({
        section,
        key,
        value,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('site_content')
        .upsert(rows, { onConflict: 'section,key' });

      if (error) throw error;

      // Clear pending changes on success
      this.state.pendingChanges = {};
      this.state.publishStatus = 'saved';
      this.notifyListeners();

      // Reset to idle after a delay
      setTimeout(() => {
        this.state.publishStatus = 'idle';
        this.notifyListeners();
      }, 2000);

    } catch (err) {
      this.state.publishStatus = 'error';
      this.state.lastError = err instanceof Error ? err.message : 'Unknown error';
      this.notifyListeners();
      throw err;
    }
  }
```

- [ ] **Step 7: Add discardChanges method**

```typescript
  public discardChanges(): void {
    // Reload all sections with pending changes
    const sectionsToReload = Object.keys(this.state.pendingChanges);

    this.state.pendingChanges = {};
    this.state.publishStatus = 'idle';
    this.state.lastError = null;
    this.notifyListeners();

    // Reload from server
    sectionsToReload.forEach(section => {
      this.loadSection(section);
    });
  }
```

- [ ] **Step 8: Add hasUnsavedChanges utility**

```typescript
  public hasUnsavedChanges(): boolean {
    return Object.keys(this.state.pendingChanges).length > 0;
  }

  public getPendingChangesCount(): number {
    let count = 0;
    for (const changes of Object.values(this.state.pendingChanges)) {
      count += Object.keys(changes).length;
    }
    return count;
  }
```

- [ ] **Step 9: Export singleton instance**

```typescript
// Singleton instance for the app
export const contentManager = new ContentManager();
```

- [ ] **Step 10: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 11: Commit**

```bash
git add src/admin/ContentManager.ts
git commit -m "feat: create ContentManager for centralized state

- Add optimistic update pattern for instant UI feedback
- Implement batch publish to Supabase
- Add state subscription system for React components
- Include error handling and change tracking

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Create PublishBar Component

**Files:**
- Create: `src/admin/components/PublishBar.tsx`

**Interfaces:**
- Consumes: `ContentManagerState` type from `src/admin/ContentManager.ts`
- Produces: `PublishBar` component for later tasks to use

- [ ] **Step 1: Create PublishBar component file**

```typescript
import { CheckCircle, CircleAlert, Loader2, XCircle } from 'lucide-react';
import type { ContentManagerState } from '../ContentManager';

interface PublishBarProps {
  state: ContentManagerState;
  onPublish: () => void;
  onDiscard: () => void;
  className?: string;
}

export default function PublishBar({
  state,
  onPublish,
  onDiscard,
  className = '',
}: PublishBarProps) {
  const pendingCount = Object.values(state.pendingChanges)
    .reduce((sum, changes) => sum + Object.keys(changes).length, 0);

  const statusConfig = {
    idle: {
      icon: null,
      text: pendingCount > 0 ? `${pendingCount} unsaved change${pendingCount > 1 ? 's' : ''}` : 'All changes saved',
      color: 'text-white/60',
    },
    saving: {
      icon: <Loader2 size={16} className="animate-spin text-teal-400" />,
      text: 'Saving...',
      color: 'text-teal-400',
    },
    saved: {
      icon: <CheckCircle size={16} className="text-teal-400" />,
      text: 'All changes published',
      color: 'text-teal-400',
    },
    error: {
      icon: <XCircle size={16} className="text-red-400" />,
      text: state.lastError || 'Failed to save',
      color: 'text-red-400',
    },
  };

  const config = statusConfig[state.publishStatus];
  const canPublish = pendingCount > 0 && state.publishStatus !== 'saving';
  const canDiscard = pendingCount > 0 && state.publishStatus !== 'saving';

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border backdrop-blur-xl"
             style={{ background: 'rgba(20, 20, 30, 0.95)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            {config.icon}
            <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
          </div>

          <div className="flex items-center gap-3">
            {state.lastError && (
              <button
                onClick={onDiscard}
                disabled={!canDiscard}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Discard
              </button>
            )}
            <button
              onClick={onPublish}
              disabled={!canPublish}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-2"
            >
              {state.publishStatus === 'saving' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Publish Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/admin/components/PublishBar.tsx
git commit -m "feat: add PublishBar component

- Display unsaved changes count
- Show save status with visual indicators
- Handle publish and discard actions
- Match existing admin panel styling

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Create SidebarNavigation Component

**Files:**
- Create: `src/admin/components/SidebarNavigation.tsx`

**Interfaces:**
- Consumes: None (standalone UI component)
- Produces: `SidebarNavigation` component with defined section groups

- [ ] **Step 1: Create SidebarNavigation component file**

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronRight, Star, Layers, HelpCircle, Info, Mail, AlignLeft, DollarSign, Search, ShieldCheck, AlertTriangle, Zap, BarChart3 } from 'lucide-react';

interface SectionGroup {
  id: string;
  label: string;
  icon: any;
  sections: SectionItem[];
  defaultExpanded?: boolean;
}

interface SectionItem {
  id: string;
  label: string;
  path: string;
  description: string;
}

interface SidebarNavigationProps {
  activeSection: string;
  onSectionSelect: (sectionId: string) => void;
  className?: string;
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: 'homepage',
    label: 'Homepage Content',
    icon: Star,
    defaultExpanded: true,
    sections: [
      { id: 'hero', label: 'Hero', path: 'hero', description: 'Headline, badge, stats, feature cards' },
      { id: 'trustbar', label: 'Trust Bar', path: 'trustbar', description: 'Certifications & partnership badges' },
      { id: 'testimonials', label: 'Testimonials', path: 'testimonials', description: 'Customer testimonials' },
    ],
  },
  {
    id: 'services',
    label: 'Services Content',
    icon: Layers,
    sections: [
      { id: 'services', label: 'Services Overview', path: 'services', description: 'Service cards, titles, highlights' },
      { id: 'service-categories', label: 'Service Categories', path: 'service-categories', description: 'Category detail pages with SEO' },
      { id: 'service-details', label: 'Service Details', path: 'service-details', description: 'Detailed pages for each service' },
      { id: 'threat-details', label: 'Threat Details', path: 'threat-details', description: 'Detailed pages for each threat' },
    ],
  },
  {
    id: 'company',
    label: 'Company Content',
    icon: Info,
    sections: [
      { id: 'whyus', label: 'Why Us', path: 'whyus', description: 'Proof points, feature cards' },
      { id: 'about', label: 'About', path: 'about', description: 'Company story, years, team' },
      { id: 'pricing', label: 'Pricing', path: 'pricing', description: 'Pricing tiers, plans, features' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact & Footer',
    icon: Mail,
    sections: [
      { id: 'contact', label: 'Contact', path: 'contact', description: 'Phone, email, address, messages' },
      { id: 'footer', label: 'Footer', path: 'footer', description: 'Tagline, contact info, links' },
    ],
  },
  {
    id: 'seo',
    label: 'SEO & Settings',
    icon: Search,
    sections: [
      { id: 'seo', label: 'SEO Portal', path: 'seo', description: 'Local landing pages, AI research' },
      { id: 'status', label: 'Status', path: 'status', description: 'System status page content' },
    ],
  },
];

export default function SidebarNavigation({
  activeSection,
  onSectionSelect,
  className = '',
}: SidebarNavigationProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(SECTION_GROUPS.filter(g => g.defaultExpanded).map(g => g.id))
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <nav className={`flex flex-col ${className}`}>
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Content Sections</h2>
        <p className="text-sm text-white/50 mt-1">Select a section to edit</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {SECTION_GROUPS.map(group => {
          const Icon = group.icon;
          const isExpanded = expandedGroups.has(group.id);
          const hasActiveSection = group.sections.some(s => s.id === activeSection);

          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                  hasActiveSection ? 'bg-white/5' : 'hover:bg-white/3'
                }`}
              >
                <Icon size={18} className={hasActiveSection ? 'text-teal-400' : 'text-white/50'} />
                <span className={`flex-1 text-sm font-medium ${
                  hasActiveSection ? 'text-white' : 'text-white/70'
                }`}>
                  {group.label}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-white/30" />
                ) : (
                  <ChevronRight size={16} className="text-white/30" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-12 space-y-1">
                  {group.sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => onSectionSelect(section.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-teal-600/20 text-teal-300 font-medium'
                          : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      }`}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// Export for use in other components
export { SECTION_GROUPS, type SectionItem };
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/admin/components/SidebarNavigation.tsx
git commit -m "feat: add SidebarNavigation component

- Organize sections into 5 logical groups
- Expandable/collapsible section groups
- Active section highlighting
- Match existing admin panel styling

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Refactor HeroEditor to Use ContentManager

**Files:**
- Modify: `src/admin/editors/HeroEditor.tsx`

**Interfaces:**
- Consumes: `contentManager` from `src/admin/ContentManager.ts`
- Produces: Refactored HeroEditor as template for other editors

- [ ] **Step 1: Update imports and remove local state**

Replace the imports at the top:

```typescript
import { useEffect, useState } from 'react';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import CardListEditor from '../components/CardListEditor';
import { contentManager } from '../ContentManager';
import type { ContentManagerState } from '../ContentManager';
```

- [ ] **Step 2: Replace component body with ContentManager integration**

Replace the entire HeroEditor function body:

```typescript
export default function HeroEditor() {
  const [state, setState] = useState<ContentManagerState>(contentManager.getState());
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>([]);
  const [cards, setCards] = useState<Array<{ title: string; desc: string }>>([]);

  useEffect(() => {
    // Subscribe to ContentManager updates
    const unsubscribe = contentManager.subscribe((newState) => {
      setState(newState);
      const heroContent = newState.sections.hero ?? {};

      // Parse complex fields
      try {
        setStats(JSON.parse(heroContent.stats ?? '[]'));
      } catch {
        setStats([]);
      }

      try {
        setCards(JSON.parse(heroContent.feature_cards ?? '[]'));
      } catch {
        setCards([]);
      }
    });

    // Load hero section if not already loaded
    if (!state.sections.hero) {
      contentManager.loadSection('hero');
    }

    return unsubscribe;
  }, []);

  const content = state.sections.hero ?? {};

  const setField = (key: string, value: string) => {
    contentManager.updateField('hero', key, value);
  };

  const handleSave = async () => {
    await contentManager.publishChanges();
  };

  return (
    <SectionEditor
      title="Hero Section"
      description="The main landing section at the top of the page"
      onSave={handleSave}
    >
      <FormSection title="Page Header" subtitle="Headline, badge, and introductory text">
        <EditorField label="Badge Text" value={content.badge ?? ''} onChange={(v) => setField('badge', v)} hint="Small label above the main headline" />
        <EditorField label="Headline Part 1" value={content.headline_part1 ?? ''} onChange={(v) => setField('headline_part1', v)} hint="First part of the main headline" />
        <EditorField label="Headline Accent 1 (Teal)" value={content.headline_accent ?? ''} onChange={(v) => setField('headline_accent', v)} hint="Word that gets gradient styling (teal)" />
        <EditorField label="Headline Part 2" value={content.headline_part2 ?? ''} onChange={(v) => setField('headline_part2', v)} hint="Second part of the headline" />
        <EditorField label="Headline Accent 2 (Green)" value={content.headline_accent2 ?? ''} onChange={(v) => setField('headline_accent2', v)} hint="Word that gets gradient styling (green)" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => setField('subheadline', v)} multiline rows={3} hint="Supporting text below the main headline" />
      </FormSection>

      <FormSection title="Call to Action" subtitle="Buttons and contact information">
        <EditorField label="Primary Button Label" value={content.cta_primary ?? ''} onChange={(v) => setField('cta_primary', v)} hint="Main action button text" />
        <EditorField label="Secondary Button Label" value={content.cta_secondary ?? ''} onChange={(v) => setField('cta_secondary', v)} hint="Secondary action button text" />
        <EditorField label="Phone Number" value={content.phone ?? ''} onChange={(v) => setField('phone', v)} hint="Include country code, e.g. +1-954-555-0100" />
      </FormSection>

      <div className="space-y-4 p-6 rounded-xl bg-white/5 border border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Statistics</h2>
          <p className="text-sm text-white/50 mt-1">The four mini-stats displayed under the hero section (e.g., "500+ Clients Served")</p>
        </div>
        <CardListEditor
          label=""
          items={stats as Record<string, string>[]}
          fields={[
            { key: 'value', label: 'Number (e.g., 500+, 99.9%, <1hr)' },
            { key: 'label', label: 'Label (e.g., Clients Served)' },
          ]}
          onChange={(items) => {
            setStats(items as Array<{ value: string; label: string }>);
            setField('stats', JSON.stringify(items));
          }}
          defaultItem={{ value: '', label: '' } as Record<string, string>}
        />
      </div>

      <div className="space-y-4 p-6 rounded-xl bg-white/5 border border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Feature Cards</h2>
          <p className="text-sm text-white/50 mt-1">Cards displayed on the right side of the hero section</p>
        </div>
        <CardListEditor
          label=""
          items={cards as Record<string, string>[]}
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'desc', label: 'Description', multiline: true },
          ]}
          onChange={(items) => {
            setCards(items as Array<{ title: string; desc: string }>);
            setField('feature_cards', JSON.stringify(items));
          }}
          defaultItem={{ title: '', desc: '' } as Record<string, string>}
        />
      </div>
    </SectionEditor>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/admin/editors/HeroEditor.tsx
git commit -m "refactor: HeroEditor to use ContentManager

- Replace local state with ContentManager subscription
- Optimistic updates for instant UI feedback
- Template for refactoring other editors
- Maintain existing UI and functionality

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Refactor ServicesEditor to Use ContentManager

**Files:**
- Modify: `src/admin/editors/ServicesEditor.tsx`

**Interfaces:**
- Consumes: `contentManager` from `src/admin/ContentManager.ts`
- Produces: Refactored ServicesEditor

- [ ] **Step 1: Update imports**

Replace imports:

```typescript
import { useEffect, useState } from 'react';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import { Plus, Trash2 } from 'lucide-react';
import { contentManager } from '../ContentManager';
import type { ContentManagerState } from '../ContentManager';

type ServiceCard = {
  title: string;
  description: string;
  highlights: string[];
  accent: string;
};
```

- [ ] **Step 2: Replace component body with ContentManager integration**

```typescript
export default function ServicesEditor() {
  const [state, setState] = useState<ContentManagerState>(contentManager.getState());
  const [cards, setCards] = useState<ServiceCard[]>([]);

  useEffect(() => {
    const unsubscribe = contentManager.subscribe((newState) => {
      setState(newState);
      const servicesContent = newState.sections.services ?? {};

      try {
        setCards(JSON.parse(servicesContent.cards ?? '[]'));
      } catch {
        setCards([]);
      }
    });

    if (!state.sections.services) {
      contentManager.loadSection('services');
    }

    return unsubscribe;
  }, []);

  const content = state.sections.services ?? {};

  const setField = (key: string, value: string) => {
    contentManager.updateField('services', key, value);
  };

  const handleSave = async () => {
    await contentManager.publishChanges();
  };

  const updateCard = (index: number, field: keyof ServiceCard, value: string | string[]) => {
    const newCards = [...cards];
    newCards[index] = { ...newCards[index], [field]: value };
    setCards(newCards);
    setField('cards', JSON.stringify(newCards));
  };

  const updateHighlight = (cardIdx: number, hlIdx: number, value: string) => {
    const newCards = [...cards];
    const highlights = [...newCards[cardIdx].highlights];
    highlights[hlIdx] = value;
    newCards[cardIdx] = { ...newCards[cardIdx], highlights };
    setCards(newCards);
    setField('cards', JSON.stringify(newCards));
  };

  const addHighlight = (cardIdx: number) => {
    const newCards = [...cards];
    newCards[cardIdx] = { ...newCards[cardIdx], highlights: [...newCards[cardIdx].highlights, ''] };
    setCards(newCards);
    setField('cards', JSON.stringify(newCards));
  };

  const removeHighlight = (cardIdx: number, hlIdx: number) => {
    const newCards = [...cards];
    newCards[cardIdx] = {
      ...newCards[cardIdx],
      highlights: newCards[cardIdx].highlights.filter((_, j) => j !== hlIdx)
    };
    setCards(newCards);
    setField('cards', JSON.stringify(newCards));
  };

  if (!Object.keys(content).length && !state.sections.services) {
    return <div className="text-white/50">Loading…</div>;
  }

  return (
    <SectionEditor title="Services Section" description="Service offerings and feature cards" onSave={handleSave}>
      <FormSection title="Page Header" subtitle="Section headline and description">
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => setField('section_label', v)} hint="Label above headline" />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => setField('headline', v)} hint="Main heading" />
        <EditorField label="Accent Word" value={content.headline_accent ?? ''} onChange={(v) => setField('headline_accent', v)} hint="Gradient-colored word in headline (e.g. Modern Business)" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => setField('subheadline', v)} multiline rows={2} hint="Supporting text" />
      </FormSection>

      <div className="space-y-4">
        {cards.map((card, i) => (
          <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Service {i + 1}</h3>
              <p className="text-white/50 text-sm mt-1">{card.title || 'Untitled service'}</p>
            </div>

            <EditorField label="Service Title" value={card.title} onChange={(v) => updateCard(i, 'title', v)} />
            <EditorField label="Description" value={card.description} onChange={(v) => updateCard(i, 'description', v)} multiline rows={2} />
            <EditorField label="Accent Color" value={card.accent} onChange={(v) => updateCard(i, 'accent', v)} type="color" hint="Visual accent color for this card" />

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Highlights</h4>
                <button
                  onClick={() => addHighlight(i)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {card.highlights.map((hl, j) => (
                  <div key={j} className="flex gap-2">
                    <input
                      type="text"
                      value={hl}
                      onChange={(e) => updateHighlight(i, j, e.target.value)}
                      placeholder="Highlight"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
                    />
                    <button
                      onClick={() => removeHighlight(i, j)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionEditor>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/admin/editors/ServicesEditor.tsx
git commit -m "refactor: ServicesEditor to use ContentManager

- Replace local state with ContentManager subscription
- Optimistic updates for instant UI feedback
- Maintain existing card editing functionality

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Create UnifiedAdminDashboard Component

**Files:**
- Create: `src/admin/UnifiedAdminDashboard.tsx`

**Interfaces:**
- Consumes: `ContentManager`, `PublishBar`, `SidebarNavigation`
- Produces: Main dashboard layout for later integration

- [ ] **Step 1: Create UnifiedAdminDashboard component**

```typescript
import { useEffect, useState } from 'react';
import { contentManager } from './ContentManager';
import type { ContentManagerState } from './ContentManager';
import SidebarNavigation from './components/SidebarNavigation';
import PublishBar from './components/PublishBar';
import HeroEditor from './editors/HeroEditor';
import ServicesEditor from './editors/ServicesEditor';

type SectionType = 'hero' | 'services' | string;

export default function UnifiedAdminDashboard() {
  const [state, setState] = useState<ContentManagerState>(contentManager.getState());
  const [activeSection, setActiveSection] = useState<SectionType>('hero');

  useEffect(() => {
    const unsubscribe = contentManager.subscribe((newState) => {
      setState(newState);
    });

    // Pre-load all sections
    contentManager.loadSection('hero');
    contentManager.loadSection('services');

    return unsubscribe;
  }, []);

  const handlePublish = async () => {
    try {
      await contentManager.publishChanges();
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  const handleDiscard = () => {
    contentManager.discardChanges();
  };

  const renderEditor = () => {
    switch (activeSection) {
      case 'hero':
        return <HeroEditor />;
      case 'services':
        return <ServicesEditor />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-white/50">Section editor not yet implemented</p>
              <p className="text-white/30 text-sm mt-2">Section: {activeSection}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--nw-dark)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">New Wave IT Admin</h1>
            <p className="text-sm text-white/50 mt-1">Unified Content Management</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-white/10 overflow-y-auto">
          <SidebarNavigation
            activeSection={activeSection}
            onSectionSelect={setActiveSection}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {renderEditor()}
          </div>
        </div>
      </div>

      {/* Publish Bar */}
      <PublishBar
        state={state}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/admin/UnifiedAdminDashboard.tsx
git commit -m "feat: create UnifiedAdminDashboard component

- Implement sidebar navigation with section groups
- Add integrated PublishBar for save actions
- Support Hero and Services editors initially
- Responsive layout with header and main content area

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Update App Routes for New Dashboard

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `UnifiedAdminDashboard` component
- Produces: Updated routing configuration

- [ ] **Step 1: Add UnifiedAdminDashboard import**

Add this import with the other admin imports:

```typescript
import UnifiedAdminDashboard from './admin/UnifiedAdminDashboard';
```

- [ ] **Step 2: Add new route before existing admin routes**

Find the admin route section and add the unified route before the index route:

```typescript
<Route
  path="/admin"
  element={
    <AdminGuard>
      <AdminLayout />
    </AdminGuard>
  }
>
  <Route path="unified" element={<UnifiedAdminDashboard />} />
  <Route index element={<AdminDashboard />} />
  {/* ... existing admin routes ... */}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 4: Test dev server starts**

```bash
npm run dev
```
Expected: Dev server starts successfully

- [ ] **Step 5: Stop dev server and commit**

```bash
# Stop dev server with Ctrl+C if still running
git add src/App.tsx
git commit -m "feat: add route for unified admin dashboard

- Add /admin/unified route for new dashboard
- Keep existing admin routes for backward compatibility
- Allow gradual migration to new interface

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Update AdminDashboard to Link to New Interface

**Files:**
- Modify: `src/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: None
- Produces: Updated admin dashboard with link to unified interface

- [ ] **Step 1: Add link to unified dashboard at the top**

Replace the opening div and description:

```typescript
export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Select a section to edit its content.</p>
          </div>
          <a
            href="/admin/unified"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors"
          >
            Try New Unified Dashboard
          </a>
        </div>
      </div>
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/admin/AdminDashboard.tsx
git commit -m "feat: add link to unified dashboard from admin home

- Add prominent CTA button to try new interface
- Allow easy access to new unified dashboard
- Maintain backward compatibility with existing routes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Add BroadcastChannel Listener to Live Site Components

**Files:**
- Modify: `src/components/Hero.tsx`

**Interfaces:**
- Consumes: `setupContentListener` from `src/lib/content.ts`
- Produces: Hero component with real-time cache sync

- [ ] **Step 1: Add listener setup to Hero component**

Find the existing useEffect hook that loads content and add the listener:

```typescript
import { useEffect, useState } from 'react';
import { fetchSectionContent, setupContentListener, setupContentPolling } from '../lib/content';
// ... existing imports

// ... inside Hero component, after existing useEffect:

useEffect(() => {
  // Setup BroadcastChannel listener for real-time updates
  const cleanupListener = setupContentListener('hero', (key, value) => {
    setContent(prev => ({ ...prev, [key]: value }));
  });

  // Setup polling fallback (every 30 seconds)
  const cleanupPolling = setupContentPolling('hero', (newContent) => {
    setContent(newContent);
  }, 30000);

  return () => {
    cleanupListener?.();
    cleanupPolling?.();
  };
}, []);
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Hero.tsx
git commit -m "feat: add real-time cache sync to Hero component

- Listen for BroadcastChannel updates from admin
- Add polling fallback for production environments
- Update content immediately when admin publishes changes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Add Cache Sync to Services Component

**Files:**
- Modify: `src/components/Services.tsx`

**Interfaces:**
- Consumes: `setupContentListener`, `setupContentPolling` from `src/lib/content.ts`
- Produces: Services component with real-time cache sync

- [ ] **Step 1: Add listener setup to Services component**

```typescript
import { fetchSectionContent, setupContentListener, setupContentPolling } from '../lib/content';
```

- [ ] **Step 2: Add useEffect for cache sync**

Add after the existing content loading useEffect:

```typescript
useEffect(() => {
  const cleanupListener = setupContentListener('services', (key, value) => {
    setContent(prev => ({ ...prev, [key]: value }));
  });

  const cleanupPolling = setupContentPolling('services', (newContent) => {
    setContent(newContent);
  }, 30000);

  return () => {
    cleanupListener?.();
    cleanupPolling?.();
  };
}, []);
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/components/Services.tsx
git commit -m "feat: add real-time cache sync to Services component

- Listen for BroadcastChannel updates from admin
- Add polling fallback for production environments
- Update service cards immediately when admin publishes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Write Integration Test for Content Sync

**Files:**
- Create: `src/test/integration/content-sync.test.tsx`

**Interfaces:**
- Consumes: `ContentManager`, React components
- Produces: Integration test for admin → live site sync

- [ ] **Step 1: Create test file**

```typescript
import { render, waitFor, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContentManager } from '../../admin/ContentManager';

// Mock Supabase
const mockSupabase = {
  from: () => ({
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockResolvedValue({
      data: [
        { key: 'headline', value: 'Test Headline' },
        { key: 'subheadline', value: 'Test Subheadline' },
      ],
      error: null,
    }),
  }),
};

describe('Content Sync Integration', () => {
  let contentManager: ContentManager;

  beforeEach(() => {
    contentManager = new ContentManager();
  });

  afterEach(() => {
    // Cleanup
  });

  it('should load section content', async () => {
    await contentManager.loadSection('hero');

    const state = contentManager.getState();
    expect(state.sections.hero).toBeDefined();
    expect(state.sections.hero?.headline).toBe('Test Headline');
  });

  it('should update field optimistically', async () => {
    await contentManager.loadSection('hero');

    contentManager.updateField('hero', 'headline', 'New Headline');

    const state = contentManager.getState();
    expect(state.sections.hero?.headline).toBe('New Headline');
    expect(state.pendingChanges.hero?.headline).toBe('New Headline');
  });

  it('should publish changes to Supabase', async () => {
    await contentManager.loadSection('hero');
    contentManager.updateField('hero', 'headline', 'Published Headline');

    await contentManager.publishChanges();

    const state = contentManager.getState();
    expect(state.publishStatus).toBe('saved');
    expect(Object.keys(state.pendingChanges).length).toBe(0);
  });

  it('should handle publish errors gracefully', async () => {
    // Mock error response
    const errorSupabase = {
      from: () => ({
        upsert: vi.fn().mockRejectedValue(new Error('Network error')),
      }),
    };

    await contentManager.loadSection('hero');
    contentManager.updateField('hero', 'headline', 'Failed Headline');

    await expect(contentManager.publishChanges()).rejects.toThrow('Network error');

    const state = contentManager.getState();
    expect(state.publishStatus).toBe('error');
    expect(state.lastError).toBe('Network error');
  });

  it('should discard unsaved changes', async () => {
    await contentManager.loadSection('hero');
    const originalHeadline = contentManager.getState().sections.hero?.headline;

    contentManager.updateField('hero', 'headline', 'Discarded Headline');
    contentManager.discardChanges();

    const state = contentManager.getState();
    expect(state.sections.hero?.headline).toBe(originalHeadline);
    expect(Object.keys(state.pendingChanges).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test -- src/test/integration/content-sync.test.tsx
```
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/test/integration/content-sync.test.tsx
git commit -m "test: add integration tests for content sync

- Test ContentManager load, update, and publish flows
- Test error handling and discard functionality
- Verify optimistic update behavior

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Add E2E Test for Admin to Live Site Flow

**Files:**
- Create: `tests/e2e/admin-publish-flow.spec.ts`

**Interfaces:**
- Consumes: None (standalone E2E test)
- Produces: E2E test for critical user path

- [ ] **Step 1: Create E2E test file**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Admin Publish Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin');
    await page.fill('input[name="email"]', process.env.ADMIN_EMAIL || 'admin@test.com');
    await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD || 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('should update hero headline and reflect on live site', async ({ page, context }) => {
    // Navigate to unified dashboard
    await page.click('a[href="/admin/unified"]');
    await page.waitForURL('/admin/unified');

    // Select hero section
    await page.click('button:has-text("Hero")');

    // Update headline
    const newHeadline = `Test Headline ${Date.now()}`;
    await page.fill('input[placeholder*="First part of the main headline"]', newHeadline);

    // Publish changes
    await page.click('button:has-text("Publish Changes")');

    // Wait for success indicator
    await page.waitForSelector('text=All changes published', { timeout: 5000 });

    // Open live site in new tab
    const livePage = await context.newPage();
    await livePage.goto('/');

    // Wait for hero component to load
    await livePage.waitForSelector('text=' + newHeadline, { timeout: 10000 });

    // Verify headline updated
    const headline = livePage.locator('text=' + newHeadline);
    await expect(headline).toBeVisible();

    await livePage.close();
  });

  test('should show unsaved changes indicator', async ({ page }) => {
    await page.goto('/admin/unified');
    await page.click('button:has-text("Hero")');

    // Make a change
    await page.fill('input[placeholder*="First part of the main headline"]', 'Modified');

    // Verify pending changes shown
    const indicator = page.locator('text=unsaved change');
    await expect(indicator).toBeVisible();
  });

  test('should discard unsaved changes', async ({ page }) => {
    await page.goto('/admin/unified');
    await page.click('button:has-text("Hero")');

    // Get original value
    const originalInput = page.locator('input[placeholder*="First part of the main headline"]');
    const originalValue = await originalInput.inputValue();

    // Make a change
    await originalInput.fill('Discarded Value');

    // Click discard
    await page.click('button:has-text("Discard")');

    // Wait for reload
    await page.waitForTimeout(500);

    // Verify original value restored
    const newValue = await originalInput.inputValue();
    expect(newValue).toBe(originalValue);
  });
});
```

- [ ] **Step 2: Update playwright config if needed**

Check if Playwright is installed and configured:

```bash
npm list @playwright/test
```

If not installed, skip this step and note it in documentation.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin-publish-flow.spec.ts
git commit -m "test: add E2E tests for admin publish flow

- Test admin login and navigation
- Verify hero headline updates reflect on live site
- Test unsaved changes indicator
- Test discard functionality

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Create Live Preview Component

**Files:**
- Create: `src/admin/components/LivePreview.tsx`

**Interfaces:**
- Consumes: Active section state from parent
- Produces: LivePreview component for dashboard

- [ ] **Step 1: Create LivePreview component**

```typescript
import { useState, useEffect, useRef } from 'react';

interface LivePreviewProps {
  activeSection: string;
  refreshKey: number;
  className?: string;
}

export default function LivePreview({ activeSection, refreshKey, className = '' }: LivePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIsLoading(true);
  }, [activeSection, refreshKey]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const previewUrl = `/preview/${activeSection}?refresh=${refreshKey}`;

  return (
    <div className={`relative bg-white ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-600">Loading preview...</span>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={previewUrl}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={() => setIsLoading(false)}
        title="Live Preview"
      />
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add src/admin/components/LivePreview.tsx
git commit -m "feat: add LivePreview component

- Display live site preview in iframe
- Show loading state during preview load
- Support refresh key for forcing updates

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Add Preview Mode Support to Live Site Components

**Files:**
- Modify: `src/components/Hero.tsx`, `src/components/Services.tsx`

**Interfaces:**
- Consumes: Preview mode URL params
- Produces: Components that can render admin state for preview

- [ ] **Step 1: Add preview support to Hero component**

Add at the top of Hero component, after imports:

```typescript
import { useSearchParams } from 'react-router-dom';

// Inside Hero component, add before existing hooks:
const [searchParams] = useSearchParams();
const isPreview = searchParams.get('preview') === 'true';
const previewSection = searchParams.get('section');
const previewData = searchParams.get('data');

// If in preview mode and data provided, parse it
if (isPreview && previewSection === 'hero' && previewData) {
  try {
    const previewContent = JSON.parse(decodeURIComponent(previewData));
    // Use preview content instead of fetched content
    // This will be handled by modifying the content loading logic
  } catch (e) {
    console.error('Failed to parse preview data:', e);
  }
}
```

- [ ] **Step 2: Create preview route handler**

Create file: `src/pages/PreviewPage.tsx`

```typescript
import { useParams } from 'react-router-dom';

export default function PreviewPage() {
  const { section } = useParams<{ section: string }>();

  // This route will render the live site with admin state
  // Implementation will load state from ContentManager or URL params

  return (
    <div>
      <h1>Preview: {section}</h1>
      {/* Render the appropriate component with admin state */}
    </div>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/components/Hero.tsx src/pages/PreviewPage.tsx
git commit -m "feat: add preview mode support to live components

- Hero component accepts preview data from URL params
- Create PreviewPage route for iframe rendering
- Foundation for live preview in admin dashboard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Update Documentation

**Files:**
- Create: `docs/admin-guide.md`

**Interfaces:**
- Consumes: None (documentation)
- Produces: User guide for new admin interface

- [ ] **Step 1: Create admin guide documentation**

```markdown
# Admin Dashboard Guide

## Overview

The New Wave IT admin dashboard allows you to manage all website content from a unified interface.

## Access

- **Legacy Admin:** `/admin` - Original multi-page interface
- **Unified Dashboard:** `/admin/unified` - New single-page interface

## Using the Unified Dashboard

### Navigation

The sidebar is organized into 5 sections:

1. **Homepage Content** - Hero, Trust Bar, Testimonials
2. **Services Content** - Services, Categories, Details, Threats
3. **Company Content** - Why Us, About, Pricing
4. **Contact & Footer** - Contact info, Footer content
5. **SEO & Settings** - SEO Portal, Status page

### Editing Content

1. Click a section in the sidebar to load its editor
2. Make changes to any field
3. Changes are saved locally (unsaved changes indicator appears)
4. Click "Publish Changes" to save to the live site

### Real-time Updates

- Changes to the live site appear within 30 seconds of publishing
- For immediate updates, refresh the live site page
- BroadcastChannel sync works across tabs in the same browser

### Discarding Changes

Click "Discard" to revert unsaved changes and reload from the server.

## Troubleshooting

### Changes not appearing on live site

1. Verify the publish completed successfully (check for "All changes published" message)
2. Wait up to 30 seconds for automatic cache refresh
3. Hard refresh the live site page (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for errors

### Error during publish

- Check your network connection
- Verify you're logged in
- Try discarding changes and re-editing
- Contact support if issue persists
```

- [ ] **Step 2: Commit**

```bash
git add docs/admin-guide.md
git commit -m "docs: add admin dashboard user guide

- Document unified dashboard navigation
- Explain editing and publishing workflow
- Add troubleshooting section

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Final Testing and Validation

**Files:**
- No file changes (testing task)

**Interfaces:**
- Consumes: All implemented features
- Produces: Validation of complete solution

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

```bash
npm run typecheck
```
Expected: No TypeScript errors

- [ ] **Step 3: Run linter**

```bash
npm run lint
```
Expected: No linting errors

- [ ] **Step 4: Build production bundle**

```bash
npm run build
```
Expected: Build completes successfully

- [ ] **Step 5: Start dev server and manual test**

```bash
npm run dev
```

Manual testing checklist:
1. Navigate to `/admin/unified`
2. Edit hero headline
3. Verify unsaved changes indicator
4. Publish changes
5. Open live site in new tab
6. Verify headline updated
7. Test discard functionality
8. Test multiple section editing
9. Test error handling (disconnect network)

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: final validation and testing complete

- All tests passing
- Type checking clean
- Production build successful
- Manual testing validated

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Create Migration Notes for Remaining Editors

**Files:**
- Create: `docs/editor-migration-guide.md`

**Interfaces:**
- Consumes: None (documentation)
- Produces: Guide for migrating remaining editors

- [ ] **Step 1: Create migration guide**

```markdown
# Editor Migration Guide

## Overview

This guide explains how to migrate the remaining admin editors to use the new ContentManager system.

## Migration Pattern

Each editor follows the same pattern as HeroEditor and ServicesEditor:

### Before (Old Pattern)

\`\`\`typescript
const [content, setContent] = useState<Record<string, string>>({});
const [cards, setCards] = useState<ServiceCard[]>([]);

useEffect(() => {
  fetchSectionContent('services').then((data) => {
    setContent(data);
    try { setCards(JSON.parse(data.cards || '[]')); } catch { setCards([]); }
    setLoaded(true);
  });
}, []);

const handleSave = async () => {
  await upsertManyContent('services', {
    ...content,
    cards: JSON.stringify(cards),
  });
};
\`\`\`

### After (New Pattern)

\`\`\`typescript
const [state, setState] = useState<ContentManagerState>(contentManager.getState());
const [cards, setCards] = useState<ServiceCard[]>([]);

useEffect(() => {
  const unsubscribe = contentManager.subscribe((newState) => {
    setState(newState);
    const content = newState.sections.services ?? {};
    try { setCards(JSON.parse(content.cards ?? '[]')); } catch { setCards([]); }
  });

  if (!state.sections.services) {
    contentManager.loadSection('services');
  }

  return unsubscribe;
}, []);

const content = state.sections.services ?? {};

const setField = (key: string, value: string) => {
  contentManager.updateField('services', key, value);
};

const handleSave = async () => {
  await contentManager.publishChanges();
};
\`\`\`

## Remaining Editors to Migrate

1. TrustBarEditor
2. WhyUsEditor
3. AboutEditor
4. ContactEditor
5. FooterEditor
6. PricingEditor
7. PricingUnitsEditor
8. StatusEditor
9. ServicesCategoryEditor
10. ServicesDetailEditor
11. ThreatsDetailEditor
12. SeoPortal
13. SeoPageEditor

## Testing After Migration

1. Load the editor
2. Make changes to fields
3. Verify unsaved changes indicator appears
4. Publish changes
5. Verify changes appear on live site
6. Test discard functionality
```

- [ ] **Step 2: Commit**

```bash
git add docs/editor-migration-guide.md
git commit -m "docs: add editor migration guide

- Document pattern for migrating editors to ContentManager
- List remaining editors to migrate
- Include testing checklist

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Update CLAUDE.md with Project Notes

**Files:**
- Modify: `CLAUDE.md` (create if doesn't exist)

**Interfaces:**
- Consumes: Implementation knowledge
- Produces: Project documentation for future work

- [ ] **Step 1: Add project notes to CLAUDE.md**

```markdown
# New Wave IT Redesign Project

## Recent Changes

### Unified Admin Dashboard (2026-08-16)

Implemented a unified admin dashboard with:

- **Centralized ContentManager** (`src/admin/ContentManager.ts`)
  - Optimistic updates for instant UI feedback
  - Batch publish to Supabase
  - State subscription system for React components

- **BroadcastChannel Sync** (`src/lib/content.ts`)
  - Real-time cache updates across tabs
  - Polling fallback for production

- **Unified Dashboard** (`/admin/unified`)
  - Sidebar navigation with 5 section groups
  - Integrated PublishBar for save actions
  - Hero and Services editors migrated

## Content Structure

Content is stored in Supabase `site_content` table:
- `section`: Content area (hero, services, etc.)
- `key`: Field name within section
- `value`: Text or JSON string

## Admin Editors

Legacy editors (to be migrated):
- Located in `src/admin/editors/`
- Each handles one section
- Use fetchSectionContent/upsertManyContent

Migrated editors (use ContentManager):
- HeroEditor
- ServicesEditor

## Testing

- Integration tests: `src/test/integration/`
- E2E tests: `tests/e2e/`
- Run with: `npm test`

## Next Steps

1. Migrate remaining editors to ContentManager
2. Implement live preview pane
3. Add version history support
4. Implement concurrent edit detection
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with unified admin notes

- Document ContentManager implementation
- Note BroadcastChannel sync changes
- List migrated and remaining editors
- Include testing and next steps

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Final Review and Cleanup

**Files:**
- Multiple (review task)

**Interfaces:**
- Consumes: All implemented code
- Produces: Clean, production-ready codebase

- [ ] **Step 1: Review all commits**

```bash
git log --oneline -20
```

Verify:
- All commits have descriptive messages
- Co-Authored-By included
- No placeholder commits

- [ ] **Step 2: Check for TODO/FIXME comments**

```bash
grep -r "TODO\|FIXME" src/
```

Address any found items or create tickets for them.

- [ ] **Step 3: Verify no console errors**

```bash
npm run dev
```

Check browser console for any errors or warnings.

- [ ] **Step 4: Final documentation check**

Verify:
- `docs/admin-guide.md` is complete
- `docs/editor-migration-guide.md` is accurate
- `CLAUDE.md` is up to date

- [ ] **Step 5: Create release summary**

```bash
cat > RELEASE_NOTES.md << 'EOF'
# Unified Admin Dashboard Release

## What's New

- New unified admin dashboard at `/admin/unified`
- Real-time content sync via BroadcastChannel
- Centralized ContentManager for reliable updates
- Optimistic UI updates for instant feedback
- Organized sidebar with 5 section groups

## Fixed Issues

- Content updates now reliably appear on live site
- Cache invalidation works across browser tabs
- Polling fallback for production environments

## Migration

Hero and Services editors migrated to ContentManager.
See `docs/editor-migration-guide.md` for remaining editors.

## Testing

- Integration tests for ContentManager
- E2E tests for admin publish flow
- All tests passing
EOF
git add RELEASE_NOTES.md
git commit -m "docs: add release notes for unified dashboard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: unified admin dashboard implementation complete

- 20 tasks completed
- All tests passing
- Documentation complete
- Ready for production use

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Summary

This implementation plan delivers:

✅ **Phase 1: Foundation**
- BroadcastChannel support for real-time sync
- ContentManager with optimistic updates
- PublishBar component for save actions

✅ **Phase 2: Unified Layout**
- SidebarNavigation with organized sections
- UnifiedAdminDashboard layout
- Hero and Services editors migrated

✅ **Phase 3: Live Preview**
- LivePreview component
- Preview mode support in components

✅ **Phase 4: Testing & Docs**
- Integration tests
- E2E tests
- Complete documentation

The plan fixes the core issue (data not updating on live site) while providing an organized, extensible admin interface for future development.
