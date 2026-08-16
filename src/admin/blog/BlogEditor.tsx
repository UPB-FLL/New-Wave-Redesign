import { useState, useEffect } from 'react';
import { X, Save, Eye, Image as ImageIcon } from 'lucide-react';
import { updateBlogPost, generateSlug, validateSlug, estimateReadTime } from '../../lib/blog';
import type { BlogPost, BlogPostUpdate } from '../../../types/blog';

interface BlogEditorProps {
  post: BlogPost;
  onCancel: () => void;
  onSave: (updated: BlogPost) => void;
}

export default function BlogEditor({ post, onCancel, onSave }: BlogEditorProps) {
  const [formData, setFormData] = useState<BlogPostUpdate>({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    content: post.content,
    featured_image: post.featured_image || '',
    category: post.category,
    tags: post.tags || [],
    meta_title: post.meta_title || '',
    meta_description: post.meta_description || '',
  });
  const [tagsInput, setTagsInput] = useState((post.tags || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const categories = ['Managed IT Services', 'Cybersecurity', 'Cloud Solutions', 'Network Infrastructure', 'Microsoft 365', 'IT Support', 'Backup & Disaster Recovery'];

  useEffect(() => {
    if (formData.slug && !validateSlug(formData.slug)) {
      setSlugError('Slug must contain only lowercase letters, numbers, and hyphens');
    } else {
      setSlugError(null);
    }
  }, [formData.slug]);

  function handleFieldChange(field: keyof BlogPostUpdate, value: string | string[]) {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from title if slug is empty
    if (field === 'title' && !formData.slug) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(value as string) }));
    }
  }

  function handleTagsChange(value: string) {
    setTagsInput(value);
    const tags = value.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
    setFormData((prev) => ({ ...prev, tags }));
  }

  async function handleSave() {
    if (slugError) {
      setError('Please fix the slug before saving.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updated = await updateBlogPost(post.id, formData);
      onSave(updated);
    } catch (err) {
      console.error('Failed to save post:', err);
      setError('Failed to save blog post. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function charCount(str: string | null | undefined): number {
    return str?.length || 0;
  }

  const readTime = estimateReadTime(formData.content || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Edit Blog Post</h2>
          <p className="text-sm text-white/50 mt-1">Update content, SEO metadata, and settings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/7.5 text-white transition-colors"
          >
            <Eye size={16} />
            {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/7.5 text-white transition-colors"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!slugError}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Save size={16} className={saving ? 'animate-pulse' : ''} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {previewMode ? (
        /* Preview mode */
        <div className="p-6 rounded-lg bg-white border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{formData.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span>{formData.category}</span>
            <span>{readTime} min read</span>
          </div>
          {formData.featured_image && (
            <img src={formData.featured_image} alt="" className="w-full h-auto rounded-lg mb-4" />
          )}
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans">{formData.content}</pre>
          </div>
        </div>
      ) : (
        /* Edit mode */
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Title <span className="text-white/50">({charCount(formData.title)}/60 chars)</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
              placeholder="Enter blog post title..."
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              URL Slug <span className="text-white/50">(auto-generated from title)</span>
            </label>
            <div className="flex">
              <span className="px-3 py-2 text-sm text-white/50 bg-white/5 border border-r-0 border-white/10 rounded-l-lg">
                /blog/
              </span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleFieldChange('slug', e.target.value)}
                className={`flex-1 px-4 py-2 rounded-r-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5 ${slugError ? 'ring-2 ring-red-500' : ''}`}
                placeholder="blog-post-slug"
              />
            </div>
            {slugError && <p className="text-red-400 text-xs mt-1">{slugError}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-gray-800">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Tags <span className="text-white/50">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              className="w-full px-4 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
              placeholder="IT Support, Cybersecurity, Business"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Excerpt <span className="text-white/50">({charCount(formData.excerpt)}/160 chars)</span>
            </label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => handleFieldChange('excerpt', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5 resize-none"
              placeholder="Brief description for blog listing and meta description..."
            />
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Featured Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.featured_image}
                onChange={(e) => handleFieldChange('featured_image', e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
                placeholder="https://..."
              />
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/7.5 text-white transition-colors"
                title="Search Pexels for images"
              >
                <ImageIcon size={16} />
                Search
              </button>
            </div>
            {formData.featured_image && (
              <img src={formData.featured_image} alt="" className="mt-2 max-h-32 rounded-lg" />
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Content <span className="text-white/50">(Markdown format, ~{readTime} min read)</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleFieldChange('content', e.target.value)}
              rows={20}
              className="w-full px-4 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 font-mono resize-y"
              placeholder="# Write your blog post in Markdown...

## Subheading

Your content here with **bold** and *italic* text.

- Bullet points
- Numbered lists

1. First item
2. Second item"
            />
          </div>

          {/* SEO Section */}
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-2">
                  Meta Title <span className="text-white/50">({charCount(formData.meta_title)}/60 chars)</span>
                </label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => handleFieldChange('meta_title', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
                  placeholder="SEO-optimized title..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-2">
                  Meta Description <span className="text-white/50">({charCount(formData.meta_description)}/160 chars)</span>
                </label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => handleFieldChange('meta_description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5 resize-none"
                  placeholder="Meta description for search engines..."
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
