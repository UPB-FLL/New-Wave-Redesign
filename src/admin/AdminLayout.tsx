import { Suspense, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, LogOut, Menu, X, Waves, Search, ChevronRight, ExternalLink,
  Home, Layers, DollarSign, Info, Mail, Activity, FileText, Settings, Globe, Gauge, ClipboardList, Handshake,
  type LucideIcon,
} from 'lucide-react';
import { usePageMeta } from '../lib/usePageMeta';
import { ADMIN_NAV, pageForPath, searchAdminNav, type AdminNavEntry, type AdminNavPage } from './adminNav';
import { contentManager, type ContentManagerState } from './ContentManager';
import PublishBar from './components/PublishBar';

/**
 * One sidebar for the whole admin: Site pages (one row per public page, its
 * block editors beneath), Blog, SEO, and Groundswell. A search box at the top
 * filters the entries by label, page, and the words in `adminNav.ts`. The
 * publish bar lives here so it is on every editor, and shows only while
 * something is unsaved or a save is in flight.
 */

const PAGE_ICONS: Record<string, LucideIcon> = {
  home: Home, services: Layers, pricing: DollarSign, about: Info, contact: Mail, status: Activity,
};
const ENTRY_ICONS: Record<string, LucideIcon> = {
  '/admin/blog': FileText, '/admin/blog/settings': Settings, '/admin/seo': Globe,
  '/admin/groundswell': Gauge, '/admin/groundswell/audits': ClipboardList, '/admin/groundswell/partners': Handshake,
};

const OPEN_PAGES_KEY = 'nw_admin_open_pages';

function readOpenPages(): Set<string> {
  try {
    const raw = localStorage.getItem(OPEN_PAGES_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* private mode or bad value: start closed */ }
  return new Set();
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
    isActive ? 'text-white' : 'text-white/55 hover:text-white/85 hover:bg-white/5'
  }`;
const activeStyle = { background: 'rgba(57,204,204,0.15)', color: '#39CCCC' };
const groupLabelClass = 'px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider';
const groupLabelStyle = { color: 'rgba(255,255,255,0.35)' };

function EntryLink({ entry, icon: Icon, indent, onPick }: { entry: AdminNavEntry; icon?: LucideIcon; indent?: boolean; onPick: () => void }) {
  return (
    <NavLink
      to={entry.path}
      end={entry.end}
      className={linkClass}
      style={({ isActive }) => ({ ...(isActive ? activeStyle : {}), ...(indent ? { paddingLeft: '2.25rem' } : {}) })}
      onClick={onPick}
    >
      {Icon ? <Icon size={16} /> : null}
      {entry.label}
    </NavLink>
  );
}

function PageRow({ page, open, active, onToggle, onPick }: { page: AdminNavPage; open: boolean; active: boolean; onToggle: () => void; onPick: () => void }) {
  const Icon = PAGE_ICONS[page.id] ?? Home;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`admin-page-${page.id}`}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
      >
        <Icon size={16} style={active ? { color: '#39CCCC' } : undefined} />
        <span className="flex-1 text-left">{page.label}</span>
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} style={{ color: 'rgba(255,255,255,0.3)' }} />
      </button>
      {open && (
        <div id={`admin-page-${page.id}`} className="space-y-0.5 pb-1">
          {page.entries.map((entry) => <EntryLink key={entry.path} entry={entry} indent onPick={onPick} />)}
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs pl-9 pr-3 py-1.5 text-white/35 hover:text-white/70"
          >
            <ExternalLink size={12} /> View {page.label === 'Home' ? 'home page' : 'on site'}
          </a>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  usePageMeta({ title: 'Admin' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openPages, setOpenPages] = useState<Set<string>>(readOpenPages);
  const [content, setContent] = useState<ContentManagerState>(() => contentManager.getState());
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => contentManager.subscribe(setContent), []);

  // The page holding the current editor is always open, so the active link is visible.
  const currentPage = pageForPath(pathname);
  useEffect(() => {
    if (currentPage && !openPages.has(currentPage.id)) {
      setOpenPages((prev) => new Set(prev).add(currentPage.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage?.id]);

  const togglePage = (id: string) => {
    setOpenPages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(OPEN_PAGES_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  const results = useMemo(() => (query.trim() ? searchAdminNav(query) : null), [query]);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const pendingCount = contentManager.getPendingChangesCount();
  const showPublishBar = pendingCount > 0 || content.publishStatus !== 'idle';

  return (
    <div className="min-h-screen flex" style={{ background: '#0f1923' }}>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:flex ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#111c27', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3 px-5 h-16" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(57,204,204,0.15)' }}>
            <Waves size={16} style={{ color: '#39CCCC' }} />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">New Wave IT</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Admin</div>
          </div>
        </div>

        <div className="px-3 pt-3">
          <label className="relative block">
            <span className="sr-only">Search the admin</span>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a section or field…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </label>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto" aria-label="Admin">
          {results ? (
            <div role="group" aria-label="Search results">
              {results.length === 0 && (
                <p className="px-3 py-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Nothing matches "{query.trim()}".</p>
              )}
              {results.map((entry) => {
                const page = pageForPath(entry.path);
                return (
                  <NavLink key={entry.path} to={entry.path} end={entry.end} className={linkClass} style={({ isActive }) => isActive ? activeStyle : {}} onClick={() => { setQuery(''); closeSidebar(); }}>
                    <span className="flex flex-col">
                      <span>{entry.label}</span>
                      {page && <span className="text-[11px] font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>{page.label}</span>}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ) : (
            <>
              <NavLink to="/admin" end className={linkClass} style={({ isActive }) => isActive ? activeStyle : {}} onClick={closeSidebar}>
                <LayoutDashboard size={16} />
                Overview
              </NavLink>
              {ADMIN_NAV.map((group) => (
                <div key={group.id} role="group" aria-labelledby={`admin-nav-${group.id}`}>
                  <div id={`admin-nav-${group.id}`} className={groupLabelClass} style={groupLabelStyle}>{group.label}</div>
                  {group.pages?.map((page) => (
                    <PageRow
                      key={page.id}
                      page={page}
                      open={openPages.has(page.id)}
                      active={currentPage?.id === page.id}
                      onToggle={() => togglePage(page.id)}
                      onPick={closeSidebar}
                    />
                  ))}
                  {group.entries?.map((entry) => (
                    <EntryLink key={entry.path} entry={entry} icon={ENTRY_ICONS[entry.path]} onPick={closeSidebar} />
                  ))}
                </div>
              ))}
            </>
          )}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={closeSidebar} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center gap-3 px-6 lg:hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111c27' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/50 hover:text-white" aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="text-sm font-semibold text-white">{currentPage?.label ?? 'Admin'}</span>
        </header>

        <main className={`flex-1 p-6 lg:p-8 overflow-y-auto ${showPublishBar ? 'pb-28' : ''}`}>
          {/* Editors are lazy chunks (App.tsx); the sidebar stays put while one loads. */}
          <Suspense fallback={<div aria-busy="true" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {showPublishBar && (
        <PublishBar
          state={content}
          onPublish={() => contentManager.publishChanges().catch(() => { /* the bar shows the error */ })}
          onDiscard={() => contentManager.discardChanges()}
          className="lg:left-64"
        />
      )}
    </div>
  );
}
