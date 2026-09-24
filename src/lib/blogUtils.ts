// Pure blog helpers with no runtime imports, shared by the browser code
// (through blog.ts) and the Vercel API routes (api/blog/*), which import this
// file directly with a .js specifier.

import type { BlogCategory } from '../../types/blog.js';

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
