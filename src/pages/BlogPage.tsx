import { ArrowRight, CalendarDays, Cloud, Monitor, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeading } from '../components/brand/SectionHeading';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { usePageMeta } from '../lib/usePageMeta';

const posts: { title: string; date: string; excerpt: string; href: string; image: string; icon: LucideIcon; tag: string }[] = [
  { title: 'Managed IT Services for Fort Lauderdale Businesses', date: 'Jun 29, 2026', excerpt: 'How proactive monitoring, patching, backup testing, and quarterly planning keep South Florida teams productive without surprise IT costs.', href: '/l/managed-it-guide', image: '/blog-managed-it.svg', icon: Monitor, tag: 'Managed IT' },
  { title: 'Cybersecurity Basics Every MSP Client Should Expect', date: 'Jun 29, 2026', excerpt: 'A practical look at endpoint protection, zero-trust access, security awareness, vulnerability management, and incident response readiness.', href: '/l/cybersecurity-guide', image: '/blog-cybersecurity.svg', icon: ShieldCheck, tag: 'Cybersecurity' },
  { title: 'Cloud, Microsoft 365, and Backup Planning for Growth', date: 'Jun 29, 2026', excerpt: 'What to review before moving workloads, modernizing Microsoft 365, or improving backup and disaster recovery across hybrid environments.', href: '/l/cloud-solutions-guide', image: '/blog-cloud.svg', icon: Cloud, tag: 'Cloud' },
];

export default function BlogPage() {
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
            {posts.map(({ title, date, excerpt, href, image, icon: Icon, tag }) => (
              <article key={title} className="nw-surface overflow-hidden rounded-lg">
                <Link to={href} className="group block" aria-label={title}>
                  <img src={image} alt="" width={370} height={239} loading="lazy" decoding="async" className="aspect-[1.55] w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
                </Link>
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--nw-signal-cyan)] px-2.5 py-1 text-xs font-semibold text-[var(--nw-deep-current)]"><CalendarDays size={13} aria-hidden="true" />{date}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--nw-cloud-white)] px-2.5 py-1 text-xs font-semibold text-[var(--nw-current-navy)]" style={{ border: '1px solid var(--nw-mist-gray)' }}><Icon size={13} className="text-[var(--nw-tide-blue)]" aria-hidden="true" />{tag}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-bold leading-snug text-[var(--nw-current-navy)]"><Link to={href} className="transition-colors hover:text-[var(--nw-tide-blue)]">{title}</Link></h2>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--nw-slate)]">{excerpt}</p>
                  <Link to={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nw-tide-blue)] transition-colors hover:text-[var(--nw-current-navy)]">Read guide<ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
