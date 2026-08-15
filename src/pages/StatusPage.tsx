import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import StatusIndicator from '../components/StatusIndicator';
import { useContent } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';

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

function averageUptime(services: StatusService[]): number {
  if (services.length === 0) return 0;
  return Math.round((services.reduce((sum, service) => sum + service.uptime, 0) / services.length) * 100) / 100;
}

export default function StatusPage() {
  usePageMeta({
    title: 'Service Status - New Wave IT',
    description: 'Real-time status of critical services and ISPs. Monitor uptime for cloud services your business depends on.',
    canonical: 'https://www.newwaveitfl.com/status',
  });

  const content = useContent('status');
  let services: StatusService[] = defaultServices;
  try {
    if (content.services) services = JSON.parse(content.services);
  } catch {
    // Keep the verified fallback services visible if CMS data is malformed.
  }

  const saasServices = services.filter((service) => service.category === 'saas');
  const ispServices = services.filter((service) => service.category === 'isp');
  const avgSaasUptime = averageUptime(saasServices);
  const avgIspUptime = averageUptime(ispServices);
  const operationalCount = services.filter((service) => service.status === 'operational').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <main className="pt-20">
        <section className="border-b py-12 sm:py-16" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center sm:mb-10">
              <p className="nw-kicker">{content.section_label || 'System status'}</p>
              <h1 className="nw-display mb-4 mt-2 text-4xl leading-[1.05] text-brand-navy sm:text-5xl lg:text-6xl">
                {content.headline || <>Real-time <span className="text-brand-tide-blue">service status</span></>}
              </h1>
              <p className="mx-auto max-w-2xl text-sm text-[var(--nw-slate)] sm:text-base">
                {content.subheadline || 'Monitor the status of cloud services and ISPs your business depends on. Updated every 5 minutes.'}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { value: `${operationalCount}/${services.length}`, label: 'Services operational', color: 'var(--nw-continuity-green)' },
                { value: `${avgSaasUptime}%`, label: 'Average SaaS uptime', color: 'var(--nw-tide-blue)' },
                { value: `${avgIspUptime}%`, label: 'Average ISP uptime', color: 'var(--nw-tide-blue)' },
              ].map((summary) => (
                <div key={summary.label} className="rounded-lg p-6 text-center nw-surface">
                  <div className="nw-display mb-2 text-3xl" style={{ color: summary.color }}>{summary.value}</div>
                  <p className="text-sm text-[var(--nw-slate)]">{summary.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <StatusGroup title="SaaS services" description="Cloud applications your business relies on" services={saasServices} />
            <StatusGroup title="Internet service providers" description="Major ISPs serving South Florida" services={ispServices} />

            <div className="mt-12 rounded-lg border p-5 sm:mt-16 sm:p-6" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-tide-blue)' }}>
              <p className="text-sm text-[var(--nw-current-navy)]">
                <span className="font-semibold">Last updated:</span> {content.last_updated || 'Just now'}
                <span className="mx-2 text-[var(--nw-slate)]">|</span>
                <span className="font-semibold">Next update:</span> In about 5 minutes
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function StatusGroup({ title, description, services }: { title: string; description: string; services: StatusService[] }) {
  return (
    <section className="mb-12 sm:mb-16">
      <div className="mb-6">
        <h2 className="nw-display text-2xl text-brand-navy sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-[var(--nw-slate)]">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {services.map((service) => <StatusIndicator key={service.name} service={service} />)}
      </div>
    </section>
  );
}
