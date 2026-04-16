import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';

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

  if (!loaded) return <div className="text-white/40 text-sm">Loading…</div>;

  return (
    <SectionEditor title="About Section" description="The company story and team information." onSave={handleSave}>
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Section Header</h2>
        <EditorField label="Section Label" value={content.section_label ?? ''} onChange={(v) => set('section_label', v)} />
        <EditorField label="Headline" value={content.headline ?? ''} onChange={(v) => set('headline', v)} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Body Content</h2>
        <EditorField label="Paragraph 1" value={content.paragraph1 ?? ''} onChange={(v) => set('paragraph1', v)} multiline rows={4} />
        <EditorField label="Paragraph 2" value={content.paragraph2 ?? ''} onChange={(v) => set('paragraph2', v)} multiline rows={4} />
        <EditorField label="Paragraph 3" value={content.paragraph3 ?? ''} onChange={(v) => set('paragraph3', v)} multiline rows={4} />
      </div>

      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Image Badge & Team</h2>
        <EditorField label="Years Badge (number)" value={content.years_badge ?? ''} onChange={(v) => set('years_badge', v)} />
        <EditorField label="Years Badge Label" value={content.years_label ?? ''} onChange={(v) => set('years_label', v)} />
        <EditorField label="Team Tagline" value={content.team_tagline ?? ''} onChange={(v) => set('team_tagline', v)} />
        <EditorField label="Team Sub-text" value={content.team_sub ?? ''} onChange={(v) => set('team_sub', v)} />
      </div>
    </SectionEditor>
  );
}
