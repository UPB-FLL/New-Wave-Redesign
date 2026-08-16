import { ArrowRight, CalendarDays, Cloud, Monitor, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SectionHeading } from '../components/brand/SectionHeading';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { usePageMeta } from '../lib/usePageMeta';
import { fetchBlogPosts } from '../lib/blog';
import type { BlogPost } from '../../types/blog';

const iconMap: Record<string, LucideIcon> = {
  'Managed IT Services': Monitor,
  'Cybersecurity': ShieldCheck,
  'Cloud Solutions': Cloud,
  'Network Infrastructure': Monitor,
  'Microsoft 365': Monitor,
  'IT Support': Monitor,
  'Backup & Disaster Recovery': ShieldCheck,
};

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
    title: 'IT Support Blog Fort Lauderdale - MSP Guides',
    description: 'New Wave IT blog with managed IT services, cybersecurity, cloud, Microsoft 365, network infrastructure, and IT support guidance for Fort Lauderdale businesses.',
    keywords: 'Fort Lauderdale MSP blog, IT support blog Fort Lauderdale, managed IT services guide, cybersecurity tips South Florida, Microsoft 365 support Fort Lauderdale, cloud backup planning',
    canonical: 'https://www.newwaveitfl.com/blog',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'New Wave IT Blog',
      url: 'https://www.newwaveitfl.com/blog',
      description: 'IT support and managed services guidance for Fort Lauderdale and South Florida businesses.',
      publisher: { '@id': 'https://www.newwaveitfl.com/#organization' },
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--nw-cloud-white)]">
        <Navbar />
        <main className="px-4 pb-20 pt-32 sm:px-6 lg:pt-40">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              as="h1"
              align="center"
              eyebrow="New Wave IT Blog"
              title={<>Recent <span className="text-[var(--nw-tide-blue)]">IT support guides.</span></>}
              description="Practical guidance for Fort Lauderdale organizations planning managed IT, cybersecurity, cloud, Microsoft 365, backup, and network infrastructure work."
            />
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="nw-surface overflow-hidden rounded-lg h-96 animate-pulse bg-gray-200" />
              ))}
            </div>
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
        <main className="px-4 pb-20 pt-32 sm:px-6 lg:pt-40">
          <div className="mx-auto max-w-7xl text-center">
            <SectionHeading
              as="h1"
              align="center"
              eyebrow="New Wave IT Blog"
              title={<>Recent <span className="text-[var(--nw-tide-blue)]">IT support guides.</span></>}
              description="Practical guidance for Fort Lauderdale organizations planning managed IT, cybersecurity, cloud, Microsoft 365, backup, and network infrastructure work."
            />
            <div className="mt-12 p-6 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <main className="px-4 pb-20 pt-32 sm:px-6 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            as="h1"
            align="center"
            eyebrow="New Wave IT Blog"
            title={<>Recent <span className="text-[var(--nw-tide-blue)]">IT support guides.</span></>}
            description="Practical guidance for Fort Lauderdale organizations planning managed IT, cybersecurity, cloud, Microsoft 365, backup, and network infrastructure work."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map(({ title, excerpt, slug, featured_image, category, tags, published_at }) => {
              const Icon = iconMap[category] || Monitor;
              const date = new Date(published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const primaryTag = tags?.[0] || category;

              return (
                <article key={slug} className="nw-surface overflow-hidden rounded-lg">
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
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--nw-signal-cyan)] px-2.5 py-1 text-xs font-semibold text-[var(--nw-deep-current)]">
                        <CalendarDays size={13} aria-hidden="true" />
                        {date}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--nw-cloud-white)] px-2.5 py-1 text-xs font-semibold text-[var(--nw-current-navy)]" style={{ border: '1px solid var(--nw-mist-gray)' }}>
                        <Icon size={13} className="text-[var(--nw-tide-blue)]" aria-hidden="true" />
                        {primaryTag}
                      </span>
                    </div>
                    <h2 className="mt-5 text-xl font-bold leading-snug text-[var(--nw-current-navy)]">
                      <Link to={`/blog/${slug}`} className="transition-colors hover:text-[var(--nw-tide-blue)]">
                        {title}
                      </Link>
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--nw-slate)]">{excerpt}</p>
                    <Link to={`/blog/${slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nw-tide-blue)] transition-colors hover:text-[var(--nw-current-navy)]">
                      Read guide
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
