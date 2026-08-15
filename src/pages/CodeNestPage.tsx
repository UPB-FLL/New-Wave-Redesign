import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import CodeNestHero from '../components/codenest/CodeNestHero';
import { usePageMeta } from '../lib/usePageMeta';

export default function CodeNestPage() {
  usePageMeta({
    title: 'CodeNest - Launch Your Coding Career',
    description: 'CodeNest is a coding education program with project-based courses, real-world mentorship, and a career-ready curriculum taught by industry professionals.',
    includeSiteName: false,
    canonical: 'https://www.newwaveitfl.com/codenest',
  });

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <CodeNestHero />
      <Footer />
    </div>
  );
}
