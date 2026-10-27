import { ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CheckList } from '../components/brand/CheckList';
import { CtaBand } from '../components/brand/CtaBand';
import { PageHeader } from '../components/brand/PageHeader';
import { Section } from '../components/brand/Section';
import { SectionHeading } from '../components/brand/SectionHeading';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useContentWithStatus } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';

interface ServiceDetail {
  name: string;
  slug: string;
  description: string;
  features: string[];
  benefits: string[];
  pricing_note: string;
}

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { content, loaded } = useContentWithStatus('services-detail');
  let service: ServiceDetail | null = null;

  try {
    if (content.services_list) {
      const services = JSON.parse(content.services_list) as ServiceDetail[];
      service = services.find((candidate) => candidate.slug === slug) || null;
    }
  } catch {
    // Route behavior stays intact when CMS content cannot be parsed.
  }

  // Content arrives from the CMS after mount; only once the section has been
  // read (or a cached copy is showing) does a missing slug mean a dead URL,
  // which stays out of the index. That includes a section with no entries.
  const contentLoaded = loaded || Object.keys(content).length > 0;

  usePageMeta({
    noindex: !service && contentLoaded,
    title: service ? `${service.name} in Fort Lauderdale` : 'IT Services',
    description: service?.description ? `${service.description} Serving Fort Lauderdale and South Florida businesses 24/7.` : undefined,
    canonical: `https://www.newwaveitfl.com/service/${slug ?? ''}`,
    jsonLd: service
      ? {
          '@context': 'https://schema.org',
          '@type': 'Service',
          provider: { '@id': 'https://www.newwaveitfl.com/#business' },
          name: service.name,
          description: service.description,
          areaServed: { '@type': 'City', name: 'Fort Lauderdale' },
          url: `https://www.newwaveitfl.com/service/${slug ?? ''}`,
        }
      : undefined,
  });

  if (!service) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
        <Navbar />
        <PageHeader
          title="Service not found"
          description="This service detail page is not available."
          actions={<Link to="/services" className="btn-primary">Back to services <ArrowRight size={14} /></Link>}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <PageHeader
        breadcrumbs={[{ name: 'Services', path: '/services' }, { name: service.name, path: `/service/${service.slug}` }]}
        title={service.name}
        description={service.description}
        actions={
          <>
            <Link to="/contact" className="btn-primary">Request an assessment <ArrowRight size={14} /></Link>
            <Link to="/pricing" className="btn-ghost-dark">See pricing</Link>
          </>
        }
      />

      <main>
        {service.features.length > 0 ? (
          <Section tone="white">
            <SectionHeading title="Key features" />
            <CheckList items={service.features} columns={2} className="mt-8 max-w-4xl" />
          </Section>
        ) : null}
        {service.benefits.length > 0 ? (
          <Section tone="base">
            <SectionHeading title="Benefits" />
            <CheckList items={service.benefits} columns={2} className="mt-8 max-w-4xl" />
          </Section>
        ) : null}
        {service.pricing_note ? (
          <Section tone="white">
            <SectionHeading title="Pricing and integration" />
            <p className="mt-5 max-w-3xl text-base leading-relaxed text-[var(--nw-slate)] sm:text-lg">{service.pricing_note}</p>
          </Section>
        ) : null}
        <CtaBand title="Ready to get started?" description="Contact our team for a free assessment and implementation plan." />
      </main>
      <Footer />
    </div>
  );
}
