import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { discoverBusiness } from '../../lib/groundswellDiscovery';
import type { DiscoveryResult, DiscoverySeed } from '../../lib/groundswellDiscoveryTypes';
import { normalizeFacebook, normalizeInstagram, normalizeWebsite } from '../../lib/groundswellValidation';
import type { WorkspaceViewer } from '../../lib/groundswellWorkspace';

export interface DiscoveryDraft {
  business_name: string;
  city: string;
  website: string;
  instagram: string;
  facebook?: string;
  brand_logo_url?: string;
  brand_color?: string;
  kind?: 'audit' | 'benchmark';
  competitors: { name: string; website: string; instagram: string; facebook?: string }[];
}

const fields = ['business_name', 'city', 'website', 'instagram', 'facebook', 'brand_logo_url', 'brand_color'] as const;
type Field = typeof fields[number];

function seedOf(draft: DiscoveryDraft): DiscoverySeed {
  const valid = (read: () => string | null) => { try { return read() || undefined; } catch { return undefined; } };
  const website = valid(() => normalizeWebsite(draft.website));
  const instagram = valid(() => normalizeInstagram(draft.instagram));
  const facebook = valid(() => normalizeFacebook(draft.facebook || ''));
  return { website, instagram, facebook, business_name: draft.business_name.trim() || undefined, city: draft.city.trim() || undefined };
}

function keyOf(draft: DiscoveryDraft): string {
  const seed = seedOf(draft);
  const context = (value: string | undefined) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return seed.website || seed.instagram || seed.facebook
    ? JSON.stringify([seed.website || '', seed.instagram || '', seed.facebook || '', context(seed.business_name), context(seed.city)])
    : '';
}

/** One cancellable lookup shared by staff and partner intake. Manual edits always win. */
export function useBusinessDiscovery<T extends DiscoveryDraft>(draft: T, setDraft: Dispatch<SetStateAction<T>>, viewer: WorkspaceViewer, enabled = true) {
  const current = useRef(draft);
  current.current = draft;
  const manual = useRef(new Set<string>());
  const automatic = useRef(new Set<Field>());
  const automaticCompetitors = useRef(false);
  const autoSeed = useRef('');
  const completed = useRef(new Set<string>());
  const generation = useRef(0);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inFlight = useRef<{ key: string; controller: AbortController; promise: Promise<T> } | null>(null);
  const [state, setState] = useState<{ key: string; status: 'loading' | 'done' | 'error'; result?: DiscoveryResult; error?: string } | null>(null);
  const key = enabled ? keyOf(draft) : '';

  const apply = (result: DiscoveryResult) => {
    const next = { ...current.current };
    for (const field of fields) {
      const found = result.business[field];
      if (manual.current.has(field)) continue;
      if (typeof found === 'string' && found.trim()) {
        Object.assign(next, { [field]: found });
        automatic.current.add(field);
      } else if (automatic.current.has(field)) {
        Object.assign(next, { [field]: '' });
        automatic.current.delete(field);
      }
    }
    if (!manual.current.has('competitors')) {
      // A named suggestion without a public profile cannot be queued by the existing engine.
      const suggestions = result.competitors.filter((c) => c.website || c.instagram || c.facebook).slice(0, 6);
      if (suggestions.length || automaticCompetitors.current) {
        next.competitors = suggestions.map((c) => ({ name: c.name, website: c.website || '', instagram: c.instagram || '', ...(c.facebook ? { facebook: c.facebook } : {}) }));
        while (next.competitors.length < (next.kind === 'benchmark' ? 2 : 1)) next.competitors.push({ name: '', website: '', instagram: '' });
        automaticCompetitors.current = true;
      }
    }
    autoSeed.current = keyOf(next);
    current.current = next;
    setDraft(next);
    return next;
  };

  const lookup = async (force = false): Promise<T> => {
    if (timer.current) clearTimeout(timer.current);
    const requestKey = enabled ? keyOf(current.current) : '';
    if (!requestKey) return current.current;
    if (!force && inFlight.current?.key === requestKey) return inFlight.current.promise;
    if (!force && (completed.current.has(requestKey) || autoSeed.current === requestKey)) return current.current;
    inFlight.current?.controller.abort();
    const controller = new AbortController();
    const id = ++generation.current;
    setState({ key: requestKey, status: 'loading' });
    const promise = (async () => {
      try {
        const result = await discoverBusiness(viewer, seedOf(current.current), controller.signal);
        if (!mounted.current || id !== generation.current || controller.signal.aborted || keyOf(current.current) !== requestKey) return current.current;
        completed.current.add(requestKey);
        const next = apply(result);
        setState({ key: keyOf(next), status: 'done', result });
        return next;
      } catch (err) {
        if (!mounted.current || id !== generation.current || controller.signal.aborted) return current.current;
        completed.current.add(requestKey);
        setState({ key: requestKey, status: 'error', error: err instanceof Error ? err.message : 'Could not look up this business. Try again or enter the details below.' });
        return current.current;
      } finally {
        if (inFlight.current?.controller === controller) inFlight.current = null;
      }
    })();
    inFlight.current = { key: requestKey, controller, promise };
    return promise;
  };
  const latestLookup = useRef(lookup);
  latestLookup.current = lookup;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current && inFlight.current.key !== key) {
      ++generation.current;
      inFlight.current.controller.abort();
      inFlight.current = null;
    }
    if (!key || key === autoSeed.current || completed.current.has(key)) return;
    timer.current = setTimeout(() => { void latestLookup.current(); }, 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [key]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      inFlight.current?.controller.abort();
    };
  }, []);

  const visible = key && (state?.key === key || state?.status === 'loading') ? state : null;
  const pending = Boolean(key && ((key !== autoSeed.current && !completed.current.has(key)) || visible?.status === 'loading'));
  const reset = () => {
    ++generation.current;
    inFlight.current?.controller.abort();
    inFlight.current = null;
    if (timer.current) clearTimeout(timer.current);
    manual.current.clear();
    automatic.current.clear();
    automaticCompetitors.current = false;
    completed.current.clear();
    autoSeed.current = '';
    setState(null);
  };
  const resolve = async (): Promise<T> => {
    do {
      await lookup();
      const latestKey = enabled ? keyOf(current.current) : '';
      if (!latestKey || latestKey === autoSeed.current || completed.current.has(latestKey)) return current.current;
      // If the user changed context while a request was pending, finish that
      // latest lookup before a submit can queue its competitor suggestions.
    } while (mounted.current);
    return current.current;
  };
  return {
    pending,
    loading: visible?.status === 'loading',
    result: visible?.result || null,
    error: visible?.error || null,
    canDiscover: Boolean(key),
    markEdited: (field: Field | 'competitors', value?: string) => {
      manual.current.add(field);
      const sourceChanged = ['website', 'instagram', 'facebook'].includes(field);
      const contextChanged = field === 'business_name' || field === 'city';
      if (!enabled || (!sourceChanged && !contextChanged) || value === undefined || keyOf({ ...current.current, [field]: value }) === keyOf(current.current)) return;
      // A new source discards previous automatic identity/brand fields. A name
      // or location correction only invalidates automatic competitor matches.
      const previousAutomatic = sourceChanged ? new Set(automatic.current) : new Set<Field>();
      const clearCompetitors = automaticCompetitors.current && !manual.current.has('competitors');
      setDraft((previous) => {
        const next = { ...previous };
        for (const name of previousAutomatic) if (!manual.current.has(name)) Object.assign(next, { [name]: '' });
        if (clearCompetitors) next.competitors = Array.from({ length: next.kind === 'benchmark' ? 2 : 1 }, () => ({ name: '', website: '', instagram: '' }));
        return next;
      });
      if (sourceChanged) automatic.current.clear();
      automaticCompetitors.current = false;
      completed.current.clear();
      autoSeed.current = '';
      setState(null);
    },
    resolve,
    refresh: () => lookup(true),
    reset,
  };
}

export type BusinessDiscovery = ReturnType<typeof useBusinessDiscovery>;
