import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  TOKEN_MIN_AGE_MS,
  TOKEN_MAX_AGE_MS,
  checkContactSpam,
  issueFormToken,
  looksLikeGibberish,
  normalizeEmailForKey,
  verifyFormToken,
} from '../../../api/_lib/spam';

const NOW = 1_756_100_000_000;

beforeAll(() => {
  vi.stubEnv('CONTACT_FORM_TOKEN_SECRET', 'test-secret');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

function agedToken(ageMs: number): string {
  return issueFormToken(NOW - ageMs);
}

describe('verifyFormToken', () => {
  it('accepts a signed token older than the minimum age', () => {
    expect(verifyFormToken(agedToken(TOKEN_MIN_AGE_MS + 1000), NOW)).toBe('ok');
  });

  it('rejects submissions faster than a human could type', () => {
    expect(verifyFormToken(agedToken(500), NOW)).toBe('too_fast');
  });

  it('rejects expired tokens', () => {
    expect(verifyFormToken(agedToken(TOKEN_MAX_AGE_MS + 1000), NOW)).toBe('expired');
  });

  it('rejects missing, malformed, and forged tokens', () => {
    expect(verifyFormToken(undefined, NOW)).toBe('missing');
    expect(verifyFormToken('', NOW)).toBe('missing');
    expect(verifyFormToken('no-dot', NOW)).toBe('malformed');
    expect(verifyFormToken('abc.def', NOW)).toBe('malformed');
    expect(verifyFormToken(`${NOW - 10_000}.forged-signature`, NOW)).toBe('bad_signature');
  });
});

describe('looksLikeGibberish', () => {
  it('flags random-case bot names', () => {
    expect(looksLikeGibberish('vytakXeEueievMohUwSl')).toBe(true);
    expect(looksLikeGibberish('qJxwRtZpLm')).toBe(true);
  });

  it('passes real names, including unusual but human ones', () => {
    for (const name of ['John Smith', 'Ronald McDonald', 'Leonardo DiCaprio', 'Krzysztof Wysocki', 'Mary-Jane O\'Brien', 'LaTanya Jackson']) {
      expect(looksLikeGibberish(name), name).toBe(false);
    }
  });
});

describe('normalizeEmailForKey', () => {
  it('collapses gmail dot and plus aliases to one key', () => {
    expect(normalizeEmailForKey('jaim.e.l.yn22@gmail.com')).toBe('jaimelyn22@gmail.com');
    expect(normalizeEmailForKey('Jaimelyn22+tag@GMAIL.com')).toBe('jaimelyn22@gmail.com');
  });

  it('strips plus tags but keeps dots for other providers', () => {
    expect(normalizeEmailForKey('First.Last+news@example.com')).toBe('first.last@example.com');
  });
});

describe('checkContactSpam', () => {
  const validToken = () => agedToken(TOKEN_MIN_AGE_MS + 5000);

  it('accepts a normal human submission', () => {
    const verdict = checkContactSpam({
      name: 'John Smith',
      message: 'Our office needs managed IT support for 12 workstations.',
      honeypot: '',
      token: validToken(),
      now: NOW,
    });
    expect(verdict).toEqual({ spam: false, reasons: [] });
  });

  it('flags the observed bot submission for both its name and its message', () => {
    const verdict = checkContactSpam({
      name: 'vytakXeEueievMohUwSl',
      message: '4805282150',
      honeypot: '',
      token: validToken(),
      now: NOW,
    });
    expect(verdict.spam).toBe(true);
    expect(verdict.reasons).toContain('name_gibberish');
    expect(verdict.reasons).toContain('message_without_words');
  });

  it('flags a filled honeypot even when everything else looks human', () => {
    const verdict = checkContactSpam({
      name: 'John Smith',
      message: 'Please call me about your services.',
      honeypot: 'https://spam.example',
      token: validToken(),
      now: NOW,
    });
    expect(verdict.reasons).toEqual(['honeypot_filled']);
  });

  it('flags a missing token', () => {
    const verdict = checkContactSpam({
      name: 'John Smith',
      message: 'Please call me about your services.',
      honeypot: '',
      now: NOW,
    });
    expect(verdict.reasons).toEqual(['token_missing']);
  });

  it('flags link-only and link-flood messages', () => {
    const linkOnly = checkContactSpam({
      name: 'John Smith',
      message: 'https://spam.example/offer',
      honeypot: '',
      token: validToken(),
      now: NOW,
    });
    expect(linkOnly.reasons).toContain('message_only_links');

    const flood = checkContactSpam({
      name: 'John Smith',
      message: 'Buy now http://a.example http://b.example http://c.example http://d.example',
      honeypot: '',
      token: validToken(),
      now: NOW,
    });
    expect(flood.reasons).toContain('message_link_flood');
  });

  it('does not flag short but real messages', () => {
    const verdict = checkContactSpam({
      name: 'John Smith',
      message: 'Call me back please.',
      honeypot: '',
      token: validToken(),
      now: NOW,
    });
    expect(verdict.spam).toBe(false);
  });
});
