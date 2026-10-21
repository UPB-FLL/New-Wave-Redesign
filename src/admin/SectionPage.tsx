import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { contentManager, type ContentManagerState } from './ContentManager';
import { SECTIONS } from './sections/descriptors';
import { isListField, type ListField, type SectionBlock, type SectionDescriptor } from './sections/types';
import BlockCard from './components/BlockCard';
import FieldInput, { type FieldValue } from './components/FieldInput';
import ListRows, { type ListItem } from './components/ListRows';
import { pageForPath } from './adminNav';
import { FIELD_PARAM, fieldInputId, parseList } from './sections/listValue';

/**
 * The editor for every `site_content` section, rendered from its
 * descriptor: a column of block cards, collapsed by default, with lists as
 * rows and a side panel. Every edit goes straight to the ContentManager,
 * and the layout's save bar publishes them. `?field=<key>` opens the block
 * holding that key and focuses its input (the sidebar search links here).
 */

function previewOf(block: SectionBlock, content: Record<string, string>): string {
  for (const f of block.fields) {
    if (isListField(f)) {
      const { items } = parseList(content[f.key]);
      if (items.length) return items.map((i) => String(i[f.titleKey] ?? '')).filter(Boolean).slice(0, 4).join(' · ');
      continue;
    }
    const v = content[f.key];
    if (v) return v.length > 90 ? `${v.slice(0, 90)}…` : v;
  }
  return '';
}

function ListBlockField({ field, section, raw, edited, onChange }: { field: ListField; section: string; raw: string | undefined; edited: boolean; onChange: (items: ListItem[]) => void }) {
  const { items, error } = parseList(raw);
  if (error) {
    return (
      <div role="alert" className="rounded-xl p-4 space-y-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <p className="text-red-200">The stored {field.label.toLowerCase()} could not be read ({error}). Nothing was changed; the site keeps showing its built-in {field.itemLabel}s.</p>
        <pre className="text-xs overflow-x-auto p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.6)' }}>{raw}</pre>
        <button type="button" onClick={() => onChange([])} className="text-xs font-medium underline text-red-200">
          Replace it with an empty list
        </button>
      </div>
    );
  }
  return <ListRows field={field} items={items} onChange={onChange} idPrefix={fieldInputId(section, field.key)} edited={edited} />;
}

export default function SectionPage({ section }: { section: string }) {
  const descriptor: SectionDescriptor | undefined = SECTIONS[section];
  const [state, setState] = useState<ContentManagerState>(() => contentManager.getState());
  const [params, setParams] = useSearchParams();
  const wanted = params.get(FIELD_PARAM);
  const blockOf = (key: string | null) => (key ? descriptor?.blocks.find((b) => b.fields.some((f) => f.key === key))?.id ?? null : null);
  const [openId, setOpenId] = useState<string | null>(() => blockOf(wanted) ?? descriptor?.blocks[0]?.id ?? null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => contentManager.subscribe(setState), []);
  useEffect(() => {
    setLoadError(null);
    contentManager.loadSection(section).catch((err) => setLoadError(err instanceof Error ? err.message : 'failed'));
  }, [section]);

  // A deep link from the sidebar search: open the block and focus the field, then drop the parameter.
  useEffect(() => {
    if (!wanted || !descriptor) return;
    const id = blockOf(wanted);
    if (id) setOpenId(id);
    const timer = setTimeout(() => {
      document.getElementById(fieldInputId(section, wanted))?.focus();
      setParams((p) => { p.delete(FIELD_PARAM); return p; }, { replace: true });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, section]);

  const content = useMemo(() => state.sections[section] ?? {}, [state.sections, section]);
  const loaded = state.loaded[section] === true;
  const pending = state.pendingChanges[section] ?? {};
  const page = pageForPath(useLocation().pathname);

  if (!descriptor) return <p className="text-white/60">No editor is defined for "{section}".</p>;

  const toggle = (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
  };
  const isOpen = (id: string) => openId === id || pinned.has(id);
  const pin = (id: string) => setPinned((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const setField = (key: string, value: FieldValue) => {
    contentManager.updateField(section, key, Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''));
  };
  const setList = (key: string, items: ListItem[]) => contentManager.updateField(section, key, JSON.stringify(items));

  const stringsValue = (raw: string | undefined): string[] => {
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          {page && <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{page.label}</p>}
          <h1 className="text-2xl font-bold text-white">{descriptor.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{descriptor.description}</p>
        </div>
        <a href={descriptor.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg text-white/70 hover:text-white flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ExternalLink size={12} /> View on site
        </a>
      </header>

      {loadError && <p role="alert" className="text-sm text-red-300">Could not load this section: {loadError}</p>}
      {!loaded && !loadError && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }} aria-busy="true">Loading…</p>}

      {loaded && descriptor.blocks.map((block) => {
        const keys = block.fields.map((f) => f.key);
        const count = block.fields.reduce((n, f) => n + (isListField(f) ? parseList(content[f.key]).items.length : 1), 0);
        return (
          <BlockCard
            key={block.id}
            id={`${section}-${block.id}`}
            title={block.title}
            description={block.description}
            preview={previewOf(block, content)}
            fieldCount={count}
            edited={keys.some((k) => pending[k] !== undefined)}
            open={isOpen(block.id)}
            pinned={pinned.has(block.id)}
            onToggle={() => toggle(block.id)}
            onPin={() => pin(block.id)}
          >
            {block.fields.map((field) => isListField(field) ? (
              <ListBlockField key={field.key} field={field} section={section} raw={content[field.key]} edited={pending[field.key] !== undefined} onChange={(items) => setList(field.key, items)} />
            ) : (
              <FieldInput
                key={field.key}
                field={field}
                id={fieldInputId(section, field.key)}
                value={field.kind === 'strings' ? stringsValue(content[field.key]) : content[field.key]}
                edited={pending[field.key] !== undefined}
                onChange={(v) => setField(field.key, v)}
              />
            ))}
          </BlockCard>
        );
      })}
    </div>
  );
}
