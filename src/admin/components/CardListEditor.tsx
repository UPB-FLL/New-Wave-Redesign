import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface Field {
  key: string;
  label: string;
  multiline?: boolean;
}

interface CardListEditorProps {
  label: string;
  items: Record<string, string>[];
  fields: Field[];
  onChange: (items: Record<string, string>[]) => void;
  defaultItem: Record<string, string>;
}

export default function CardListEditor({ label, items, fields, onChange, defaultItem }: CardListEditorProps) {
  const update = (index: number, key: string, value: string) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  const add = () => onChange([...items, { ...defaultItem }]);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
        <button
          onClick={add}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{ background: 'rgba(57,204,204,0.12)', color: '#39CCCC', border: '1px solid rgba(57,204,204,0.2)' }}
        >
          <Plus size={12} /> Add Item
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>Item {index + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => move(index, -1)} className="p-1 rounded hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => move(index, 1)} className="p-1 rounded hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <ChevronDown size={14} />
                </button>
                <button onClick={() => remove(index)} className="p-1 rounded hover:bg-red-500/10 transition-all" style={{ color: 'rgba(239,68,68,0.5)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-2.5">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{field.label}</label>
                  {field.multiline ? (
                    <textarea
                      rows={2}
                      value={item[field.key] ?? ''}
                      onChange={(e) => update(index, field.key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none resize-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(57,204,204,0.5)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  ) : (
                    <input
                      type="text"
                      value={item[field.key] ?? ''}
                      onChange={(e) => update(index, field.key, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(57,204,204,0.5)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
