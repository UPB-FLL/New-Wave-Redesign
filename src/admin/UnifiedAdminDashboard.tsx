import { useEffect, useState } from 'react';
import { contentManager } from './ContentManager';
import type { ContentManagerState } from './ContentManager';
import SidebarNavigation from './components/SidebarNavigation';
import PublishBar from './components/PublishBar';
import HeroEditor from './editors/HeroEditor';
import ServicesEditor from './editors/ServicesEditor';

type SectionType = 'hero' | 'services' | string;

export default function UnifiedAdminDashboard() {
  const [state, setState] = useState<ContentManagerState>(contentManager.getState());
  const [activeSection, setActiveSection] = useState<SectionType>('hero');

  useEffect(() => {
    const unsubscribe = contentManager.subscribe((newState) => {
      setState(newState);
    });

    // Pre-load all sections
    contentManager.loadSection('hero');
    contentManager.loadSection('services');

    return unsubscribe;
  }, []);

  const handlePublish = async () => {
    try {
      await contentManager.publishChanges();
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  const handleDiscard = () => {
    contentManager.discardChanges();
  };

  const renderEditor = () => {
    switch (activeSection) {
      case 'hero':
        return <HeroEditor />;
      case 'services':
        return <ServicesEditor />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-white/50">Section editor not yet implemented</p>
              <p className="text-white/30 text-sm mt-2">Section: {activeSection}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--nw-dark)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">New Wave IT Admin</h1>
            <p className="text-sm text-white/50 mt-1">Unified Content Management</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-white/10 overflow-y-auto">
          <SidebarNavigation
            activeSection={activeSection}
            onSectionSelect={setActiveSection}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {renderEditor()}
          </div>
        </div>
      </div>

      {/* Publish Bar */}
      <PublishBar
        state={state}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />
    </div>
  );
}