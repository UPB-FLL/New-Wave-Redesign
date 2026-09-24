import { supabase } from './supabase';
import type { BlogPost, BlogPostCreate, BlogPostUpdate } from '../../types/blog';

export async function fetchBlogPosts(params: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}): Promise<{ posts: BlogPost[]; total: number }> {
  const { page = 1, limit = 10, category, search } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(from, to);

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return {
    posts: (data ?? []) as BlogPost[],
    total: count ?? 0,
  };
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data as BlogPost;
}

export async function fetchBlogPostById(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as BlogPost;
}

export async function createBlogPost(post: BlogPostCreate): Promise<BlogPost> {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function updateBlogPost(id: string, updates: BlogPostUpdate): Promise<BlogPost> {
  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as BlogPost;
}

export async function deleteBlogPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Pure helpers live in blogUtils.ts so the API routes can use them without
// loading the browser Supabase client above.
export { estimateReadTime, generateSlug, getCategoryForWeek, validateSlug } from './blogUtils';
