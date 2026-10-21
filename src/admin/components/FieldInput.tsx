import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { ScalarField } from '../sections/types';

/**
 * The one field widget set for every admin editor: text, long text, number,
 * colour, select, checkbox, and a list of plain strings. Labels are real
 * <label>s bound to the input, inputs are 14px, and the hint says where the
 * value shows on the site.
 */

export type FieldValue = string | number | boolean | string[] | undefined;

interface FieldInputProps {
  field: ScalarField;
  value: FieldValue;
  onChange: (value: string | number | boolean | string[]) => void;
  /** The input's DOM id, so the sidebar search can focus it. */
  id: string;
  /** True while the field has an unsaved edit. */
  edited?: boolean;
}

const inputClass = 'w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-teal-500/40';
const inputStyle = { background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' };

function StringsInput({ id, values, onChange, label }: { id: string; values: string[]; onChange: (v: string[]) => void; label: string }) {
  const set = (i: number, v: string) => onChange(values.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= values.length) return;
    const next = [...values];
    [next[i], next[t]] = [next[t], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2" role="group" aria-labelledby={`${id}-label`}>
      {values.length === 0 && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>None yet.</p>}
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            id={i === 0 ? id : `${id}-${i}`}
            type="text"
            value={v}
            onChange={(e) => set(i, e.target.value)}
            aria-label={`${label} ${i + 1}`}
            className={inputClass}
            style={inputStyle}
          />
          <button type="button" onClick={() => move(i, -1)} aria-label={`Move ${label} ${i + 1} up`} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10"><ChevronUp size={14} /></button>
          <button type="button" onClick={() => move(i, 1)} aria-label={`Move ${label} ${i + 1} down`} className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/10"><ChevronDown size={14} /></button>
          <button type="button" onClick={() => remove(i)} aria-label={`Remove ${label} ${i + 1}`} className="p-1.5 rounded text-red-400/60 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={14} /></button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ''])}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
        style={{ background: 'rgba(57,204,204,0.12)', color: '#39CCCC', border: '1px solid rgba(57,204,204,0.2)' }}
      >
        <Plus size={12} /> Add
      </button>
    </div>
  );
}

export default function FieldInput({ field, value, onChange, id, edited }: FieldInputProps) {
  const label = (
    <label id={`${id}-label`} htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-white/80">
      {field.label}
      {edited && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved" aria-label="unsaved" />}
    </label>
  );
  const hint = field.hint ? <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{field.hint}</p> : null;

  if (field.kind === 'checkbox') {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="flex items-center gap-3 text-sm font-medium text-white/80">
          <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-teal-500" />
          {field.label}
          {edited && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-label="unsaved" />}
        </label>
        {hint}
      </div>
    );
  }

  let control;
  switch (field.kind) {
    case 'textarea':
      control = <textarea id={id} rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={`${inputClass} resize-y`} style={inputStyle} placeholder={field.placeholder} />;
      break;
    case 'number':
      control = <input id={id} type="number" step="any" value={value === undefined || value === '' ? '' : String(value)} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} style={inputStyle} />;
      break;
    case 'color':
      control = (
        <div className="flex items-center gap-2">
          <input id={id} type="color" value={typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#39CCCC'} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0 p-0" />
          <input type="text" aria-label={`${field.label} hex`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={`${inputClass} font-mono`} style={inputStyle} placeholder="#39CCCC" />
        </div>
      );
      break;
    case 'select':
      control = (
        <select id={id} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={inputClass} style={{ ...inputStyle, color: 'white' }}>
          {(field.options ?? []).map((o) => <option key={o.value} value={o.value} style={{ background: '#1a2f3f' }}>{o.label}</option>)}
        </select>
      );
      break;
    case 'strings':
      control = <StringsInput id={id} values={Array.isArray(value) ? value : []} onChange={onChange} label={field.label} />;
      break;
    default:
      control = <input id={id} type="text" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={inputClass} style={inputStyle} placeholder={field.placeholder} />;
  }

  return (
    <div className="space-y-1.5">
      {label}
      {control}
      {hint}
    </div>
  );
}
