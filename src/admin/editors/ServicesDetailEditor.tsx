import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import { Plus, Trash2 } from 'lucide-react';

interface ServiceDetail {
  name: string;
  slug: string;
  description: string;
  features: string[];
  benefits: string[];
  pricing_note: string;
}

const defaultServices: ServiceDetail[] = [
  { name: 'Microsoft 365', slug: 'microsoft-365', description: '', features: [], benefits: [], pricing_note: '' },
  { name: 'Google Workspace', slug: 'google-workspace', description: '', features: [], benefits: [], pricing_note: '' },
  { name: 'AWS', slug: 'aws', description: '', features: [], benefits: [], pricing_note: '' },
  { name: 'Slack', slug: 'slack', description: '', features: [], benefits: [], pricing_note: '' },
  { name: 'Zoom', slug: 'zoom', description: '', features: [], benefits: [], pricing_note: '' },
  { name: 'Salesforce', slug: 'salesforce', description: '', features: [], benefits: [], pricing_note: '' },
  { name: 'HubSpot', slug: 'hubspot', description: '', features: [], benefits: [], pricing_note: '' },
  { name: 'Stripe', slug: 'stripe', description: '', features: [], benefits: [], pricing_note: '' },
];

export default function ServicesDetailEditor() {
  const [services, setServices] = useState<ServiceDetail[]>(defaultServices);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('services-detail').then((data) => {
      try {
        setServices(JSON.parse(data.services_list || '[]'));
      } catch {
        setServices(defaultServices);
      }
      setLoaded(true);
    });
  }, []);

  const updateService = (idx: number, field: keyof ServiceDetail, value: any) => {
    setServices((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const addFeature = (idx: number) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, features: [...s.features, ''] } : s
      )
    );
  };

  const removeFeature = (idx: number, fIdx: number) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, features: s.features.filter((_, fi) => fi !== fIdx) }
          : s
      )
    );
  };

  const updateFeature = (idx: number, fIdx: number, value: string) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, features: s.features.map((f, fi) => (fi === fIdx ? value : f)) }
          : s
      )
    );
  };

  const addBenefit = (idx: number) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, benefits: [...s.benefits, ''] } : s
      )
    );
  };

  const removeBenefit = (idx: number, bIdx: number) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, benefits: s.benefits.filter((_, bi) => bi !== bIdx) }
          : s
      )
    );
  };

  const updateBenefit = (idx: number, bIdx: number, value: string) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, benefits: s.benefits.map((b, bi) => (bi === bIdx ? value : b)) }
          : s
      )
    );
  };

  const handleSave = async () => {
    await upsertManyContent('services-detail', {
      services_list: JSON.stringify(services),
    });
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Service Details" description="Detailed pages for each service" onSave={handleSave}>
      <div className="space-y-6">
        {services.map((service, i) => (
          <FormSection key={i} title={service.name} subtitle={`Manage details for ${service.name}`}>
            <EditorField
              label="Service Name"
              value={service.name}
              onChange={(v) => updateService(i, 'name', v)}
            />
            <EditorField
              label="URL Slug"
              value={service.slug}
              onChange={(v) => updateService(i, 'slug', v)}
              hint="Used in /service/:slug"
            />
            <EditorField
              label="Description"
              value={service.description}
              onChange={(v) => updateService(i, 'description', v)}
              multiline
              rows={3}
              hint="Brief overview of the service"
            />
            <EditorField
              label="Pricing Note"
              value={service.pricing_note}
              onChange={(v) => updateService(i, 'pricing_note', v)}
              multiline
              rows={2}
              hint="Any pricing info or integration notes"
            />

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">Key Features</label>
                <button
                  onClick={() => addFeature(i)}
                  className="text-xs px-2 py-1 rounded bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {service.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(i, fIdx, e.target.value)}
                      placeholder="Enter feature"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                      style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    />
                    <button
                      onClick={() => removeFeature(i, fIdx)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">Key Benefits</label>
                <button
                  onClick={() => addBenefit(i)}
                  className="text-xs px-2 py-1 rounded bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {service.benefits.map((benefit, bIdx) => (
                  <div key={bIdx} className="flex gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => updateBenefit(i, bIdx, e.target.value)}
                      placeholder="Enter benefit"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                      style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    />
                    <button
                      onClick={() => removeBenefit(i, bIdx)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </FormSection>
        ))}
      </div>
    </SectionEditor>
  );
}
