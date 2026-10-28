/**
 * What a step writes to Postgres has to be JSON that jsonb accepts: a string
 * cut in the middle of an emoji leaves a lone surrogate, which JSON.stringify
 * escapes as `\ud83c` and PostgREST and Postgres both refuse ("Unicode low
 * surrogate must follow a high surrogate"), and jsonb never holds `\u0000`.
 * `storable` returns the value with every string made well-formed (a lone
 * surrogate becomes U+FFFD, NUL is dropped), so a provider's text can never
 * stop an output from being saved.
 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export const storableString = (s: string): string => s.replace(LONE_SURROGATE, '\uFFFD').split('\u0000').join('');

export function storable<T>(value: T): T {
  if (typeof value === 'string') return storableString(value) as T;
  if (Array.isArray(value)) return value.map((v) => storable(v)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[storableString(k)] = storable(v);
    }
    return out as T;
  }
  return value;
}

/** The first `n` UTF-16 units of `s`, never ending on half an emoji. */
export const cut = (s: string, n: number): string => s.slice(0, n).replace(/[\uD800-\uDBFF]$/, '');
