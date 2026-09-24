// The admin "generate post" buttons. Generation runs on the server
// (api/blog/generate-post.ts), which holds the OpenAI and Pexels keys; this
// used to call OpenAI from the browser with VITE_OPENAI_API_KEY, which would
// have shipped the key to every visitor had it ever been set.

import { adminAuthHeaders } from './adminAuth';

interface GenerateOptions {
  category?: string;
}

export interface GeneratedBlogPost {
  id: string;
  title: string;
  slug: string;
}

export async function generateBlogPost(options: GenerateOptions = {}): Promise<GeneratedBlogPost> {
  const res = await fetch('/api/blog/generate-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await adminAuthHeaders()) },
    body: JSON.stringify(options),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<GeneratedBlogPost> & { error?: string };
  if (!res.ok) throw new Error(data.error || `Generation failed (${res.status}).`);
  return data as GeneratedBlogPost;
}
