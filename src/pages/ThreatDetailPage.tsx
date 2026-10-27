import { AlertTriangle, ArrowRight, Shield } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CtaBand } from '../components/brand/CtaBand';
import { PageHeader } from '../components/brand/PageHeader';
import { Section } from '../components/brand/Section';
import { SectionHeading } from '../components/brand/SectionHeading';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useContentWithStatus } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';

interface ThreatDetail {
  name: string;
  slug: string;
  severity: string;
  description: string;
  details: string;
  mitigation_strategies: string[];
  impact: string;
}

/** CRITICAL → Critical, as the CMS stores severities in capitals. */
function severityLabel(severity: string): string {
  return severity ? severity.charAt(0) + severity.slice(1).toLowerCase() : '';
}

export default function ThreatDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { content, loaded } = useContentWithStatus('threats-detail');
  let threat: ThreatDetail | null = null;

  try {
    if (content.threats_list) {
      const threats = JSON.parse(content.threats_list) as ThreatDetail[];
      threat = threats.find((candidate) => candidate.slug === slug) || null;
    }
  } catch {
    // Keep the existing not-found behavior when CMS content is malformed.
  }

  // Content arrives from the CMS after mount; only once the section has been
  // read (or a cached copy is showing) does a missing slug mean a dead URL,
  // which stays out of the index. That includes a section with no entries.
  const contentLoaded = loaded || Object.keys(content).length > 0;

  usePageMeta({
    noindex: !threat && contentLoaded,
    title: threat ? `${threat.name} - Threat Protection & Mitigation` : 'Cyber Threat Protection',
    description: threat?.description ? `${threat.description} Learn how New Wave IT protects South Florida businesses against ${threat.name.toLowerCase()}.` : undefined,
    canonical: `https://www.newwaveitfl.com/threat/${slug ?? ''}`,
    jsonLd: threat
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `${threat.name} - Threat Protection & Mitigation`,
          description: threat.description,
          author: { '@id': 'https://www.newwaveitfl.com/#organization' },
          publisher: { '@id': 'https://www.newwaveitfl.com/#organization' },
          mainEntityOfPage: `https://www.newwaveitfl.com/threat/${slug ?? ''}`,
        }
      : undefined,
  });

  if (!threat) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
        <Navbar />
        <PageHeader
          title="Threat not found"
          description="This threat detail page is not available."
          actions={<Link to="/cybersecurity" className="btn-primary">Back to threat coverage <ArrowRight size={14} /></Link>}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <PageHeader
        breadcrumbs={[{ name: 'Threat Center', path: '/cybersecurity' }, { name: threat.name, path: `/threat/${threat.slug}` }]}
        title={threat.name}
        description={threat.description}
        actions={
          <>
            <Link to="/contact" className="btn-primary">Get a threat assessment <ArrowRight size={14} /></Link>
            <Link to="/pricing" className="btn-ghost-dark">See protection plans</Link>
          </>
        }
      >
        {threat.severity ? <p className="nw-meta mt-4 text-sm text-[var(--nw-mist-gray)]">Severity: {severityLabel(threat.severity)}</p> : null}
      </PageHeader>

      <main>
        {threat.details ? (
          <Section tone="white">
            <div className="max-w-3xl">
              <SectionHeading title="Understanding this threat" />
              <div className="mt-6 space-y-4 text-base leading-relaxed text-[var(--nw-slate)] sm:text-lg">
                {threat.details.split(/\n\n+/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          </Section>
        ) : null}

        {threat.impact ? (
          <Section tone="base">
            <div className="flex max-w-3xl gap-4 rounded-lg border-l-4 p-6" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-tide-blue)' }}>
              <AlertTriangle size={24} className="shrink-0 text-[var(--nw-tide-blue)]" aria-hidden="true" />
              <div>
                <h2 className="nw-display mb-2 text-xl text-brand-navy">Impact</h2>
                <p className="text-[var(--nw-current-navy)]">{threat.impact}</p>
              </div>
            </div>
          </Section>
        ) : null}

        {threat.mitigation_strategies.length > 0 ? (
          <Section tone="white">
            <SectionHeading title="Our defense strategy" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {threat.mitigation_strategies.map((strategy) => (
                <div key={strategy} className="flex gap-3 rounded-lg border p-5" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                  <Shield size={20} className="mt-0.5 shrink-0 text-[var(--nw-tide-blue)]" aria-hidden="true" />
                  <p className="text-[var(--nw-current-navy)]">{strategy}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <CtaBand
          title={`Protect against ${threat.name}`}
          description="Our security experts can help you build defenses against this threat."
          actionLabel="Schedule a security audit"
        />
      </main>
      <Footer />
    </div>
  );
}
