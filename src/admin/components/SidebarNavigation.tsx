import { useState } from 'react';
import { ChevronDown, ChevronRight, Star, Layers, Info, Mail, Search } from 'lucide-react';

interface SectionGroup {
  id: string;
  label: string;
  icon: any;
  sections: SectionItem[];
  defaultExpanded?: boolean;
}

interface SectionItem {
  id: string;
  label: string;
  path: string;
  description: string;
}

interface SidebarNavigationProps {
  activeSection: string;
  onSectionSelect: (sectionId: string) => void;
  className?: string;
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: 'homepage',
    label: 'Homepage Content',
    icon: Star,
    defaultExpanded: true,
    sections: [
      { id: 'hero', label: 'Hero', path: 'hero', description: 'Headline, badge, stats, feature cards' },
      { id: 'trustbar', label: 'Trust Bar', path: 'trustbar', description: 'Certifications & partnership badges' },
      { id: 'testimonials', label: 'Testimonials', path: 'testimonials', description: 'Customer testimonials' },
    ],
  },
  {
    id: 'services',
    label: 'Services Content',
    icon: Layers,
    sections: [
      { id: 'services', label: 'Services Overview', path: 'services', description: 'Service cards, titles, highlights' },
      { id: 'service-categories', label: 'Service Categories', path: 'service-categories', description: 'Category detail pages with SEO' },
      { id: 'service-details', label: 'Service Details', path: 'service-details', description: 'Detailed pages for each service' },
      { id: 'threat-details', label: 'Threat Details', path: 'threat-details', description: 'Detailed pages for each threat' },
    ],
  },
  {
    id: 'company',
    label: 'Company Content',
    icon: Info,
    sections: [
      { id: 'whyus', label: 'Why Us', path: 'whyus', description: 'Proof points, feature cards' },
      { id: 'about', label: 'About', path: 'about', description: 'Company story, years, team' },
      { id: 'pricing', label: 'Pricing', path: 'pricing', description: 'Pricing tiers, plans, features' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact & Footer',
    icon: Mail,
    sections: [
      { id: 'contact', label: 'Contact', path: 'contact', description: 'Phone, email, address, messages' },
      { id: 'footer', label: 'Footer', path: 'footer', description: 'Tagline, contact info, links' },
    ],
  },
  {
    id: 'seo',
    label: 'SEO & Settings',
    icon: Search,
    sections: [
      { id: 'seo', label: 'SEO Portal', path: 'seo', description: 'Local landing pages, AI research' },
      { id: 'status', label: 'Status', path: 'status', description: 'System status page content' },
    ],
  },
];

export default function SidebarNavigation({
  activeSection,
  onSectionSelect,
  className = '',
}: SidebarNavigationProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(SECTION_GROUPS.filter(g => g.defaultExpanded).map(g => g.id))
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <nav className={`flex flex-col ${className}`}>
      <div className="px-6 py-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Content Sections</h2>
        <p className="text-sm text-white/50 mt-1">Select a section to edit</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {SECTION_GROUPS.map(group => {
          const Icon = group.icon;
          const isExpanded = expandedGroups.has(group.id);
          const hasActiveSection = group.sections.some(s => s.id === activeSection);

          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                  hasActiveSection ? 'bg-white/5' : 'hover:bg-white/3'
                }`}
              >
                <Icon size={18} className={hasActiveSection ? 'text-teal-400' : 'text-white/50'} />
                <span className={`flex-1 text-sm font-medium ${
                  hasActiveSection ? 'text-white' : 'text-white/70'
                }`}>
                  {group.label}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-white/30" />
                ) : (
                  <ChevronRight size={16} className="text-white/30" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-12 space-y-1">
                  {group.sections.map(section => (
                    <button
                      key={section.id}
                      onClick={() => onSectionSelect(section.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-teal-600/20 text-teal-300 font-medium'
                          : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                      }`}
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// Export for use in other components
export { SECTION_GROUPS, type SectionItem };
