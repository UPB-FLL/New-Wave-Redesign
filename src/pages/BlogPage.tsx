import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/brand/PageHeader';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';
import { fetchBlogPosts } from '../lib/blog';
import type { BlogPost } from '../../types/blog';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        const result = await fetchBlogPosts({ limit: 12 });
        setPosts(result.posts);
        setError(null);
      } catch (err) {
        console.error('Failed to load blog posts:', err);
        setError('Failed to load blog posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, []);

  usePageMeta({
    ...IT_PAGE_META['/blog'],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'New Wave IT Blog',
      url: 'https://www.newwaveitfl.com/blog',
      description: 'IT support and managed services guidance for Fort Lauderdale and South Florida businesses.',
      publisher: { '@id': 'https://www.newwaveitfl.com/#organization' },
    },
  });

  const header = (
    <PageHeader
      breadcrumbs={IT_PAGE_META['/blog'].breadcrumbs}
      title="Recent IT support guides"
      description="Practical guidance for Fort Lauderdale organizations planning managed IT, cybersecurity, cloud, Microsoft 365, backup, and network infrastructure work."
    />
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--nw-cloud-white)]">
        <Navbar />
        {header}
        <main className="py-12 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8" aria-busy="true">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="nw-surface h-96 animate-pulse overflow-hidden rounded-lg" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--nw-cloud-white)]">
        <Navbar />
        {header}
        <main className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="nw-surface rounded-lg p-6 text-[var(--nw-current-navy)]" role="alert">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      {header}
      <main className="py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {posts.map(({ title, excerpt, slug, featured_image, category, published_at }) => {
            const date = new Date(published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <article key={slug} className="nw-surface flex flex-col overflow-hidden rounded-lg">
                <Link to={`/blog/${slug}`} className="group block" aria-label={title}>
                  {featured_image ? (
                    <img
                      src={featured_image}
                      alt=""
                      width={370}
                      height={239}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[1.55] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="aspect-[1.55] w-full bg-gradient-to-br from-[var(--nw-deep-current)] to-[var(--nw-tide-blue)]" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-6">
                  <p className="nw-meta text-xs text-[var(--nw-slate)]">
                    <time dateTime={published_at}>{date}</time>
                    {category ? <> · {category}</> : null}
                  </p>
                  <h2 className="mt-3 text-xl font-bold leading-snug text-[var(--nw-current-navy)]">
                    <Link to={`/blog/${slug}`} className="transition-colors hover:text-[var(--nw-tide-blue)]">
                      {title}
                    </Link>
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--nw-slate)]">{excerpt}</p>
                  <Link to={`/blog/${slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nw-tide-blue)] transition-colors hover:text-[var(--nw-current-navy)]">
                    Read guide
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
