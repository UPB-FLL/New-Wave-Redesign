import { useState, useEffect } from 'react';
import { Trash2, Edit, RefreshCw, Plus, Search, Filter } from 'lucide-react';
import { fetchBlogPosts, deleteBlogPost } from '../../lib/blog';
import type { BlogPost } from '../../../types/blog';

interface BlogPostManagerProps {
  onEdit: (post: BlogPost) => void;
  onGenerate: () => void;
  onRefresh: () => void;
}

export default function BlogPostManager({ onEdit, onGenerate, onRefresh }: BlogPostManagerProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const categories = ['Managed IT Services', 'Cybersecurity', 'Cloud Solutions', 'Network Infrastructure', 'Microsoft 365', 'IT Support', 'Backup & Disaster Recovery'];

  useEffect(() => {
    loadPosts();
  }, [page, categoryFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      loadPosts();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  async function loadPosts() {
    try {
      setLoading(true);
      const result = await fetchBlogPosts({
        page,
        limit: 10,
        category: categoryFilter || undefined,
        search: searchTerm || undefined,
      });
      setPosts(result.posts);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(id);
      await deleteBlogPost(id);
      await loadPosts();
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete blog post. Please try again.');
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Blog Posts</h2>
          <p className="text-sm text-white/50 mt-1">Manage and generate blog content</p>
        </div>
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors"
        >
          <Plus size={16} />
          Generate New Post
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 bg-white/5 border border-white/10 hover:bg-white/7.5"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-teal-500/50"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/7.5 text-white transition-colors"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Posts table */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        {loading && posts.length === 0 ? (
          <div className="p-8 text-center text-white/50">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-white/50">
            <p>No blog posts found. Generate your first post to get started.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">Published</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{post.title}</p>
                      <p className="text-xs text-white/50 mt-1 truncate max-w-md">{post.excerpt}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-teal-600/20 text-teal-300">
                      {post.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/70">{formatDate(post.published_at)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(post)}
                        className="p-2 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors"
                        title="Edit post"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deleting === post.id}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-white/70 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete post"
                      >
                        <Trash2 size={16} className={deleting === post.id ? 'animate-pulse' : ''} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/50">
            Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} posts
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
