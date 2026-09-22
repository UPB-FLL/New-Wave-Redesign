import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
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
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <div className="pt-20">
        <Contact headlineAs="h1" />
      </div>
      <Footer />
    </div>
  );
}
