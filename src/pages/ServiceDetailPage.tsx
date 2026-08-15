import { ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicPageHero } from '../components/brand/PublicPageHero';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useContent } from '../lib/useContent';
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
  const content = useContent('services-detail');
  let service: ServiceDetail | null = null;

  try {
    if (content.services_list) {
      const services = JSON.parse(content.services_list) as ServiceDetail[];
      service = services.find((candidate) => candidate.slug === slug) || null;
    }
  } catch {
    // Route behavior stays intact when CMS content cannot be parsed.
  }

  usePageMeta({
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
        <main className="mx-auto max-w-3xl px-6 pb-20 pt-32 text-center">
          <h1 className="nw-display mb-3 text-3xl text-brand-navy">Service not found</h1>
          <p className="mb-6 text-[var(--nw-slate)]">This service detail page is not available.</p>
          <Link to="/services" className="btn-primary">Back to services <ArrowRight size={14} /></Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <PublicPageHero title={service.name} description={service.description} eyebrow="New Wave IT service" backTo="/services" backLabel="Back to services">
        <Link to="/contact" className="btn-primary">Request an assessment <ArrowRight size={14} /></Link>
        <Link to="/pricing" className="btn-secondary">See pricing</Link>
      </PublicPageHero>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 sm:py-14">
        {service.features.length > 0 ? <ServiceList title="Key features" items={service.features} accent="var(--nw-signal-cyan)" /> : null}
        {service.benefits.length > 0 ? <ServiceList title="Benefits" items={service.benefits} accent="var(--nw-tide-blue)" /> : null}
        {service.pricing_note ? (
          <section className="rounded-lg border p-6 sm:p-8" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-tide-blue)' }}>
            <h2 className="nw-display mb-3 text-2xl text-brand-navy">Pricing and integration</h2>
            <p className="leading-relaxed text-[var(--nw-current-navy)]">{service.pricing_note}</p>
          </section>
        ) : null}
        <section className="border-t py-8 text-center" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <h2 className="nw-display mb-3 text-2xl text-brand-navy">Ready to get started?</h2>
          <p className="mx-auto mb-6 max-w-xl text-[var(--nw-slate)]">Contact our team for a free assessment and implementation plan.</p>
          <Link to="/contact" className="btn-primary">Schedule a consultation <ArrowRight size={14} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ServiceList({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <section>
      <h2 className="nw-display mb-6 text-3xl text-brand-navy">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg p-4 nw-surface">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} aria-hidden="true" />
            <p className="text-[var(--nw-current-navy)]">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
