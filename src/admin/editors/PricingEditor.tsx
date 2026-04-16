import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import { Plus, Trash2 } from 'lucide-react';

interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
  accent: string;
}

export default function PricingEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loaded, setLoaded] = useState(false);

  const defaultTiers: PricingTier[] = [
    {
      name: 'Starter',
      description: 'Perfect for small teams',
      price: '$199',
      period: '/month',
      features: ['Up to 5 users', '10GB storage', 'Email support', 'Basic analytics'],
      highlight: false,
      accent: '#39CCCC',
    },
    {
      name: 'Professional',
      description: 'For growing businesses',
      price: '$499',
      period: '/month',
      features: ['Up to 20 users', '100GB storage', 'Priority support', 'Advanced analytics', 'Custom integrations'],
      highlight: true,
      accent: '#2db8b8',
    },
    {
      name: 'Enterprise',
      description: 'For large organizations',
      price: 'Custom',
      period: 'Contact us',
      features: ['Unlimited users', 'Unlimited storage', '24/7 dedicated support', 'Advanced security', 'Custom SLA'],
      highlight: false,
      accent: '#5EBC67',
    },
  ];

  useEffect(() => {
    fetchSectionContent('pricing').then((data) => {
      setContent(data);
      try {
        const parsed = JSON.parse(data.tiers || '[]');
        setTiers(parsed.length > 0 ? parsed : defaultTiers);
      } catch {
        setTiers(defaultTiers);
      }
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const updateTier = (index: number, field: keyof PricingTier, value: string | boolean | string[]) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const updateFeature = (tierIdx: number, featureIdx: number, value: string) => {
    setTiers((prev) =>
      prev.map((t, i) => {
        if (i !== tierIdx) return t;
        const features = [...t.features];
        features[featureIdx] = value;
        return { ...t, features };
      })
    );
  };

  const addFeature = (tierIdx: number) => {
    setTiers((prev) => prev.map((t, i) => (i === tierIdx ? { ...t, features: [...t.features, ''] } : t)));
  };

  const removeFeature = (tierIdx: number, featureIdx: number) => {
    setTiers((prev) =>
      prev.map((t, i) => {
        if (i !== tierIdx) return t;
        return { ...t, features: t.features.filter((_, j) => j !== featureIdx) };
      })
    );
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        name: 'New Plan',
        description: 'Plan description',
        price: '$99',
        period: '/month',
        features: ['Feature 1', 'Feature 2'],
        highlight: false,
        accent: '#39CCCC',
      },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await upsertManyContent('pricing', {
      ...content,
      tiers: JSON.stringify(tiers),
    });
    alert('Pricing saved successfully!');
  };

  if (!loaded) return <div>Loading...</div>;

  return (
    <SectionEditor title="Pricing" onSave={handleSave}>
      <EditorField label="Section Label" value={content.section_label || ''} onChange={(v) => set('section_label', v)} />
      <EditorField label="Headline" value={content.headline || ''} onChange={(v) => set('headline', v)} />
      <EditorField
        label="Subheadline"
        value={content.subheadline || ''}
        onChange={(v) => set('subheadline', v)}
        type="textarea"
      />

      <div className="mt-8 border-t pt-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Pricing Tiers</h3>
          <button
            onClick={addTier}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Plus size={18} /> Add Tier
          </button>
        </div>

        <div className="space-y-8">
          {tiers.map((tier, tierIdx) => (
            <div key={tierIdx} className="border rounded-lg p-6 bg-gray-50">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-base font-semibold">Tier {tierIdx + 1}</h4>
                <button
                  onClick={() => removeTier(tierIdx)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <EditorField
                  label="Tier Name"
                  value={tier.name}
                  onChange={(v) => updateTier(tierIdx, 'name', v)}
                />
                <EditorField
                  label="Price"
                  value={tier.price}
                  onChange={(v) => updateTier(tierIdx, 'price', v)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <EditorField
                  label="Period"
                  value={tier.period}
                  onChange={(v) => updateTier(tierIdx, 'period', v)}
                />
                <EditorField
                  label="Accent Color"
                  value={tier.accent}
                  onChange={(v) => updateTier(tierIdx, 'accent', v)}
                  type="text"
                />
              </div>

              <EditorField
                label="Description"
                value={tier.description}
                onChange={(v) => updateTier(tierIdx, 'description', v)}
              />

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tier.highlight}
                    onChange={(e) => updateTier(tierIdx, 'highlight', e.target.checked)}
                  />
                  <span>Mark as Most Popular</span>
                </label>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-semibold text-sm">Features</h5>
                  <button
                    onClick={() => addFeature(tierIdx)}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    + Add Feature
                  </button>
                </div>

                <div className="space-y-2">
                  {tier.features.map((feature, featureIdx) => (
                    <div key={featureIdx} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(tierIdx, featureIdx, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded text-sm"
                        placeholder="Feature description"
                      />
                      <button
                        onClick={() => removeFeature(tierIdx, featureIdx)}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionEditor>
  );
}
