import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchBlogPosts } from '../../src/lib/blog';

interface ListQuery {
  page?: string;
  limit?: string;
  category?: string;
  search?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page, limit, category, search } = req.query as ListQuery;

    const result = await fetchBlogPosts({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      category,
      search,
    });

    return res.status(200).json({
      posts: result.posts,
      total: result.total,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  } catch (err: any) {
    console.error('blog/list error:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to fetch blog posts',
      stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined,
    });
  }
}
