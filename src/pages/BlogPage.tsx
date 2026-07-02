import { ArrowRight, CalendarDays, Cloud, Monitor, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { usePageMeta } from '../lib/usePageMeta';

const posts = [
  {
    title: 'Managed IT Services for Fort Lauderdale Businesses',
    date: 'Jun 29, 2026',
    excerpt:
      'How proactive monitoring, patching, backup testing, and quarterly planning keep South Florida teams productive without surprise IT costs.',
    href: '/l/managed-it-guide',
    image: '/blog-managed-it.svg',
    icon: Monitor,
    tag: 'Managed IT',
  },
  {
    title: 'Cybersecurity Basics Every MSP Client Should Expect',
    date: 'Jun 29, 2026',
    excerpt:
      'A practical look at endpoint protection, zero-trust access, security awareness, vulnerability management, and incident response readiness.',
    href: '/l/cybersecurity-guide',
    image: '/blog-cybersecurity.svg',
    icon: ShieldCheck,
    tag: 'Cybersecurity',
  },
  {
    title: 'Cloud, Microsoft 365, and Backup Planning for Growth',
    date: 'Jun 29, 2026',
    excerpt:
      'What to review before moving workloads, modernizing Microsoft 365, or improving backup and disaster recovery across hybrid environments.',
    href: '/l/cloud-solutions-guide',
    image: '/blog-cloud.svg',
    icon: Cloud,
    tag: 'Cloud',
  },
];

export default function BlogPage() {
  usePageMeta({
    title: 'IT Support Blog Fort Lauderdale - MSP Guides',
    description:
      'New Wave IT blog with managed IT services, cybersecurity, cloud, Microsoft 365, network infrastructure, and IT support guidance for Fort Lauderdale businesses.',
    keywords:
      'Fort Lauderdale MSP blog, IT support blog Fort Lauderdale, managed IT services guide, cybersecurity tips South Florida, Microsoft 365 support Fort Lauderdale, cloud backup planning',
    canonical: 'https://www.newwaveitfl.com/blog',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      'name': 'New Wave IT Blog',
      'url': 'https://www.newwaveitfl.com/blog',
      'description': 'IT support and managed services guidance for Fort Lauderdale and South Florida businesses.',
      'publisher': { '@id': 'https://www.newwaveitfl.com/#organization' },
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="pt-32 lg:pt-40 pb-10 lg:pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center -mx-4">
            <div className="w-full px-4">
              <div className="text-center mx-auto mb-[60px] lg:mb-20 max-w-[640px]">
                <span className="font-semibold text-lg text-brand-cyan mb-2 block">
                  New Wave IT Blog
                </span>
                <h1 className="font-bold text-3xl sm:text-4xl md:text-[40px] text-brand-navy mb-4 leading-tight">
                  Recent IT Support Guides
                </h1>
                <p className="text-base text-slate-600 leading-relaxed">
                  Practical guidance for Fort Lauderdale businesses that need managed IT, cybersecurity, cloud, Microsoft 365, backup, and network infrastructure support.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap -mx-4">
            {posts.map(({ title, date, excerpt, href, image, icon: Icon, tag }) => (
              <div key={title} className="w-full md:w-1/2 lg:w-1/3 px-4">
                <article className="max-w-[370px] mx-auto mb-10">
                  <Link to={href} className="block rounded-lg overflow-hidden mb-8 group" aria-label={title}>
                    <img
                      src={image}
                      alt={title}
                      width={370}
                      height={239}
                      loading="lazy"
                      decoding="async"
                      className="w-full aspect-[1.55] object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </Link>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      <span className="bg-brand-cyan rounded inline-flex items-center gap-1.5 text-center py-1 px-4 text-xs leading-loose font-semibold text-white">
                        <CalendarDays size={13} />
                        {date}
                      </span>
                      <span className="rounded inline-flex items-center gap-1.5 py-1 px-3 text-xs leading-loose font-semibold text-brand-navy bg-brand-muted">
                        <Icon size={13} style={{ color: '#5EBC67' }} />
                        {tag}
                      </span>
                    </div>
                    <h2>
                      <Link
                        to={href}
                        className="font-semibold text-xl sm:text-2xl lg:text-xl xl:text-2xl mb-4 inline-block text-brand-navy hover:text-brand-cyan transition-colors leading-snug"
                      >
                        {title}
                      </Link>
                    </h2>
                    <p className="text-base text-slate-600 leading-relaxed mb-5">
                      {excerpt}
                    </p>
                    <Link
                      to={href}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan hover:text-brand-cyan-dark transition-colors"
                    >
                      Read guide
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
