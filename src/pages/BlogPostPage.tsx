import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock, Share2, Tag } from 'lucide-react';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';
import { fetchBlogPostBySlug, fetchBlogPosts, estimateReadTime } from '../lib/blog';
import type { BlogPost } from '../../types/blog';
import ReactMarkdown from 'react-markdown';

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPost() {
      if (!slug) {
        setError('Blog post not found');
        setLoading(false);
        return;
      }

      try {
        const postData = await fetchBlogPostBySlug(slug);
        if (!postData) {
          setError('Blog post not found');
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
        <main className="px-4 pb-20 pt-32 sm:px-6 lg:pt-40">
          <div className="mx-auto max-w-4xl">
            <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
            <div className="mt-8 space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[var(--nw-cloud-white)]">
        <main className="px-4 pb-20 pt-32 sm:px-6 lg:pt-40">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-2xl font-bold text-[var(--nw-current-navy)]">Blog Post Not Found</h1>
            <Link to="/blog" className="mt-4 inline-flex items-center gap-2 text-[var(--nw-tide-blue)]">
              <ArrowLeft size={16} />
              Back to Blog
            </Link>
          </div>
        </main>
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

  // SEO metadata
  usePageMeta({
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    canonical: `https://www.newwaveitfl.com/blog/${post.slug}`,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt,
      images: post.featured_image ? [{ url: post.featured_image }] : undefined,
      type: 'article',
      publishedTime: post.published_at,
    },
  });

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <main className="px-4 pb-20 pt-32 sm:px-6 lg:pt-40">
        <div className="mx-auto max-w-4xl">
          {/* Back button */}
          <Link to="/blog" className="inline-flex items-center gap-2 text-[var(--nw-tide-blue)] hover:text-[var(--nw-current-navy)] transition-colors mb-8">
            <ArrowLeft size={16} />
            Back to Blog
          </Link>

          {/* Hero image */}
          {post.featured_image && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-auto"
                width={1200}
                height={630}
              />
            </div>
          )}

          {/* Category badge */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--nw-signal-cyan)] px-3 py-1.5 text-sm font-semibold text-[var(--nw-deep-current)]">
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-[var(--nw-current-navy)] leading-tight mb-4">
            {post.title}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--nw-slate)] mb-8">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={16} />
              <span>{publishedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={16} />
              <span>{readTime} min read</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>By {post.author}</span>
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <Tag size={16} className="text-[var(--nw-slate)]" />
              {post.tags.map((tag) => (
                <span key={tag} className="text-sm text-[var(--nw-slate)]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm text-[var(--nw-tide-blue)] hover:text-[var(--nw-current-navy)] transition-colors mb-8"
          >
            <Share2 size={16} />
            Share this post
          </button>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          {/* Related posts */}
          {related.length > 0 && (
            <div className="mt-16 pt-16 border-t border-[var(--nw-mist-gray)]">
              <h2 className="text-2xl font-bold text-[var(--nw-current-navy)] mb-6">Related Posts</h2>
              <div className="grid gap-6 md:grid-cols-3">
                {related.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    to={`/blog/${relatedPost.slug}`}
                    className="group"
                  >
                    {relatedPost.featured_image && (
                      <img
                        src={relatedPost.featured_image}
                        alt={relatedPost.title}
                        className="w-full aspect-[1.55] object-cover rounded-lg mb-3 transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    )}
                    <h3 className="font-semibold text-[var(--nw-current-navy)] group-hover:text-[var(--nw-tide-blue)] transition-colors">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-[var(--nw-slate)] mt-2 line-clamp-2">{relatedPost.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
