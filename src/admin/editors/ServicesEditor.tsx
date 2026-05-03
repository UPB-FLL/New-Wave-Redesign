import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import { Plus, Trash2 } from 'lucide-react';

type ServiceCard = {
  title: string;
  description: string;
  highlights: string[];
  accent: string;
};

export default function ServicesEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [cards, setCards] = useState<ServiceCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('services').then((data) => {
      setContent(data);
      try { setCards(JSON.parse(data.cards || '[]')); } catch { setCards([]); }
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const updateCard = (index: number, field: keyof ServiceCard, value: string | string[]) => {
    setCards((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const updateHighlight = (cardIdx: number, hlIdx: number, value: string) => {
    setCards((prev) => prev.map((c, i) => {
      if (i !== cardIdx) return c;
      const highlights = [...c.highlights];
      highlights[hlIdx] = value;
      return { ...c, highlights };
    }));
  };

  const addHighlight = (cardIdx: number) => {
    setCards((prev) => prev.map((c, i) => i === cardIdx ? { ...c, highlights: [...c.highlights, ''] } : c));
  };

  const removeHighlight = (cardIdx: number, hlIdx: number) => {
    setCards((prev) => prev.map((c, i) => {
      if (i !== cardIdx) return c;
      return { ...c, highlights: c.highlights.filter((_, j) => j !== hlIdx) };
    }));
  };

  const handleSave = async () => {
    await upsertManyContent('services', {
      ...content,
      cards: JSON.stringify(cards),
    });
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Services Section" description="Service offerings and feature cards" onSave={handleSave}>
      <FormSection title="Page Header" subtitle="Section headline and description">
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} hint="Label above headline" />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} hint="Main heading" />
        <EditorField label="Accent Word" value={content.headline_accent ?? ''} onChange={(v) => set('headline_accent', v)} hint="Gradient-colored word in headline (e.g. Modern Business)" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={2} hint="Supporting text" />
      </FormSection>

      <div className="space-y-4">
        {cards.map((card, i) => (
          <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Service {i + 1}</h3>
              <p className="text-white/50 text-sm mt-1">{card.title || 'Untitled service'}</p>
            </div>

            <EditorField label="Service Title" value={card.title} onChange={(v) => updateCard(i, 'title', v)} />
            <EditorField label="Description" value={card.description} onChange={(v) => updateCard(i, 'description', v)} multiline rows={2} />
            <EditorField label="Accent Color" value={card.accent} onChange={(v) => updateCard(i, 'accent', v)} type="color" hint="Visual accent color for this card" />

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Highlights</h4>
                <button
                  onClick={() => addHighlight(i)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {card.highlights.map((hl, j) => (
                  <div key={j} className="flex gap-2">
                    <input
                      type="text"
                      value={hl}
                      onChange={(e) => updateHighlight(i, j, e.target.value)}
                      placeholder="Highlight"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
                    />
                    <button
                      onClick={() => removeHighlight(i, j)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors flex-shrink-0"
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
    </SectionEditor>
  );
}
