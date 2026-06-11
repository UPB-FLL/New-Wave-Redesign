import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

export default function ContactPage() {
  usePageMeta({
    title: 'Contact New Wave IT — Get in Touch',
    description:
      'Contact New Wave IT for managed IT services, cybersecurity, and support in Fort Lauderdale and South Florida. Call us or fill out the form for a free assessment.',
  });
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20">
        <Contact />
      </div>
      <Footer />
    </div>
  );
}
