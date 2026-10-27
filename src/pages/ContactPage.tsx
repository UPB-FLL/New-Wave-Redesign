import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { PageHeader } from '../components/brand/PageHeader';
import { useContent } from '../lib/useContent';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function ContactPage() {
  usePageMeta({
    ...IT_PAGE_META['/contact'],
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Contact New Wave IT',
      'url': 'https://www.newwaveitfl.com/contact',
      'description': 'Contact page for New Wave IT — Fort Lauderdale managed IT services, cybersecurity, and cloud solutions.',
      'mainEntity': { '@id': 'https://www.newwaveitfl.com/#business' },
    },
  });
  const content = useContent('contact');
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/contact'].breadcrumbs}
        title={content.headline || 'Ready to get started?'}
        description={content.subheadline || 'Fill out the form and a technician will reach out within one business day. For urgent issues, call us now.'}
      />
      <main>
        <Contact showIntro={false} />
      </main>
      <Footer />
    </div>
  );
}
