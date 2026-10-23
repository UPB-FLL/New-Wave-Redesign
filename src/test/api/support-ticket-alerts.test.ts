import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeSupabase } from './fixtures/fakeSupabase';

const db = vi.hoisted(() => ({ current: null as ReturnType<typeof import('./fixtures/fakeSupabase').fakeSupabase> | null }));
const mail = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('../../../api/_lib/supabaseAdmin', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseAdmin: () => db.current!.client,
}));
vi.mock('../../../api/_lib/supabasePublic', () => ({
  isSupabasePublicConfigured: () => false,
  missingSupabasePublicEnv: () => [],
  getSupabasePublic: () => ({ auth: { getUser: vi.fn() } }),
}));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mail.send };
  },
}));

import handler from '../../../api/support/ticket-alerts';
import { getTicketsForRequester, superOpsTime } from '../../../api/_lib/superops';
import { alertEmailHtml, alertSms, freshTickets, ticketIdsIn } from '../../../api/_lib/ticketAlerts';

const NOW = Date.parse('2026-10-23T20:00:00Z');
const SECRET = 'webhook-secret-for-tests';

/** SuperOps' own shape: UTC times without an offset, people as JSON scalars. */
const rawTicket = (id: string, displayId: string, createdTime: string, extra: Record<string, unknown> = {}) => ({
  ticketId: id,
  displayId,
  subject: `Ticket ${displayId}`,
  status: 'New (email)',
  priority: 'High',
  source: 'EMAIL',
  createdTime,
  requester: { userId: '9', name: 'Jane Doe' },
  client: { accountId: '1', name: 'Acme Corp' },
  site: { id: '2', name: 'Fort Lauderdale' },
  ...extra,
});

let board: ReturnType<typeof rawTicket>[] = [];
let superOpsDown = false;
const superOpsBodies: Array<{ query: string; variables: { input: { ticketId?: string; sort?: unknown; condition?: unknown } } }> = [];
const texts: Array<{ to: string; body: string }> = [];

function fakeFetch(url: string, init: RequestInit) {
  if (url.startsWith('https://api.superops.ai/msp')) {
    const body = JSON.parse(String(init.body));
    superOpsBodies.push(body);
    if (superOpsDown) return Promise.resolve(new Response('down', { status: 503 }));
    if (body.query.includes('getTicket(')) {
      const found = board.find((t) => t.ticketId === body.variables.input.ticketId) ?? null;
      return Promise.resolve(Response.json({ data: { getTicket: found } }));
    }
    return Promise.resolve(Response.json({ data: { getTicketList: { tickets: board, listInfo: { totalCount: board.length, hasMore: false } } } }));
  }
  if (url.startsWith('https://api.twilio.com/')) {
    const form = new URLSearchParams(String(init.body));
    texts.push({ to: form.get('To')!, body: form.get('Body')! });
    return Promise.resolve(Response.json({ sid: `SM${texts.length}` }));
  }
  throw new Error(`unexpected fetch ${url}`);
}

function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown as Record<string, unknown>,
    setHeader() {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload as Record<string, unknown>;
      return this;
    },
    send() {
      return this;
    },
  };
}

const webhook = (body: unknown = { event: 'TICKET_CREATED' }, secret = SECRET) => ({
  method: 'POST',
  body,
  headers: { 'x-superops-webhook-secret': secret },
});

const ENV = {
  SUPEROPS_API_TOKEN: 'api-test',
  SUPEROPS_SUBDOMAIN: 'newwave',
  SUPEROPS_WEBHOOK_SECRET: SECRET,
  RESEND_API_KEY: 're_test',
  TWILIO_ACCOUNT_SID: 'AC1',
  TWILIO_AUTH_TOKEN: 'tok',
  TWILIO_FROM_NUMBER: '+19545550100',
  SUPPORT_ALERT_SMS_NUMBERS: '+15615550199',
  ADMIN_API_KEY: 'admin-key',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  vi.stubEnv('SUPPORT_ALERT_EMAIL', '');
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  db.current = fakeSupabase();
  board = [
    rawTicket('300', '3264', '2026-10-23T19:46:34'),
    rawTicket('299', '3263', '2026-10-23T19:45:22', { requester: null, client: null, priority: null }),
    rawTicket('298', '3262', '2026-09-08T21:36:19'),
  ];
  superOpsDown = false;
  superOpsBodies.length = 0;
  texts.length = 0;
  mail.send.mockReset();
  mail.send.mockResolvedValue({ data: { id: 'email-1' }, error: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/support/ticket-alerts', () => {
  it('texts and emails each ticket from the last hour, oldest first, and never the backlog', async () => {
    const res = makeRes();
    await handler(webhook(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, checked: 2, alerted: ['3263', '3264'], failed: [] });
    expect(texts.map((t) => t.to)).toEqual(['+15615550199', '+15615550199']);
    expect(texts[1].body).toContain('new ticket #3264');
    expect(texts[1].body).toContain('Jane Doe · Acme Corp');
    expect(mail.send).toHaveBeenCalledTimes(2);
    const email = mail.send.mock.calls[1][0];
    expect(email.to).toBe('josh@newwaveitfl.com');
    expect(email.subject).toBe('New ticket #3264: Ticket 3264');
    expect(email.html).toContain('New Wave IT');
    expect(email.text).toContain('Requester: Jane Doe');
    expect(db.current!.tables.support_ticket_alerts.map((r) => r.ticket_id).sort()).toEqual(['299', '300']);
  });

  it('asks SuperOps for the newest tickets first', async () => {
    await handler(webhook(), makeRes());
    const list = superOpsBodies.find((b) => b.query.includes('getTicketList'))!;
    expect(list.variables.input.sort).toEqual([{ attribute: 'createdTime', order: 'DESC' }]);
    expect(list.query).not.toMatch(/requester\s*\{|client\s*\{|technician\s*\{/);
  });

  it('alerts a ticket once, however often SuperOps delivers the event', async () => {
    await handler(webhook(), makeRes());
    const again = makeRes();
    await handler(webhook(), again);

    expect(again.statusCode).toBe(200);
    expect(again.body).toMatchObject({ alerted: [] });
    expect(texts).toHaveLength(2);
    expect(mail.send).toHaveBeenCalledTimes(2);
  });

  it('reads a ticket the delivery names even when the list does not show it yet', async () => {
    board = [rawTicket('301', '3265', '2026-10-23T19:59:00')];
    // The list answer is stale: it holds nothing; getTicket finds the new one.
    const stale = vi.fn((url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body ?? '{}'));
      if (url.startsWith('https://api.superops.ai/msp') && body.query?.includes('getTicketList')) {
        return Promise.resolve(Response.json({ data: { getTicketList: { tickets: [] } } }));
      }
      return fakeFetch(url, init);
    });
    vi.stubGlobal('fetch', stale);

    const res = makeRes();
    await handler(webhook({ event: 'TICKET_CREATED', data: { ticket: { ticketId: '301' } } }), res);
    expect(res.body).toMatchObject({ alerted: ['3265'] });
  });

  it('refuses a wrong webhook secret and a caller with no credentials', async () => {
    const wrong = makeRes();
    await handler(webhook(undefined, 'nope'), wrong);
    expect(wrong.statusCode).toBe(401);

    const none = makeRes();
    await handler({ method: 'POST', body: {}, headers: {} }, none);
    expect(none.statusCode).toBe(401);
    expect(texts).toHaveLength(0);
    expect(superOpsBodies).toHaveLength(0);
  });

  it('lets staff run the check with the admin key', async () => {
    const res = makeRes();
    await handler({ method: 'POST', body: {}, headers: { 'x-admin-key': 'admin-key' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.alerted).toHaveLength(2);
  });

  it('answers 503 until SuperOps is configured', async () => {
    vi.stubEnv('SUPEROPS_SUBDOMAIN', '');
    const res = makeRes();
    await handler(webhook(), res);
    expect(res.statusCode).toBe(503);
  });

  it('answers 502 when SuperOps is unreachable, so the event is delivered again', async () => {
    superOpsDown = true;
    const res = makeRes();
    await handler(webhook(), res);
    expect(res.statusCode).toBe(502);
    expect(texts).toHaveLength(0);
  });

  it('forgets a ticket nothing could be sent for, so the next delivery tries again', async () => {
    vi.stubEnv('SUPPORT_ALERT_SMS_NUMBERS', '');
    vi.stubEnv('SUPPORT_AGENT_SMS_NUMBERS', '');
    mail.send.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });

    const res = makeRes();
    await handler(webhook(), res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ alerted: [], failed: ['3263', '3264'] });
    expect(db.current!.tables.support_ticket_alerts).toHaveLength(0);
  });

  it('still alerts, by email alone, when no phone number is set', async () => {
    vi.stubEnv('SUPPORT_ALERT_SMS_NUMBERS', '');
    vi.stubEnv('SUPPORT_AGENT_SMS_NUMBERS', '');
    const res = makeRes();
    await handler(webhook(), res);
    expect(res.statusCode).toBe(200);
    expect(texts).toHaveLength(0);
    expect(mail.send).toHaveBeenCalledTimes(2);
  });

  it('falls back to the chat bridge numbers and a configured alert address', async () => {
    vi.stubEnv('SUPPORT_ALERT_SMS_NUMBERS', '');
    vi.stubEnv('SUPPORT_AGENT_SMS_NUMBERS', '+15615550101,+15615550102');
    vi.stubEnv('SUPPORT_ALERT_EMAIL', 'alerts@newwaveitfl.com');
    await handler(webhook(), makeRes());
    expect(new Set(texts.map((t) => t.to))).toEqual(new Set(['+15615550101', '+15615550102']));
    expect(mail.send.mock.calls[0][0].to).toBe('alerts@newwaveitfl.com');
  });

  it('alerts without dedupe when the table is not there yet', async () => {
    db.current = fakeSupabase({}, { support_ticket_alerts: ['*'] });
    const res = makeRes();
    await handler(webhook(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.alerted).toEqual(['3263', '3264']);
  });
});

describe('ticket alert helpers', () => {
  it('reads SuperOps times as UTC', () => {
    expect(superOpsTime('2026-10-23T19:46:34')).toBe(Date.parse('2026-10-23T19:46:34Z'));
    expect(superOpsTime('2026-10-23T19:46:34-04:00')).toBe(Date.parse('2026-10-23T23:46:34Z'));
    expect(Number.isNaN(superOpsTime(''))).toBe(true);
  });

  it('keeps only tickets from the last hour', () => {
    const t = (createdAt: string) => ({ ticketId: createdAt, displayId: '1', subject: '', status: '', priority: '', source: '', createdAt, requester: '', client: '', site: '' });
    const kept = freshTickets([t('2026-10-23T19:30:00'), t('2026-10-23T18:30:00'), t('not a date')], NOW);
    expect(kept.map((k) => k.createdAt)).toEqual(['2026-10-23T19:30:00']);
  });

  it('finds ticket ids at any depth and ignores anything that is not one', () => {
    expect(ticketIdsIn({ data: { ticketId: '12' }, ticket: { ticketId: 34 }, other: { ticketId: 'x; drop' } })).toEqual(['12', '34']);
    expect(ticketIdsIn(null)).toEqual([]);
  });

  it('escapes what a requester typed into the alert email', () => {
    const html = alertEmailHtml({ ticketId: '1', displayId: '7', subject: '<script>x</script>', status: '', priority: '', source: '', createdAt: '', requester: '<b>', client: '', site: '' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('keeps the text short', () => {
    const sms = alertSms({ ticketId: '1', displayId: '7', subject: 'x'.repeat(400), status: '', priority: '', source: '', createdAt: '', requester: '', client: '', site: '' });
    expect(sms.length).toBeLessThan(220);
    expect(sms).toContain('Unknown requester');
  });
});

describe('customer portal ticket list', () => {
  it('reads the technician as the JSON scalar SuperOps returns', async () => {
    board = [rawTicket('300', '3264', '2026-10-23T19:46:34', { technician: { name: 'Sam Tech' }, updatedTime: '2026-10-23T19:50:00' })];
    const { tickets } = await getTicketsForRequester('jane@acme.com');
    const query = superOpsBodies[0].query;
    expect(query).not.toMatch(/technician\s*\{/);
    expect(tickets[0]).toMatchObject({ displayId: '3264', technician: 'Sam Tech', priority: 'high' });
    expect(superOpsBodies[0].variables.input.condition).toEqual({ attribute: 'requester.email', operator: 'is', value: 'jane@acme.com' });
  });
});
