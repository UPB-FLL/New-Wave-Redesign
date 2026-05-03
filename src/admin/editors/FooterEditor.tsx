import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';

export default function FooterEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('footer').then((data) => {
      setContent(data);
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    await upsertManyContent('footer', content);
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Footer Section" description="Tagline, contact details, and links in the footer" onSave={handleSave}>
      <FormSection title="Branding" subtitle="Footer tagline and company messaging">
        <EditorField label="Tagline" value={content.tagline ?? ''} onChange={(v) => set('tagline', v)} multiline rows={2} hint="Company tagline or slogan" />
      </FormSection>

      <FormSection title="Contact Info" subtitle="Phone, email, and address details">
        <EditorField label="Phone" value={content.phone ?? ''} onChange={(v) => set('phone', v)} hint="Main phone number" />
        <EditorField label="Email" value={content.email ?? ''} onChange={(v) => set('email', v)} hint="Main email address" />
        <EditorField label="Address (full)" value={content.address ?? ''} onChange={(v) => set('address', v)} multiline rows={2} hint="Complete street address" />
      </FormSection>

      <FormSection title="Legal Links" subtitle="Privacy and terms URLs">
        <EditorField label="Privacy Policy URL" value={content.privacy_url ?? ''} onChange={(v) => set('privacy_url', v)} hint="Full URL to privacy policy page" />
        <EditorField label="Terms of Service URL" value={content.terms_url ?? ''} onChange={(v) => set('terms_url', v)} hint="Full URL to terms of service page" />
      </FormSection>
    </SectionEditor>
  );
}
