import { describe, expect, it } from 'vitest';
import { cut, storable, storableString } from '../../../api/_lib/groundswell/storable';

/** What a step writes has to be JSON that jsonb accepts: no lone surrogate (half an emoji), no NUL. */
describe('storable', () => {
  it('makes every string well-formed and drops NUL, through objects and arrays', () => {
    const half = '🍻'.slice(0, 1); // a lone high surrogate
    const out = storable({ caption: `Cheers ${half}`, nested: [{ text: `a\u0000b`, n: 1, ok: true, nothing: null }], keep: 'fine 🍕' });
    expect(out).toEqual({ caption: 'Cheers �', nested: [{ text: 'ab', n: 1, ok: true, nothing: null }], keep: 'fine 🍕' });
    expect(JSON.stringify(out).includes('\\ud83c')).toBe(false);
    expect(storableString('🍻'.slice(1))).toBe('�'); // a lone low surrogate
    expect(storable(undefined)).toBeUndefined();
    expect(storable({ a: undefined, b: 2 })).toEqual({ b: 2 });
  });

  it('cut never ends on half an emoji', () => {
    expect(cut('Cheers 🍻 tonight', 8)).toBe('Cheers ');
    expect(cut('Cheers 🍻 tonight', 9)).toBe('Cheers 🍻');
    expect(cut('short', 10)).toBe('short');
    expect(storableString(cut('Cheers 🍻 tonight', 8))).toBe(cut('Cheers 🍻 tonight', 8));
  });
});
