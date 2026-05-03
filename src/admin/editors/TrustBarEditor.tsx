import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import CardListEditor from '../components/CardListEditor';

type TrustItem = { icon: string; label: string; sub: string };

const defaultItem: TrustItem = { icon: 'Shield', label: '', sub: '' };

const defaultHeading = 'Trusted by 500+ businesses across South Florida';

const defaultItems: TrustItem[] = [
  { icon: 'Shield', label: 'SOC 2 Type II', sub: 'Audited & Certified' },
  { icon: 'Award', label: 'Microsoft Gold', sub: 'Cloud Solutions Partner' },
  { icon: 'Users', label: 'Cisco Premier', sub: 'Network Solutions' },
  { icon: 'Star', label: 'CompTIA', sub: 'Authorized Partner' },
  { icon: 'TrendingUp', label: 'HIPAA Compliant', sub: 'Healthcare Ready' },
];

const iconOptions = [
  { value: 'Shield', label: 'Shield' },
  { value: 'Award', label: 'Award' },
  { value: 'Star', label: 'Star' },
  { value: 'Users', label: 'Users' },
  { value: 'TrendingUp', label: 'Trending Up' },
  { value: 'CheckCircle', label: 'Check Circle' },
  { value: 'Lock', label: 'Lock' },
  { value: 'Cloud', label: 'Cloud' },
  { value: 'Server', label: 'Server' },
  { value: 'Zap', label: 'Zap' },
  { value: 'Globe', label: 'Globe' },
  { value: 'Briefcase', label: 'Briefcase' },
];

export default function TrustBarEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [items, setItems] = useState<TrustItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('trustbar').then((data) => {
      setContent({ heading: data.heading ?? defaultHeading, ...data });
      let parsed: TrustItem[] = [];
      try { parsed = JSON.parse(data.items || '[]'); } catch { parsed = []; }
      setItems(parsed.length > 0 ? parsed : defaultItems);
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    await upsertManyContent('trustbar', {
      ...content,
      items: JSON.stringify(items),
    });
  };

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <SectionEditor
      title="Trust Bar"
      description="Certifications and partnerships shown below the hero."
      onSave={handleSave}
    >
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Heading</h2>
        <EditorField
          label="Heading Text"
          value={content.heading ?? ''}
          onChange={(v) => set('heading', v)}
          hint="e.g. Trusted by 500+ businesses across South Florida"
        />
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Trust Items</h2>
        <CardListEditor
          label=""
          items={items as Record<string, string>[]}
          fields={[
            { key: 'icon', label: 'Icon', type: 'select', options: iconOptions },
            { key: 'label', label: 'Label (e.g. SOC 2 Type II)' },
            { key: 'sub', label: 'Subtitle (e.g. Audited & Certified)' },
          ]}
          onChange={(next) => setItems(next as TrustItem[])}
          defaultItem={defaultItem as Record<string, string>}
        />
      </div>
    </SectionEditor>
  );
}
