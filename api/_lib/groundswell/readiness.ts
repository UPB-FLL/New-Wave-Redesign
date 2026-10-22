import { getSupabaseAdmin, isSupabaseConfigured } from '../supabaseAdmin.js';
import { CLIENT_SERVICES } from '../../../src/lib/groundswellValidation.js';
import { activeConnection, authConfigFor, isComposioConfigured, keyShape } from './composio.js';
import { REPORTS_BUCKET } from './reportStore.js';
import { PermanentStepError } from './types.js';

/**
 * Live readiness checks for the staff overview: each service Groundswell
 * runs on is asked to answer, so a partner never finds a gap by queueing an
 * audit. A check's detail is for staff and never carries a key or a value.
 *
 * `required` checks stop every audit (nothing is written or stored without
 * them). The toolkit checks do not: a prospect's audit runs without any of
 * them and names the gap in its reports (gaps.ts), so they say what is lost.
 */

export interface ReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  required: boolean;
  /** What was found, in words a staff member can act on; never a value. */
  detail: string;
}

/** The Composio toolkits the Currents read, and what a prospect's audit loses without each. */
export const TOOLKIT_CHECKS = [
  { toolkit: 'ahrefs', label: 'Ahrefs (search rankings, paid pages, authority)', without: 'search rankings, paid pages and domain authority are left out of the reports' },
  { toolkit: 'scrapecreators', label: 'ScrapeCreators (Instagram, ad libraries)', without: 'Instagram and the ad libraries are left out of the reports' },
  { toolkit: 'google_maps', label: 'Google Places (Maps listing, competitor picks)', without: 'Maps is read from its public view and no competitors are picked' },
  { toolkit: 'googleads', label: 'Google Ads (Keyword Planner)', without: 'keyword demand, the ad plan and the ad copy are left out of the reports' },
] as const;

const TIMEOUT_MS = 15_000;
const message = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 300);

async function checkStorage(): Promise<ReadinessCheck> {
  const base = { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role and the reports bucket', required: true };
  if (!isSupabaseConfigured()) return { ...base, ok: false, detail: 'SUPABASE_SERVICE_ROLE_KEY is missing in Vercel.' };
  try {
    const { error } = await getSupabaseAdmin().storage.from(REPORTS_BUCKET).list('', { limit: 1 });
    if (error) return { ...base, ok: false, detail: `The reports bucket "${REPORTS_BUCKET}" is not reachable: ${error.message}` };
    return { ...base, ok: true, detail: `The reports bucket "${REPORTS_BUCKET}" answered.` };
  } catch (err) {
    return { ...base, ok: false, detail: `Supabase could not be reached: ${message(err)}` };
  }
}

async function checkOpenAI(fetchImpl: typeof fetch): Promise<ReadinessCheck> {
  const base = { key: 'OPENAI_API_KEY', label: 'OpenAI (the write-up)', required: true };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ...base, ok: false, detail: 'OPENAI_API_KEY is missing in Vercel.' };
  try {
    const response = await fetchImpl('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 401) return { ...base, ok: false, detail: 'OpenAI refused the key.' };
    if (!response.ok) return { ...base, ok: false, detail: `OpenAI answered ${response.status}.` };
    return { ...base, ok: true, detail: 'OpenAI accepted the key.' };
  } catch (err) {
    return { ...base, ok: false, detail: `OpenAI could not be reached: ${message(err)}` };
  }
}

/** The sign-ins partners can offer a client: one auth config per client service in the Composio project. */
const SIGNIN_CHECKS = CLIENT_SERVICES.map((s) => ({ key: `authconfig:${s.toolkit}`, label: `Client sign-in: ${s.label}`, toolkit: s.toolkit, service: s.label }));

/** The Composio key, one check per toolkit the Currents read, and one per client sign-in. */
async function checkComposio(): Promise<ReadinessCheck[]> {
  const keyCheck = { key: 'COMPOSIO_API_KEY', label: 'Composio project key', required: true };
  const toolkits = TOOLKIT_CHECKS.map((t) => ({ key: `composio:${t.toolkit}`, label: t.label, required: false, without: t.without }));
  if (!isComposioConfigured()) {
    const unchecked = { required: false, ok: false, detail: 'Not checked: Composio is not set up.' };
    return [
      { ...keyCheck, ok: false, detail: 'COMPOSIO_API_KEY is missing in Vercel.' },
      ...toolkits.map((t) => ({ key: t.key, label: t.label, ...unchecked })),
      ...SIGNIN_CHECKS.map((t) => ({ key: t.key, label: t.label, ...unchecked })),
    ];
  }
  const [results, signins] = await Promise.all([
    Promise.all(
      TOOLKIT_CHECKS.map(async (t) => {
        try {
          return { account: await activeConnection(t.toolkit), error: null as unknown };
        } catch (err) {
          return { account: null, error: err };
        }
      })
    ),
    Promise.all(
      SIGNIN_CHECKS.map(async (t) => {
        try {
          return { config: await authConfigFor(t.toolkit), error: null as unknown };
        } catch (err) {
          return { config: null, error: err };
        }
      })
    ),
  ]);
  const refused = [...results, ...signins].find((r) => r.error instanceof PermanentStepError && /API key/i.test(message(r.error)))?.error;
  const answered = results.some((r) => !r.error);
  const key: ReadinessCheck = refused
    ? { ...keyCheck, ok: false, detail: message(refused) }
    : answered
      ? { ...keyCheck, ok: true, detail: `Composio accepted the key (${keyShape(process.env.COMPOSIO_API_KEY ?? '')}).` }
      : { ...keyCheck, ok: false, detail: `Composio could not be reached: ${message(results[0]?.error)}` };
  return [
    key,
    ...toolkits.map(({ without, ...t }, i) => {
      const r = results[i];
      if (r.error) return { ...t, ok: false, detail: refused ? 'Not checked: the key was refused.' : `Could not list connections: ${message(r.error)}` };
      if (!r.account) return { ...t, ok: false, detail: `No active connection in the project; ${without}. Connect it under Auth Configs.` };
      return { ...t, ok: true, detail: `Active connection found${r.account.user_id ? ` (user id ${r.account.user_id})` : ''}.` };
    }),
    ...SIGNIN_CHECKS.map((t, i) => {
      const r = signins[i];
      const base = { key: t.key, label: t.label, required: false };
      if (r.error) return { ...base, ok: false, detail: refused ? 'Not checked: the key was refused.' : `Could not list auth configs: ${message(r.error)}` };
      if (!r.config) return { ...base, ok: false, detail: `No auth config in the Composio project, so partners cannot link ${t.service} for a client. Add one under Auth Configs.` };
      return { ...base, ok: true, detail: `Auth config present; partners can link ${t.service}.` };
    }),
  ];
}

function envChecks(): ReadinessCheck[] {
  const set = (name: string) => Boolean(process.env[name]);
  return [
    {
      key: 'RESEND_API_KEY',
      label: 'Resend (partner invites and resets)',
      required: false,
      ok: set('RESEND_API_KEY'),
      detail: set('RESEND_API_KEY') ? 'Set.' : 'Not set: invite and reset links are shown on the partners screen instead of emailed.',
    },
    {
      key: 'GOOGLE_ADS_CUSTOMER_ID',
      label: 'Google Ads customer id (Keyword Planner)',
      required: false,
      ok: set('GOOGLE_ADS_CUSTOMER_ID'),
      detail: set('GOOGLE_ADS_CUSTOMER_ID') ? 'Set.' : 'Not set: Keyword Planner uses the connected account’s default customer.',
    },
  ];
}

/** Every check, with the services asked to answer. Never throws: a failure is a check that is not ok. */
export async function readinessChecks(fetchImpl: typeof fetch = fetch): Promise<ReadinessCheck[]> {
  const [storage, openai, composio] = await Promise.all([checkStorage(), checkOpenAI(fetchImpl), checkComposio()]);
  return [storage, openai, ...composio, ...envChecks()];
}

/** One line for the overview: ready, ready with data sources missing, or not ready. */
export function readinessSummary(checks: ReadinessCheck[]): { ready: boolean; complete: boolean; summary: string } {
  const required = checks.filter((c) => c.required && !c.ok);
  const optional = checks.filter((c) => !c.required && !c.ok && c.key.startsWith('composio:'));
  if (required.length) return { ready: false, complete: false, summary: `Not ready: ${required.map((c) => c.label).join(', ')}.` };
  if (optional.length) {
    return { ready: true, complete: false, summary: `Audits run, with ${optional.length} data source${optional.length === 1 ? '' : 's'} missing: ${optional.map((c) => c.label).join(', ')}.` };
  }
  return { ready: true, complete: true, summary: 'Ready: every service answered.' };
}
