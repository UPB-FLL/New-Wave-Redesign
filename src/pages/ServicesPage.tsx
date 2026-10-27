import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Services, { SERVICES_DEFAULT_DESCRIPTION, SERVICES_DEFAULT_TITLE } from '../components/Services';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { cmsHeadline } from '../components/brand/cmsHeadline';
import { PageHeader } from '../components/brand/PageHeader';
import { useContent } from '../lib/useContent';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function ServicesPage() {
  usePageMeta(IT_PAGE_META['/services']);
  const content = useContent('services');
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/services'].breadcrumbs}
        title={cmsHeadline(content, SERVICES_DEFAULT_TITLE)}
        description={content.subheadline || SERVICES_DEFAULT_DESCRIPTION}
        actions={
          <>
            <Link to="/contact" className="btn-primary">
              Request an assessment
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/pricing" className="btn-ghost-dark">See pricing</Link>
          </>
        }
      />
      <main>
        <Services variant="page" showOtherSpecialties />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
