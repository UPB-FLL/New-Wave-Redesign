import { supabase } from './supabase';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SeoImage {
  url: string;
  alt: string;
  caption?: string;
}

export interface SeoSection {
  heading: string;
  body: string;
  image?: string;
}

export interface Competitor {
  name: string;
  website?: string;
  location?: string;
  strengths?: string;
  notes?: string;
}

export interface Backlink {
  url: string;
  anchor: string;
  note?: string;
}

export interface SeoPage {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  meta_keywords: string;
  canonical_url: string;
  og_image: string;
  hero_image: string;
  h1: string;
  intro: string;
  content: string;
  sections: SeoSection[];
  faq: FaqItem[];
  images: SeoImage[];
  competitors: Competitor[];
  backlinks: Backlink[];
  target_location: string;
  target_keyword: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type SeoPageInput = Omit<SeoPage, 'id' | 'created_at' | 'updated_at'>;

export function emptySeoPage(): SeoPageInput {
  return {
    slug: '',
    title: '',
    meta_description: '',
    meta_keywords: '',
    canonical_url: '',
    og_image: '',
    hero_image: '',
    h1: '',
    intro: '',
    content: '',
    sections: [],
    faq: [],
    images: [],
    competitors: [],
    backlinks: [],
    target_location: '',
    target_keyword: '',
    published: false,
  };
}

export async function listSeoPages(): Promise<SeoPage[]> {
  const { data, error } = await supabase
    .from('seo_pages')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data as SeoPage[];
}

export async function getSeoPage(id: string): Promise<SeoPage | null> {
  const { data, error } = await supabase
    .from('seo_pages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as SeoPage;
}

export async function getSeoPageBySlug(slug: string): Promise<SeoPage | null> {
  const { data, error } = await supabase
    .from('seo_pages')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as SeoPage;
}

export async function createSeoPage(input: SeoPageInput): Promise<SeoPage | null> {
  const { data, error } = await supabase
    .from('seo_pages')
    .insert({ ...input, updated_at: new Date().toISOString() })
    .select('*')
    .single();
  if (error || !data) return null;
  return data as SeoPage;
}

export async function updateSeoPage(id: string, input: Partial<SeoPageInput>): Promise<SeoPage | null> {
  const { data, error } = await supabase
    .from('seo_pages')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error || !data) return null;
  return data as SeoPage;
}

export async function deleteSeoPage(id: string): Promise<boolean> {
  const { error } = await supabase.from('seo_pages').delete().eq('id', id);
  return !error;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
