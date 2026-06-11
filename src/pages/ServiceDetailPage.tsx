import { useParams, Link } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowRight } from 'lucide-react';

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
  const c = useContent('services-detail');

  let service: ServiceDetail | null = null;
  try {
    if (c.services_list) {
      const services = JSON.parse(c.services_list) as ServiceDetail[];
      service = services.find(s => s.slug === slug) || null;
    }
  } catch {
    // use null
  }

  if (!service) {
    return (
      <div className="min-h-screen" style={{ background: 'white' }}>
        <Navbar />
        <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Service not found</h1>
          <p className="text-slate-600 mb-6">This service detail page is not available.</p>
          <Link
            to="/cybersecurity"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Back to security services <ArrowRight size={14} />
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

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
            ← Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">{service.name}</h1>
          {service.description && (
            <p className="text-lg md:text-xl max-w-3xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {service.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#39CCCC' }}
            >
              Get a free assessment <ArrowRight size={14} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              See pricing
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {/* Features Section */}
        {service.features.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Key Features</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {service.features.map((feature, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(57, 204, 204, 0.08)', border: '1px solid rgba(57, 204, 204, 0.2)' }}
                >
                  <p className="text-slate-700">{feature}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Benefits Section */}
        {service.benefits.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Benefits</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {service.benefits.map((benefit, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl"
                  style={{ background: 'rgba(94, 188, 103, 0.08)', border: '1px solid rgba(94, 188, 103, 0.2)' }}
                >
                  <p className="text-slate-700">{benefit}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pricing Note */}
        {service.pricing_note && (
          <section
            className="p-8 rounded-2xl"
            style={{
              background: 'rgba(57, 204, 204, 0.08)',
              border: '1px solid rgba(57, 204, 204, 0.2)',
            }}
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Pricing & Integration</h2>
            <p className="text-slate-700 leading-relaxed">{service.pricing_note}</p>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to get started?</h2>
          <p className="text-slate-600 mb-6">Contact our team for a free assessment and implementation plan.</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Schedule a consultation <ArrowRight size={14} />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
