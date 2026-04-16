import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, Star, Layers, HelpCircle, Info, Mail, AlignLeft, LogOut, Menu, X, Waves, Search,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Hero', path: '/admin/hero', icon: Star },
  { label: 'Services', path: '/admin/services', icon: Layers },
  { label: 'Why Us', path: '/admin/whyus', icon: HelpCircle },
  { label: 'About', path: '/admin/about', icon: Info },
  { label: 'Contact', path: '/admin/contact', icon: Mail },
  { label: 'Footer', path: '/admin/footer', icon: AlignLeft },
  { label: 'SEO Portal', path: '/admin/seo', icon: Search },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'text-white'
        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
    }`;

  const activeStyle = { background: 'rgba(57,204,204,0.15)', color: '#39CCCC' };

  return (
    <div className="min-h-screen flex" style={{ background: '#0f1923' }}>
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:flex ${
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
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={linkClass}
              style={({ isActive }) => isActive ? activeStyle : {}}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center px-6 lg:hidden" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111c27' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white/50 hover:text-white">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
