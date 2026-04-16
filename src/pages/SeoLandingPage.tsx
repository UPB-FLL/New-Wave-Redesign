import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ExternalLink, HelpCircle, MapPin, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getSeoPageBySlug, type SeoPage } from '../lib/seoPages';

function setOrUpdateMeta(attr: 'name' | 'property', key: string, value: string) {
  if (!value) return;
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function setCanonical(href: string) {
  if (!href) return;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

function setJsonLd(id: string, data: unknown) {
  let tag = document.getElementById(id) as HTMLScriptElement | null;
  if (!tag) {
    tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.id = id;
    document.head.appendChild(tag);
  }
  tag.text = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

function applySeoTags(page: SeoPage) {
  const prevTitle = document.title;
  if (page.title) document.title = page.title;
  setOrUpdateMeta('name', 'description', page.meta_description);
  setOrUpdateMeta('name', 'keywords', page.meta_keywords);
  setOrUpdateMeta('property', 'og:title', page.title);
  setOrUpdateMeta('property', 'og:description', page.meta_description);
  setOrUpdateMeta('property', 'og:type', 'article');
  setOrUpdateMeta('property', 'og:image', page.og_image);
  setOrUpdateMeta('name', 'twitter:card', 'summary_large_image');
  setOrUpdateMeta('name', 'twitter:title', page.title);
  setOrUpdateMeta('name', 'twitter:description', page.meta_description);
  setOrUpdateMeta('name', 'twitter:image', page.og_image);
  if (page.canonical_url) setCanonical(page.canonical_url);

  if (page.faq.length > 0) {
    setJsonLd('seo-faq-ld', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  } else {
    removeJsonLd('seo-faq-ld');
  }

  setJsonLd('seo-article-ld', {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.h1 || page.title,
    description: page.meta_description,
    image: page.og_image || page.hero_image,
    datePublished: page.created_at,
    dateModified: page.updated_at,
    author: { '@type': 'Organization', name: 'New Wave IT' },
    publisher: { '@type': 'Organization', name: 'New Wave IT' },
    ...(page.target_location
      ? {
          contentLocation: { '@type': 'Place', name: page.target_location },
        }
      : {}),
  });

  return () => {
    document.title = prevTitle;
    removeJsonLd('seo-faq-ld');
    removeJsonLd('seo-article-ld');
  };
}

function fallbackImage(seed: string, width = 1200, height = 630): string {
  const s = encodeURIComponent(
    (seed || 'new-wave-it')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'nw',
  );
  return `https://picsum.photos/seed/${s}/${width}/${height}`;
}

function handleImgError(seed: string, width = 1200, height = 630) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const fallback = fallbackImage(seed, width, height);
    if (img.src !== fallback) img.src = fallback;
  };
}

export default function SeoLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SeoPage | null>(null);
  const [status, setStatus] = useState<'loading' | 'found' | 'missing'>('loading');

  useEffect(() => {
    if (!slug) return;
    setStatus('loading');
    void (async () => {
      const p = await getSeoPageBySlug(slug);
      if (!p) {
        setStatus('missing');
        return;
      }
      setPage(p);
      setStatus('found');
    })();
  }, [slug]);

  useEffect(() => {
    if (!page) return;
    return applySeoTags(page);
  }, [page]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'white' }}>
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#39CCCC', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (status === 'missing' || !page) {
    return (
      <div className="min-h-screen" style={{ background: 'white' }}>
        <Navbar />
        <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Page not found</h1>
          <p className="text-slate-600 mb-6">This landing page is not available or has been unpublished.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Back to home <ArrowRight size={14} />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      <header
        className="relative pt-32 pb-16 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}
      >
        {page.hero_image && (
          <>
            <img
              src={page.hero_image}
              alt=""
              aria-hidden="true"
              onError={handleImgError(`${page.target_keyword || 'it'} ${page.target_location || 'office'}`, 1600, 900)}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(rgba(15,25,35,0.72), rgba(15,25,35,0.82))' }}
            />
          </>
        )}
        <div className="relative max-w-5xl mx-auto text-white">
          <div className="flex items-center gap-3 flex-wrap mb-4 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {page.target_location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {page.target_location}
              </span>
            )}
            {page.target_keyword && (
              <span className="flex items-center gap-1">
                <Tag size={12} /> {page.target_keyword}
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">{page.h1 || page.title}</h1>
          {page.intro && (
            <p className="text-lg md:text-xl max-w-3xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {page.intro}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/#contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#39CCCC' }}
            >
              Get a free assessment <ArrowRight size={14} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              See pricing
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {page.content && (
          <section>
            {page.content.split(/\n\n+/).map((para, i) => (
              <p key={i} className="text-slate-700 leading-relaxed mb-4">
                {para}
              </p>
            ))}
          </section>
        )}

        {page.sections.length > 0 && (
          <section className="space-y-12">
            {page.sections.map((s, i) => (
              <article key={i} className="grid md:grid-cols-5 gap-8 items-start">
                <div className={s.image ? 'md:col-span-3' : 'md:col-span-5'}>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">{s.heading}</h2>
                  {s.body.split(/\n\n+/).map((para, j) => (
                    <p key={j} className="text-slate-700 leading-relaxed mb-3">
                      {para}
                    </p>
                  ))}
                </div>
                {s.image && (
                  <div className="md:col-span-2">
                    <img
                      src={s.image}
                      alt={s.heading}
                      loading="lazy"
                      onError={handleImgError(s.heading || 'section', 800, 600)}
                      className="w-full rounded-2xl shadow-md"
                      style={{ border: '1px solid rgba(0,0,0,0.05)' }}
                    />
                  </div>
                )}
              </article>
            ))}
          </section>
        )}

        {page.images.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Gallery</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {page.images.map((img, i) => (
                <figure key={i} className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    onError={handleImgError(img.alt || `gallery-${i}`, 800, 600)}
                    className="w-full h-56 object-cover"
                  />
                  {img.caption && (
                    <figcaption className="p-3 text-xs text-slate-600 bg-slate-50">{img.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {page.competitors.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Local alternatives we compare against</h2>
            <p className="text-slate-600 mb-6 text-sm">
              Transparent look at other providers in {page.target_location || 'the area'}.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {page.competitors.map((c, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl"
                  style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#f8fafb' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      {c.location && <div className="text-xs text-slate-500 mt-0.5">{c.location}</div>}
                    </div>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs flex items-center gap-1"
                        style={{ color: '#39CCCC' }}
                      >
                        Visit <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  {c.strengths && <p className="text-sm text-slate-700 mt-3">{c.strengths}</p>}
                  {c.notes && <p className="text-xs text-slate-600 mt-2">{c.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {page.faq.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle size={20} style={{ color: '#39CCCC' }} />
              <h2 className="text-2xl font-bold text-slate-900">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {page.faq.map((f, i) => (
                <details
                  key={i}
                  className="rounded-2xl p-5 group"
                  style={{ border: '1px solid rgba(0,0,0,0.06)', background: '#f8fafb' }}
                >
                  <summary className="cursor-pointer font-semibold text-slate-900 list-none flex items-start justify-between gap-4">
                    <span>{f.question}</span>
                    <span className="text-slate-400 text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-slate-700 mt-3 text-sm leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {page.backlinks.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Additional local resources</h2>
            <ul className="space-y-2">
              {page.backlinks.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={14} style={{ color: '#5EBC67' }} className="mt-1 flex-shrink-0" />
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener"
                    className="underline"
                    style={{ color: '#0f766e' }}
                  >
                    {b.anchor || b.url}
                  </a>
                  {b.note && <span className="text-slate-500">— {b.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          className="p-8 rounded-3xl text-center text-white"
          style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to upgrade your {page.target_keyword || 'IT'} in {page.target_location || 'your area'}?
          </h2>
          <p className="max-w-2xl mx-auto mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Talk to a certified engineer about a free, no-obligation assessment.
          </p>
          <Link
            to="/#contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Get a free assessment <ArrowRight size={14} />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
