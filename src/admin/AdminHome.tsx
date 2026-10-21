import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, ExternalLink } from 'lucide-react';
import { listAudits } from '../lib/groundswell';
import { GROUNDSWELL_ADMIN_AUDITS_PATH } from '../groundswell/site';
import { SITE_PAGES } from './adminNav';
import { fetchSectionEdits, formatEdited } from './adminHomeData';
import { previewUrl } from '../lib/preview';

/**
 * The admin's front page: one card per public page with when its content
 * was last edited, and the Groundswell queue at a glance. Everything else is
 * in the sidebar.
 */

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

export default function AdminHome() {
  const [edits, setEdits] = useState<Record<string, string> | null>(null);
  const [queue, setQueue] = useState<{ queued: number; running: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const fail = (what: string) => (err: unknown) => setErrors((e) => [...e, `${what}: ${err instanceof Error ? err.message : 'failed'}`]);
    fetchSectionEdits().then(setEdits).catch(fail('Last edits'));
    listAudits()
      .then((audits) => setQueue({
        queued: audits.filter((a) => a.status === 'queued').length,
        running: audits.filter((a) => a.status === 'running').length,
      }))
      .catch(fail('Groundswell'));
  }, []);

  const lastEdit = (sections: (string | undefined)[]) => {
    if (!edits) return undefined;
    const stamps = sections.flatMap((s) => (s && edits[s] ? [edits[s]] : []));
    return stamps.length ? stamps.sort()[stamps.length - 1] : undefined;
  };

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white mb-1">Overview</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Pick a page to edit its content, or search the sidebar for a field.</p>
      </header>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-red-300 space-y-1">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <section aria-labelledby="admin-home-pages">
        <h2 id="admin-home-pages" className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Site pages</h2>
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 list-none p-0 m-0">
          {SITE_PAGES.map((page) => (
            <li key={page.id} className="rounded-2xl p-5 flex flex-col gap-3" style={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={page.entries[0].path} className="font-semibold text-white text-sm hover:underline">{page.label}</Link>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{page.description}</p>
                </div>
                <a href={previewUrl(page.url)} target="_blank" rel="noreferrer" className="text-white/30 hover:text-white/70" aria-label={`View ${page.label} on the site`}>
                  <ExternalLink size={14} />
                </a>
              </div>
              <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
                {page.entries.map((entry) => (
                  <li key={entry.path}>
                    <Link to={entry.path} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-white/70 hover:text-white" style={{ background: 'rgba(57,204,204,0.1)', border: '1px solid rgba(57,204,204,0.2)' }}>
                      {entry.label} <ArrowRight size={10} />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {edits ? formatEdited(lastEdit(page.entries.map((e) => e.section))) : '…'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="admin-home-groundswell">
        <h2 id="admin-home-groundswell" className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Groundswell</h2>
        <Link to={GROUNDSWELL_ADMIN_AUDITS_PATH} className="flex items-center gap-4 rounded-2xl p-5 max-w-md hover:bg-white/5 transition-colors" style={card}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(57,204,204,0.12)', border: '1px solid rgba(57,204,204,0.2)' }}>
            <ClipboardList size={18} style={{ color: '#39CCCC' }} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">Audit queue</div>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {queue ? `${queue.queued} queued, ${queue.running} running` : '…'}
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
