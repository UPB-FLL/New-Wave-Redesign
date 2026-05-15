import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import CardListEditor from '../components/CardListEditor';
import { Plus, Trash2 } from 'lucide-react';

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

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Why Us Section" description="Explain why clients choose your company" onSave={handleSave}>
      <FormSection title="Page Header" subtitle="Section headline and call-to-action">
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} hint="Label above the headline" />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} hint="Main heading" />
        <EditorField label="Headline Accent" value={content.headline_accent ?? ''} onChange={(v) => set('headline_accent', v)} hint="Word that receives gradient styling" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={2} hint="Supporting text" />
        <EditorField label="Button Label" value={content.cta_label ?? ''} onChange={(v) => set('cta_label', v)} hint="Call-to-action button text" />
      </FormSection>

      <div className="space-y-4 p-6 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Proof Points</h2>
            <p className="text-sm text-white/50 mt-1">Checkmark list of benefits or credentials</p>
          </div>
          <button
            onClick={addPoint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors text-sm font-medium"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {proofPoints.map((point, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={point}
                onChange={(e) => updatePoint(i, e.target.value)}
                placeholder="Proof point"
                className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
              />
              <button
                onClick={() => removePoint(i)}
                className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-6 rounded-xl bg-white/5 border border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Feature Cards</h2>
          <p className="text-sm text-white/50 mt-1">Cards displayed on the right side of the section</p>
        </div>
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

      <FormSection title="How It Works Section" subtitle="3-step process overview">
        <EditorField label="Section Title" value={content.how_it_works_title ?? ''} onChange={(v) => set('how_it_works_title', v)} hint="E.g., 'How It Works'" />
        <EditorField label="Section Description" value={content.how_it_works_desc ?? ''} onChange={(v) => set('how_it_works_desc', v)} multiline rows={2} hint="Introductory text" />

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Step 1: Assessment</h4>
          <EditorField label="Title" value={content.how_step1_title ?? ''} onChange={(v) => set('how_step1_title', v)} hint="E.g., 'Assessment'" />
          <EditorField label="Description" value={content.how_step1_desc ?? ''} onChange={(v) => set('how_step1_desc', v)} multiline rows={2} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Step 2: Planning</h4>
          <EditorField label="Title" value={content.how_step2_title ?? ''} onChange={(v) => set('how_step2_title', v)} hint="E.g., 'Planning'" />
          <EditorField label="Description" value={content.how_step2_desc ?? ''} onChange={(v) => set('how_step2_desc', v)} multiline rows={2} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Step 3: Implementation & Support</h4>
          <EditorField label="Title" value={content.how_step3_title ?? ''} onChange={(v) => set('how_step3_title', v)} hint="E.g., 'Implementation & Support'" />
          <EditorField label="Description" value={content.how_step3_desc ?? ''} onChange={(v) => set('how_step3_desc', v)} multiline rows={2} />
        </div>
      </FormSection>
    </SectionEditor>
  );
}
