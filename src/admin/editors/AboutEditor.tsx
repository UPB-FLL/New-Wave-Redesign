import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';

export default function AboutEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('about').then((data) => {
      setContent(data);
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    await upsertManyContent('about', content);
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="About Section" description="Company story and team information" onSave={handleSave}>
      <FormSection title="Page Header" subtitle="Headline and intro text for the about section">
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} hint="Label above the headline" />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} hint="Main heading" />
        <EditorField label="Headline Accent" value={content.headline_accent ?? ''} onChange={(v) => set('headline_accent', v)} hint="Word that receives gradient styling" />
      </FormSection>

      <FormSection title="Story Content" subtitle="Company narrative and background paragraphs">
        <EditorField label="Paragraph 1" value={content.paragraph1 ?? ''} onChange={(v) => set('paragraph1', v)} multiline rows={4} hint="Opening paragraph" />
        <EditorField label="Paragraph 2" value={content.paragraph2 ?? ''} onChange={(v) => set('paragraph2', v)} multiline rows={4} hint="Middle paragraph" />
        <EditorField label="Paragraph 3" value={content.paragraph3 ?? ''} onChange={(v) => set('paragraph3', v)} multiline rows={4} hint="Closing paragraph" />
      </FormSection>

      <FormSection title="Team Section" subtitle="Team badge and messaging">
        <EditorField label="Years in Business" value={content.years_badge ?? ''} onChange={(v) => set('years_badge', v)} hint="E.g., '15' or '20+'" />
        <EditorField label="Years Badge Label" value={content.years_label ?? ''} onChange={(v) => set('years_label', v)} hint="E.g., 'Years of Experience'" />
        <EditorField label="Team Tagline" value={content.team_tagline ?? ''} onChange={(v) => set('team_tagline', v)} hint="Main team message" />
        <EditorField label="Team Sub-text" value={content.team_sub ?? ''} onChange={(v) => set('team_sub', v)} hint="Supporting team message" />
      </FormSection>
    </SectionEditor>
  );
}
