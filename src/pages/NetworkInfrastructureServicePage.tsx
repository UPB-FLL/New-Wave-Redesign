import { ArrowRight, Wifi, Network, Shield, Zap, GitBranch, AlertTriangle } from 'lucide-react';
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
  id: 'network-infrastructure',
  slug: 'network-infrastructure',
  name: 'Network Infrastructure',
  description: 'Modern network design, deployment, and management for enterprise reliability.',
  details:
    'From fiber installation to firewall configuration to wireless deployment, we design networks that are fast, secure, and redundant.',
  highlights: [
    'Network architecture & design',
    'Fiber cabling & installation',
    'WiFi 6 mesh deployment',
    'Firewall & intrusion prevention',
    'Network segmentation & VLANs',
    'VPN & remote access',
    'Redundancy & failover',
    'Network monitoring & analytics',
  ],
  seo_link: '/l/network-infrastructure-guide',
};

export default function NetworkInfrastructureServicePage() {
  const navigate = useNavigate();

  usePageMeta({
    title: 'Network Infrastructure & Design | New Wave IT',
    description:
      'Modern network design, fiber cabling, WiFi 6, firewalls, and network security. Reliable, fast, and redundant infrastructure for Fort Lauderdale businesses.',
    keywords: 'network infrastructure, network design, fiber cabling, WiFi, network security, firewalls',
  });

  const service = defaultService;

  return (
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />

      <header className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #0f1923 0%, #1a3a52 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 85%, rgba(57,204,204,0.2) 0%, transparent 50%)' }} />

        <div className="relative max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Enterprise-Grade
            <br />
            <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Network Backbone
            </span>
          </h1>
          <p className="text-xl max-w-3xl mb-12" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Your network is the foundation of your IT operations. We design, build, and maintain networks that are fast, secure, and always available.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/#contact')}
              className="px-6 py-4 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Network size={18} />
                <span>Design Consultation</span>
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
              <div className="flex items-center justify-center gap-2">
                <ArrowRight size={18} />
                <span>Learn More</span>
              </div>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20 space-y-20">
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Network Architecture Principles</h2>
          <p className="text-lg text-slate-600 mb-12">
            Modern networks require thoughtful design. We follow layered architecture with redundancy, segmentation, and security at every level.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Network size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Layered Architecture</h3>
              <p className="text-slate-600">
                Core, distribution, and access layers with clear separation of concerns. Each layer has defined responsibilities and redundancy.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Zap size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Redundancy</h3>
              <p className="text-slate-600">
                Multiple paths, failover capabilities, and no single point of failure. Your network stays up even if hardware fails.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.1)', width: 'fit-content' }}>
                <Shield size={28} style={{ color: '#39CCCC' }} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Security</h3>
              <p className="text-slate-600">
                Multiple security zones with controlled traffic flow. Implicit deny with explicit allow policies at each boundary.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 rounded-3xl px-8 md:px-12" style={{ background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(57,204,204,0.03) 100%)', border: '1px solid rgba(57,204,204,0.15)' }}>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Service Highlights</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {service.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="p-2 rounded mt-1" style={{ background: 'rgba(57,204,204,0.2)' }}>
                  <Network size={16} style={{ color: '#39CCCC' }} />
                </div>
                <span className="text-sm font-medium text-slate-700">{highlight}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Cabling & Connectivity</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Fiber Infrastructure</h3>
              <p className="text-slate-600 mb-4">
                Single-mode fiber provides unlimited bandwidth for long-distance runs with no signal degradation. We design fiber infrastructure for growth, not today's needs.
              </p>
              <ul className="space-y-3 text-slate-600 text-sm">
                <li>✓ Campus backbone fiber runs</li>
                <li>✓ Data center interconnects</li>
                <li>✓ Future-proofed capacity</li>
                <li>✓ Cost-effective vs. copper for long distances</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Copper Cabling</h3>
              <p className="text-slate-600 mb-4">
                Cat6A and Cat8 cabling for access layer with future-proofing for 10G/25G+ speeds. Proper cable management ensures longevity and performance.
              </p>
              <ul className="space-y-3 text-slate-600 text-sm">
                <li>✓ Professional installation & termination</li>
                <li>✓ Certification testing</li>
                <li>✓ Proper management systems</li>
                <li>✓ Environmental control</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Wireless & Remote Access</h2>
          <div className="space-y-6">
            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex gap-4 items-start mb-4">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(57,204,204,0.15)' }}>
                  <Wifi size={32} style={{ color: '#39CCCC' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">WiFi 6 Mesh Networks</h3>
                  <p className="text-slate-600">
                    WiFi 6 (802.11ax) provides massive capacity improvements and lower latency. Our mesh deployments provide seamless coverage with automatic roaming.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex gap-4 items-start">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(57,204,204,0.15)' }}>
                  <GitBranch size={32} style={{ color: '#39CCCC' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">VPN & Remote Access</h3>
                  <p className="text-slate-600">
                    Secure remote workers with site-to-site VPN, client VPN, and zero-trust network access. Work from anywhere safely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Network Security</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Firewall & Intrusion Prevention</h3>
                <p className="text-slate-600">
                  Next-generation firewalls with intrusion prevention, DPI, and threat intelligence. Application-aware rules provide fine-grained control.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Network Segmentation</h3>
                <p className="text-slate-600">
                  VLANs and subnets separate user traffic, servers, and IoT devices. Isolate critical systems and contain breaches.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Access Control Lists</h3>
                <p className="text-slate-600">
                  Define exactly what traffic is allowed between network segments. Implement zero-trust principles at the network layer.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <AlertTriangle size={64} style={{ color: '#39CCCC', opacity: 0.15 }} className="mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-4">Defense in Depth</h3>
              <p className="text-slate-600 leading-relaxed">
                Don't rely on a single security layer. Multiple defenses at network perimeter, between segments, and at device level provide layered protection against breaches.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Network Monitoring & Optimization</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, #f0fffe 0%, #f8fafb 100%)', border: '1px solid rgba(57,204,204,0.2)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Real-Time Monitoring</h3>
              <p className="text-slate-600 leading-relaxed">
                NetFlow and sFlow analysis shows you exactly how your network is being used. Identify bottlenecks, rogue devices, and unusual traffic patterns.
              </p>
            </div>

            <div className="p-8 rounded-2xl" style={{ background: '#f8fafb', border: '1px solid rgba(0,0,0,0.05)' }}>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Performance Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Detailed metrics on bandwidth usage, latency, jitter, and packet loss. Trending data reveals capacity planning needs before problems occur.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 rounded-3xl px-8 md:px-12 text-white text-center" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Build Your Optimal Network
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Let's design a network that grows with your business. Fast, secure, and built to last.
          </p>
          <button
            onClick={() => navigate('/#contact')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
              boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
            }}
          >
            Schedule Network Assessment <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}
