import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import CardListEditor from '../components/CardListEditor';

type FeatureCard = { title: string; desc: string };

export default function WhyUsEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [proofPoints, setProofPoints] = useState<string[]>([]);
  const [cards, setCards] = useState<FeatureCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('whyus').then((data) => {
      setContent(data);
      try { setProofPoints(JSON.parse(data.proof_points || '[]')); } catch { setProofPoints([]); }
      try { setCards(JSON.parse(data.feature_cards || '[]')); } catch { setCards([]); }
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const updatePoint = (i: number, val: string) => setProofPoints((prev) => prev.map((p, j) => j === i ? val : p));
  const addPoint = () => setProofPoints((prev) => [...prev, '']);
  const removePoint = (i: number) => setProofPoints((prev) => prev.filter((_, j) => j !== i));

  const handleSave = async () => {
    await upsertManyContent('whyus', {
      ...content,
      proof_points: JSON.stringify(proofPoints),
      feature_cards: JSON.stringify(cards),
    });
  };

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <SectionEditor title="Why Us Section" description="The section explaining why clients choose New Wave IT." onSave={handleSave}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Section Header</h2>
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={2} />
        <EditorField label="CTA Button Label" value={content.cta_label ?? ''} onChange={(v) => set('cta_label', v)} />
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Proof Points (Checklist)</h2>
          <button onClick={addPoint} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'rgba(57,204,204,0.1)', color: '#39CCCC' }}>+ Add</button>
        </div>
        <div className="space-y-2">
          {proofPoints.map((point, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={point}
                onChange={(e) => updatePoint(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(57,204,204,0.5)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button onClick={() => removePoint(i)} className="px-2.5 py-2 rounded-lg text-xs transition-all" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Feature Cards (right side)</h2>
        <CardListEditor
          label=""
          items={cards as Record<string, string>[]}
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'desc', label: 'Description', multiline: true },
          ]}
          onChange={(items) => setCards(items as FeatureCard[])}
          defaultItem={{ title: '', desc: '' }}
        />
      </div>
    </SectionEditor>
  );
}
