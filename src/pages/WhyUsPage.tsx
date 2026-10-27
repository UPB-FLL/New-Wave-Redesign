import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WhyUs, { WHYUS_DEFAULT_CTA, WHYUS_DEFAULT_DESCRIPTION, WHYUS_DEFAULT_TITLE } from '../components/WhyUs';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { cmsHeadline } from '../components/brand/cmsHeadline';
import { PageHeader } from '../components/brand/PageHeader';
import { useContent } from '../lib/useContent';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function WhyUsPage() {
  usePageMeta(IT_PAGE_META['/why-us']);
  const content = useContent('whyus');
  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/why-us'].breadcrumbs}
        title={cmsHeadline(content, WHYUS_DEFAULT_TITLE)}
        description={content.subheadline || WHYUS_DEFAULT_DESCRIPTION}
        actions={
          <Link to="/contact" className="btn-primary">
            {content.cta_label || WHYUS_DEFAULT_CTA}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        }
      />
      <main>
        <WhyUs variant="page" />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
