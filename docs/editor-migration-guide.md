# Editor Migration Guide

## Overview

This guide explains how to migrate the remaining admin editors to use the new ContentManager system.

## Migration Pattern

Each editor follows the same pattern as HeroEditor and ServicesEditor.

### Before (Old Pattern)

```typescript
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
```

### After (New Pattern)

```typescript
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
```

## Key Changes

1. **Imports**: Replace `fetchSectionContent, upsertManyContent` with `contentManager` and `ContentManagerState`
2. **State Management**: Use ContentManager subscription pattern instead of local state
3. **Field Updates**: Use `contentManager.updateField()` for individual fields
4. **Save Handler**: Use `contentManager.publishChanges()` instead of manual upsert
5. **Optimistic Updates**: UI updates immediately, synced to server on publish

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
14. TestimonialsEditor

## Migration Steps

For each editor:

1. Update imports to include ContentManager
2. Replace useState for content with ContentManagerState
3. Add useEffect for ContentManager subscription
4. Replace setField logic with updateField calls
5. Replace save handler with publishChanges
6. Remove manual save buttons (handled by PublishBar in unified dashboard)
7. Test the editor in the unified interface

## Testing After Migration

1. Load the editor
2. Make changes to fields
3. Verify unsaved changes indicator appears
4. Publish changes
5. Verify changes appear on live site
6. Test discard functionality

## Benefits

- **Optimistic UI**: Instant feedback when editing
- **Centralized State**: Single source of truth
- **Real-time Sync**: Changes propagate across tabs
- **Unified Interface**: One dashboard for all content
- **Better Error Handling**: Centralized error states
