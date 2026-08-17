import { useEffect, useState } from 'react';
import { contentManager } from './ContentManager';
import type { ContentManagerState } from './ContentManager';
import SidebarNavigation from './components/SidebarNavigation';
import PublishBar from './components/PublishBar';
import HeroEditor from './editors/HeroEditor';
import ServicesEditor from './editors/ServicesEditor';
import BlogPostManager from './blog/BlogPostManager';
import BlogEditor from './blog/BlogEditor';
import BlogSettings from './blog/BlogSettings';
import { fetchBlogPosts } from '../lib/blog';
import { generateBlogPost } from '../lib/blogGeneration';
import type { BlogPost } from '../../types/blog';

type SectionType = 'hero' | 'services' | 'blog-posts' | 'blog-settings' | string;

export default function UnifiedAdminDashboard() {
  const [state, setState] = useState<ContentManagerState>(contentManager.getState());
  const [activeSection, setActiveSection] = useState<SectionType>('hero');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);

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

  const loadBlogPosts = async () => {
    try {
      setBlogLoading(true);
      const result = await fetchBlogPosts({ limit: 12 });
      setBlogPosts(result.posts);
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setBlogLoading(false);
    }
  };

  // Load blog posts on mount
  useEffect(() => {
    loadBlogPosts();
  }, []);

  const renderEditor = () => {
    switch (activeSection) {
      case 'hero':
        return <HeroEditor />;
      case 'services':
        return <ServicesEditor />;
      case 'blog-posts':
        if (editingPost) {
          return (
            <BlogEditor
              post={editingPost}
              onCancel={() => setEditingPost(null)}
              onSave={() => {
                setEditingPost(null);
                // Refresh the blog posts
                loadBlogPosts();
              }}
            />
          );
        }
        return (
          <BlogPostManager
            onEdit={(post) => setEditingPost(post)}
            onGenerate={async () => {
              try {
                const data = await generateBlogPost({});
                alert(`Blog post generated: "${data.title}"`);
                // Refresh the blog posts list
                await loadBlogPosts();
              } catch (err) {
                console.error('Blog generation failed:', err);
                alert(`Blog generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure VITE_OPENAI_API_KEY is configured.`);
              }
            }}
            onRefresh={async () => {
              // Refresh blog posts
              await loadBlogPosts();
            }}
            posts={blogPosts}
            loading={blogLoading}
          />
        );
      case 'blog-settings':
        return <BlogSettings />;
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