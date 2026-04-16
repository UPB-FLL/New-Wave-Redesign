import { Link } from 'react-router-dom';
import { Star, Layers, HelpCircle, Info, Mail, AlignLeft, ArrowRight, DollarSign } from 'lucide-react';

const sections = [
  { label: 'Hero', path: '/admin/hero', icon: Star, desc: 'Headline, badge, stats, feature cards' },
  { label: 'Services', path: '/admin/services', icon: Layers, desc: 'Service cards, titles, highlights' },
  { label: 'Pricing', path: '/admin/pricing', icon: DollarSign, desc: 'Pricing tiers, plans, features' },
  { label: 'Why Us', path: '/admin/whyus', icon: HelpCircle, desc: 'Proof points, feature cards' },
  { label: 'About', path: '/admin/about', icon: Info, desc: 'Company story, years, team tagline' },
  { label: 'Contact', path: '/admin/contact', icon: Mail, desc: 'Phone, email, address, messages' },
  { label: 'Footer', path: '/admin/footer', icon: AlignLeft, desc: 'Tagline, contact info, links' },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Select a section to edit its content.</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link
            key={section.path}
            to={section.path}
            className="group flex items-start gap-4 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(57,204,204,0.12)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <section.icon size={18} style={{ color: '#39CCCC' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-sm">{section.label}</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{section.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
