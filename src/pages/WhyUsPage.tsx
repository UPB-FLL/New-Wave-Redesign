import Navbar from '../components/Navbar';
import WhyUs from '../components/WhyUs';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function WhyUsPage() {
  usePageMeta(IT_PAGE_META['/why-us']);
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <div className="pt-20">
        <WhyUs headlineAs="h1" />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
