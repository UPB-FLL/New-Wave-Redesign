import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';

export default function ContactEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('contact').then((data) => {
      setContent(data);
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    await upsertManyContent('contact', content);
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Contact Section" description="Contact cards and form messaging" onSave={handleSave}>
      <FormSection title="Page Header" subtitle="Section headline and intro">
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} hint="Label above headline" />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} hint="Main heading" />
        <EditorField label="Headline Accent" value={content.headline_accent ?? ''} onChange={(v) => set('headline_accent', v)} hint="Word that receives gradient styling" />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={2} hint="Supporting text" />
      </FormSection>

      <FormSection title="Phone Contact" subtitle="Phone number and description">
        <EditorField label="Phone Number" value={content.phone ?? ''} onChange={(v) => set('phone', v)} hint="E.g. (954) 555-0100" />
        <EditorField label="Description" value={content.phone_sub ?? ''} onChange={(v) => set('phone_sub', v)} hint="Supporting text for phone option" />
      </FormSection>

      <FormSection title="Email Contact" subtitle="Email address and description">
        <EditorField label="Email Address" value={content.email ?? ''} onChange={(v) => set('email', v)} hint="Email for contact form" />
        <EditorField label="Description" value={content.email_sub ?? ''} onChange={(v) => set('email_sub', v)} hint="Supporting text for email option" />
      </FormSection>

      <FormSection title="Physical Address" subtitle="Office location details">
        <EditorField label="Street Address" value={content.address ?? ''} onChange={(v) => set('address', v)} hint="Full street address" />
        <EditorField label="City, State, ZIP" value={content.address_city ?? ''} onChange={(v) => set('address_city', v)} hint="City and postal code" />
        <EditorField label="Description" value={content.address_sub ?? ''} onChange={(v) => set('address_sub', v)} hint="Supporting text for address" />
      </FormSection>

      <FormSection title="Form Success Message" subtitle="Message shown after form submission">
        <EditorField label="Success Title" value={content.success_title ?? ''} onChange={(v) => set('success_title', v)} hint="Heading of success message" />
        <EditorField label="Success Message" value={content.success_body ?? ''} onChange={(v) => set('success_body', v)} multiline rows={3} hint="Full message body" />
      </FormSection>
    </SectionEditor>
  );
}
