import { useState } from 'react';
import BlogPostManager from './BlogPostManager';
import BlogEditor from './BlogEditor';
import { generateBlogPost } from '../../lib/blogGeneration';
import type { BlogPost } from '../../../types/blog';

/**
 * `/admin/blog`: the post list, with a post's editor opening in place.
 * This used to live inside the old single-page dashboard, three clicks from the
 * sidebar; now it is the Blog group's first entry.
 */
export default function BlogPage() {
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  if (editingPost) {
    return (
      <BlogEditor
        post={editingPost}
        onCancel={() => setEditingPost(null)}
        onSave={() => {
          setEditingPost(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p role="status" className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(57,204,204,0.1)', border: '1px solid rgba(57,204,204,0.2)', color: '#9be3e3' }}>
          {notice}
        </p>
      )}
      <BlogPostManager
        key={reloadKey}
        onEdit={setEditingPost}
        onGenerate={async () => {
          setNotice('Generating a post… this takes a minute or two.');
          try {
            const data = await generateBlogPost({});
            setNotice(`Blog post generated: "${data.title}"`);
            setReloadKey((k) => k + 1);
          } catch (err) {
            setNotice(`Blog generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Check that OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.`);
          }
        }}
        onRefresh={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
