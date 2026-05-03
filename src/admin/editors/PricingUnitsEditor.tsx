import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Loader2, Check } from 'lucide-react';

interface PricingUnit {
  id: string;
  name: string;
  description: string;
  cost_per_unit: number;
  min_quantity: number;
  max_quantity: number;
  sort_order: number;
  active: boolean;
}

export default function PricingUnitsEditor() {
  const [units, setUnits] = useState<PricingUnit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [costInput, setCostInput] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_units')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setUnits(data || []);
    } catch (err) {
      console.error('Failed to fetch pricing units:', err);
    } finally {
      setLoaded(true);
    }
  };

  const updateUnit = (id: string, field: keyof PricingUnit, value: string | number | boolean) => {
    setUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: value } : u))
    );
    setEditingId(null);
  };

  const addUnit = () => {
    const newUnit: PricingUnit = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      cost_per_unit: 0,
      min_quantity: 1,
      max_quantity: 1000,
      sort_order: Math.max(0, ...units.map((u) => u.sort_order)) + 1,
      active: true,
    };
    setUnits((prev) => [...prev, newUnit]);
    setEditingId(newUnit.id);
  };

  const removeUnit = (id: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  const moveUp = (id: string) => {
    const idx = units.findIndex((u) => u.id === id);
    if (idx <= 0) return;
    const newUnits = [...units];
    [newUnits[idx - 1], newUnits[idx]] = [newUnits[idx], newUnits[idx - 1]];
    newUnits.forEach((unit, i) => {
      unit.sort_order = i + 1;
    });
    setUnits(newUnits);
  };

  const moveDown = (id: string) => {
    const idx = units.findIndex((u) => u.id === id);
    if (idx >= units.length - 1) return;
    const newUnits = [...units];
    [newUnits[idx], newUnits[idx + 1]] = [newUnits[idx + 1], newUnits[idx]];
    newUnits.forEach((unit, i) => {
      unit.sort_order = i + 1;
    });
    setUnits(newUnits);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const unit of units) {
        if (!unit.name.trim()) {
          alert('All pricing units must have a name');
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from('pricing_units')
          .upsert(
            {
              id: unit.id,
              name: unit.name,
              description: unit.description,
              cost_per_unit: unit.cost_per_unit,
              min_quantity: unit.min_quantity,
              max_quantity: unit.max_quantity,
              sort_order: unit.sort_order,
              active: unit.active,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.error('Supabase error details:', error);
          throw error;
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : (err && typeof err === 'object' && 'message' in err)
          ? String((err as any).message)
          : 'Unknown error';
      alert('Failed to save: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 mx-auto mb-2" style={{ color: '#39CCCC' }} />
          <p className="text-gray-400">Loading pricing units...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pricing Units</h1>
          <p className="text-gray-400">Configure the options customers can select on the quote builder</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-60"
            style={{
              background: saved ? '#5EBC67' : '#39CCCC',
              color: 'white',
              boxShadow: `0 4px 12px ${saved ? 'rgba(94,188,103,0.3)' : 'rgba(57,204,204,0.3)'}`,
            }}
          >
            {saved ? (
              <>
                <Check size={16} /> Saved!
              </>
            ) : saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check size={16} /> Save Changes
              </>
            )}
          </button>
          <button
            onClick={addUnit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-lg"
            style={{
              background: 'rgba(57,204,204,0.15)',
              color: '#39CCCC',
              border: '1px solid rgba(57,204,204,0.3)',
            }}
          >
            <Plus size={16} /> Add Unit
          </button>
        </div>
      </div>

      {/* Units Grid */}
      {units.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center border-2 border-dashed transition-all duration-200 hover:border-opacity-100"
          style={{
            borderColor: 'rgba(57,204,204,0.3)',
            background: 'rgba(57,204,204,0.02)',
          }}
        >
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(57,204,204,0.1)' }}>
            <Plus size={24} style={{ color: '#39CCCC' }} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No pricing units yet</h3>
          <p className="text-gray-400 mb-6">Create your first pricing unit to get started</p>
          <button
            onClick={addUnit}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200"
            style={{
              background: '#39CCCC',
              color: 'white',
              boxShadow: '0 4px 12px rgba(57,204,204,0.3)',
            }}
          >
            <Plus size={16} /> Add First Unit
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit, idx) => (
            <div
              key={unit.id}
              className="group rounded-xl border transition-all duration-200 hover:shadow-lg"
              style={{
                borderColor: editingId === unit.id ? '#39CCCC' : 'rgba(57,204,204,0.15)',
                background: editingId === unit.id ? 'rgba(57,204,204,0.05)' : 'transparent',
              }}
            >
              <div className="p-6">
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Order Controls */}
                  <div className="col-span-1 flex flex-col gap-1">
                    <button
                      onClick={() => moveUp(unit.id)}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp size={16} style={{ color: '#39CCCC' }} />
                    </button>
                    <button
                      onClick={() => moveDown(unit.id)}
                      disabled={idx === units.length - 1}
                      className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown size={16} style={{ color: '#39CCCC' }} />
                    </button>
                  </div>

                  {/* Name & Description */}
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={unit.name}
                      onChange={(e) => updateUnit(unit.id, 'name', e.target.value)}
                      onFocus={() => setEditingId(unit.id)}
                      placeholder="Unit name"
                      className="w-full bg-transparent text-white font-semibold text-lg outline-none border-b border-transparent hover:border-gray-600 focus:border-gray-500 pb-1 transition-colors"
                    />
                    <input
                      type="text"
                      value={unit.description}
                      onChange={(e) => updateUnit(unit.id, 'description', e.target.value)}
                      onFocus={() => setEditingId(unit.id)}
                      placeholder="Description"
                      className="w-full mt-2 bg-transparent text-gray-400 text-sm outline-none border-b border-transparent hover:border-gray-600 focus:border-gray-500 pb-1 transition-colors"
                    />
                  </div>

                  {/* Cost */}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost per unit</label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        value={costInput[unit.id] !== undefined ? costInput[unit.id] : (unit.cost_per_unit / 100).toFixed(2)}
                        onChange={(e) => setCostInput((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            updateUnit(unit.id, 'cost_per_unit', Math.round(value * 100));
                            setCostInput((prev) => {
                              const next = { ...prev };
                              delete next[unit.id];
                              return next;
                            });
                          }
                          setEditingId(null);
                        }}
                        onFocus={() => setEditingId(unit.id)}
                        className="flex-1 bg-transparent text-white font-mono outline-none border-b border-transparent hover:border-gray-600 focus:border-gray-500 pb-1 transition-colors"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Quantity Range */}
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty range</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={unit.min_quantity}
                        onChange={(e) => updateUnit(unit.id, 'min_quantity', parseInt(e.target.value) || 1)}
                        onFocus={() => setEditingId(unit.id)}
                        className="w-12 bg-transparent text-white text-sm outline-none border-b border-transparent hover:border-gray-600 focus:border-gray-500 pb-1 transition-colors"
                      />
                      <span className="text-gray-500">−</span>
                      <input
                        type="number"
                        value={unit.max_quantity}
                        onChange={(e) => updateUnit(unit.id, 'max_quantity', parseInt(e.target.value) || 1000)}
                        onFocus={() => setEditingId(unit.id)}
                        className="w-16 bg-transparent text-white text-sm outline-none border-b border-transparent hover:border-gray-600 focus:border-gray-500 pb-1 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() => updateUnit(unit.id, 'active', !unit.active)}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        background: unit.active ? 'rgba(94,188,103,0.15)' : 'rgba(255,0,0,0.1)',
                        color: unit.active ? '#5EBC67' : '#ff6b6b',
                      }}
                      title={unit.active ? 'Visible to customers' : 'Hidden from customers'}
                    >
                      {unit.active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => removeUnit(unit.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500 hover:bg-opacity-10 transition-colors"
                      title="Delete unit"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      {units.length > 0 && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{
            background: 'rgba(57,204,204,0.05)',
            borderLeft: '3px solid rgba(57,204,204,0.3)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <strong>Tip:</strong> Reorder units by clicking the up/down arrows. Toggle visibility with the eye icon. All changes are saved to the database.
        </div>
      )}
    </div>
  );
}
