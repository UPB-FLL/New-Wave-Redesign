import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

export default function ContactPage() {
  usePageMeta({
    title: 'Contact New Wave IT — Free IT Assessment Fort Lauderdale',
    description:
      'Get a free IT assessment from New Wave IT in Fort Lauderdale. Contact us for managed IT, cybersecurity, cloud, and support. Response within one business day — or call us 24/7.',
    keywords: 'contact IT company Fort Lauderdale, free IT assessment South Florida, IT consultation Fort Lauderdale, managed IT services quote, New Wave IT contact',
    canonical: 'https://www.newwaveitfl.com/contact',
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
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20">
        <Contact headlineAs="h1" />
      </div>
      <Footer />
    </div>
  );
}
