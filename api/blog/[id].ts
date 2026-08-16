import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchBlogPostById, updateBlogPost, deleteBlogPost } from '../../src/lib/blog';

function requireAdminKey(req: NextApiRequest, res: NextApiResponse): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return true;
  const provided = req.headers['x-admin-key'];
  if (provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { method } = req;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (method === 'GET') {
    try {
      const post = await fetchBlogPostById(id);
      if (!post) {
        return res.status(404).json({ error: 'Blog post not found' });
      }
      return res.status(200).json(post);
    } catch (err: any) {
      console.error('blog/[id] GET error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to fetch blog post' });
    }
  }

  // Write operations require admin key
  if (!requireAdminKey(req, res)) return;

  if (method === 'PUT') {
    try {
      const updates = req.body;
      const updated = await updateBlogPost(id, updates);
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('blog/[id] PUT error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to update blog post' });
    }
  }

  if (method === 'DELETE') {
    try {
      await deleteBlogPost(id);
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('blog/[id] DELETE error:', err);
      return res.status(500).json({ error: err?.message || 'Failed to delete blog post' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
