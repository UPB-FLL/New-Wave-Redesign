import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import type { ListField } from '../sections/types';
import FieldInput, { type FieldValue } from './FieldInput';

/**
 * A list block (cards, tiers, services) as compact rows: title, a second
 * field, drag or arrow reorder, duplicate and delete. Clicking a row opens
 * it in a side panel. The whole list is one JSON value in `site_content`,
 * so every change goes back through `onChange` with the full list.
 */

export type ListItem = Record<string, FieldValue>;

interface ListRowsProps {
  field: ListField;
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  /** Prefix for input ids, e.g. `field-pricing-tiers`. */
  idPrefix: string;
  edited?: boolean;
}

const rowButton = 'p-1.5 rounded text-white/35 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent';

function ItemPanel({ field, item, index, onChange, onClose, idPrefix }: {
  field: ListField; item: ListItem; index: number; onChange: (item: ListItem) => void; onClose: () => void; idPrefix: string;
}) {
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => {
    first.current?.querySelector<HTMLElement>('input, textarea, select')?.focus();
  }, [index]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const title = String(item[field.titleKey] ?? '') || `${field.itemLabel} ${index + 1}`;
  return (
    <aside
      role="dialog"
      aria-label={`Edit ${title}`}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[28rem] flex flex-col shadow-2xl"
      style={{ background: '#111c27', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
    >
      <header className="flex items-center justify-between gap-3 px-5 h-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>{field.label} · {index + 1} of {field.itemLabel}s</p>
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
        </div>
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: 'rgba(57,204,204,0.15)', color: '#39CCCC' }}>
          Done
        </button>
      </header>
      <div ref={first} className="flex-1 overflow-y-auto p-5 space-y-5">
        {field.fields.map((f) => (
          <FieldInput
            key={f.key}
            field={f}
            id={`${idPrefix}-${index}-${f.key}`}
            value={item[f.key]}
            onChange={(v) => onChange({ ...item, [f.key]: v })}
          />
        ))}
      </div>
    </aside>
  );
}

export default function ListRows({ field, items, onChange, idPrefix, edited }: ListRowsProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const update = (i: number, item: ListItem) => onChange(items.map((x, j) => (j === i ? item : x)));
  const remove = (i: number) => {
    onChange(items.filter((_, j) => j !== i));
    setSelected(null);
  };
  const duplicate = (i: number) => {
    const copy = JSON.parse(JSON.stringify(items[i])) as ListItem;
    onChange([...items.slice(0, i + 1), copy, ...items.slice(i + 1)]);
  };
  const add = () => {
    onChange([...items, { ...field.newItem } as ListItem]);
    setSelected(items.length);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    if (selected === from) setSelected(to);
  };

  const subtitle = (item: ListItem) => {
    if (!field.subtitleKey) return '';
    const v = item[field.subtitleKey];
    return Array.isArray(v) ? v.join(', ') : String(v ?? '');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {items.length} {items.length === 1 ? field.itemLabel : `${field.itemLabel}s`}
          {edited && <span className="ml-2 text-amber-300">unsaved</span>}
        </p>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'rgba(57,204,204,0.12)', color: '#39CCCC', border: '1px solid rgba(57,204,204,0.2)' }}
        >
          <Plus size={12} /> Add {field.itemLabel}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl p-5 text-sm space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
          <p>No {field.itemLabel}s yet. The site shows its built-in {field.itemLabel}s until some are saved here.</p>
          {field.defaults && (
            <button type="button" onClick={() => onChange(field.defaults!.map((d) => ({ ...d }) as ListItem))} className="text-xs font-medium underline" style={{ color: '#39CCCC' }}>
              Start from the site's defaults ({field.defaults.length})
            </button>
          )}
        </div>
      ) : (
        <ul className="rounded-xl overflow-hidden divide-y" style={{ border: '1px solid rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.08)' }} aria-label={field.label}>
          {items.map((item, i) => {
            const title = String(item[field.titleKey] ?? '') || <span className="italic text-white/40">Untitled {field.itemLabel}</span>;
            return (
              <li
                key={i}
                draggable
                onDragStart={() => setDragging(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragging !== null) move(dragging, i); setDragging(null); }}
                onDragEnd={() => setDragging(null)}
                className={`flex items-center gap-2 px-2 py-1.5 text-sm ${selected === i ? 'bg-teal-500/10' : 'hover:bg-white/[0.04]'} ${dragging === i ? 'opacity-50' : ''}`}
                style={{ background: selected === i ? undefined : 'rgba(255,255,255,0.02)' }}
              >
                <span className="cursor-grab text-white/25" aria-hidden="true"><GripVertical size={14} /></span>
                <button type="button" onClick={() => setSelected(i)} className="flex-1 min-w-0 text-left py-1 flex items-baseline gap-3">
                  <span className="text-white font-medium truncate">{title}</span>
                  <span className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle(item)}</span>
                </button>
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${field.itemLabel} ${i + 1} up`} className={rowButton}><ChevronUp size={14} /></button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={`Move ${field.itemLabel} ${i + 1} down`} className={rowButton}><ChevronDown size={14} /></button>
                <button type="button" onClick={() => duplicate(i)} aria-label={`Duplicate ${field.itemLabel} ${i + 1}`} className={rowButton}><Copy size={14} /></button>
                <button type="button" onClick={() => remove(i)} aria-label={`Delete ${field.itemLabel} ${i + 1}`} className="p-1.5 rounded text-red-400/50 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={14} /></button>
              </li>
            );
          })}
        </ul>
      )}

      {selected !== null && items[selected] && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelected(null)} aria-hidden="true" />
          <ItemPanel
            field={field}
            item={items[selected]}
            index={selected}
            idPrefix={idPrefix}
            onChange={(item) => update(selected, item)}
            onClose={() => setSelected(null)}
          />
        </>
      )}
    </div>
  );
}
