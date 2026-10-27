/**
 * The services /status lists, each linked to its provider's own status page
 * (every link opened on 2026-10-27). The site checks none of them itself, so
 * the page states no status, uptime, or check time of its own.
 */
export type StatusCategory = 'saas' | 'isp';
export type StatusService = { name: string; category: StatusCategory; url: string };

export const STATUS_SERVICES: StatusService[] = [
  { name: 'Microsoft 365', category: 'saas', url: 'https://status.cloud.microsoft/' },
  { name: 'Google Workspace', category: 'saas', url: 'https://www.google.com/appsstatus/dashboard/' },
  { name: 'AWS', category: 'saas', url: 'https://health.aws.amazon.com/health/status' },
  { name: 'Slack', category: 'saas', url: 'https://slack-status.com/' },
  { name: 'Zoom', category: 'saas', url: 'https://www.zoomstatus.com/' },
  { name: 'Salesforce', category: 'saas', url: 'https://status.salesforce.com/' },
  { name: 'HubSpot', category: 'saas', url: 'https://status.hubspot.com/' },
  { name: 'Stripe', category: 'saas', url: 'https://status.stripe.com/' },
  // Comcast is not listed: Xfinity has no public status page (its status
  // address sends a signed-out visitor to the support home page).
  { name: 'Verizon', category: 'isp', url: 'https://www.verizon.com/support/check-network-status/' },
  { name: 'AT&T', category: 'isp', url: 'https://www.att.com/outages/' },
  { name: 'Spectrum', category: 'isp', url: 'https://www.spectrum.net/support/internet/spectrum-outage' },
];

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    return new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The CMS's list when it has one, else the built-in list. An entry keeps its
 * own https link, or takes the built-in link for its name; an entry with
 * neither is not shown. Older entries carry a status and uptime, never read.
 */
export function statusServices(raw?: string): StatusService[] {
  if (!raw) return STATUS_SERVICES;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return STATUS_SERVICES;
  }
  if (!Array.isArray(parsed)) return STATUS_SERVICES;
  const services = parsed.flatMap((entry): StatusService[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { name, category, url } = entry as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim() || (category !== 'saas' && category !== 'isp')) return [];
    const link = httpsUrl(url) ?? STATUS_SERVICES.find((service) => service.name === name)?.url;
    return link ? [{ name, category, url: link }] : [];
  });
  return services.length ? services : STATUS_SERVICES;
}

/** The provider's domain, as a visitor reads it in the link: "status.cloud.microsoft", "att.com". */
export function statusHost(url: string): string {
  return new URL(url).host.replace(/^www\./, '');
}
