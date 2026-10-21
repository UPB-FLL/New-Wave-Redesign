import type { AdPlan, AngleInput } from './adplan.js';
import type { AdPlatformId, GroundswellConfig } from './config.js';
import { claimsIn, templateProblems, type AdTemplate } from './templates.js';

/**
 * Ad copy for the rows an ad plan runs (funded and tested), held to each
 * platform's format and to what the business can show.
 *
 * Whoever runs the package writes the copy (New Wave's engine asks a language
 * model); `checkCopy` decides what survives:
 * - only rows the plan runs, one ad per angle and platform, funded rows first;
 * - every line within the platform's character limit, with no claim from the
 *   setup file's `unsupported_claims` (never, even with proof: a line that
 *   needs a source to be true is left out), and no number the caller rejects
 *   (in New Wave's engine, any number that is not in the audit's data);
 * - duplicate lines, and fields the format does not have, are dropped;
 * - a search row's targeting is its Keyword Planner keywords, set here;
 * - what is left must pass `templateProblems`, or the row is listed as not
 *   written, with the reason.
 */

/** The most ads one audit writes: every funded row, then tested rows, up to this many. */
export const COPY_LIMIT = 8;
const CTA_MAX_CHARS = 120;
const TARGETING_MAX_CHARS = 240;

export interface CopyTarget {
  angle_id: string;
  angle: string;
  why: string;
  platform: AdPlatformId;
  platform_label: string;
  buying: 'search' | 'social';
  recommendation: 'fund' | 'test';
  keywords: string[];
  /** The platform's rules for this row (an age limit for alcohol, say), one sentence each. */
  conditions: string[];
}

/** One ad per angle and platform the plan funds or tests: funded rows first, in the plan's order. */
export function copyTargets(plan: AdPlan, angles: AngleInput[], limit = COPY_LIMIT): CopyTarget[] {
  const byId = new Map(angles.map((a) => [a.id, a]));
  const live = [...plan.rows.filter((r) => r.recommendation === 'fund'), ...plan.rows.filter((r) => r.recommendation === 'test')];
  const seen = new Set<string>();
  const out: CopyTarget[] = [];
  for (const r of live) {
    const key = `${r.angle_id}|${r.platform}`;
    if (seen.has(key) || out.length >= limit) continue;
    seen.add(key);
    const angle = byId.get(r.angle_id);
    out.push({
      angle_id: r.angle_id,
      angle: r.angle,
      why: angle?.why ?? '',
      platform: r.platform,
      platform_label: r.platform_label,
      buying: r.buying,
      recommendation: r.recommendation as 'fund' | 'test',
      keywords: (angle?.keywords ?? []).map((k) => k.keyword),
      conditions: r.conditions,
    });
  }
  return out;
}

export interface CheckedAd extends AdTemplate {
  angle: string;
  platform_label: string;
  recommendation: 'fund' | 'test';
  format: string;
  /** Where the platform's limits come from, with its edition. */
  limits_source: string;
}

export interface CopyResult {
  ads: CheckedAd[];
  /** Rows the plan runs that have no ad, and why. */
  not_written: { angle: string; platform_label: string; reason: string }[];
  /** Lines the checks removed, each with the reason. */
  dropped: string[];
}

const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');

/** Why a line cannot run, or null. */
function lineProblem(text: string, maxChars: number, config: GroundswellConfig, badNumbers: (text: string) => string[]): string | null {
  if (!text) return 'empty';
  const len = [...text].length;
  if (len > maxChars) return `${len} characters, limit ${maxChars}`;
  const claims = claimsIn(text, config.unsupported_claims);
  if (claims.length) return `claims ${claims.map((c) => `"${c}"`).join(', ')}`;
  const numbers = badNumbers(text);
  if (numbers.length) return `uses ${numbers.join(', ')}, which the data does not show`;
  return null;
}

const asRecord = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Holds written copy to the formats and the data. `raw` is `{ ads: [{ angle_id,
 * platform, fields, targeting, call_to_action }] }`; `badNumbers` returns the
 * numbers in a line that the data does not support.
 */
export function checkCopy(
  raw: unknown,
  targets: CopyTarget[],
  config: GroundswellConfig,
  badNumbers: (text: string) => string[] = () => []
): CopyResult {
  const answers = (Array.isArray(asRecord(raw).ads) ? (asRecord(raw).ads as unknown[]) : []).map(asRecord);
  const ads: CheckedAd[] = [];
  const not_written: CopyResult['not_written'] = [];
  const dropped: string[] = [];
  const wanted = new Set(targets.map((t) => `${t.angle_id}|${t.platform}`));
  for (const a of answers) {
    if (!wanted.has(`${clean(a.angle_id)}|${clean(a.platform)}`)) dropped.push(`An ad for "${clean(a.angle_id)}" on ${clean(a.platform) || 'no platform'}, a row the plan does not run.`);
  }

  for (const t of targets) {
    const platform = config.platforms[t.platform];
    const miss = (reason: string) => not_written.push({ angle: t.angle, platform_label: t.platform_label, reason });
    const answer = answers.find((a) => clean(a.angle_id) === t.angle_id && clean(a.platform) === t.platform);
    if (!platform) {
      miss('The platform is not in the setup file.');
      continue;
    }
    if (!answer) {
      miss('No copy came back for this row.');
      continue;
    }
    const spec = platform.template;
    const given = asRecord(answer.fields);
    const fields: AdTemplate['fields'] = {};
    for (const name of Object.keys(given)) {
      if (!spec.fields[name]) dropped.push(`${platform.label}: "${name}" is not a field of the ${spec.format} format.`);
    }
    for (const [name, rule] of Object.entries(spec.fields)) {
      const value = given[name];
      const lines = (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(clean);
      const kept: string[] = [];
      for (const line of lines) {
        const problem = kept.some((k) => k.toLowerCase() === line.toLowerCase()) ? 'a repeat' : lineProblem(line, rule.max_chars, config, badNumbers);
        if (problem) {
          if (line) dropped.push(`${t.angle} on ${platform.label}, ${name}: "${line}" (${problem}).`);
        } else if (kept.length < (rule.max_count ?? 1)) kept.push(line);
      }
      if (!kept.length) continue;
      fields[name] = (rule.max_count ?? 1) > 1 ? kept : kept[0];
    }

    const targeting = t.buying === 'search' ? `Keywords: ${t.keywords.join(', ')}` : clean(answer.targeting);
    const targetingProblem = t.buying === 'search' ? (t.keywords.length ? null : 'no keywords') : lineProblem(targeting, TARGETING_MAX_CHARS, config, badNumbers);
    if (targetingProblem) {
      miss(`Its targeting cannot run (${targetingProblem}).`);
      continue;
    }
    const cta = clean(answer.call_to_action);
    const ctaProblem = lineProblem(cta, CTA_MAX_CHARS, config, badNumbers);
    if (ctaProblem) {
      miss(`Its call to action cannot run (${ctaProblem}).`);
      continue;
    }

    const ad: AdTemplate = { platform: t.platform, angle_id: t.angle_id, fields, targeting, call_to_action: cta };
    const problems = templateProblems(ad, config);
    if (problems.length) {
      miss(problems.join(' '));
      continue;
    }
    ads.push({
      ...ad,
      angle: t.angle,
      platform_label: t.platform_label,
      recommendation: t.recommendation,
      format: spec.format,
      limits_source: `${spec.source} (${spec.as_of})`,
    });
  }
  return { ads, not_written, dropped };
}
