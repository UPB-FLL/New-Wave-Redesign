import Navbar from '../components/Navbar';
import Services from '../components/Services';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

export default function ServicesPage() {
  usePageMeta({
    title: 'IT Services in Fort Lauderdale — Cybersecurity, Cloud & Support',
    description:
      'Cybersecurity, live 24/7 IT support, hardware repair, cloud migration, network infrastructure, and fully managed IT for South Florida businesses.',
  });
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="pt-20">
        <Services />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
