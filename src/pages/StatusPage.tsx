import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StatusIndicator from '../components/StatusIndicator';
import { usePageMeta } from '../lib/usePageMeta';
import { useContent } from '../lib/useContent';

interface StatusService {
  name: string;
  category: 'saas' | 'isp';
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  lastChecked: string;
}

const defaultServices: StatusService[] = [
  { name: 'Microsoft 365', category: 'saas', status: 'operational', uptime: 99.95, lastChecked: '2 min ago' },
  { name: 'Google Workspace', category: 'saas', status: 'operational', uptime: 99.98, lastChecked: '2 min ago' },
  { name: 'AWS', category: 'saas', status: 'operational', uptime: 99.99, lastChecked: '2 min ago' },
  { name: 'Slack', category: 'saas', status: 'operational', uptime: 99.9, lastChecked: '2 min ago' },
  { name: 'Zoom', category: 'saas', status: 'operational', uptime: 99.94, lastChecked: '2 min ago' },
  { name: 'Salesforce', category: 'saas', status: 'operational', uptime: 99.96, lastChecked: '2 min ago' },
  { name: 'HubSpot', category: 'saas', status: 'operational', uptime: 99.92, lastChecked: '2 min ago' },
  { name: 'Stripe', category: 'saas', status: 'operational', uptime: 99.99, lastChecked: '2 min ago' },
  { name: 'Comcast', category: 'isp', status: 'operational', uptime: 99.7, lastChecked: '5 min ago' },
  { name: 'Verizon', category: 'isp', status: 'operational', uptime: 99.75, lastChecked: '5 min ago' },
  { name: 'AT&T', category: 'isp', status: 'operational', uptime: 99.68, lastChecked: '5 min ago' },
  { name: 'Spectrum', category: 'isp', status: 'degraded', uptime: 99.45, lastChecked: '5 min ago' },
];

export default function StatusPage() {
  usePageMeta({
    title: 'Service Status — New Wave IT',
    description: 'Real-time status of critical services and ISPs. Monitor uptime for cloud services your business depends on.',
  });

  const c = useContent('status');

  let services: StatusService[] = defaultServices;
  try { if (c.services) services = JSON.parse(c.services); } catch { /* use default */ }

  const saasServices = services.filter(s => s.category === 'saas');
  const ispServices = services.filter(s => s.category === 'isp');

  const avgSaasUptime = Math.round((saasServices.reduce((sum, s) => sum + s.uptime, 0) / saasServices.length) * 100) / 100;
  const avgIspUptime = Math.round((ispServices.reduce((sum, s) => sum + s.uptime, 0) / ispServices.length) * 100) / 100;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-white py-12 sm:py-16 relative" style={{ borderBottom: '1px solid rgba(21,34,50,0.06)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 sm:mb-8">
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
                {c.section_label || 'System Status'}
              </span>
              <h1
                className="text-4xl sm:text-5xl lg:text-7xl leading-[0.95] mt-2 mb-3 tracking-tight"
                style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
              >
                {c.headline ? (
                  c.headline
                ) : (
                  <>
                    Real-time{' '}
                    <span
                      style={{
                        display: 'inline-block',
                        background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Service Status
                    </span>
                  </>
                )}
              </h1>
              <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.65)' }}>
                {c.subheadline || 'Monitor the status of cloud services and ISPs your business depends on. Updated every 5 minutes.'}
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="bg-white py-8 sm:py-12 relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* SaaS Services */}
            <div className="mb-8 sm:mb-10">
              <div className="mb-4">
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight mb-1"
                  style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
                >
                  SaaS Services
                </h2>
                <p className="text-sm" style={{ color: 'rgba(21,34,50,0.6)' }}>
                  Cloud applications your business relies on
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {saasServices.map((service) => (
                  <StatusIndicator key={service.name} service={service} />
                ))}
              </div>
            </div>

            {/* ISP Services */}
            <div>
              <div className="mb-4">
                <h2
                  className="text-2xl sm:text-3xl font-bold tracking-tight mb-1"
                  style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
                >
                  Internet Service Providers
                </h2>
                <p className="text-sm" style={{ color: 'rgba(21,34,50,0.6)' }}>
                  Major ISPs serving South Florida
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {ispServices.map((service) => (
                  <StatusIndicator key={service.name} service={service} />
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div
              className="mt-8 sm:mt-10 rounded-2xl p-4 sm:p-6"
              style={{
                background: 'rgba(57,204,204,0.08)',
                border: '1px solid rgba(57,204,204,0.2)',
              }}
            >
              <p className="text-sm" style={{ color: 'rgba(21,34,50,0.7)' }}>
                <span className="font-semibold">Last updated:</span> {c.last_updated || 'Just now'} •
                <span className="ml-2"><span className="font-semibold">Next update:</span> In ~5 minutes</span>
              </p>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
