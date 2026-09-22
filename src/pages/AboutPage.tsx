import Navbar from '../components/Navbar';
import About from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function AboutPage() {
  usePageMeta(IT_PAGE_META['/about']);
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <div className="pt-20">
        <About headlineAs="h1" />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
