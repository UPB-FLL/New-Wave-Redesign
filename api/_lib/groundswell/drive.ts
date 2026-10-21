import { createHash } from 'node:crypto';
import { executeTool, findKey, stageFile } from './composio.js';
import { PermanentStepError } from './types.js';

/**
 * Google Drive through Composio, as the account in GROUNDSWELL_DRIVE_OWNER
 * (josh@newwaveitfl.com by default). Reports go to My Drive/Customers/<Business>/;
 * the business folder and every file are shared "anyone with the link" as viewer,
 * never discoverable, never to individual addresses.
 */

export const driveOwner = () => (process.env.GROUNDSWELL_DRIVE_OWNER || 'josh@newwaveitfl.com').toLowerCase();

export const CUSTOMERS_FOLDER = 'Customers';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
/** GOOGLEDRIVE_UPLOAD_FILE takes files up to 5 MB. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const fileLink = (id: string) => `https://drive.google.com/file/d/${id}/view?usp=sharing`;
export const folderLink = (id: string) => `https://drive.google.com/drive/folders/${id}?usp=sharing`;

/** Quotes a value for a Drive `q` string. */
export const driveQuote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** A business name as a folder or file name: no slashes, no control characters. */
export const safeName = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex -- control characters are exactly what is removed
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'Business';

export async function checkAccount(): Promise<string> {
  const about = await executeTool('GOOGLEDRIVE_GET_ABOUT', { fields: 'user' });
  const email = String(findKey(about, 'emailAddress') ?? '').toLowerCase();
  if (email !== driveOwner()) {
    throw new PermanentStepError(`Google Drive is not connected as ${driveOwner()} in Composio${email ? ` (it is ${email})` : ''}.`);
  }
  return email;
}

async function findFolder(name: string, parent: string): Promise<string | null> {
  const result = await executeTool('GOOGLEDRIVE_FIND_FILE', {
    q: `name = ${driveQuote(name)} and mimeType = '${FOLDER_MIME}' and ${driveQuote(parent)} in parents and trashed = false`,
    fields: 'files(id,name,createdTime)',
    orderBy: 'createdTime',
    pageSize: 10,
    corpora: 'user',
  });
  const files = findKey<{ id?: string }[]>(result, 'files') ?? [];
  return files.find((f) => f.id)?.id ?? null;
}

export async function ensureFolder(name: string, parent: string): Promise<string> {
  const existing = await findFolder(name, parent);
  if (existing) return existing;
  const created = await executeTool('GOOGLEDRIVE_CREATE_FOLDER', parent === 'root' ? { name } : { name, parent_id: parent });
  const id = findKey<string>(created, 'id');
  if (!id) throw new Error(`Drive did not return an id for the new folder "${name}".`);
  return id;
}

interface FileMeta {
  id?: string;
  name?: string;
  parents?: string[];
  md5Checksum?: string;
  owners?: { emailAddress?: string }[];
  permissions?: { type?: string; role?: string; allowFileDiscovery?: boolean }[];
}

export async function metadata(id: string, fields: string): Promise<FileMeta> {
  const result = await executeTool('GOOGLEDRIVE_GET_FILE_METADATA', { fileId: id, fields });
  return findFileMeta(result) ?? {};
}

/** The object in a tool result that carries the file's `id`. */
function findFileMeta(value: unknown, depth = 0): FileMeta | null {
  if (!value || typeof value !== 'object' || depth > 6) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id === 'string') return record as FileMeta;
  for (const child of Object.values(record)) {
    const hit = findFileMeta(child, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** Uploads a PDF into `folderId` and checks that Drive stored it there, byte for byte. */
export async function uploadPdf(name: string, bytes: Uint8Array, folderId: string): Promise<string> {
  if (bytes.length > MAX_UPLOAD_BYTES) throw new PermanentStepError(`${name} is ${(bytes.length / 1048576).toFixed(1)} MB; Drive uploads through Composio stop at 5 MB.`);
  const s3key = await stageFile('googledrive', 'GOOGLEDRIVE_UPLOAD_FILE', name, 'application/pdf', bytes);
  const result = await executeTool(
    'GOOGLEDRIVE_UPLOAD_FILE',
    { file_to_upload: { name, mimetype: 'application/pdf', s3key }, folder_to_upload_to: folderId },
    120_000
  );
  const id = findFileMeta(result)?.id;
  if (!id) throw new Error(`Drive did not return an id for ${name}.`);
  const meta = await metadata(id, 'id,name,parents,md5Checksum');
  const md5 = createHash('md5').update(bytes).digest('hex');
  // The upload tool silently falls back to My Drive's root for a bad folder id.
  if (!meta.parents?.includes(folderId)) throw new Error(`${name} landed outside the business folder in Drive.`);
  if (meta.md5Checksum && meta.md5Checksum !== md5) throw new Error(`${name} in Drive does not match the file that was printed.`);
  return id;
}

export async function shareAnyoneReader(id: string): Promise<void> {
  await executeTool('GOOGLEDRIVE_CREATE_PERMISSION', { file_id: id, type: 'anyone', role: 'reader', allow_file_discovery: false });
}

/** Throws unless the item is owned by the Drive owner, readable by link, and not discoverable. */
export async function verifyShared(id: string, parent?: string): Promise<void> {
  const meta = await metadata(id, 'id,name,parents,owners,permissions');
  const label = meta.name ?? id;
  if (!meta.owners?.some((o) => o.emailAddress?.toLowerCase() === driveOwner())) {
    throw new Error(`${label} is not owned by ${driveOwner()}.`);
  }
  const anyone = meta.permissions?.find((p) => p.type === 'anyone');
  if (!anyone || anyone.role !== 'reader' || anyone.allowFileDiscovery === true) {
    throw new Error(`${label} is not shared as "anyone with the link can view".`);
  }
  if (parent && !meta.parents?.includes(parent)) throw new Error(`${label} is not in the business folder.`);
}
