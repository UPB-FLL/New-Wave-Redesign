import Navbar from '../components/Navbar';
import Services from '../components/Services';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function ServicesPage() {
  usePageMeta(IT_PAGE_META['/services']);
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <div className="pt-20">
        <Services headlineAs="h1" />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
