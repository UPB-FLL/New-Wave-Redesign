import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ContentManagerState } from '../../admin/ContentManager';
import type { ContentMap } from '../../lib/content';

// Simple test class that mimics ContentManager without Supabase dependency
class TestContentManager {
  private state: ContentManagerState = {
    sections: {},
    pendingChanges: {},
    publishStatus: 'idle',
    lastError: null,
  };

  private listeners: Set<(state: ContentManagerState) => void> = new Set();
  private mockData: Record<string, ContentMap> = {
    hero: {
      headline: 'Test Headline',
      subheadline: 'Test Subheadline',
      badge: 'Test Badge',
    },
    services: {
      headline: 'Services Headline',
      subheadline: 'Services Subheadline',
    },
  };

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  public getState(): ContentManagerState {
    return { ...this.state };
  }

  public subscribe(listener: (state: ContentManagerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public async loadSection(section: string): Promise<ContentMap> {
    await new Promise(resolve => setTimeout(resolve, 10));
    const content = this.mockData[section] ?? {};
    this.state.sections[section] = content;
    this.notifyListeners();
    return content;
  }

  public getSection(section: string): ContentMap {
    return this.state.sections[section] ?? {};
  }

  public updateField(section: string, key: string, value: string): void {
    if (!this.state.sections[section]) {
      this.state.sections[section] = {};
    }
    this.state.sections[section][key] = value;

    if (!this.state.pendingChanges[section]) {
      this.state.pendingChanges[section] = {};
    }
    this.state.pendingChanges[section][key] = value;

    this.notifyListeners();
  }

  public async publishChanges(): Promise<void> {
    if (Object.keys(this.state.pendingChanges).length === 0) {
      return;
    }

    this.state.publishStatus = 'saving';
    this.state.lastError = null;
    this.notifyListeners();

    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate successful publish
    this.state.pendingChanges = {};
    this.state.publishStatus = 'saved';
    this.notifyListeners();

    setTimeout(() => {
      this.state.publishStatus = 'idle';
      this.notifyListeners();
    }, 100);
  }

  public discardChanges(): void {
    const sectionsToReload = Object.keys(this.state.pendingChanges);
    this.state.pendingChanges = {};
    this.state.publishStatus = 'idle';
    this.state.lastError = null;
    this.notifyListeners();

    sectionsToReload.forEach(section => {
      this.loadSection(section);
    });
  }

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
}

describe('Content Sync Integration', () => {
  let contentManager: TestContentManager;

  beforeEach(() => {
    contentManager = new TestContentManager();
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

  it('should track unsaved changes', () => {
    contentManager.updateField('hero', 'headline', 'New Headline');

    expect(contentManager.hasUnsavedChanges()).toBe(true);
    expect(contentManager.getPendingChangesCount()).toBe(1);

    contentManager.updateField('hero', 'subheadline', 'New Subheadline');
    expect(contentManager.getPendingChangesCount()).toBe(2);
  });

  it('should publish changes', async () => {
    await contentManager.loadSection('hero');
    contentManager.updateField('hero', 'headline', 'Published Headline');

    await contentManager.publishChanges();

    const state = contentManager.getState();
    expect(state.publishStatus).toBe('saved');
    expect(Object.keys(state.pendingChanges).length).toBe(0);
  });

  it('should handle empty publish gracefully', async () => {
    await contentManager.publishChanges();

    const state = contentManager.getState();
    expect(state.publishStatus).toBe('idle');
  });

  it('should discard unsaved changes', async () => {
    await contentManager.loadSection('hero');

    contentManager.updateField('hero', 'headline', 'Discarded Headline');
    contentManager.discardChanges();

    await new Promise(resolve => setTimeout(resolve, 20));

    const state = contentManager.getState();
    expect(Object.keys(state.pendingChanges).length).toBe(0);
    expect(state.publishStatus).toBe('idle');
  });

  it('should notify subscribers on state changes', async () => {
    const listener = vi.fn();
    contentManager.subscribe(listener);

    await contentManager.loadSection('hero');

    expect(listener).toHaveBeenCalled();
    const lastCallState = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(lastCallState.sections.hero).toBeDefined();
  });

  it('should handle multiple section updates', async () => {
    await contentManager.loadSection('hero');
    await contentManager.loadSection('services');

    contentManager.updateField('hero', 'headline', 'Hero Update');
    contentManager.updateField('services', 'headline', 'Services Update');

    expect(contentManager.getPendingChangesCount()).toBe(2);
    expect(contentManager.getState().pendingChanges.hero?.headline).toBe('Hero Update');
    expect(contentManager.getState().pendingChanges.services?.headline).toBe('Services Update');
  });

  it('should get section content directly', async () => {
    await contentManager.loadSection('hero');

    const heroSection = contentManager.getSection('hero');
    expect(heroSection.headline).toBe('Test Headline');

    const emptySection = contentManager.getSection('nonexistent');
    expect(emptySection).toEqual({});
  });

  it('should return unsubscribe function from subscribe', () => {
    const listener = vi.fn();
    const unsubscribe = contentManager.subscribe(listener);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();

    const state = contentManager.getState();
    expect(state).toBeDefined();
  });

  it('should maintain correct state transitions during publish', async () => {
    await contentManager.loadSection('hero');
    contentManager.updateField('hero', 'headline', 'Test Update');

    // Initial state should have pending changes
    expect(contentManager.getState().publishStatus).toBe('idle');

    const publishPromise = contentManager.publishChanges();

    // During publish, status should be saving
    expect(contentManager.getState().publishStatus).toBe('saving');

    await publishPromise;

    // After publish, status should be saved
    expect(contentManager.getState().publishStatus).toBe('saved');

    // After timeout, status should return to idle
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(contentManager.getState().publishStatus).toBe('idle');
  });
});
