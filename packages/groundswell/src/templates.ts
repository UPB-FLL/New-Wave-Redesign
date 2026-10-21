import type { AdPlatformId, GroundswellConfig } from './config.js';

/**
 * Ad templates: ready-to-paste copy for one angle on one platform, checked
 * against that platform's character limits (from the setup file) and against
 * claims an ad may not make without proof.
 *
 * The audit's point is that a business wins on what it can show: an event
 * space with published packages, a pizza menu, a 4.8 rating. So a template
 * targets the "best pizza near me" search but never says "best pizza"
 * itself unless a third party said it and the proof is named alongside.
 */

export interface AdTemplate {
  platform: AdPlatformId;
  angle_id: string;
  /** Field name → text, or a list of variants (e.g. a search ad's headlines). Names match the platform's spec. */
  fields: Record<string, string | string[]>;
  /** Who sees it: area, age, interests or keywords, in one line. */
  targeting: string;
  /** The button or next step. */
  call_to_action: string;
  /** Third-party proof shown with any comparative claim (e.g. "Google rating 4.8 from about 283 reviews"). */
  proof?: string[];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The unsupported claims a piece of copy makes, case-insensitive, whole words only. */
export function claimsIn(text: string, claims: readonly string[]): string[] {
  return claims.filter((c) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(c)}($|[^\\p{L}\\p{N}])`, 'iu').test(text));
}

/** Every problem with a template; an empty list means it is ready to use. */
export function templateProblems(t: AdTemplate, config: GroundswellConfig): string[] {
  const platform = config.platforms[t.platform];
  if (!platform) return [`Unknown platform "${t.platform}".`];
  const spec = platform.template;
  const problems: string[] = [];

  for (const [name, rule] of Object.entries(spec.fields)) {
    const value = t.fields[name];
    const items = value === undefined ? [] : Array.isArray(value) ? value : [value];
    const min = rule.min_count ?? 1;
    const max = rule.max_count ?? 1;
    if (items.length < min) problems.push(`${platform.label} ${name}: needs at least ${min}, has ${items.length}.`);
    if (items.length > max) problems.push(`${platform.label} ${name}: at most ${max}, has ${items.length}.`);
    items.forEach((text, i) => {
      const len = [...text].length;
      if (len === 0) problems.push(`${platform.label} ${name}${items.length > 1 ? ` ${i + 1}` : ''}: is empty.`);
      if (len > rule.max_chars) problems.push(`${platform.label} ${name}${items.length > 1 ? ` ${i + 1}` : ''}: ${len} characters, limit ${rule.max_chars}.`);
    });
  }
  for (const name of Object.keys(t.fields)) {
    if (!spec.fields[name]) problems.push(`${platform.label}: "${name}" is not a field of the ${spec.format} format.`);
  }

  const copy = Object.values(t.fields).flat().join('\n');
  const claims = claimsIn(copy, config.unsupported_claims);
  if (claims.length && !(t.proof && t.proof.length)) {
    problems.push(`${platform.label}: claims ${claims.map((c) => `"${c}"`).join(', ')} with no third-party proof named.`);
  }
  if (!t.targeting.trim()) problems.push(`${platform.label}: no targeting.`);
  if (!t.call_to_action.trim()) problems.push(`${platform.label}: no call to action.`);
  return problems;
}
