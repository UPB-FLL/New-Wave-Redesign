import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, Share2, Tag } from 'lucide-react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { PageHeader } from '../components/brand/PageHeader';
import { usePageMeta } from '../lib/usePageMeta';
import { fetchBlogPostBySlug, fetchBlogPosts, estimateReadTime } from '../lib/blog';
import { blogPostPageMeta } from '../lib/blogSeo';
import type { BlogPost } from '../../types/blog';
import ReactMarkdown from 'react-markdown';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // True only when the database has no post for this slug (not on a network error).
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    async function loadPost() {
      if (!slug) {
        setError('Blog post not found');
        setMissing(true);
        setLoading(false);
        return;
      }

      try {
        const postData = await fetchBlogPostBySlug(slug);
        if (!postData) {
          setError('Blog post not found');
          setMissing(true);
          setLoading(false);
          return;
        }

        setPost(postData);

        // Load related posts from same category
        const relatedData = await fetchBlogPosts({
          category: postData.category,
          limit: 4,
        });
        setRelated(relatedData.posts.filter(p => p.id !== postData.id).slice(0, 3));
      } catch (err) {
        console.error('Failed to load blog post:', err);
        setError('Failed to load blog post. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [slug]);

  // Every render path calls usePageMeta exactly once, before any early return
  // (calling it only after the post loaded crashed the page with a hook-order error).
  const meta = useMemo(
    () => blogPostPageMeta(slug ?? '', post ? { status: 'ready', post } : missing ? { status: 'missing' } : { status: 'loading' }),
    [slug, post, missing],
  );
  usePageMeta(meta);

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.meta_title || post.title,
          text: post.excerpt || post.meta_description || '',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--nw-cloud-white)]">
        <Navbar />
        <div className="pb-14 pt-28 sm:pb-16 sm:pt-32" style={{ background: 'var(--nw-deep-current)' }} aria-busy="true">
          <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
            <div className="h-4 w-48 animate-pulse rounded" style={{ background: 'var(--nw-current-navy)' }} />
            <div className="h-10 max-w-2xl animate-pulse rounded" style={{ background: 'var(--nw-current-navy)' }} />
            <div className="h-4 w-72 animate-pulse rounded" style={{ background: 'var(--nw-current-navy)' }} />
          </div>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-3xl space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded" style={{ background: 'var(--nw-mist-gray)' }} />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[var(--nw-cloud-white)]">
        <Navbar />
        <PageHeader
          title="Blog Post Not Found"
          description="This article is not available. It may have moved, or the link may be wrong."
          actions={
            <Link to="/blog" className="btn-primary">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to the blog
            </Link>
          }
        />
        <Footer />
      </div>
    );
  }

  const readTime = estimateReadTime(post.content);
  const publishedDate = new Date(post.published_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader breadcrumbs={[{ name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }]} title={post.title}>
        <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--nw-mist-gray)]">
          {post.category ? <li className="font-semibold text-[var(--nw-cloud-white)]">{post.category}</li> : null}
          <li className="flex items-center gap-1.5">
            <CalendarDays size={15} aria-hidden="true" />
            <time dateTime={post.published_at}>{publishedDate}</time>
          </li>
          <li className="flex items-center gap-1.5">
            <Clock size={15} aria-hidden="true" />
            {readTime} min read
          </li>
          <li>By {post.author}</li>
        </ul>
      </PageHeader>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* The article column starts where the page header's text does. */}
        <article className="max-w-3xl">
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.title}
              className="mb-10 h-auto w-full rounded-lg"
              width={1200}
              height={630}
            />
          )}

          <div className="nw-prose">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            {post.tags && post.tags.length > 0 ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--nw-slate)]">
                <Tag size={16} aria-hidden="true" />
                {post.tags.join(', ')}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 text-sm font-semibold text-[var(--nw-tide-blue)] transition-colors hover:text-[var(--nw-current-navy)]"
            >
              <Share2 size={16} aria-hidden="true" />
              Share this post
            </button>
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-16 max-w-5xl border-t pt-12" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <h2 className="nw-display text-2xl text-[var(--nw-current-navy)]">Related posts</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((relatedPost) => (
                <Link key={relatedPost.id} to={`/blog/${relatedPost.slug}`} className="group">
                  {relatedPost.featured_image && (
                    <img
                      src={relatedPost.featured_image}
                      alt={relatedPost.title}
                      className="mb-3 aspect-[1.55] w-full rounded-lg object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  )}
                  <h3 className="font-semibold text-[var(--nw-current-navy)] transition-colors group-hover:text-[var(--nw-tide-blue)]">
                    {relatedPost.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--nw-slate)]">{relatedPost.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
