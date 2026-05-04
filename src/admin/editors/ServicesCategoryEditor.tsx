import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import { Plus, Trash2 } from 'lucide-react';

interface ServiceCategory {
  title: string;
  slug: string;
  description: string;
  details: string;
  highlights: string[];
  seo_link: string;
}

const defaultServices: ServiceCategory[] = [
  { title: 'Cybersecurity', slug: 'cybersecurity', description: '', details: '', highlights: [], seo_link: '' },
  { title: 'Live IT Support', slug: 'live-it-support', description: '', details: '', highlights: [], seo_link: '' },
  { title: 'IT Repair & Upgrades', slug: 'it-repair-upgrades', description: '', details: '', highlights: [], seo_link: '' },
  { title: 'Managed IT Services', slug: 'managed-it-services', description: '', details: '', highlights: [], seo_link: '' },
  { title: 'Cloud Solutions', slug: 'cloud-solutions', description: '', details: '', highlights: [], seo_link: '' },
  { title: 'Network Infrastructure', slug: 'network-infrastructure', description: '', details: '', highlights: [], seo_link: '' },
];

export default function ServicesCategoryEditor() {
  const [services, setServices] = useState<ServiceCategory[]>(defaultServices);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('services-categories').then((data) => {
      try {
        setServices(JSON.parse(data.services_list || '[]'));
      } catch {
        setServices(defaultServices);
      }
      setLoaded(true);
    });
  }, []);

  const updateService = (idx: number, field: keyof ServiceCategory, value: any) => {
    setServices((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const addHighlight = (idx: number) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, highlights: [...s.highlights, ''] } : s
      )
    );
  };

  const removeHighlight = (idx: number, hIdx: number) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, highlights: s.highlights.filter((_, hi) => hi !== hIdx) }
          : s
      )
    );
  };

  const updateHighlight = (idx: number, hIdx: number, value: string) => {
    setServices((prev) =>
      prev.map((s, i) =>
        i === idx
          ? { ...s, highlights: s.highlights.map((h, hi) => (hi === hIdx ? value : h)) }
          : s
      )
    );
  };

  const handleSave = async () => {
    await upsertManyContent('services-categories', {
      services_list: JSON.stringify(services),
    });
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Service Categories" description="Detail pages for IT service categories" onSave={handleSave}>
      <div className="space-y-6">
        {services.map((service, i) => (
          <FormSection key={i} title={service.title} subtitle={`Manage details for ${service.title}`}>
            <EditorField
              label="Service Title"
              value={service.title}
              onChange={(v) => updateService(i, 'title', v)}
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
              rows={2}
              hint="Brief overview for the hero section"
            />
            <EditorField
              label="Detailed Explanation"
              value={service.details}
              onChange={(v) => updateService(i, 'details', v)}
              multiline
              rows={4}
              hint="Full explanation of the service (displayed in 'Service Overview' section)"
            />
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(57, 204, 204, 0.1)', border: '1px solid rgba(57, 204, 204, 0.3)' }}>
              <p className="text-xs text-white/70 mb-3">
                📚 <strong>SEO Blog Link</strong> — Link to a detailed guide or blog post that will be featured in a prominent "Deep Dive Guide" section on the service page. This gives visitors easy access to your most comprehensive content.
              </p>
            </div>
            <EditorField
              label="SEO Blog Link"
              value={service.seo_link}
              onChange={(v) => updateService(i, 'seo_link', v)}
              hint="Link to detailed blog post or SEO landing page. Examples: /l/cybersecurity-guide, /blog/managed-it-services, https://example.com/article"
            />

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">Key Highlights</label>
                <button
                  onClick={() => addHighlight(i)}
                  className="text-xs px-2 py-1 rounded bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {service.highlights.map((highlight, hIdx) => (
                  <div key={hIdx} className="flex gap-2">
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => updateHighlight(i, hIdx, e.target.value)}
                      placeholder="Enter highlight"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                      style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    />
                    <button
                      onClick={() => removeHighlight(i, hIdx)}
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
