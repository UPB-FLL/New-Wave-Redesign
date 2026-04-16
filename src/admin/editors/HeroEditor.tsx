import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import CardListEditor from '../components/CardListEditor';

type Stat = { value: string; label: string };
type FeatureCard = { title: string; desc: string };

const defaultStat: Stat = { value: '', label: '' };
const defaultCard: FeatureCard = { title: '', desc: '' };

export default function HeroEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Stat[]>([]);
  const [cards, setCards] = useState<FeatureCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('hero').then((data) => {
      setContent(data);
      try { setStats(JSON.parse(data.stats || '[]')); } catch { setStats([]); }
      try { setCards(JSON.parse(data.feature_cards || '[]')); } catch { setCards([]); }
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    await upsertManyContent('hero', {
      ...content,
      stats: JSON.stringify(stats),
      feature_cards: JSON.stringify(cards),
    });
  };

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <SectionEditor title="Hero Section" description="The main landing section at the top of the page." onSave={handleSave}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Badge & Headlines</h2>
        <EditorField label="Badge Text" value={content.badge ?? ''} onChange={(v) => set('badge', v)} />
        <EditorField label="Headline Part 1" value={content.headline_part1 ?? ''} onChange={(v) => set('headline_part1', v)} />
        <EditorField label="Headline Accent 1 (teal)" value={content.headline_accent ?? ''} onChange={(v) => set('headline_accent', v)} />
        <EditorField label="Headline Part 2" value={content.headline_part2 ?? ''} onChange={(v) => set('headline_part2', v)} />
        <EditorField label="Headline Accent 2 (green)" value={content.headline_accent2 ?? ''} onChange={(v) => set('headline_accent2', v)} />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={3} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Buttons & Contact</h2>
        <EditorField label="Primary CTA Label" value={content.cta_primary ?? ''} onChange={(v) => set('cta_primary', v)} />
        <EditorField label="Secondary CTA Label" value={content.cta_secondary ?? ''} onChange={(v) => set('cta_secondary', v)} />
        <EditorField label="Phone Number (with country code)" value={content.phone ?? ''} onChange={(v) => set('phone', v)} hint="e.g. +19545550100" />
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Stats</h2>
        <CardListEditor
          label=""
          items={stats as Record<string, string>[]}
          fields={[
            { key: 'value', label: 'Value' },
            { key: 'label', label: 'Label' },
          ]}
          onChange={(items) => setStats(items as Stat[])}
          defaultItem={defaultStat as Record<string, string>}
        />
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">Feature Cards (right column)</h2>
        <CardListEditor
          label=""
          items={cards as Record<string, string>[]}
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'desc', label: 'Description', multiline: true },
          ]}
          onChange={(items) => setCards(items as FeatureCard[])}
          defaultItem={defaultCard as Record<string, string>}
        />
      </div>
    </SectionEditor>
  );
}
