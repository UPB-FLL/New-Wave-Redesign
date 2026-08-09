import crypto from 'node:crypto';

/**
 * Minimal Twilio REST helpers.
 *
 * Talking to the two endpoints we need (send a message, validate an inbound
 * webhook signature) is a handful of lines, so we call the REST API directly
 * rather than pulling in the SDK.
 */

export class TwilioNotConfiguredError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'TwilioNotConfiguredError';
  }
}

export function isTwilioConfigured(): boolean {
  const hasAccount = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  const hasSender = Boolean(
    process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM_NUMBER
  );
  return hasAccount && hasSender && getAgentNumbers().length > 0;
}

/** The technician cell number(s) that receive chat messages, in E.164. */
export function getAgentNumbers(): string[] {
  return (process.env.SUPPORT_AGENT_SMS_NUMBERS || process.env.SUPPORT_AGENT_SMS_NUMBER || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

export async function sendSms(to: string, body: string): Promise<string> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken) {
    throw new TwilioNotConfiguredError('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set');
  }
  if (!messagingServiceSid && !fromNumber) {
    throw new TwilioNotConfiguredError(
      'Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER'
    );
  }

  const form = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) form.set('MessagingServiceSid', messagingServiceSid);
  else form.set('From', fromNumber as string);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    }
  );

  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    code?: number;
  };

  if (!response.ok) {
    throw new Error(
      `Twilio send failed (HTTP ${response.status}${payload.code ? ` / ${payload.code}` : ''}): ${
        payload.message || 'unknown error'
      }`
    );
  }

  return payload.sid || '';
}

/**
 * Validates Twilio's `X-Twilio-Signature` header.
 *
 * Twilio signs the full request URL with the POST parameters appended in
 * lexicographic key order, HMAC-SHA1 with the account auth token as the key.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;

  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const expected = crypto.createHmac('sha1', authToken).update(Buffer.from(payload, 'utf-8')).digest('base64');

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signature);
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/** Rebuilds the public URL Twilio signed, which is not what `req.url` reports behind a proxy. */
export function webhookUrl(req: any): string {
  const configured = process.env.SUPPORT_SMS_WEBHOOK_URL;
  if (configured) return configured;

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}${req.url}`;
}
