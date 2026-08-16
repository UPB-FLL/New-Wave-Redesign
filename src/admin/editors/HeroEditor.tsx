import { useEffect, useState } from 'react';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import CardListEditor from '../components/CardListEditor';
import { contentManager } from '../ContentManager';
import type { ContentManagerState } from '../ContentManager';

export default function HeroEditor() {
  const [state, setState] = useState<ContentManagerState>(contentManager.getState());
  const [stats, setStats] = useState<Array<{ value: string; label: string }>>([]);
  const [cards, setCards] = useState<Array<{ title: string; desc: string }>>([]);

  useEffect(() => {
    // Subscribe to ContentManager updates
    const unsubscribe = contentManager.subscribe((newState) => {
      setState(newState);
      const heroContent = newState.sections.hero ?? {};

      // Parse complex fields
      try {
        setStats(JSON.parse(heroContent.stats ?? '[]'));
      } catch {
        setStats([]);
      }

      try {
        setCards(JSON.parse(heroContent.feature_cards ?? '[]'));
      } catch {
        setCards([]);
      }
    });

    // Load hero section if not already loaded
    if (!state.sections.hero) {
      contentManager.loadSection('hero');
    }

    return unsubscribe;
  }, []);

  const content = state.sections.hero ?? {};

  const setField = (key: string, value: string) => {
    contentManager.updateField('hero', key, value);
  };

  const handleSave = async () => {
    await contentManager.publishChanges();
  };

  return (
    <SectionEditor
      title="Hero Section"
      description="The main landing section at the top of the page"
      onSave={handleSave}
    >
      <FormSection title="Page Header" subtitle="Headline, badge, and introductory text">
        <EditorField label="Badge Text" value={content.badge ?? ''} onChange={(v) => setField('badge', v)} hint="Small label above the main headline" />
        <EditorField label="Headline Part 1" value={content.headline_part1 ?? ''} onChange={(v) => setField('headline_part1', v)} hint="First part of the main headline" />
        <EditorField label="Headline Accent 1 (Teal)" value={content.headline_accent ?? ''} onChange={(v) => setField('headline_accent', v)} hint="Word that gets gradient styling (teal)" />
        <EditorField label="Headline Part 2" value={content.headline_part2 ?? ''} onChange={(v) => setField('headline_part2', v)} hint="Second part of the headline" />
        <EditorField label="Headline Accent 2 (Green)" value={content.headline_accent2 ?? ''} onChange={(v) => setField('headline_accent2', v)} hint="Word that gets gradient styling (green)" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => setField('subheadline', v)} multiline rows={3} hint="Supporting text below the main headline" />
      </FormSection>

      <FormSection title="Call to Action" subtitle="Buttons and contact information">
        <EditorField label="Primary Button Label" value={content.cta_primary ?? ''} onChange={(v) => setField('cta_primary', v)} hint="Main action button text" />
        <EditorField label="Secondary Button Label" value={content.cta_secondary ?? ''} onChange={(v) => setField('cta_secondary', v)} hint="Secondary action button text" />
        <EditorField label="Phone Number" value={content.phone ?? ''} onChange={(v) => setField('phone', v)} hint="Include country code, e.g. +1-954-555-0100" />
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
          onChange={(items) => {
            setStats(items as Array<{ value: string; label: string }>);
            setField('stats', JSON.stringify(items));
          }}
          defaultItem={{ value: '', label: '' } as Record<string, string>}
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
          onChange={(items) => {
            setCards(items as Array<{ title: string; desc: string }>);
            setField('feature_cards', JSON.stringify(items));
          }}
          defaultItem={{ title: '', desc: '' } as Record<string, string>}
        />
      </div>
    </SectionEditor>
  );
}
