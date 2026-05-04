import { useParams, Link } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowRight, ExternalLink } from 'lucide-react';

interface ServiceCategory {
  title: string;
  slug: string;
  description: string;
  details: string;
  highlights: string[];
  seo_link: string;
}

export default function ServiceCategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = useContent('services-categories');

  let service: ServiceCategory | null = null;
  try {
    if (c.services_list) {
      const services = JSON.parse(c.services_list) as ServiceCategory[];
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
          <p className="text-slate-600 mb-6">This service page is not available.</p>
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#39CCCC' }}
          >
            Back to services <ArrowRight size={14} />
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
            to="/services"
            className="inline-flex items-center gap-1 text-sm mb-4"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            ← Back to Services
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">{service.title}</h1>
          {service.description && (
            <p className="text-lg md:text-xl max-w-3xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {service.description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/#contact"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#39CCCC' }}
            >
              Get in touch <ArrowRight size={14} />
            </Link>
            {service.seo_link && (
              <Link
                to={service.seo_link}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Read blog post <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-14 space-y-14">
        {/* Full Details */}
        {service.details && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">About This Service</h2>
            <div className="prose prose-lg max-w-none">
              {service.details.split(/\n\n+/).map((para, i) => (
                <p key={i} className="text-slate-700 leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Highlights */}
        {service.highlights.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">What We Provide</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {service.highlights.map((highlight, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl flex gap-3"
                  style={{ background: 'rgba(57, 204, 204, 0.08)', border: '1px solid rgba(57, 204, 204, 0.2)' }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: '#39CCCC' }}
                  >
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <p className="text-slate-700">{highlight}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Blog Link */}
        {service.seo_link && (
          <section
            className="p-8 rounded-2xl"
            style={{
              background: 'rgba(57, 204, 204, 0.08)',
              border: '1px solid rgba(57, 204, 204, 0.2)',
            }}
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Learn More</h2>
            <p className="text-slate-700 mb-4">
              Want to know more about this service? Check out our detailed blog post for in-depth information and best practices.
            </p>
            <Link
              to={service.seo_link}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#39CCCC' }}
            >
              Read the full article <ExternalLink size={14} />
            </Link>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to get started?</h2>
          <p className="text-slate-600 mb-6">Let's discuss how we can help with {service.title.toLowerCase()}.</p>
          <Link
            to="/#contact"
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
