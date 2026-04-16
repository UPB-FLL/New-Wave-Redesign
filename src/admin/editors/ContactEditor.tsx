import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';

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

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <SectionEditor title="Contact Section" description="Contact info cards and form messaging." onSave={handleSave}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Section Header</h2>
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} />
        <EditorField label="Headline Accent" value={content.headline_accent ?? ''} onChange={(v) => set('headline_accent', v)} />
        <EditorField label="Subheadline" value={content.subheadline ?? ''} onChange={(v) => set('subheadline', v)} multiline rows={2} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Phone</h2>
        <EditorField label="Phone Number (display)" value={content.phone ?? ''} onChange={(v) => set('phone', v)} hint="e.g. (954) 555-0100" />
        <EditorField label="Phone Sub-text" value={content.phone_sub ?? ''} onChange={(v) => set('phone_sub', v)} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Email</h2>
        <EditorField label="Email Address" value={content.email ?? ''} onChange={(v) => set('email', v)} />
        <EditorField label="Email Sub-text" value={content.email_sub ?? ''} onChange={(v) => set('email_sub', v)} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Address</h2>
        <EditorField label="Street Address" value={content.address ?? ''} onChange={(v) => set('address', v)} />
        <EditorField label="City, State, ZIP" value={content.address_city ?? ''} onChange={(v) => set('address_city', v)} />
        <EditorField label="Address Sub-text" value={content.address_sub ?? ''} onChange={(v) => set('address_sub', v)} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Success Message</h2>
        <EditorField label="Success Title" value={content.success_title ?? ''} onChange={(v) => set('success_title', v)} />
        <EditorField label="Success Body" value={content.success_body ?? ''} onChange={(v) => set('success_body', v)} multiline rows={3} />
      </div>
    </SectionEditor>
  );
}
