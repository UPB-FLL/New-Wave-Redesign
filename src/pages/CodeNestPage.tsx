import CodeNestHero from '../components/codenest/CodeNestHero';
import { usePageMeta } from '../lib/usePageMeta';

export default function CodeNestPage() {
  usePageMeta({
    title: 'CodeNest — Launch Your Coding Career',
    description:
      'CodeNest is a coding education platform with project-based courses, real-world mentorship, and a career-ready curriculum taught by industry professionals.',
    includeSiteName: false,
    canonical: 'https://www.newwaveitfl.com/codenest',
  });

  return (
    <main className="font-inter" style={{ background: '#070b0a' }}>
      <CodeNestHero />
    </main>
  );
}
