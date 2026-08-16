import { supabase } from './supabase';
import type { BlogPost, BlogPostCreate, BlogPostUpdate, BlogCategory } from '../../types/blog';

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

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .trim();
}

export function getCategoryForWeek(): BlogCategory {
  const categories = ['Managed IT Services', 'Cybersecurity', 'Cloud Solutions', 'Network Infrastructure', 'Microsoft 365', 'IT Support', 'Backup & Disaster Recovery'] as const;
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return categories[weekNumber % categories.length];
}

export function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 && slug.length <= 100;
}

export function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}
