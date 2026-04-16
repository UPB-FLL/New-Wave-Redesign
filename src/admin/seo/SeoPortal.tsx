import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Sparkles,
  Trash2,
  ExternalLink,
  Edit3,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
} from 'lucide-react';
import {
  createSeoPage,
  deleteSeoPage,
  emptySeoPage,
  listSeoPages,
  slugify,
  type Competitor,
  type SeoPage,
} from '../../lib/seoPages';

interface ResearchResult {
  competitors: Competitor[];
  suggestedAngles: string[];
  localSignals: string[];
}

export default function SeoPortal() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState('Fort Lauderdale, FL');
  const [keyword, setKeyword] = useState('managed IT services');
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researching, setResearching] = useState(false);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    void refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    const data = await listSeoPages();
    setPages(data);
    setLoading(false);
  };

  const handleResearch = async () => {
    setError(null);
    setResearch(null);
    setSelected({});
    setResearching(true);
    try {
      const res = await fetch('/api/seo/research-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, keyword, limit: 8 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status}).`);
      }
      const data = (await res.json()) as ResearchResult;
      setResearch(data);
      const initial: Record<number, boolean> = {};
      data.competitors.forEach((_, i) => (initial[i] = true));
      setSelected(initial);
    } catch (err: any) {
      setError(err?.message || 'Research failed.');
    } finally {
      setResearching(false);
    }
  };

  const generateBacklinkPage = async (idx: number) => {
    if (!research) return;
    const competitor = research.competitors[idx];
    setError(null);
    setGeneratingIdx(idx);
    try {
      const res = await fetch('/api/seo/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          keyword: `${keyword} vs ${competitor.name}`,
          competitors: [competitor],
          angles: research.suggestedAngles,
          localSignals: research.localSignals,
          pageType: 'backlink',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Generation failed (${res.status}).`);
      }
      const page = await res.json();
      const slug = slugify(page.slug || `${keyword}-vs-${competitor.name}`);
      const created = await createSeoPage({
        ...emptySeoPage(),
        ...page,
        slug,
        published: false,
      });
      if (!created) throw new Error('Failed to save generated page.');
      await refresh();
      navigate(`/admin/seo/${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Generation failed.');
    } finally {
      setGeneratingIdx(null);
    }
  };

  const generateLocalLanding = async () => {
    if (!research) return;
    const chosen = research.competitors.filter((_, i) => selected[i]);
    setError(null);
    setGeneratingIdx(-1);
    try {
      const res = await fetch('/api/seo/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          keyword,
          competitors: chosen,
          angles: research.suggestedAngles,
          localSignals: research.localSignals,
          pageType: 'local-landing',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Generation failed (${res.status}).`);
      }
      const page = await res.json();
      const slug = slugify(page.slug || `${keyword}-${location}`);
      const created = await createSeoPage({
        ...emptySeoPage(),
        ...page,
        slug,
        published: false,
      });
      if (!created) throw new Error('Failed to save generated page.');
      await refresh();
      navigate(`/admin/seo/${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Generation failed.');
    } finally {
      setGeneratingIdx(null);
    }
  };

  const createBlank = async () => {
    const created = await createSeoPage({
      ...emptySeoPage(),
      slug: `untitled-${Date.now()}`,
      title: 'New SEO Page',
      h1: 'New SEO Page',
    });
    if (!created) {
      setError('Failed to create page. Is the seo_pages migration applied?');
      return;
    }
    navigate(`/admin/seo/${created.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SEO page permanently?')) return;
    const ok = await deleteSeoPage(id);
    if (ok) await refresh();
  };

  const panelStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">SEO Portal</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Research local MSP competitors with AI and generate optimized landing &amp; backlink pages.
          </p>
        </div>
        <button
          onClick={createBlank}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <Plus size={15} /> Blank Page
        </button>
      </div>

      <div className="p-5 rounded-2xl mb-6" style={panelStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: '#39CCCC' }} />
          <h2 className="text-sm font-semibold text-white">Competitor research (GPT)</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Target location
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Fort Lauderdale, FL"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Primary keyword / service
            </label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. managed IT services"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleResearch}
            disabled={researching || !location || !keyword}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#39CCCC' }}
          >
            {researching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {researching ? 'Researching…' : 'Research competitors'}
          </button>
          {research && (
            <button
              onClick={generateLocalLanding}
              disabled={generatingIdx !== null}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#5EBC67' }}
            >
              {generatingIdx === -1 ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              Generate local landing page
            </button>
          )}
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 text-sm" style={{ color: '#f87171' }}>
            <XCircle size={15} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {research && (
        <div className="p-5 rounded-2xl mb-6" style={panelStyle}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              {research.competitors.length} competitors found
            </h3>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Select rows to include in the local landing page
            </span>
          </div>

          {research.suggestedAngles.length > 0 && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Suggested SEO angles
              </div>
              <div className="flex flex-wrap gap-2">
                {research.suggestedAngles.map((a, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(57,204,204,0.12)', color: '#8fe3e3', border: '1px solid rgba(57,204,204,0.2)' }}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {research.competitors.map((c, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <input
                  type="checkbox"
                  checked={!!selected[i]}
                  onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.checked }))}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs flex items-center gap-1"
                        style={{ color: '#39CCCC' }}
                      >
                        {c.website} <ExternalLink size={11} />
                      </a>
                    )}
                    {c.location && (
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        • {c.location}
                      </span>
                    )}
                  </div>
                  {(c.strengths || c.notes) && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {c.strengths} {c.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => generateBacklinkPage(i)}
                  disabled={generatingIdx !== null}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50 flex-shrink-0"
                  style={{ background: 'rgba(57,204,204,0.15)', border: '1px solid rgba(57,204,204,0.25)', color: '#8fe3e3' }}
                >
                  {generatingIdx === i ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  Backlink page
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl" style={panelStyle}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">All SEO pages</h2>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pages.length} total
          </span>
        </div>
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 size={18} className="animate-spin" style={{ color: '#39CCCC' }} />
          </div>
        ) : pages.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No SEO pages yet. Run competitor research or create a blank page to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{p.title || p.h1 || p.slug}</span>
                    {p.published ? (
                      <span
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(94,188,103,0.12)', color: '#5EBC67', border: '1px solid rgba(94,188,103,0.2)' }}
                      >
                        <CheckCircle2 size={10} /> Live
                      </span>
                    ) : (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    <Globe size={11} /> /l/{p.slug}
                    {p.target_location && <span>• {p.target_location}</span>}
                    {p.target_keyword && <span>• {p.target_keyword}</span>}
                  </div>
                </div>
                {p.published && (
                  <a
                    href={`/l/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
                    style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)' }}
                  >
                    <ExternalLink size={12} /> View
                  </a>
                )}
                <Link
                  to={`/admin/seo/${p.id}`}
                  className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white"
                  style={{ background: 'rgba(57,204,204,0.15)', border: '1px solid rgba(57,204,204,0.25)', color: '#8fe3e3' }}
                >
                  <Edit3 size={12} /> Edit
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
