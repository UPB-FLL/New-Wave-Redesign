import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PublicPageHero } from '../components/brand/PublicPageHero';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useContent } from '../lib/useContent';
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

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return '#b42318';
    case 'HIGH': return '#b54708';
    case 'MEDIUM': return 'var(--nw-tide-blue)';
    default: return 'var(--nw-slate)';
  }
}

export default function ThreatDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = useContent('threats-detail');
  let threat: ThreatDetail | null = null;

  try {
    if (content.threats_list) {
      const threats = JSON.parse(content.threats_list) as ThreatDetail[];
      threat = threats.find((candidate) => candidate.slug === slug) || null;
    }
  } catch {
    // Keep the existing not-found behavior when CMS content is malformed.
  }

  usePageMeta({
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
        <main className="mx-auto max-w-3xl px-6 pb-20 pt-32 text-center">
          <h1 className="nw-display mb-3 text-3xl text-brand-navy">Threat not found</h1>
          <p className="mb-6 text-[var(--nw-slate)]">This threat detail page is not available.</p>
          <Link to="/cybersecurity" className="btn-primary">Back to threat coverage <ArrowRight size={14} /></Link>
        </main>
        <Footer />
      </div>
    );
  }

  const color = severityColor(threat.severity);
  return (
    <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <PublicPageHero title={threat.name} description={threat.description} eyebrow="Threat protection" backTo="/cybersecurity" backLabel="Back to threats">
        <span className="rounded-md px-3 py-2 text-xs font-semibold" style={{ background: color, color: 'var(--nw-cloud-white)' }}>{threat.severity}</span>
        <Link to="/contact" className="btn-primary">Get a threat assessment <ArrowRight size={14} /></Link>
        <Link to="/pricing" className="btn-secondary">See protection plans</Link>
      </PublicPageHero>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6 sm:py-14">
        {threat.details ? (
          <section>
            <h2 className="nw-display mb-6 text-3xl text-brand-navy">Understanding this threat</h2>
            {threat.details.split(/\n\n+/).map((paragraph) => <p key={paragraph} className="mb-4 leading-relaxed text-[var(--nw-current-navy)]">{paragraph}</p>)}
          </section>
        ) : null}

        {threat.impact ? (
          <section className="rounded-lg border-l-4 p-6" style={{ background: 'var(--nw-pure-white)', borderColor: color }}>
            <div className="flex gap-4">
              <AlertTriangle size={24} style={{ color, flexShrink: 0 }} />
              <div>
                <h2 className="nw-display mb-2 text-xl text-brand-navy">Impact</h2>
                <p className="text-[var(--nw-current-navy)]">{threat.impact}</p>
              </div>
            </div>
          </section>
        ) : null}

        {threat.mitigation_strategies.length > 0 ? (
          <section>
            <h2 className="nw-display mb-6 text-3xl text-brand-navy">Our defense strategy</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {threat.mitigation_strategies.map((strategy, index) => (
                <div key={strategy} className="flex gap-3 rounded-lg p-5 nw-surface" style={{ borderColor: 'var(--nw-continuity-green)' }}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'var(--nw-continuity-green)', color: 'var(--nw-deep-current)' }}>{index + 1}</span>
                  <p className="text-[var(--nw-current-navy)]">{strategy}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-t py-8 text-center" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <h2 className="nw-display mb-3 text-2xl text-brand-navy">Protect against {threat.name}</h2>
          <p className="mx-auto mb-6 max-w-xl text-[var(--nw-slate)]">Our security experts can help you build defenses against this threat.</p>
          <Link to="/contact" className="btn-primary">Schedule security audit <ArrowRight size={14} /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
