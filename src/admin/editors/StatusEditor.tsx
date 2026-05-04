import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import { Plus, Trash2 } from 'lucide-react';

type StatusService = {
  name: string;
  category: 'saas' | 'isp';
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  lastChecked: string;
};

export default function StatusEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [services, setServices] = useState<StatusService[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('status').then((data) => {
      setContent(data);
      try { setServices(JSON.parse(data.services || '[]')); } catch { setServices([]); }
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const updateService = (index: number, field: keyof StatusService, value: string | number) => {
    setServices((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addService = () => {
    setServices((prev) => [...prev, {
      name: 'New Service',
      category: 'saas',
      status: 'operational',
      uptime: 99.9,
      lastChecked: '1 min ago',
    }]);
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await upsertManyContent('status', {
      ...content,
      services: JSON.stringify(services),
    });
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Status Page" description="Service status and uptime tracking" onSave={handleSave}>
      <FormSection title="Page Header" subtitle="Section headline and description">
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} hint="Label above headline" />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} hint="Main heading" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={2} hint="Supporting text" />
        <EditorField label="Last Updated" value={content.last_updated ?? ''} onChange={(v) => set('last_updated', v)} hint="e.g. 'Just now' or '5 minutes ago'" />
      </FormSection>

      <FormSection title="Services" subtitle="Manage SaaS and ISP services">
        <div className="space-y-4">
          {services.map((service, i) => (
            <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Service {i + 1}</h3>
                <p className="text-white/50 text-sm mt-1">{service.name || 'Untitled service'}</p>
              </div>

              <EditorField label="Service Name" value={service.name} onChange={(v) => updateService(i, 'name', v)} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Category</label>
                  <select
                    value={service.category}
                    onChange={(e) => updateService(i, 'category', e.target.value as 'saas' | 'isp')}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-all focus:ring-2"
                    style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.7)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94, 188, 103, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="saas" style={{ background: '#1a2f3f', color: '#5EBC67' }}>SaaS Service</option>
                    <option value="isp" style={{ background: '#1a2f3f', color: '#5EBC67' }}>Internet Service Provider</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Status</label>
                  <select
                    value={service.status}
                    onChange={(e) => updateService(i, 'status', e.target.value as 'operational' | 'degraded' | 'down')}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-all focus:ring-2"
                    style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.7)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94, 188, 103, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="operational" style={{ background: '#1a2f3f', color: '#5EBC67' }}>Operational</option>
                    <option value="degraded" style={{ background: '#1a2f3f', color: '#5EBC67' }}>Degraded</option>
                    <option value="down" style={{ background: '#1a2f3f', color: '#5EBC67' }}>Down</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Uptime %</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={service.uptime}
                    onChange={(e) => updateService(i, 'uptime', parseFloat(e.target.value))}
                    placeholder="99.9"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-2"
                    style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.7)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94, 188, 103, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Last Checked</label>
                  <input
                    type="text"
                    value={service.lastChecked}
                    onChange={(e) => updateService(i, 'lastChecked', e.target.value)}
                    placeholder="2 min ago"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-2"
                    style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.7)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94, 188, 103, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.3)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  onClick={() => removeService(i)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addService}
          className="w-full mt-4 text-sm px-3 py-2.5 rounded-lg bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add Service
        </button>
      </FormSection>
    </SectionEditor>
  );
}
