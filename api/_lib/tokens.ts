import crypto from 'node:crypto';

/**
 * Opaque token helpers.
 *
 * Nothing secret is ever stored in Postgres in the clear: the browser holds the
 * raw token, the database holds only its SHA-256 digest. A leaked table dump
 * therefore cannot be replayed against the API.
 */

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Six-digit login code. `randomInt` is uniform, unlike `Math.random() * 900000`. */
export function randomLoginCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Short human-typeable tag used to route an SMS reply back to a chat session.
 * Excludes characters that are easy to confuse on a phone keyboard (0/O, 1/I).
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomChatCode(length = 4): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
