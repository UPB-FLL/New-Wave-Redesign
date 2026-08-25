/**
 * Layered spam screening for the public lead-capture endpoints.
 *
 * Nothing here keeps state between requests: the timing token is an HMAC
 * over its own issue time, so it survives serverless instance recycling
 * and needs no storage. Routes that use these checks respond to detected
 * spam with a fake success so bots cannot probe for which check tripped.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Faster than any human can load the form, fill it in, and submit. */
export const TOKEN_MIN_AGE_MS = 3_000;
/** Long-open tabs refresh their token client-side well before this. */
export const TOKEN_MAX_AGE_MS = 6 * 60 * 60 * 1_000;

/**
 * Falls back to the Resend key so production works with zero extra config
 * (HMAC use never exposes the key material). With neither set — local dev
 * without email — tokens are unsigned and only timing is enforced.
 */
function tokenSecret(): string | null {
  return process.env.CONTACT_FORM_TOKEN_SECRET || process.env.RESEND_API_KEY || null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Token format is `<issue-millis>.<signature>`; clients may read the millis. */
export function issueFormToken(now: number = Date.now()): string {
  const payload = String(now);
  const secret = tokenSecret();
  return `${payload}.${secret ? signPayload(payload, secret) : 'unsigned'}`;
}

export type TokenVerdict = 'ok' | 'missing' | 'malformed' | 'bad_signature' | 'too_fast' | 'expired';

export function verifyFormToken(token: unknown, now: number = Date.now()): TokenVerdict {
  if (typeof token !== 'string' || token.length === 0) return 'missing';
  if (token.length > 200) return 'malformed';
  const dot = token.indexOf('.');
  if (dot <= 0) return 'malformed';
  const payload = token.slice(0, dot);
  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) return 'malformed';

  const secret = tokenSecret();
  if (secret) {
    const signature = Buffer.from(token.slice(dot + 1));
    const expected = Buffer.from(signPayload(payload, secret));
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
      return 'bad_signature';
    }
  }

  const age = now - issuedAt;
  if (age < TOKEN_MIN_AGE_MS) return 'too_fast';
  if (age > TOKEN_MAX_AGE_MS) return 'expired';
  return 'ok';
}

/** `y` counts as a vowel so names like Krzysztof or Wyn stay unflagged. */
const VOWELS = new Set('aeiouy');

function midWordCaseFlips(word: string): number {
  let flips = 0;
  for (let i = 1; i < word.length; i += 1) {
    if (/[a-z]/.test(word[i - 1]) && /[A-Z]/.test(word[i])) flips += 1;
  }
  return flips;
}

function longestConsonantRun(word: string): number {
  let run = 0;
  let longest = 0;
  for (const char of word.toLowerCase()) {
    if (/[a-z]/.test(char) && !VOWELS.has(char)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return longest;
}

/**
 * Random keyboard-mash names ("vytakXeEueievMohUwSl") flip case mid-word far
 * more often than real names do — McDonald and DiCaprio flip once. The
 * consonant-run check needs a run longer than real names produce (Bartsch
 * peaks at five). Non-Latin scripts match neither pattern and pass.
 */
export function looksLikeGibberish(text: string): boolean {
  return text
    .trim()
    .split(/\s+/)
    .some((word) => midWordCaseFlips(word) >= 3 || longestConsonantRun(word) >= 6);
}

const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;

function countLetters(text: string): number {
  return (text.match(/\p{L}/gu) || []).length;
}

/** Collapses gmail dot/plus aliasing so one mailbox cannot dodge the rate limit. */
export function normalizeEmailForKey(email: string): string {
  const lowered = String(email ?? '').trim().toLowerCase();
  const at = lowered.lastIndexOf('@');
  if (at < 0) return lowered;
  let local = lowered.slice(0, at).split('+')[0];
  const domain = lowered.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

export interface ContactSpamInput {
  name: string;
  message: string;
  /** Value of the hidden form field; any content means a bot filled it. */
  honeypot?: unknown;
  token?: unknown;
  now?: number;
}

export interface SpamVerdict {
  spam: boolean;
  reasons: string[];
}

export function checkContactSpam(input: ContactSpamInput): SpamVerdict {
  const reasons: string[] = [];
  const now = input.now ?? Date.now();

  if (typeof input.honeypot === 'string' && input.honeypot.trim().length > 0) {
    reasons.push('honeypot_filled');
  }

  const tokenVerdict = verifyFormToken(input.token, now);
  if (tokenVerdict !== 'ok') reasons.push(`token_${tokenVerdict}`);

  if (countLetters(input.name) < 2) reasons.push('name_without_letters');
  else if (looksLikeGibberish(input.name)) reasons.push('name_gibberish');

  const urlCount = (input.message.match(URL_PATTERN) || []).length;
  if (urlCount > 3) reasons.push('message_link_flood');
  if (countLetters(input.message.replace(URL_PATTERN, ' ')) < 3) {
    reasons.push(urlCount > 0 ? 'message_only_links' : 'message_without_words');
  }

  return { spam: reasons.length > 0, reasons };
}
