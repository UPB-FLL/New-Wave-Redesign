import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import About, { ABOUT_DEFAULT_INTRO, ABOUT_DEFAULT_TITLE } from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { cmsHeadline } from '../components/brand/cmsHeadline';
import { PageHeader } from '../components/brand/PageHeader';
import { useContent } from '../lib/useContent';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function AboutPage() {
  usePageMeta(IT_PAGE_META['/about']);
  const content = useContent('about');
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/about'].breadcrumbs}
        title={cmsHeadline(content, ABOUT_DEFAULT_TITLE)}
        description={content.paragraph1 || ABOUT_DEFAULT_INTRO}
        actions={
          <Link to="/contact" className="btn-primary">
            Request an assessment
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        }
      />
      <main>
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
