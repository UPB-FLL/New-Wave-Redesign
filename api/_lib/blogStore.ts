import type { BlogPost, BlogPostCreate, BlogPostUpdate } from '../../types/blog.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { getSupabasePublic } from './supabasePublic.js';

/**
 * Blog data access for the API routes. Reads use the anon client (blog_posts
 * is publicly readable); writes need the service role, because RLS only lets
 * authenticated users insert, update, or delete, and these routes have no
 * user session. The routes used to import src/lib/blog.ts, whose browser
 * client (import.meta.env) cannot load in a Vercel function.
 */

export const MAX_PAGE_SIZE = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPostId = (id: string) => UUID.test(id);

/** Fields a PUT may change; anything else in the body (id, timestamps) is dropped. */
const UPDATABLE_FIELDS = [
  'title',
  'slug',
  'excerpt',
  'content',
  'featured_image',
  'category',
  'tags',
  'meta_title',
  'meta_description',
] as const satisfies readonly (keyof BlogPostUpdate)[];

export function pickUpdatableFields(body: unknown): BlogPostUpdate {
  if (!body || typeof body !== 'object') return {};
  const source = body as Record<string, unknown>;
  return Object.fromEntries(UPDATABLE_FIELDS.filter((key) => key in source).map((key) => [key, source[key]])) as BlogPostUpdate;
}

/**
 * The search term as a plain substring. Commas, parentheses, and quotes
 * would otherwise add or change conditions in the PostgREST or() filter.
 */
export function sanitizeSearch(search: string | undefined): string | undefined {
  const cleaned = search?.replace(/[,()*%\\"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
  return cleaned || undefined;
}

export interface ListParams {
  page?: string;
  limit?: string;
  category?: string;
  search?: string;
}

export async function listPosts(params: ListParams) {
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(params.limit)) || 10));
  const from = (page - 1) * limit;

  let query = getSupabasePublic()
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(from, from + limit - 1);
  if (params.category) query = query.eq('category', params.category);
  const term = sanitizeSearch(params.search);
  if (term) query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { posts: (data ?? []) as BlogPost[], total: count ?? 0, page, limit };
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  if (!isPostId(id)) return null;
  const { data, error } = await getSupabasePublic().from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as BlogPost | null) ?? null;
}

export async function createPost(post: BlogPostCreate): Promise<BlogPost> {
  const { data, error } = await getSupabaseAdmin().from('blog_posts').insert(post).select().single();
  if (error) throw error;
  return data as BlogPost;
}

/** Returns null when no post has this id. */
export async function updatePost(id: string, updates: BlogPostUpdate): Promise<BlogPost | null> {
  if (!isPostId(id)) return null;
  const { data, error } = await getSupabaseAdmin().from('blog_posts').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return (data as BlogPost | null) ?? null;
}

/** Returns false when no post has this id. */
export async function deletePost(id: string): Promise<boolean> {
  if (!isPostId(id)) return false;
  const { data, error } = await getSupabaseAdmin().from('blog_posts').delete().eq('id', id).select('id');
  if (error) throw error;
  return (data ?? []).length > 0;
}
