import Navbar from '../components/Navbar';
import Services from '../components/Services';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

export default function ServicesPage() {
  usePageMeta({
    title: 'IT Services Fort Lauderdale — Cybersecurity, Cloud & Managed IT',
    description:
      'Full-service IT company in Fort Lauderdale: cybersecurity, 24/7 live support, cloud migration, network infrastructure, hardware repair, and fully managed IT for South Florida businesses.',
    keywords: 'IT services Fort Lauderdale, IT company South Florida, cybersecurity, cloud migration, managed IT, network infrastructure, IT support South Florida, technology services Fort Lauderdale',
    canonical: 'https://www.newwaveitfl.com/services',
  });
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="pt-20">
        <Services headlineAs="h1" />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
