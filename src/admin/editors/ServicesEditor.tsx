import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';

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

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <SectionEditor title="Services Section" description="The six service cards displayed on the home page." onSave={handleSave}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Section Header</h2>
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={2} />
      </div>

      {cards.map((card, i) => (
        <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Service Card {i + 1}</h2>
          <EditorField label="Title" value={card.title} onChange={(v) => updateCard(i, 'title', v)} />
          <EditorField label="Description" value={card.description} onChange={(v) => updateCard(i, 'description', v)} multiline rows={2} />
          <EditorField label="Accent Color" value={card.accent} onChange={(v) => updateCard(i, 'accent', v)} hint="Hex color, e.g. #39CCCC" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Highlights</label>
              <button
                onClick={() => addHighlight(i)}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(57,204,204,0.1)', color: '#39CCCC' }}
              >+ Add</button>
            </div>
            <div className="space-y-2">
              {card.highlights.map((hl, j) => (
                <div key={j} className="flex gap-2">
                  <input
                    type="text"
                    value={hl}
                    onChange={(e) => updateHighlight(i, j, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-white outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(57,204,204,0.5)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                  <button onClick={() => removeHighlight(i, j)} className="px-2.5 py-2 rounded-lg text-xs transition-all" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </SectionEditor>
  );
}
