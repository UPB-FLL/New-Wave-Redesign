/**
 * SuperOps GraphQL client.
 *
 * SuperOps exposes a single GraphQL endpoint per data centre and authenticates
 * with a bearer API token plus a `CustomerSubDomain` header identifying the
 * MSP account. See https://developer.superops.com/msp.
 *
 *   US: https://api.superops.ai/msp
 *   EU: https://euapi.superops.ai/msp
 */

const US_ENDPOINT = 'https://api.superops.ai/msp';
const EU_ENDPOINT = 'https://euapi.superops.ai/msp';

export interface NormalizedTicket {
  id: string;
  displayId: string;
  subject: string;
  status: string;
  priority: string;
  ticketType: string;
  createdAt: string;
  updatedAt: string;
  technician: string;
  resolutionDueAt: string | null;
}

export class SuperOpsNotConfiguredError extends Error {
  constructor() {
    super('SuperOps API is not configured');
    this.name = 'SuperOpsNotConfiguredError';
  }
}

export class SuperOpsRequestError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'SuperOpsRequestError';
    this.status = status;
  }
}

function resolveEndpoint(): string {
  const explicit = process.env.SUPEROPS_API_URL || process.env.SUPEROPS_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const dc = (process.env.SUPEROPS_DATA_CENTER || 'us').toLowerCase();
  return dc === 'eu' ? EU_ENDPOINT : US_ENDPOINT;
}

export function isSuperOpsConfigured(): boolean {
  const token = process.env.SUPEROPS_API_TOKEN || process.env.SUPEROPS_API_KEY;
  return Boolean(token && process.env.SUPEROPS_SUBDOMAIN);
}

export async function superOpsRequest<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const token = process.env.SUPEROPS_API_TOKEN || process.env.SUPEROPS_API_KEY;
  const subdomain = process.env.SUPEROPS_SUBDOMAIN;

  if (!token || !subdomain) throw new SuperOpsNotConfiguredError();

  let response: Response;
  try {
    response = await fetch(resolveEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        CustomerSubDomain: subdomain,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    throw new SuperOpsRequestError(
      `Could not reach SuperOps: ${error instanceof Error ? error.message : 'network error'}`
    );
  }

  const text = await response.text();

  if (!response.ok) {
    // Surface the status but never the raw body — it can echo the token back.
    throw new SuperOpsRequestError(`SuperOps returned HTTP ${response.status}`, 502);
  }

  let payload: { data?: T; errors?: Array<{ message?: string }> };
  try {
    payload = JSON.parse(text);
  } catch {
    throw new SuperOpsRequestError('SuperOps returned a non-JSON response');
  }

  if (payload.errors?.length) {
    const detail = payload.errors.map((e) => e.message).filter(Boolean).join('; ');
    throw new SuperOpsRequestError(detail || 'SuperOps rejected the request');
  }

  if (!payload.data) throw new SuperOpsRequestError('SuperOps returned an empty response');

  return payload.data;
}

const TICKET_LIST_QUERY = `
  query getTicketList($input: ListInfoInput!) {
    getTicketList(input: $input) {
      tickets {
        ticketId
        displayId
        subject
        ticketType
        status
        priority
        createdTime
        updatedTime
        resolutionDueTime
        technician
      }
      listInfo {
        page
        pageSize
        totalCount
        hasMore
      }
    }
  }
`;

interface RawTicket {
  ticketId?: string;
  displayId?: string;
  subject?: string;
  ticketType?: string;
  status?: string;
  priority?: string;
  createdTime?: string;
  updatedTime?: string;
  resolutionDueTime?: string | null;
  /** SuperOps types requester, client and technician as JSON scalars, so no sub-selection. */
  technician?: { name?: string } | null;
}

/** Maps SuperOps ticket statuses onto the four states the portal renders. */
export function normalizeStatus(status: string): 'open' | 'in-progress' | 'resolved' | 'closed' {
  const value = (status || '').toLowerCase().replace(/[\s_]+/g, '-');
  if (value.includes('closed')) return 'closed';
  if (value.includes('resolved') || value.includes('complete')) return 'resolved';
  if (
    value.includes('progress') ||
    value.includes('assigned') ||
    value.includes('pending') ||
    value.includes('hold') ||
    value.includes('waiting')
  ) {
    return 'in-progress';
  }
  return 'open';
}

export function normalizePriority(priority: string): 'low' | 'medium' | 'high' | 'critical' {
  const value = (priority || '').toLowerCase();
  if (value.includes('critical') || value.includes('urgent')) return 'critical';
  if (value.includes('high')) return 'high';
  if (value.includes('low')) return 'low';
  return 'medium';
}

/**
 * Fetches the tickets belonging to a single requester.
 *
 * The email filter is applied server-side by SuperOps and re-checked here is
 * not possible (the list payload omits the requester by design), so the caller
 * must have already proven ownership of `email`.
 */
export async function getTicketsForRequester(
  email: string,
  { page = 1, pageSize = 50 }: { page?: number; pageSize?: number } = {}
): Promise<{ tickets: NormalizedTicket[]; totalCount: number; hasMore: boolean }> {
  const data = await superOpsRequest<{
    getTicketList?: {
      tickets?: RawTicket[];
      listInfo?: { totalCount?: number; hasMore?: boolean };
    };
  }>(TICKET_LIST_QUERY, {
    input: {
      page,
      // SuperOps caps a single list request at 100 records.
      pageSize: Math.min(Math.max(pageSize, 1), 100),
      sort: [{ attribute: 'createdTime', order: 'DESC' }],
      condition: {
        attribute: 'requester.email',
        operator: 'is',
        value: email,
      },
    },
  });

  const raw = data.getTicketList?.tickets ?? [];

  const tickets: NormalizedTicket[] = raw.map((ticket, index) => ({
    id: String(ticket.ticketId ?? ticket.displayId ?? index),
    displayId: String(ticket.displayId ?? ticket.ticketId ?? ''),
    subject: ticket.subject || 'Untitled ticket',
    status: normalizeStatus(ticket.status || ''),
    priority: normalizePriority(ticket.priority || ''),
    ticketType: ticket.ticketType || '',
    createdAt: ticket.createdTime || '',
    updatedAt: ticket.updatedTime || ticket.createdTime || '',
    technician: ticket.technician?.name || '',
    resolutionDueAt: ticket.resolutionDueTime || null,
  }));

  return {
    tickets,
    totalCount: data.getTicketList?.listInfo?.totalCount ?? tickets.length,
    hasMore: Boolean(data.getTicketList?.listInfo?.hasMore),
  };
}

/** A ticket as the new-ticket alert reads it. */
export interface AlertTicket {
  ticketId: string;
  displayId: string;
  subject: string;
  status: string;
  priority: string;
  source: string;
  createdAt: string;
  requester: string;
  client: string;
  site: string;
}

const TICKET_ALERT_FIELDS = `
  ticketId
  displayId
  subject
  status
  priority
  source
  createdTime
  requester
  client
  site
`;

const RECENT_TICKETS_QUERY = `
  query getRecentTickets($input: ListInfoInput!) {
    getTicketList(input: $input) {
      tickets { ${TICKET_ALERT_FIELDS} }
    }
  }
`;

const TICKET_QUERY = `
  query getTicket($input: TicketIdentifierInput!) {
    getTicket(input: $input) { ${TICKET_ALERT_FIELDS} }
  }
`;

interface RawAlertTicket {
  ticketId?: string | number;
  displayId?: string | number;
  subject?: string | null;
  status?: string | null;
  priority?: string | null;
  source?: string | null;
  createdTime?: string | null;
  requester?: { name?: string } | null;
  client?: { name?: string } | null;
  site?: { name?: string } | null;
}

/**
 * SuperOps answers `createdTime` in UTC without an offset ("2026-10-23T19:46:34");
 * read that way, a ticket raised a minute ago is a minute old.
 */
export function superOpsTime(value: string): number {
  if (!value) return Number.NaN;
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

function toAlertTicket(raw: RawAlertTicket): AlertTicket | null {
  if (raw.ticketId === undefined || raw.ticketId === null) return null;
  return {
    ticketId: String(raw.ticketId),
    displayId: String(raw.displayId ?? raw.ticketId),
    subject: raw.subject || 'Untitled ticket',
    status: raw.status || '',
    priority: raw.priority || '',
    source: raw.source || '',
    createdAt: raw.createdTime || '',
    requester: raw.requester?.name || '',
    client: raw.client?.name || '',
    site: raw.site?.name || '',
  };
}

/** The newest tickets on the board, newest first. */
export async function getRecentTickets(limit = 10): Promise<AlertTicket[]> {
  const data = await superOpsRequest<{ getTicketList?: { tickets?: RawAlertTicket[] } }>(RECENT_TICKETS_QUERY, {
    input: {
      page: 1,
      pageSize: Math.min(Math.max(limit, 1), 100),
      sort: [{ attribute: 'createdTime', order: 'DESC' }],
    },
  });
  return (data.getTicketList?.tickets ?? []).map(toAlertTicket).filter((t): t is AlertTicket => t !== null);
}

/** One ticket by its SuperOps id, or null when SuperOps has none. */
export async function getTicketById(ticketId: string): Promise<AlertTicket | null> {
  const data = await superOpsRequest<{ getTicket?: RawAlertTicket | null }>(TICKET_QUERY, { input: { ticketId } });
  return data.getTicket ? toAlertTicket(data.getTicket) : null;
}
