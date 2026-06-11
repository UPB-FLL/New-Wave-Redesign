import { ArrowRight, Headphones, Clock, MessageSquare, Zap, Award, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string;
  highlights: string[];
  seo_link: string;
}

const defaultService: ServiceCategory = {
  id: 'live-it-support',
  slug: 'live-it-support',
  name: 'Live IT Support',
  description: 'Around-the-clock technical support with dedicated engineers responding in minutes.',
  details:
    'Our live support team is available 24/7 via phone, email, chat, and on-site. We prioritize critical issues and maintain detailed ticket tracking.',
  highlights: [
    'Dedicated account management & priority routing',
    'Sub-hour response times',
    'Remote & on-site support',
    'Advanced ticket tracking',
    'Comprehensive knowledge base',
    'Escalation management & executive reporting',
    'Phone/email/chat/in-person support',
    'Technician training & mentoring',
  ],
  seo_link: '/l/it-support-guide',
};

export default function LiveITSupportServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: '24/7 Live IT Support | New Wave IT',
    description:
      'Round-the-clock technical support with response times under 1 hour. Phone, email, chat, and on-site support for South Florida businesses.',
    keywords: 'IT support, technical support, 24/7 support, help desk, remote support',
  });

  const service = defaultService;

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a2942 0%, #0f1923 50%, #1a3a52 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(57,204,204,0.2) 0%, transparent 50%)' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Always-On Technical
              <br />
              <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Support Excellence
              </span>
            </h1>
            <p className="text-xl max-w-3xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Your team deserves expert IT support when they need it most. Our certified engineers respond to issues within minutes, not hours.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-12">
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <Clock size={24} style={{ color: '#39CCCC' }} className="mb-3" />
              <div className="text-3xl font-bold text-white mb-2">&lt; 1 hour</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Response Time</p>
            </div>
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <Globe size={24} style={{ color: '#39CCCC' }} className="mb-3" />
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Always Available</p>
            </div>
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <MessageSquare size={24} style={{ color: '#39CCCC' }} className="mb-3" />
              <div className="text-3xl font-bold text-white mb-2">4 Channels</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Contact Methods</p>
            </div>
            <div className="p-6 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <Zap size={24} style={{ color: '#39CCCC' }} className="mb-3" />
              <div className="text-3xl font-bold text-white mb-2">99.8%</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Uptime SLA</p>
            </div>
          </div>

          <div className="mt-12 flex gap-3">
            <button
              onClick={() => navigate('/contact')}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
              }}
            >
              <div className="flex items-center gap-2">
                <Headphones size={18} />
                <span>Get Live Support</span>
              </div>
            </button>
            <a
              href={service.seo_link}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div className="flex items-center gap-2">
                <ArrowRight size={18} />
                <span>Learn More</span>
              </div>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Support That's Always Ready</h2>
          <p className="text-lg text-slate-600 mb-12">
            Technology issues don't happen during business hours. Our support team is always staffed to respond to your needs, no matter when they arise.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Support Tiers</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(57,204,204,0.2)' }}>
                    <Headphones size={18} style={{ color: '#39CCCC' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Tier 1: Desktop Support</div>
                    <p className="text-sm text-slate-600">Password resets, software installation, basic troubleshooting</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(57,204,204,0.2)' }}>
                    <Headphones size={18} style={{ color: '#39CCCC' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Tier 2: Advanced Support</div>
                    <p className="text-sm text-slate-600">Network issues, server problems, advanced diagnostics</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(57,204,204,0.2)' }}>
                    <Headphones size={18} style={{ color: '#39CCCC' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Tier 3: Engineering</div>
                    <p className="text-sm text-slate-600">Critical outages, security incidents, infrastructure changes</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">How to Reach Us</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(57,204,204,0.2)' }}>
                    <MessageSquare size={18} style={{ color: '#39CCCC' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Phone</div>
                    <p className="text-sm text-slate-600">Call 24/7 for immediate assistance</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(57,204,204,0.2)' }}>
                    <MessageSquare size={18} style={{ color: '#39CCCC' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Email</div>
                    <p className="text-sm text-slate-600">Tracked and prioritized for complex issues</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(57,204,204,0.2)' }}>
                    <MessageSquare size={18} style={{ color: '#39CCCC' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Chat & Portal</div>
                    <p className="text-sm text-slate-600">Real-time support with ticket tracking</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-12 rounded-3xl px-8 md:px-12" style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(57,204,204,0.03) 100%)', border: '1px solid rgba(57,204,204,0.15)' }}>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Service Capabilities</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {service.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="p-2 rounded mt-1" style={{ background: 'rgba(57,204,204,0.2)' }}>
                  <Award size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Knowledge Management</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Comprehensive Knowledge Base</h3>
                <p className="text-slate-600">
                  Every issue is documented and categorized. Our knowledge base grows with every ticket, enabling faster resolution of recurring issues.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Ticket Tracking & Escalation</h3>
                <p className="text-slate-600">
                  Never lose track of an issue. Advanced ticket management ensures nothing falls through the cracks, with automatic escalation when needed.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Executive Reporting</h3>
                <p className="text-slate-600">
                  Understand your IT health at a glance. Monthly reports detail response times, resolution rates, and trends in your infrastructure.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Dedicated Account Manager</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Your account manager knows your business, your team, and your technical environment. They serve as your primary contact and advocate within our organization.
              </p>
              <p className="text-sm text-slate-500">
                Continuity in relationships leads to better support outcomes and faster problem resolution.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Remote & On-Site Support</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Remote Support</h3>
              <ul className="space-y-3 text-slate-600">
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>Immediate assistance without travel time</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>Screen sharing for complex diagnostics</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>99% of issues resolved without on-site visit</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>Cost-effective for multiple locations</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">On-Site Support</h3>
              <ul className="space-y-3 text-slate-600">
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>Hardware repair and replacement</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>Network and server work</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>Critical incident response</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: '#39CCCC' }}>✓</span>
                  <span>Same-day emergency dispatch</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Never Be Without IT Support Again
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Connect with our team today to set up 24/7 live support. Your first response happens within an hour.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Start Your Free Trial <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
