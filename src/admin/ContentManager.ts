import { supabase } from '../lib/supabase';
import { broadcastContentChange, writeContentCache } from '../lib/content';
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
  /** Sections whose server copy changed after they were loaded here; set by a refused publish. */
  staleSections: string[];
  /** Sections read at least once (an empty map alone cannot say). */
  loaded: Record<string, boolean>;
}

export type ContentManagerListener = (state: ContentManagerState) => void;

/** sessionStorage key for unsaved edits, so a reload or a wrong click does not lose them. */
export const DRAFT_KEY = 'nw_admin_draft';

/** Thrown by `publishChanges` when another tab or person saved the section after it was loaded here. */
export class StaleSectionError extends Error {
  constructor(public readonly sections: string[]) {
    super(`Changed elsewhere since you opened it: ${sections.join(', ')}`);
    this.name = 'StaleSectionError';
  }
}

type Row = { key: string | null; value: string | null; updated_at?: string | null };

function readDraft(): Record<string, Partial<ContentMap>> {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeDraft(pending: Record<string, Partial<ContentMap>>): void {
  try {
    if (Object.keys(pending).length === 0) sessionStorage.removeItem(DRAFT_KEY);
    else sessionStorage.setItem(DRAFT_KEY, JSON.stringify(pending));
  } catch {
    /* private mode or quota: the draft lives in memory only */
  }
}

export class ContentManager {
  private state: ContentManagerState = {
    sections: {},
    pendingChanges: readDraft(),
    publishStatus: 'idle',
    lastError: null,
    staleSections: [],
    loaded: {},
  };

  private listeners: Set<ContentManagerListener> = new Set();
  private loadPromises: Map<string, Promise<ContentMap>> = new Map();
  /** The newest `updated_at` seen when each section was loaded; the stale check compares against it. */
  private loadedAt: Record<string, string | null> = {};

  constructor() {
    // Pre-load common sections on initialization
    this.preloadSections();
  }

  private async preloadSections() {
    const commonSections = ['hero', 'services', 'whyus', 'about', 'contact', 'footer'];
    await Promise.all(commonSections.map(s => this.loadSection(s).catch(() => undefined)));
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

  /** The section with its unsaved edits laid over the server copy. */
  private withPending(section: string, content: ContentMap): ContentMap {
    const pending = this.state.pendingChanges[section];
    if (!pending) return content;
    const merged = { ...content };
    for (const [key, value] of Object.entries(pending)) if (typeof value === 'string') merged[key] = value;
    return merged;
  }

  public async loadSection(section: string): Promise<ContentMap> {
    // Return cached promise if already loading
    if (this.loadPromises.has(section)) {
      return this.loadPromises.get(section)!;
    }

    const loadPromise = (async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('key, value, updated_at')
        .eq('section', section);

      if (error) throw error;

      const rows = (data ?? []) as Row[];
      const content = Object.fromEntries(
        rows
          .filter(row => row.key !== null && row.key !== undefined && row.value !== null && row.value !== undefined)
          .map(row => [row.key as string, row.value as string])
      );
      this.loadedAt[section] = rows.reduce<string | null>((latest, row) => (row.updated_at && (!latest || row.updated_at > latest) ? row.updated_at : latest), null);

      // New objects, not in-place edits, so React memos keyed on them see the change.
      this.state.sections = { ...this.state.sections, [section]: this.withPending(section, content) };
      this.state.loaded = { ...this.state.loaded, [section]: true };
      this.notifyListeners();
      return this.state.sections[section];
    })();

    this.loadPromises.set(section, loadPromise);
    try {
      return await loadPromise;
    } finally {
      this.loadPromises.delete(section);
    }
  }

  public getSection(section: string): ContentMap {
    return this.state.sections[section] ?? {};
  }

  public updateField(section: string, key: string, value: string): void {
    // Update local state immediately (optimistic update), as new objects.
    this.state.sections = { ...this.state.sections, [section]: { ...(this.state.sections[section] ?? {}), [key]: value } };
    this.state.pendingChanges = { ...this.state.pendingChanges, [section]: { ...(this.state.pendingChanges[section] ?? {}), [key]: value } };
    writeDraft(this.state.pendingChanges);

    this.notifyListeners();
  }

  /** Whether a key has an unsaved edit. */
  public isPending(section: string, key: string): boolean {
    return this.state.pendingChanges[section]?.[key] !== undefined;
  }

  /** Sections with unsaved edits whose server rows changed after they were loaded here. */
  private async findStaleSections(): Promise<string[]> {
    const sections = Object.keys(this.state.pendingChanges);
    if (sections.length === 0) return [];
    const { data, error } = await supabase
      .from('site_content')
      .select('section, updated_at');
    if (error) throw error;
    const newest: Record<string, string> = {};
    for (const row of (data ?? []) as Array<{ section: string | null; updated_at: string | null }>) {
      if (!row.section || !row.updated_at) continue;
      if (!newest[row.section] || row.updated_at > newest[row.section]) newest[row.section] = row.updated_at;
    }
    return sections.filter((s) => {
      const seen = this.loadedAt[s];
      const now = newest[s];
      return !!now && (!seen || now > seen);
    });
  }

  /**
   * Save every unsaved edit in one upsert. Unless `force`, a section that
   * changed on the server since it was loaded here is refused with a
   * `StaleSectionError` (and listed in `staleSections`) so the caller can
   * ask before overwriting. On success the public site's cache is written
   * and the change broadcast, so open tabs update at once.
   */
  public async publishChanges(options: { force?: boolean } = {}): Promise<void> {
    if (Object.keys(this.state.pendingChanges).length === 0) {
      return; // Nothing to publish
    }

    this.state.publishStatus = 'saving';
    this.state.lastError = null;
    this.state.staleSections = [];
    this.notifyListeners();

    try {
      if (!options.force) {
        const stale = await this.findStaleSections();
        if (stale.length > 0) {
          this.state.staleSections = stale;
          this.state.publishStatus = 'idle';
          this.notifyListeners();
          throw new StaleSectionError(stale);
        }
      }

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
      const now = new Date().toISOString();
      const rows = allChanges.map(({ section, key, value }) => ({
        section,
        key,
        value,
        updated_at: now,
      }));

      const { error } = await supabase
        .from('site_content')
        .upsert(rows, { onConflict: 'section,key' });

      if (error) throw error;

      // The live site reads this cache and channel; without them it waits for the next poll.
      for (const section of Object.keys(this.state.pendingChanges)) {
        writeContentCache(section, this.state.sections[section] ?? {});
        this.loadedAt[section] = now;
      }
      for (const { section, key, value } of allChanges) broadcastContentChange(section, key, value);

      // Clear pending changes on success
      this.state.pendingChanges = {};
      writeDraft({});
      this.state.publishStatus = 'saved';
      this.notifyListeners();

      // Reset to idle after a delay
      setTimeout(() => {
        this.state.publishStatus = 'idle';
        this.notifyListeners();
      }, 2000);

    } catch (err) {
      if (err instanceof StaleSectionError) throw err;
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
    writeDraft({});
    this.state.publishStatus = 'idle';
    this.state.lastError = null;
    this.state.staleSections = [];
    this.notifyListeners();

    // Reload from server
    sectionsToReload.forEach(section => {
      this.loadSection(section).catch(() => undefined);
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
