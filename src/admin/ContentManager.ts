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
        (data ?? [])
          .filter(row => row.key !== null && row.key !== undefined && row.value !== null && row.value !== undefined)
          .map(row => [row.key, row.value])
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
          if (value !== undefined && value !== null) {
            allChanges.push({ section, key, value });
          }
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

// Singleton instance for the app
export const contentManager = new ContentManager();