import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sendSpy = vi.hoisted(() =>
  vi.fn(async () => ({ data: { id: 'email-1' }, error: null })),
);

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendSpy };
  },
}));

import handler from '../../../api/send-contact-email';
import { TOKEN_MIN_AGE_MS, issueFormToken } from '../../../api/_lib/spam';

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  setHeader(key: string, value: string): void;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function makeRes(): MockResponse {
  return {
    statusCode: 0,
    body: undefined,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function makeReq(method: string, body: unknown, ip: string) {
  return { method, body, headers: { 'x-forwarded-for': ip }, socket: { remoteAddress: ip } };
}

const validToken = () => issueFormToken(Date.now() - TOKEN_MIN_AGE_MS - 5000);

function humanBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'John Smith',
    email: 'john@company.com',
    phone: '(954) 555-0100',
    company: 'Acme Corp',
    message: 'Our office needs managed IT support for 12 workstations.',
    company_website: '',
    token: validToken(),
    ...overrides,
  };
}

// Each test uses its own IP and email so the module-level in-memory rate
// limiter never carries state across cases.
let nextIp = 0;
const freshIp = () => `203.0.113.${(nextIp += 1)}`;
const freshEmail = () => `person${nextIp}@company.com`;

beforeAll(() => {
  vi.stubEnv('CONTACT_FORM_TOKEN_SECRET', 'test-secret');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  sendSpy.mockClear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('GET /api/send-contact-email', () => {
  it('issues an uncacheable timing token', async () => {
    const res = makeRes();
    await handler(makeReq('GET', undefined, freshIp()), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toMatchObject({ token: expect.stringMatching(/^\d+\./) });
  });
});

describe('POST /api/send-contact-email', () => {
  it('sends both emails for a human submission with an aged token', async () => {
    const res = makeRes();
    await handler(makeReq('POST', humanBody({ email: freshEmail() }), freshIp()), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('silently drops the observed bot payload without sending email', async () => {
    const res = makeRes();
    await handler(
      makeReq(
        'POST',
        humanBody({
          name: 'vytakXeEueievMohUwSl',
          email: 'jaim.e.l.yn22@gmail.com',
          message: '4805282150',
        }),
        freshIp(),
      ),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('silently drops submissions without a token', async () => {
    const res = makeRes();
    await handler(makeReq('POST', humanBody({ email: freshEmail(), token: undefined }), freshIp()), res);

    expect(res.statusCode).toBe(200);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('silently drops submissions that filled the honeypot', async () => {
    const res = makeRes();
    await handler(
      makeReq('POST', humanBody({ email: freshEmail(), company_website: 'https://spam.example' }), freshIp()),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('still rejects invalid input with an honest error', async () => {
    const res = makeRes();
    await handler(makeReq('POST', humanBody({ email: 'not-an-email' }), freshIp()), res);

    expect(res.statusCode).toBe(400);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('rate limits repeated submissions from one IP', async () => {
    const ip = freshIp();
    for (let i = 0; i < 5; i += 1) {
      await handler(makeReq('POST', humanBody({ email: freshEmail() }), ip), makeRes());
    }

    const res = makeRes();
    await handler(makeReq('POST', humanBody({ email: freshEmail() }), ip), res);

    expect(res.statusCode).toBe(429);
  });

  it('rate limits one mailbox across gmail dot aliases', async () => {
    for (const alias of ['spam.mer@gmail.com', 'sp.ammer@gmail.com', 'spamme.r@gmail.com']) {
      await handler(makeReq('POST', humanBody({ email: alias }), freshIp()), makeRes());
    }

    const res = makeRes();
    await handler(makeReq('POST', humanBody({ email: 's.pammer@gmail.com' }), freshIp()), res);

    expect(res.statusCode).toBe(429);
  });
});
