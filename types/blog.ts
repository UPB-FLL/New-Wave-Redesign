// types/blog.ts

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category: string;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
  author: string;
}

export interface BlogPostCreate {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  category: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  author?: string;
}

export interface BlogPostUpdate {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  category?: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
}

export interface BlogListResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
}

export interface BlogGenerateRequest {
  category?: string;
  trendFocus?: number;
}

export interface BlogGenerateResponse {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
  published_at: string;
}

// Categories for rotation
export const BLOG_CATEGORIES = [
  'Managed IT Services',
  'Cybersecurity',
  'Cloud Solutions',
  'Network Infrastructure',
  'Microsoft 365',
  'IT Support',
  'Backup & Disaster Recovery',
] as const;

export type BlogCategory = typeof BLOG_CATEGORIES[number];
