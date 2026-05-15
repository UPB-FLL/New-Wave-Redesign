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

      <FormSection title="Our Approach Section" subtitle="How we work with clients — 4 key principles">
        <EditorField label="Section Title" value={content.approach_title ?? ''} onChange={(v) => set('approach_title', v)} hint="E.g., 'Our Approach'" />
        <EditorField label="Section Description" value={content.approach_desc ?? ''} onChange={(v) => set('approach_desc', v)} multiline rows={2} hint="Introductory text" />

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Approach Point 1: Proactive</h4>
          <EditorField label="Title" value={content.approach_point1_title ?? ''} onChange={(v) => set('approach_point1_title', v)} hint="E.g., 'Proactive'" />
          <EditorField label="Description" value={content.approach_point1_desc ?? ''} onChange={(v) => set('approach_point1_desc', v)} multiline rows={2} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Approach Point 2: Collaborative</h4>
          <EditorField label="Title" value={content.approach_point2_title ?? ''} onChange={(v) => set('approach_point2_title', v)} hint="E.g., 'Collaborative'" />
          <EditorField label="Description" value={content.approach_point2_desc ?? ''} onChange={(v) => set('approach_point2_desc', v)} multiline rows={2} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Approach Point 3: Certified</h4>
          <EditorField label="Title" value={content.approach_point3_title ?? ''} onChange={(v) => set('approach_point3_title', v)} hint="E.g., 'Certified'" />
          <EditorField label="Description" value={content.approach_point3_desc ?? ''} onChange={(v) => set('approach_point3_desc', v)} multiline rows={2} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Approach Point 4: Responsive</h4>
          <EditorField label="Title" value={content.approach_point4_title ?? ''} onChange={(v) => set('approach_point4_title', v)} hint="E.g., 'Responsive'" />
          <EditorField label="Description" value={content.approach_point4_desc ?? ''} onChange={(v) => set('approach_point4_desc', v)} multiline rows={2} />
        </div>
      </FormSection>

      <FormSection title="Why Choose Us Section" subtitle="3 key differentiators">
        <EditorField label="Section Title" value={content.why_choose_title ?? ''} onChange={(v) => set('why_choose_title', v)} hint="E.g., 'Why Choose New Wave IT?'" />
        <EditorField label="Section Description" value={content.why_choose_desc ?? ''} onChange={(v) => set('why_choose_desc', v)} multiline rows={2} hint="Introductory text" />

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Reason 1: Flat-Rate Pricing</h4>
          <EditorField label="Title" value={content.why_reason1_title ?? ''} onChange={(v) => set('why_reason1_title', v)} hint="E.g., 'Flat-Rate Pricing'" />
          <EditorField label="Description" value={content.why_reason1_desc ?? ''} onChange={(v) => set('why_reason1_desc', v)} multiline rows={2} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Reason 2: Local Expertise</h4>
          <EditorField label="Title" value={content.why_reason2_title ?? ''} onChange={(v) => set('why_reason2_title', v)} hint="E.g., 'Local Expertise'" />
          <EditorField label="Description" value={content.why_reason2_desc ?? ''} onChange={(v) => set('why_reason2_desc', v)} multiline rows={2} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/70 mb-3">Reason 3: True Partnership</h4>
          <EditorField label="Title" value={content.why_reason3_title ?? ''} onChange={(v) => set('why_reason3_title', v)} hint="E.g., 'True Partnership'" />
          <EditorField label="Description" value={content.why_reason3_desc ?? ''} onChange={(v) => set('why_reason3_desc', v)} multiline rows={2} />
        </div>
      </FormSection>
    </SectionEditor>
  );
}
