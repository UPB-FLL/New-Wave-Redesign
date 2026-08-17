import { Link } from 'react-router-dom';
import { Star, Layers, HelpCircle, Info, Mail, AlignLeft, ArrowRight, DollarSign, Search, ShieldCheck, AlertTriangle, Zap, FileText } from 'lucide-react';

const sections = [
  { label: 'Hero', path: '/admin/hero', icon: Star, desc: 'Headline, badge, stats, feature cards' },
  { label: 'Trust Bar', path: '/admin/trustbar', icon: ShieldCheck, desc: 'Certifications & partnership badges' },
  { label: 'Services', path: '/admin/services', icon: Layers, desc: 'Service cards, titles, highlights' },
  { label: 'Service Categories', path: '/admin/service-categories', icon: Layers, desc: 'Category detail pages with SEO blog links' },
  { label: 'Service Details', path: '/admin/services-detail', icon: Zap, desc: 'Detailed pages for each service' },
  { label: 'Threat Details', path: '/admin/threats-detail', icon: AlertTriangle, desc: 'Detailed pages for each threat' },
  { label: 'Pricing', path: '/admin/pricing', icon: DollarSign, desc: 'Pricing tiers, plans, features' },
  { label: 'Pricing Units', path: '/admin/pricing-units', icon: DollarSign, desc: 'Configure quote builder options & rates' },
  { label: 'Why Us', path: '/admin/whyus', icon: HelpCircle, desc: 'Proof points, feature cards' },
  { label: 'About', path: '/admin/about', icon: Info, desc: 'Company story, years, team tagline' },
  { label: 'Contact', path: '/admin/contact', icon: Mail, desc: 'Phone, email, address, messages' },
  { label: 'Footer', path: '/admin/footer', icon: AlignLeft, desc: 'Tagline, contact info, links' },
  { label: 'Blog', path: '/admin/unified', icon: FileText, desc: 'Manage blog posts, AI generation, and settings' },
  { label: 'SEO Portal', path: '/admin/seo', icon: Search, desc: 'Local landing pages, AI competitor research, backlinks' },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Legacy Dashboard</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Classic admin interface. Use the new unified dashboard for a better experience.</p>
          </div>
          <a
            href="/admin"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors"
          >
            Go to Unified Dashboard
          </a>
        </div>
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
