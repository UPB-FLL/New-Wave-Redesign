import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Everything a run makes that is not a PDF (migration 20261029120000): the
 * business's own Instagram images it picked, the ad images built from them, a
 * carousel, and the Meta and Google Ads import files. A private bucket, one
 * object per file under the run's id, and a groundswell_assets row each.
 * Nothing is public: /api/groundswell/asset signs a short link after the same
 * ownership check as the reports (the run's partner, or an admin).
 */

export const ASSETS_BUCKET = 'groundswell-assets';
export const ASSET_KINDS = ['image', 'creative', 'carousel', 'export'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
export const isAssetKind = (v: unknown): v is AssetKind => ASSET_KINDS.includes(v as AssetKind);

export interface AssetRow {
  id?: string;
  audit_id: string;
  kind: AssetKind;
  path: string;
  name: string;
  content_type: string;
  bytes: number;
  meta: Record<string, unknown>;
  created_at?: string;
}

/** An asset's object path: the run's folder, the kind, then an ASCII file name. */
export function assetPath(auditId: string, kind: AssetKind, fileName: string): string {
  const ascii =
    fileName
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/[#?%\\/:*"<>|]/g, '')
      .replace(/\s+/g, '_')
      .trim() || `${kind}.bin`;
  return `${auditId}/${kind}/${ascii}`;
}

type StorageClient = Pick<SupabaseClient, 'storage' | 'from'>;

/** Uploads one file and records it; the same path again replaces it. */
export async function storeAsset(db: StorageClient, asset: Omit<AssetRow, 'path' | 'bytes'>, bytes: Uint8Array): Promise<AssetRow> {
  const path = assetPath(asset.audit_id, asset.kind, asset.name);
  const { error: uploadError } = await db.storage.from(ASSETS_BUCKET).upload(path, bytes, { contentType: asset.content_type, upsert: true });
  if (uploadError) throw new Error(`Could not store ${asset.name}: ${uploadError.message}`);
  const row: AssetRow = { ...asset, path, bytes: bytes.length };
  const { error } = await db.from('groundswell_assets').upsert(row, { onConflict: 'audit_id,path' });
  if (error) throw new Error(`Could not record ${asset.name}: ${error.message}`);
  return row;
}

/** A stored asset's bytes (an earlier phase's image, read again to build a later phase's ads). */
export async function readAsset(db: StorageClient, path: string): Promise<Uint8Array> {
  const { data, error } = await db.storage.from(ASSETS_BUCKET).download(path);
  if (error || !data) throw new Error(`Could not read ${path}: ${error?.message ?? 'missing'}`);
  return new Uint8Array(await data.arrayBuffer());
}

/** The assets of some runs, by run id, newest kind order: exports, creative, carousel, images. */
export async function assetsFor(db: StorageClient, auditIds: string[]): Promise<Map<string, AssetRow[]>> {
  const out = new Map<string, AssetRow[]>();
  if (!auditIds.length) return out;
  const { data, error } = await db.from('groundswell_assets').select('audit_id,kind,path,name,content_type,bytes,meta,created_at').in('audit_id', auditIds);
  if (error) {
    // Before the phases migration there is no table: no assets.
    if (/relation .* does not exist|42P01/i.test(error.message)) return out;
    throw new Error(`Could not read the files: ${error.message}`);
  }
  const order: AssetKind[] = ['export', 'creative', 'carousel', 'image'];
  for (const row of (data ?? []) as AssetRow[]) {
    if (!isAssetKind(row.kind)) continue;
    const list = out.get(row.audit_id) ?? [];
    list.push(row);
    out.set(row.audit_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
  return out;
}

/** A link that opens one asset for `seconds`, for a reader the route has already checked. */
export async function signedAssetUrl(db: StorageClient, path: string, seconds = 120, download?: string): Promise<string> {
  const { data, error } = await db.storage.from(ASSETS_BUCKET).createSignedUrl(path, seconds, download ? { download } : undefined);
  if (error || !data?.signedUrl) throw new Error(`Could not sign the file link: ${error?.message ?? 'no url'}`);
  return data.signedUrl;
}
