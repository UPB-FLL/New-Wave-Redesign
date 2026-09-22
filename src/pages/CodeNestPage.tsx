import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import CodeNestHero from '../components/codenest/CodeNestHero';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function CodeNestPage() {
  usePageMeta(IT_PAGE_META['/codenest']);

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <CodeNestHero />
      <Footer />
    </div>
  );
}
