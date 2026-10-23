import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';

/** Only globally routable addresses may answer a user-supplied website lookup. */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
  }
  // Global unicast only. This also excludes mapped IPv4, loopback, link-local and unique-local ranges.
  return version === 6 && /^[23]/i.test(address) && !/^2001:(?:db8|0(?::|0+:))/i.test(address);
}

export function publicWebsiteUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Add a complete public website address.'); }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port)) || !host.includes('.') || isIP(host) || /[:[\]]/.test(host) || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) {
    throw new Error('Only public business websites on HTTP or HTTPS can be researched.');
  }
  url.hostname = host;
  url.hash = '';
  return url;
}

export interface PublicTextOptions {
  timeoutMs?: number;
  maxBytes?: number;
  contentTypes?: string[];
}

/** DNS is checked and pinned for every hop, including redirects; responses are bounded. */
export async function readPublicText(value: string, options: PublicTextOptions = {}): Promise<{ url: string; status: number; text: string; contentType: string; xRobotsTag?: string | null }> {
  const deadline = Date.now() + (options.timeoutMs ?? 8_000);
  const maxBytes = options.maxBytes ?? 1_500_000;
  let url = publicWebsiteUrl(value);
  for (let hop = 0; hop <= 3; hop += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('The website lookup timed out.');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let addresses: { address: string; family: number }[];
    try {
      addresses = await Promise.race([
        lookup(url.hostname, { all: true }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('The website address lookup timed out.')), remaining); }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
    if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) throw new Error('The website address does not resolve exclusively to public servers.');
    const chosen = addresses.find(entry => entry.family === 4) ?? addresses[0];
    const response = await new Promise<{ status: number; location?: string; type: string; text: string; xRobotsTag?: string | null }>((resolve, reject) => {
      const request = url.protocol === 'https:' ? httpsRequest : httpRequest;
      const req = request(url, {
        family: chosen.family,
        lookup: (_host, _opts, done) => done(null, chosen.address, chosen.family),
        headers: { 'User-Agent': 'GroundSwell/1.0 (public business research)', Accept: 'text/html,text/css,application/xhtml+xml;q=0.9', 'Accept-Encoding': 'identity' },
      }, res => {
        const status = res.statusCode ?? 0;
        const type = String(res.headers['content-type'] ?? '').toLowerCase();
        if ([301, 302, 303, 307, 308].includes(status)) {
          res.resume();
          resolve({ status, location: res.headers.location, type, text: '' });
          return;
        }
        if (status < 200 || status >= 300) { res.resume(); reject(new Error(`The website returned HTTP ${status}.`)); return; }
        const allowed = options.contentTypes ?? ['text/html', 'application/xhtml+xml', 'text/css'];
        if (type && !allowed.some(contentType => type.includes(contentType))) { res.resume(); reject(new Error('The website did not return a readable HTML or CSS page.')); return; }
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes) { req.destroy(new Error('The website response was too large to research safely.')); return; }
          chunks.push(Buffer.from(chunk));
        });
        res.on('end', () => {
          try {
            let body = Buffer.concat(chunks);
            const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase();
            if (encoding === 'gzip') body = gunzipSync(body, { maxOutputLength: maxBytes });
            else if (encoding === 'br') body = brotliDecompressSync(body, { maxOutputLength: maxBytes });
            else if (encoding === 'deflate') body = inflateSync(body, { maxOutputLength: maxBytes });
            else if (encoding && encoding !== 'identity') throw new Error('The website returned an unsupported content encoding.');
            resolve({ status, type, text: body.toString('utf8'), xRobotsTag: typeof res.headers['x-robots-tag'] === 'string' ? res.headers['x-robots-tag'] : null });
          } catch { reject(new Error('The website response could not be decoded within the lookup size limit.')); }
        });
        res.on('error', reject);
      });
      const timeout = setTimeout(() => req.destroy(new Error('The website lookup timed out.')), Math.max(1, deadline - Date.now()));
      req.on('close', () => clearTimeout(timeout));
      req.on('error', reject);
      req.end();
    });
    if (response.location) {
      if (hop === 3) throw new Error('The website redirected too many times.');
      url = publicWebsiteUrl(new URL(response.location, url).toString());
      continue;
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) throw new Error('The website returned an incomplete redirect.');
    return { url: url.toString(), status: response.status, text: response.text, contentType: response.type, xRobotsTag: response.xRobotsTag };
  }
  throw new Error('The website could not be read.');
}
