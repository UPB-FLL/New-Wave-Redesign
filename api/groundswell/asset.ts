import { methodGuard, queryParam, type ApiRequest, type ApiResponse } from '../_lib/http.js';
import { assetsFor, signedAssetUrl } from '../_lib/groundswell/assetStore.js';
import { resolveViewer } from '../_lib/groundswell/viewer.js';
import { getSupabaseAdmin, isSupabaseConfigured } from '../_lib/supabaseAdmin.js';

/**
 * GET /api/groundswell/asset?audit=<id>[&path=<path>] — the files a run made
 * (the business's own images, the ad images, the carousel, the Meta and
 * Google Ads import files), for the partner whose run it is or an admin on
 * the allow-list. Only paths recorded for that run are ever signed, so no
 * other run's files can be reached through it. Without a path, every file
 * of the run with a link that lasts LIST_SECONDS (for thumbnails); with one,
 * a download link for that file.
 */

export const LIST_SECONDS = 600;
const ID = /^[0-9a-f-]{36}$/i;

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!methodGuard(req, res, ['GET'])) return;
  if (!isSupabaseConfigured()) return res.status(503).json({ error: 'Files are not available right now.' });
  const auditId = queryParam(req, 'audit');
  const path = queryParam(req, 'path');
  if (!auditId || !ID.test(auditId)) return res.status(400).json({ error: 'Say which run.' });
  const who = await resolveViewer(req);
  if (!who.ok) return res.status(who.status).json({ error: who.error });

  const db = getSupabaseAdmin();
  const { data: audit, error } = await db.from('marketing_audits').select('id,partner_id').eq('id', auditId).maybeSingle();
  if (error) {
    console.error('Asset lookup failed:', error.message);
    return res.status(503).json({ error: 'Files are not available right now.' });
  }
  // A partner sees only its own runs; a missing one and someone else's answer alike.
  if (!audit || (who.viewer.kind === 'partner' && (audit as { partner_id: string | null }).partner_id !== who.viewer.partnerId)) return res.status(404).json({ error: 'No such file.' });

  const files = (await assetsFor(db, [auditId])).get(auditId) ?? [];
  try {
    if (path) {
      const file = files.find((f) => f.path === path);
      if (!file) return res.status(404).json({ error: 'No such file.' });
      return res.status(200).json({ url: await signedAssetUrl(db, file.path, 120, file.name), name: file.name });
    }
    const listed = await Promise.all(
      files.map(async (f) => ({ kind: f.kind, name: f.name, path: f.path, content_type: f.content_type, bytes: f.bytes, url: await signedAssetUrl(db, f.path, LIST_SECONDS, f.kind === 'export' ? f.name : undefined) }))
    );
    return res.status(200).json({ files: listed, expires_in: LIST_SECONDS });
  } catch (err) {
    console.error('Asset link failed:', err instanceof Error ? err.message : err);
    return res.status(503).json({ error: 'Files are not available right now.' });
  }
}
