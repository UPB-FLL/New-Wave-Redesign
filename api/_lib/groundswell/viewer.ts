import { adminUser, isReportAdmin } from '../adminKey.js';
import type { ApiRequest } from '../http.js';
import { resolvePartner, type PartnerProfile } from './partners.js';
import type { Viewer } from './workspace.js';

/**
 * Who is asking, for the workspace and its files: the partner whose session
 * token it is (Bearer partner token), or a New Wave admin on the allow-list
 * (Bearer Supabase token, GROUNDSWELL_ADMIN_EMAILS), the same two doors as the
 * reports. A signed-in staff member not on the list is told so; anyone else
 * is asked to sign in.
 */

export type ViewerResult = { ok: true; viewer: Viewer; partner: PartnerProfile | null } | { ok: false; status: 401 | 403; error: string };

const bearer = (req: ApiRequest) => {
  const v = req.headers?.authorization;
  return (Array.isArray(v) ? v[0] : v)?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
};

export async function resolveViewer(req: ApiRequest): Promise<ViewerResult> {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: 'Sign in to see this customer.' };
  const partner = await resolvePartner(token);
  if (partner) return { ok: true, viewer: { kind: 'partner', partnerId: partner.id }, partner };
  const admin = await adminUser(req);
  if (admin && isReportAdmin(admin.email)) return { ok: true, viewer: { kind: 'admin' }, partner: null };
  if (admin) return { ok: false, status: 403, error: 'Your account is not on the Groundswell admin list (GROUNDSWELL_ADMIN_EMAILS).' };
  return { ok: false, status: 401, error: 'Sign in to see this customer.' };
}
