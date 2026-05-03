import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
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
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(content)) {
      if (k === 'stats' || k === 'feature_cards') continue;
      payload[k] = v;
    }
    payload.stats = JSON.stringify(stats);
    payload.feature_cards = JSON.stringify(cards);
    await upsertManyContent('hero', payload);
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Hero Section" description="The main landing section at the top of the page" onSave={handleSave}>
      <FormSection title="Page Header" subtitle="Headline, badge, and introductory text">
        <EditorField label="Badge Text" value={content.badge ?? ''} onChange={(v) => set('badge', v)} hint="Small label above the main headline" />
        <EditorField label="Headline Part 1" value={content.headline_part1 ?? ''} onChange={(v) => set('headline_part1', v)} hint="First part of the main headline" />
        <EditorField label="Headline Accent 1 (Teal)" value={content.headline_accent ?? ''} onChange={(v) => set('headline_accent', v)} hint="Word that gets gradient styling (teal)" />
        <EditorField label="Headline Part 2" value={content.headline_part2 ?? ''} onChange={(v) => set('headline_part2', v)} hint="Second part of the headline" />
        <EditorField label="Headline Accent 2 (Green)" value={content.headline_accent2 ?? ''} onChange={(v) => set('headline_accent2', v)} hint="Word that gets gradient styling (green)" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={3} hint="Supporting text below the main headline" />
      </FormSection>

      <FormSection title="Call to Action" subtitle="Buttons and contact information">
        <EditorField label="Primary Button Label" value={content.cta_primary ?? ''} onChange={(v) => set('cta_primary', v)} hint="Main action button text" />
        <EditorField label="Secondary Button Label" value={content.cta_secondary ?? ''} onChange={(v) => set('cta_secondary', v)} hint="Secondary action button text" />
        <EditorField label="Phone Number" value={content.phone ?? ''} onChange={(v) => set('phone', v)} hint="Include country code, e.g. +1-954-555-0100" />
      </FormSection>

      <div className="space-y-4 p-6 rounded-xl bg-white/5 border border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Statistics</h2>
          <p className="text-sm text-white/50 mt-1">The four mini-stats displayed under the hero section (e.g., "500+ Clients Served")</p>
        </div>
        <CardListEditor
          label=""
          items={stats as Record<string, string>[]}
          fields={[
            { key: 'value', label: 'Number (e.g., 500+, 99.9%, <1hr)' },
            { key: 'label', label: 'Label (e.g., Clients Served)' },
          ]}
          onChange={(items) => setStats(items as Stat[])}
          defaultItem={defaultStat as Record<string, string>}
        />
      </div>

      <div className="space-y-4 p-6 rounded-xl bg-white/5 border border-white/10">
        <div>
          <h2 className="text-lg font-semibold text-white">Feature Cards</h2>
          <p className="text-sm text-white/50 mt-1">Cards displayed on the right side of the hero section</p>
        </div>
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
