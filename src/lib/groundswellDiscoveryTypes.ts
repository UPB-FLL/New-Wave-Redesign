/** Editable suggestions returned by the authenticated public-business lookup. */
export interface DiscoverySeed {
  website?: string;
  instagram?: string;
  facebook?: string;
  business_name?: string;
  city?: string;
}

export interface DiscoverySource {
  name: string;
  status: 'ok' | 'unavailable' | 'not_found';
  url?: string | null;
  detail?: string | null;
}

export interface DiscoveryResult {
  business: {
    business_name: string | null;
    city: string | null;
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    brand_logo_url: string | null;
    brand_color: string | null;
    brand_colors: string[];
    category: string | null;
  };
  competitors: {
    name: string;
    website: string | null;
    instagram: string | null;
    facebook?: string | null;
    source_url?: string | null;
    reason?: string | null;
  }[];
  sources: DiscoverySource[];
  warnings: string[];
  discovered_at: string;
}
