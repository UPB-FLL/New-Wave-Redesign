import { useParams, Link } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowRight, AlertTriangle } from 'lucide-react';

interface ThreatDetail {
  name: string;
  slug: string;
  severity: string;
  description: string;
  details: string;
  mitigation_strategies: string[];
  impact: string;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH': return '#f59e0b';
    case 'MEDIUM': return '#3b82f6';
    default: return '#6b7280';
  }
};

export default function ThreatDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = useContent('threats-detail');

  let threat: ThreatDetail | null = null;
  try {
    if (c.threats_list) {
      const threats = JSON.parse(c.threats_list) as ThreatDetail[];
      threat = threats.find(t => t.slug === slug) || null;
    }
  } catch {
    // use null
  }

  if (!threat) {
    return (
      <div className="min-h-screen" style={{ background: 'white' }}>
        <Navbar />
        <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Threat not found</h1>
          <p className="text-slate-600 mb-6">This threat detail page is not available.</p>
          <Link
            to="/cybersecurity"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Back to threat coverage <ArrowRight size={14} />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const severityColor = getSeverityColor(threat.severity);

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      {/* Hero Section */}
      <header
        className="relative pt-32 pb-16 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}
      >
        <div className="relative max-w-5xl mx-auto text-white">
          <Link
            to="/cybersecurity"
            className="inline-flex items-center gap-1 text-sm mb-4"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            ← Back to Threats
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">{threat.name}</h1>
            <span
              className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg"
              style={{
                background: `${severityColor}30`,
                color: severityColor,
              }}
            >
              {threat.severity}
            </span>
          </div>
          {threat.description && (
            <p className="text-lg md:text-xl max-w-3xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {threat.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#39CCCC' }}
            >
              Get threat assessment <ArrowRight size={14} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              See protection plans
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {/* Full Details */}
        {threat.details && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Understanding This Threat</h2>
            <div className="prose prose-lg max-w-none">
              {threat.details.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-slate-700 leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Impact */}
        {threat.impact && (
          <section
            className="p-8 rounded-2xl border-l-4"
            style={{
              background: `${severityColor}08`,
              borderColor: severityColor,
            }}
          >
            <div className="flex gap-4">
              <AlertTriangle size={24} style={{ color: severityColor, flexShrink: 0 }} />
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Impact</h2>
                <p className="text-slate-700">{threat.impact}</p>
              </div>
            </div>
          </section>
        )}

        {/* Mitigation Strategies */}
        {threat.mitigation_strategies.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Defense Strategy</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {threat.mitigation_strategies.map((strategy, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border-l-4"
                  style={{
                    background: 'rgba(94, 188, 103, 0.08)',
                    borderColor: '#5EBC67',
                  }}
                >
                  <div className="flex gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: '#5EBC67' }}
                    >
                      <span className="text-white text-xs font-bold">{i + 1}</span>
                    </div>
                    <p className="text-slate-700">{strategy}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Protect against {threat.name}</h2>
          <p className="text-slate-600 mb-6">Our security experts can help you build defenses against this threat.</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Schedule security audit <ArrowRight size={14} />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
