import { ExternalLink } from 'lucide-react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { CtaBand } from '../components/brand/CtaBand';
import { PageHeader } from '../components/brand/PageHeader';
import { Section } from '../components/brand/Section';
import { SectionHeading } from '../components/brand/SectionHeading';
import { useContent } from '../lib/useContent';
import { IT_PAGE_META } from '../lib/routeMeta';
import { statusHost, statusServices, type StatusService } from '../lib/statusPages';
import { usePageMeta } from '../lib/usePageMeta';

/**
 * Each provider's own status page, in one place. The site checks none of
 * these services, so it shows no status of its own (2026-10-27: the page
 * printed made-up uptimes, "Last checked: 2 min ago", and Spectrum degraded).
 */
export default function StatusPage() {
  usePageMeta(IT_PAGE_META['/status']);

  const content = useContent('status');
  const services = statusServices(content.services);
  const groups = [
    { title: 'Cloud services', description: "Each link opens the provider's own status page in a new tab.", services: services.filter((service) => service.category === 'saas') },
    { title: 'Internet providers', description: "Each link opens the provider's own outage page in a new tab.", services: services.filter((service) => service.category === 'isp') },
  ].filter((group) => group.services.length);

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/status'].breadcrumbs}
        title={content.headline || 'Service status'}
        description={content.subheadline || 'Official status pages for the cloud services and internet providers your business depends on, in one place. If something stops working, check here, then call us.'}
      />
      <main>
        {groups.map((group, index) => (
          <Section key={group.title} tone={index % 2 ? 'base' : 'white'}>
            <SectionHeading title={group.title} description={group.description} />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.services.map((service) => (
                <li key={service.name}>
                  <StatusLink service={service} />
                </li>
              ))}
            </ul>
          </Section>
        ))}

        <CtaBand
          title="Something not working?"
          description="If the provider's page shows no outage and your team is still affected, we can help."
          actionLabel="Get support"
          actionTo="/support"
        />
      </main>
      <Footer />
    </div>
  );
}

function StatusLink({ service }: { service: StatusService }) {
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="nw-surface group flex h-full items-center justify-between gap-4 rounded-lg p-5 transition-colors hover:border-[var(--nw-tide-blue)]"
    >
      <span className="min-w-0">
        <span className="block font-bold text-[var(--nw-current-navy)]">{service.name}</span>
        <span className="mt-1 block truncate text-sm text-[var(--nw-slate)]">{statusHost(service.url)}</span>
      </span>
      <ExternalLink size={17} aria-hidden="true" className="shrink-0 text-[var(--nw-tide-blue)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
