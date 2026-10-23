import { EventEmitter } from 'node:events';
import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ lookup: vi.fn(), request: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: mocks.lookup, default: { lookup: mocks.lookup } }));
vi.mock('node:http', () => ({ request: mocks.request, default: { request: mocks.request } }));
vi.mock('node:https', () => ({ request: mocks.request, default: { request: mocks.request } }));
import { isPublicAddress, publicWebsiteUrl, readPublicText } from '../../../api/_lib/groundswell/publicFetch';

interface Answer { status?: number; headers?: Record<string, string>; body?: string | Buffer }
let answers: Answer[];
beforeEach(() => {
  answers = [];
  mocks.lookup.mockReset().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  mocks.request.mockReset().mockImplementation((_url, _options, callback) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (error?: Error) => void };
    req.destroy = error => { if (error) req.emit('error', error); req.emit('close'); };
    req.end = () => {
      const answer = answers.shift() ?? {};
      const res = new EventEmitter() as EventEmitter & { statusCode: number; headers: Record<string, string>; resume: () => void };
      res.statusCode = answer.status ?? 200;
      res.headers = { 'content-type': 'text/html', ...answer.headers };
      res.resume = () => req.emit('close');
      callback(res);
      if (![301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.emit('data', Buffer.isBuffer(answer.body) ? answer.body : Buffer.from(answer.body ?? '<title>Business</title>'));
        res.emit('end');
        req.emit('close');
      }
    };
    return req;
  });
});

describe('public website research transport', () => {
  it.each(['http://127.0.0.1', 'http://2130706433', 'http://localhost', 'http://host.internal', 'http://[::1]', 'file:///etc/passwd', 'https://user:pass@example.com', 'https://example.com:8443'])('rejects a non-public destination: %s', value => {
    expect(() => publicWebsiteUrl(value)).toThrow();
  });
  it.each(['10.0.0.1', '127.1.2.3', '172.31.0.1', '169.254.169.254', '192.168.1.1', '100.64.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1'])('rejects a private resolved address: %s', address => {
    expect(isPublicAddress(address)).toBe(false);
  });
  it('pins the already-checked DNS address and preserves SEO response headers', async () => {
    answers.push({ headers: { 'x-robots-tag': 'noindex' } });
    expect(await readPublicText('https://business.example')).toMatchObject({ status: 200, xRobotsTag: 'noindex', text: '<title>Business</title>' });
    const options = mocks.request.mock.calls[0][1];
    const done = vi.fn();
    options.lookup('business.example', {}, done);
    expect(done).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(options.family).toBe(4);
  });
  it('rejects a mixed public/private DNS response before a request is sent', async () => {
    mocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.1', family: 4 }]);
    await expect(readPublicText('https://business.example')).rejects.toThrow(/public servers/);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('rechecks every redirect and never requests an internal address', async () => {
    answers.push({ status: 302, headers: { location: 'https://redirect.example/private' } });
    mocks.lookup.mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }]).mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    await expect(readPublicText('https://business.example')).rejects.toThrow(/public servers/);
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it('decodes compressed HTML but rejects oversized decoded bodies', async () => {
    answers.push({ body: gzipSync('<title>Business</title>'), headers: { 'content-encoding': 'gzip' } });
    expect((await readPublicText('https://business.example')).text).toBe('<title>Business</title>');
    answers.push({ body: gzipSync('a'.repeat(1_000)), headers: { 'content-encoding': 'gzip' } });
    await expect(readPublicText('https://business.example', { maxBytes: 100 })).rejects.toThrow(/size limit/);
  });
  it('does not treat error pages or binary files as successful website research', async () => {
    answers.push({ status: 403 });
    await expect(readPublicText('https://business.example')).rejects.toThrow(/HTTP 403/);
    answers.push({ headers: { 'content-type': 'image/png' } });
    await expect(readPublicText('https://business.example')).rejects.toThrow(/HTML or CSS/);
  });
});
