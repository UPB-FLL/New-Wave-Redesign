import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendSpy = vi.hoisted(() =>
  vi.fn(async () => ({ data: { id: 'email-1' }, error: null })),
);

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendSpy };
  },
}));

import quoteHandler from '../../../api/send-quote-email';
import ticketHandler from '../../../api/send-support-ticket';

function makeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    setHeader() {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function makeReq(body: unknown, ip: string, country?: string) {
  return {
    method: 'POST',
    body,
    headers: {
      'x-forwarded-for': ip,
      ...(country ? { 'x-vercel-ip-country': country } : {}),
    },
    socket: { remoteAddress: ip },
  };
}

// Distinct IPs and emails per case so the module-level in-memory rate
// limiter never carries state across tests.
let counter = 0;
const freshIp = () => `198.51.100.${(counter += 1)}`;
const freshEmail = () => `lead${counter}@company.com`;

beforeEach(() => {
  sendSpy.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('POST /api/send-quote-email', () => {
  const quoteBody = (overrides: Record<string, unknown> = {}) => ({
    name: 'John Smith',
    email: freshEmail(),
    message: 'Looking for a managed IT quote.',
    ...overrides,
  });

  it('sends both emails for US traffic', async () => {
    const res = makeRes();
    await quoteHandler(makeReq(quoteBody(), freshIp(), 'US'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('silently drops traffic from blocked countries', async () => {
    const res = makeRes();
    await quoteHandler(makeReq(quoteBody(), freshIp(), 'RU'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('still works without the geo header (local dev)', async () => {
    const res = makeRes();
    await quoteHandler(makeReq(quoteBody(), freshIp()), res);

    expect(res.statusCode).toBe(200);
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('rate limits repeated requests from one IP', async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i += 1) {
      await quoteHandler(makeReq(quoteBody(), ip, 'US'), makeRes());
    }

    const res = makeRes();
    await quoteHandler(makeReq(quoteBody(), ip, 'US'), res);

    expect(res.statusCode).toBe(429);
  });

  it('rate limits one mailbox across IPs', async () => {
    const email = 'repeat.quoter@gmail.com';
    for (let i = 0; i < 3; i += 1) {
      await quoteHandler(makeReq(quoteBody({ email }), freshIp(), 'US'), makeRes());
    }

    const res = makeRes();
    await quoteHandler(makeReq(quoteBody({ email: 'repeatquoter@gmail.com' }), freshIp(), 'US'), res);

    expect(res.statusCode).toBe(429);
  });
});

describe('POST /api/send-support-ticket', () => {
  const ticketBody = () => ({
    name: 'John Smith',
    email: freshEmail(),
    subject: 'Printer offline',
    description: 'The office printer stopped responding this morning.',
  });

  it('sends both emails for US traffic', async () => {
    const res = makeRes();
    await ticketHandler(makeReq(ticketBody(), freshIp(), 'US'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('silently drops traffic from blocked countries', async () => {
    const res = makeRes();
    await ticketHandler(makeReq(ticketBody(), freshIp(), 'CN'), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('rate limits repeated requests from one IP', async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i += 1) {
      await ticketHandler(makeReq(ticketBody(), ip, 'US'), makeRes());
    }

    const res = makeRes();
    await ticketHandler(makeReq(ticketBody(), ip, 'US'), res);

    expect(res.statusCode).toBe(429);
  });
});
