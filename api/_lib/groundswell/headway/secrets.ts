import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Logins a customer hands over instead of linking an account (the setup
 * checklist's `secret` items) are held with AES-256-GCM under
 * GROUNDSWELL_SECRETS_KEY (any string; its SHA-256 is the key). The stored
 * form is "v1:<iv>:<tag>:<ciphertext>", each base64. Without the key set,
 * nothing is stored and the route says so.
 */

export const isSecretsConfigured = () => Boolean((process.env.GROUNDSWELL_SECRETS_KEY ?? '').trim());

const key = () => {
  const raw = (process.env.GROUNDSWELL_SECRETS_KEY ?? '').trim();
  if (!raw) throw new Error('GROUNDSWELL_SECRETS_KEY is not set, so logins cannot be stored.');
  return createHash('sha256').update(raw).digest();
};

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${body.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  const [v, iv, tag, body] = stored.split(':');
  if (v !== 'v1' || !iv || !tag || !body) throw new Error('The stored value is not in a form this app can read.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8');
}
