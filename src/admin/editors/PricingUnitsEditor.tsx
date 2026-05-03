import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import { Plus, Trash2, GripVertical } from 'lucide-react';

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
  };

  const addUnit = () => {
    const newUnit: PricingUnit = {
      id: crypto.randomUUID(),
      name: 'New Unit',
      description: '',
      cost_per_unit: 0,
      min_quantity: 1,
      max_quantity: 1000,
      sort_order: Math.max(0, ...units.map((u) => u.sort_order)) + 1,
      active: true,
    };
    setUnits((prev) => [...prev, newUnit]);
  };

  const removeUnit = (id: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const unit of units) {
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

        if (error) throw error;
      }

      alert('Pricing units saved successfully!');
    } catch (err) {
      alert('Failed to save pricing units: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div>Loading...</div>;

  return (
    <SectionEditor title="Pricing Units" onSave={handleSave}>
      <p className="text-sm mb-6" style={{ color: 'rgba(21,34,50,0.6)' }}>
        Define the pricing units that customers can select from (e.g., Employees, Computers, etc.). Costs are in cents.
      </p>

      <div className="mb-6">
        <button
          onClick={addUnit}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus size={18} /> Add Unit
        </button>
      </div>

      <div className="space-y-6">
        {units.map((unit, idx) => (
          <div key={unit.id} className="border rounded-lg p-6 bg-gray-50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <GripVertical size={18} className="text-gray-400" />
                <h4 className="text-base font-semibold">Unit {idx + 1}</h4>
              </div>
              <button
                onClick={() => removeUnit(unit.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <EditorField
                label="Unit Name"
                value={unit.name}
                onChange={(v) => updateUnit(unit.id, 'name', v)}
                placeholder="e.g., Employees"
              />
              <EditorField
                label="Cost Per Unit (cents)"
                value={unit.cost_per_unit.toString()}
                onChange={(v) => updateUnit(unit.id, 'cost_per_unit', parseInt(v) || 0)}
                type="number"
              />
            </div>

            <EditorField
              label="Description"
              value={unit.description}
              onChange={(v) => updateUnit(unit.id, 'description', v)}
              placeholder="Brief description of this unit"
            />

            <div className="grid grid-cols-3 gap-4 mb-4">
              <EditorField
                label="Min Quantity"
                value={unit.min_quantity.toString()}
                onChange={(v) => updateUnit(unit.id, 'min_quantity', parseInt(v) || 1)}
                type="number"
              />
              <EditorField
                label="Max Quantity"
                value={unit.max_quantity.toString()}
                onChange={(v) => updateUnit(unit.id, 'max_quantity', parseInt(v) || 1000)}
                type="number"
              />
              <EditorField
                label="Sort Order"
                value={unit.sort_order.toString()}
                onChange={(v) => updateUnit(unit.id, 'sort_order', parseInt(v) || 0)}
                type="number"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={unit.active}
                onChange={(e) => updateUnit(unit.id, 'active', e.target.checked)}
              />
              <span className="text-sm font-medium">Active (visible to customers)</span>
            </label>
          </div>
        ))}
      </div>

      {units.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <p style={{ color: 'rgba(21,34,50,0.6)' }}>No pricing units yet. Click "Add Unit" to get started.</p>
        </div>
      )}
    </SectionEditor>
  );
}
