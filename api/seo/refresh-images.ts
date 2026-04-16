interface SectionIn {
  heading?: string;
  body?: string;
  image?: string;
}

interface ImageIn {
  url?: string;
  alt?: string;
  caption?: string;
}

interface RequestBody {
  keyword?: string;
  location?: string;
  sections?: SectionIn[];
  images?: ImageIn[];
  hero_image?: string;
  og_image?: string;
  /** If true, replace every image even if it already has an http URL. */
  force?: boolean;
}

function picsumFallback(query: string, width: number, height: number): string {
  const seed = encodeURIComponent(
    (query || 'new wave it')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'nw',
  );
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function searchImage(query: string, width: number, height: number): Promise<string> {
  const apiKey = process.env.PEXELS_API_KEY;
  const cleaned = (query || '').trim();
  if (!apiKey || !cleaned) return picsumFallback(cleaned, width, height);
  try {
    const orientation = height >= width ? 'portrait' : width > height * 1.2 ? 'landscape' : 'square';
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleaned)}&per_page=3&orientation=${orientation}`;
    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) return picsumFallback(cleaned, width, height);
    const data = (await res.json()) as {
      photos?: Array<{
        src?: { original?: string; large2x?: string; large?: string; landscape?: string; medium?: string };
      }>;
    };
    const src = data.photos?.[0]?.src;
    return src?.large2x || src?.landscape || src?.large || src?.original || src?.medium || picsumFallback(cleaned, width, height);
  } catch {
    return picsumFallback(cleaned, width, height);
  }
}

function enrichQuery(query: string, keyword: string): string {
  const q = (query || '').toLowerCase();
  const kw = (keyword || '').toLowerCase();
  const generic = ['office', 'team', 'people', 'meeting', 'laptop', 'computer', 'desk', 'building'];
  const isGeneric = generic.some((t) => q === t || q.startsWith(t + ' ') || q.endsWith(' ' + t));
  if (isGeneric && kw) return `${query} ${keyword} technology`.trim();
  return query;
}

function parseBody(body: any): RequestBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as RequestBody;
    } catch {
      return {};
    }
  }
  return body as RequestBody;
}

/** Detect Picsum + deprecated Unsplash Source URLs as "bad". */
function isBadUrl(url?: string): boolean {
  if (!url) return true;
  return /picsum\.photos|source\.unsplash\.com/i.test(url);
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      hasPexels: Boolean(process.env.PEXELS_API_KEY),
      name: 'refresh-images',
    });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseBody(req.body);
    const keyword = (body.keyword || '').trim();
    const location = (body.location || '').trim();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    const images = Array.isArray(body.images) ? body.images : [];
    const force = Boolean(body.force);

    if (!keyword) {
      return res.status(400).json({ error: 'keyword is required.' });
    }

    const shouldReplace = (url?: string) => force || isBadUrl(url);

    const sectionPromises = sections.map((s) => {
      if (!shouldReplace(s.image)) return Promise.resolve(s.image || '');
      const q = enrichQuery(s.heading || s.image || `${keyword} ${location}`, keyword);
      return searchImage(q, 1200, 800);
    });

    const imagePromises = images.map((img, i) => {
      if (!shouldReplace(img.url)) return Promise.resolve(img.url || '');
      const q = enrichQuery(img.alt || img.url || `${keyword} ${location} ${i + 1}`, keyword);
      return searchImage(q, 1200, 800);
    });

    const heroPromise = shouldReplace(body.hero_image)
      ? searchImage(`${keyword} ${location} office technology`, 1600, 900)
      : Promise.resolve(body.hero_image || '');
    const ogPromise = shouldReplace(body.og_image)
      ? searchImage(`${keyword} ${location}`, 1200, 630)
      : Promise.resolve(body.og_image || '');

    const [resolvedSections, resolvedImages, heroImage, ogImage] = await Promise.all([
      Promise.all(sectionPromises),
      Promise.all(imagePromises),
      heroPromise,
      ogPromise,
    ]);

    return res.status(200).json({
      hero_image: heroImage,
      og_image: ogImage,
      sections: sections.map((s, i) => ({ ...s, image: resolvedSections[i] })),
      images: images.map((img, i) => ({
        url: resolvedImages[i] || img.url || '',
        alt: img.alt || `${keyword} ${location} ${i + 1}`,
        caption: img.caption || '',
      })),
    });
  } catch (err: any) {
    console.error('refresh-images error:', err);
    return res.status(500).json({ error: err?.message || 'Refresh failed.' });
  }
}
