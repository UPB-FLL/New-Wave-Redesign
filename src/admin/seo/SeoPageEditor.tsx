import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  Globe,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import EditorField from '../components/EditorField';
import {
  getSeoPage,
  updateSeoPage,
  slugify,
  type SeoPage,
  type FaqItem,
  type SeoImage,
  type SeoSection,
  type Competitor,
  type Backlink,
} from '../../lib/seoPages';

type Status = 'idle' | 'saving' | 'success' | 'error';

export default function SeoPageEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<SeoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const p = await getSeoPage(id);
      setPage(p);
      setLoading(false);
    })();
  }, [id]);

  const [refreshing, setRefreshing] = useState(false);

  const set = <K extends keyof SeoPage>(key: K, value: SeoPage[K]) => {
    setPage((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const refreshImages = async (force: boolean) => {
    if (!page || !id) return;
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/refresh-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: page.target_keyword || page.h1 || page.title,
          location: page.target_location,
          sections: page.sections,
          images: page.images,
          hero_image: page.hero_image,
          og_image: page.og_image,
          force,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Refresh failed (${res.status}).`);
      }
      const data = await res.json();
      const updated = await updateSeoPage(id, {
        hero_image: data.hero_image || page.hero_image,
        og_image: data.og_image || page.og_image,
        sections: Array.isArray(data.sections) ? data.sections : page.sections,
        images: Array.isArray(data.images) ? data.images : page.images,
      });
      if (updated) setPage(updated);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err: any) {
      setError(err?.message || 'Refresh failed.');
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  };

  const save = async () => {
    if (!page || !id) return;
    setStatus('saving');
    setError(null);
    const cleanSlug = slugify(page.slug || page.title || 'untitled');
    const updated = await updateSeoPage(id, {
      slug: cleanSlug,
      title: page.title,
      meta_description: page.meta_description,
      meta_keywords: page.meta_keywords,
      canonical_url: page.canonical_url,
      og_image: page.og_image,
      hero_image: page.hero_image,
      h1: page.h1,
      intro: page.intro,
      content: page.content,
      sections: page.sections,
      faq: page.faq,
      images: page.images,
      competitors: page.competitors,
      backlinks: page.backlinks,
      target_location: page.target_location,
      target_keyword: page.target_keyword,
      published: page.published,
    });
    if (!updated) {
      setStatus('error');
      setError('Save failed.');
      return;
    }
    setPage(updated);
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2500);
  };

  if (loading) return <div className="text-white/50 text-sm">Loading…</div>;
  if (!page)
    return (
      <div className="text-white/60">
        Page not found.{' '}
        <Link to="/admin/seo" className="underline" style={{ color: '#39CCCC' }}>
          Back to portal
        </Link>
      </div>
    );

  const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <Link
            to="/admin/seo"
            className="text-xs flex items-center gap-1 mb-2"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <ArrowLeft size={12} /> Back to SEO Portal
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">{page.title || page.h1 || 'Untitled page'}</h1>
          <p className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Globe size={11} /> /l/{page.slug}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {status === 'success' && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: '#5EBC67' }}>
              <CheckCircle size={15} /> Saved
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: '#f87171' }}>
              <AlertCircle size={15} /> {error || 'Error'}
            </span>
          )}
          <label
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <input
              type="checkbox"
              checked={page.published}
              onChange={(e) => set('published', e.target.checked)}
            />
            Published
          </label>
          <button
            onClick={() => refreshImages(true)}
            disabled={refreshing || status === 'saving'}
            title="Fetch fresh images from Pexels for every image on this page"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'rgba(94,188,103,0.15)', border: '1px solid rgba(94,188,103,0.3)', color: '#8fe8a0' }}
          >
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
            {refreshing ? 'Refreshing…' : 'Refresh images'}
          </button>
          <a
            href={`/l/${page.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Eye size={15} /> Preview
          </a>
          <button
            onClick={save}
            disabled={status === 'saving'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: status === 'saving' ? 'rgba(57,204,204,0.5)' : '#39CCCC' }}
          >
            <Save size={15} />
            {status === 'saving' ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="p-5 rounded-2xl" style={panelStyle}>
          <h3 className="text-sm font-semibold text-white mb-4">SEO &amp; Meta</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <EditorField
              label="URL slug"
              value={page.slug}
              onChange={(v) => set('slug', v)}
              hint="Used in /l/:slug. Auto-cleans on save."
            />
            <EditorField
              label="Canonical URL"
              value={page.canonical_url}
              onChange={(v) => set('canonical_url', v)}
              hint="Absolute URL, e.g. https://site.com/l/slug"
            />
            <EditorField
              label="Meta title"
              value={page.title}
              onChange={(v) => set('title', v)}
              hint={`${page.title.length}/60 chars`}
            />
            <EditorField
              label="Meta keywords"
              value={page.meta_keywords}
              onChange={(v) => set('meta_keywords', v)}
              hint="Comma separated"
            />
            <div className="md:col-span-2">
              <EditorField
                label="Meta description"
                value={page.meta_description}
                onChange={(v) => set('meta_description', v)}
                multiline
                rows={2}
                hint={`${page.meta_description.length}/160 chars`}
              />
            </div>
            <EditorField
              label="OG image URL (1200×630)"
              value={page.og_image}
              onChange={(v) => set('og_image', v)}
            />
            <EditorField label="Hero image URL" value={page.hero_image} onChange={(v) => set('hero_image', v)} />
            <EditorField
              label="Target location"
              value={page.target_location}
              onChange={(v) => set('target_location', v)}
            />
            <EditorField
              label="Target keyword"
              value={page.target_keyword}
              onChange={(v) => set('target_keyword', v)}
            />
          </div>
        </section>

        <section className="p-5 rounded-2xl" style={panelStyle}>
          <h3 className="text-sm font-semibold text-white mb-4">Page copy</h3>
          <div className="space-y-4">
            <EditorField label="H1" value={page.h1} onChange={(v) => set('h1', v)} />
            <EditorField
              label="Intro paragraph"
              value={page.intro}
              onChange={(v) => set('intro', v)}
              multiline
              rows={3}
            />
            <EditorField
              label="Main body (optional)"
              value={page.content}
              onChange={(v) => set('content', v)}
              multiline
              rows={6}
              hint="Free-form text shown above the sections."
            />
          </div>
        </section>

        <SectionsEditor
          sections={page.sections}
          onChange={(sections) => set('sections', sections)}
        />

        <ImagesEditor images={page.images} onChange={(images) => set('images', images)} />

        <FaqEditor faq={page.faq} onChange={(faq) => set('faq', faq)} />

        <CompetitorsEditor
          competitors={page.competitors}
          onChange={(competitors) => set('competitors', competitors)}
        />

        <BacklinksEditor backlinks={page.backlinks} onChange={(backlinks) => set('backlinks', backlinks)} />
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => navigate('/admin/seo')}
          className="text-xs flex items-center gap-1 px-3 py-2 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)' }}
        >
          <ArrowLeft size={12} /> Back
        </button>
        <button
          onClick={save}
          disabled={status === 'saving'}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: status === 'saving' ? 'rgba(57,204,204,0.5)' : '#39CCCC' }}
        >
          <Save size={15} /> {status === 'saving' ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      className="p-5 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function addButton(onClick: () => void, label: string) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
      style={{ background: 'rgba(57,204,204,0.15)', border: '1px solid rgba(57,204,204,0.25)', color: '#8fe3e3' }}
    >
      <Plus size={12} /> {label}
    </button>
  );
}

function removeButton(onClick: () => void) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
      style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
    >
      <Trash2 size={12} />
    </button>
  );
}

function SectionsEditor({
  sections,
  onChange,
}: {
  sections: SeoSection[];
  onChange: (s: SeoSection[]) => void;
}) {
  const update = (i: number, patch: Partial<SeoSection>) =>
    onChange(sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const add = () => onChange([...sections, { heading: '', body: '', image: '' }]);
  const remove = (i: number) => onChange(sections.filter((_, idx) => idx !== i));

  return (
    <Panel title={`Content sections (${sections.length})`} action={addButton(add, 'Add section')}>
      {sections.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No sections yet. Each section becomes an H2 on the page.
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div
              key={i}
              className="p-4 rounded-xl space-y-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <EditorField
                    label={`Section ${i + 1} heading`}
                    value={s.heading}
                    onChange={(v) => update(i, { heading: v })}
                  />
                  <EditorField
                    label="Body"
                    value={s.body}
                    onChange={(v) => update(i, { body: v })}
                    multiline
                    rows={5}
                  />
                  <EditorField
                    label="Image URL (optional)"
                    value={s.image || ''}
                    onChange={(v) => update(i, { image: v })}
                  />
                </div>
                {removeButton(() => remove(i))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ImagesEditor({ images, onChange }: { images: SeoImage[]; onChange: (i: SeoImage[]) => void }) {
  const update = (i: number, patch: Partial<SeoImage>) =>
    onChange(images.map((img, idx) => (idx === i ? { ...img, ...patch } : img)));
  const add = () => onChange([...images, { url: '', alt: '', caption: '' }]);
  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  return (
    <Panel title={`Images (${images.length})`} action={addButton(add, 'Add image')}>
      {images.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No images yet. Add at least 2-3 images with descriptive alt text for SEO.
        </p>
      ) : (
        <div className="space-y-4">
          {images.map((img, i) => (
            <div
              key={i}
              className="p-4 rounded-xl flex items-start gap-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {img.url && (
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                />
              )}
              <div className="flex-1 space-y-3">
                <EditorField label="Image URL" value={img.url} onChange={(v) => update(i, { url: v })} />
                <div className="grid md:grid-cols-2 gap-3">
                  <EditorField
                    label="Alt text (SEO)"
                    value={img.alt}
                    onChange={(v) => update(i, { alt: v })}
                  />
                  <EditorField
                    label="Caption (optional)"
                    value={img.caption || ''}
                    onChange={(v) => update(i, { caption: v })}
                  />
                </div>
              </div>
              {removeButton(() => remove(i))}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function FaqEditor({ faq, onChange }: { faq: FaqItem[]; onChange: (f: FaqItem[]) => void }) {
  const update = (i: number, patch: Partial<FaqItem>) =>
    onChange(faq.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const add = () => onChange([...faq, { question: '', answer: '' }]);
  const remove = (i: number) => onChange(faq.filter((_, idx) => idx !== i));

  return (
    <Panel title={`FAQ (${faq.length})`} action={addButton(add, 'Add question')}>
      {faq.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Add 6-10 Q&amp;A items to generate FAQ schema markup.
        </p>
      ) : (
        <div className="space-y-3">
          {faq.map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex-1 space-y-3">
                <EditorField
                  label={`Question ${i + 1}`}
                  value={item.question}
                  onChange={(v) => update(i, { question: v })}
                />
                <EditorField
                  label="Answer"
                  value={item.answer}
                  onChange={(v) => update(i, { answer: v })}
                  multiline
                  rows={3}
                />
              </div>
              {removeButton(() => remove(i))}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function CompetitorsEditor({
  competitors,
  onChange,
}: {
  competitors: Competitor[];
  onChange: (c: Competitor[]) => void;
}) {
  const update = (i: number, patch: Partial<Competitor>) =>
    onChange(competitors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const add = () =>
    onChange([...competitors, { name: '', website: '', location: '', strengths: '', notes: '' }]);
  const remove = (i: number) => onChange(competitors.filter((_, idx) => idx !== i));

  return (
    <Panel title={`Competitor research (${competitors.length})`} action={addButton(add, 'Add competitor')}>
      {competitors.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No competitors saved. Research runs on the portal page will populate this automatically.
        </p>
      ) : (
        <div className="space-y-3">
          {competitors.map((c, i) => (
            <div
              key={i}
              className="p-4 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex-1 grid md:grid-cols-2 gap-3">
                <EditorField label="Name" value={c.name} onChange={(v) => update(i, { name: v })} />
                <EditorField label="Website" value={c.website || ''} onChange={(v) => update(i, { website: v })} />
                <EditorField label="Location" value={c.location || ''} onChange={(v) => update(i, { location: v })} />
                <EditorField
                  label="Strengths"
                  value={c.strengths || ''}
                  onChange={(v) => update(i, { strengths: v })}
                />
                <div className="md:col-span-2">
                  <EditorField
                    label="Notes"
                    value={c.notes || ''}
                    onChange={(v) => update(i, { notes: v })}
                    multiline
                    rows={2}
                  />
                </div>
              </div>
              {removeButton(() => remove(i))}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function BacklinksEditor({
  backlinks,
  onChange,
}: {
  backlinks: Backlink[];
  onChange: (b: Backlink[]) => void;
}) {
  const update = (i: number, patch: Partial<Backlink>) =>
    onChange(backlinks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const add = () => onChange([...backlinks, { url: '', anchor: '', note: '' }]);
  const remove = (i: number) => onChange(backlinks.filter((_, idx) => idx !== i));

  return (
    <Panel title={`Backlinks (${backlinks.length})`} action={addButton(add, 'Add backlink')}>
      {backlinks.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No backlinks yet. These render as an outgoing-link section on the public page.
        </p>
      ) : (
        <div className="space-y-3">
          {backlinks.map((b, i) => (
            <div
              key={i}
              className="p-4 rounded-xl flex items-start gap-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex-1 grid md:grid-cols-2 gap-3">
                <EditorField
                  label="URL"
                  value={b.url}
                  onChange={(v) => update(i, { url: v })}
                  hint="Absolute URL"
                />
                <EditorField
                  label="Anchor text"
                  value={b.anchor}
                  onChange={(v) => update(i, { anchor: v })}
                />
                <div className="md:col-span-2">
                  <EditorField
                    label="Note (internal)"
                    value={b.note || ''}
                    onChange={(v) => update(i, { note: v })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {b.url && (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ background: 'rgba(57,204,204,0.12)', color: '#39CCCC' }}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
                {removeButton(() => remove(i))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
