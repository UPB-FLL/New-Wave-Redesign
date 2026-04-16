import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';

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

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <SectionEditor title="Footer Section" description="Tagline, contact details, and links in the footer." onSave={handleSave}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Branding</h2>
        <EditorField label="Tagline" value={content.tagline ?? ''} onChange={(v) => set('tagline', v)} multiline rows={2} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Contact Info</h2>
        <EditorField label="Phone" value={content.phone ?? ''} onChange={(v) => set('phone', v)} />
        <EditorField label="Email" value={content.email ?? ''} onChange={(v) => set('email', v)} />
        <EditorField label="Address (full)" value={content.address ?? ''} onChange={(v) => set('address', v)} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Legal Links</h2>
        <EditorField label="Privacy Policy URL" value={content.privacy_url ?? ''} onChange={(v) => set('privacy_url', v)} />
        <EditorField label="Terms of Service URL" value={content.terms_url ?? ''} onChange={(v) => set('terms_url', v)} />
      </div>
    </SectionEditor>
  );
}
