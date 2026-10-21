import { beforeEach, describe, expect, it, vi } from 'vitest';

const composio = vi.hoisted(() => ({ executeTool: vi.fn(), stageFile: vi.fn() }));
vi.mock('../../../api/_lib/groundswell/composio', async (orig) => ({
  ...(await orig<typeof import('../../../api/_lib/groundswell/composio')>()),
  executeTool: composio.executeTool,
  stageFile: composio.stageFile,
}));

import { createHash } from 'node:crypto';
import { checkAccount, driveQuote, ensureFolder, safeName, uploadPdf, verifyShared } from '../../../api/_lib/groundswell/drive';
import { PermanentStepError } from '../../../api/_lib/groundswell/types';

const bytes = new TextEncoder().encode('%PDF-1.4 sample');
const md5 = createHash('md5').update(bytes).digest('hex');

beforeEach(() => {
  composio.executeTool.mockReset();
  composio.stageFile.mockReset();
  composio.stageFile.mockResolvedValue('staged/key');
});

describe('names and queries', () => {
  it('quotes names for Drive queries and cleans folder names', () => {
    expect(driveQuote("Joe's \\ Shop")).toBe("'Joe\\'s \\\\ Shop'");
    expect(safeName('A/B: Auto*Care  ')).toBe('A B Auto Care');
  });
});

describe('checkAccount', () => {
  it('accepts only the Drive owner', async () => {
    composio.executeTool.mockResolvedValueOnce({ data: { user: { emailAddress: 'Josh@NewWaveITFL.com' } } });
    await expect(checkAccount()).resolves.toBe('josh@newwaveitfl.com');
    composio.executeTool.mockResolvedValueOnce({ data: { user: { emailAddress: 'someone@else.com' } } });
    await expect(checkAccount()).rejects.toBeInstanceOf(PermanentStepError);
  });
});

describe('ensureFolder', () => {
  it('reuses an existing folder', async () => {
    composio.executeTool.mockResolvedValueOnce({ data: { files: [{ id: 'F1' }] } });
    await expect(ensureFolder('Customers', 'root')).resolves.toBe('F1');
    expect(composio.executeTool).toHaveBeenCalledTimes(1);
    expect(composio.executeTool.mock.calls[0][1].q).toContain("'root' in parents");
  });

  it('creates one inside the parent when none exists', async () => {
    composio.executeTool.mockResolvedValueOnce({ data: { files: [] } }).mockResolvedValueOnce({ data: { id: 'NEW' } });
    await expect(ensureFolder('Harbor', 'CUST')).resolves.toBe('NEW');
    expect(composio.executeTool.mock.calls[1]).toEqual(['GOOGLEDRIVE_CREATE_FOLDER', { name: 'Harbor', parent_id: 'CUST' }]);
  });
});

describe('uploadPdf', () => {
  it('uploads into the folder and checks where it landed and its checksum', async () => {
    composio.executeTool
      .mockResolvedValueOnce({ data: { file: { id: 'PDF1', name: 'x.pdf' } } })
      .mockResolvedValueOnce({ data: { id: 'PDF1', parents: ['FOLDER'], md5Checksum: md5 } });
    await expect(uploadPdf('x.pdf', bytes, 'FOLDER')).resolves.toBe('PDF1');
    expect(composio.executeTool.mock.calls[0][1]).toEqual({
      file_to_upload: { name: 'x.pdf', mimetype: 'application/pdf', s3key: 'staged/key' },
      folder_to_upload_to: 'FOLDER',
    });
  });

  it('refuses a file that fell back to My Drive root', async () => {
    composio.executeTool
      .mockResolvedValueOnce({ data: { id: 'PDF1' } })
      .mockResolvedValueOnce({ data: { id: 'PDF1', parents: ['ROOT'], md5Checksum: md5 } });
    await expect(uploadPdf('x.pdf', bytes, 'FOLDER')).rejects.toThrow(/outside the business folder/);
  });
});

describe('verifyShared', () => {
  const meta = (permissions: unknown[], owner = 'josh@newwaveitfl.com') => ({
    data: { id: 'X', name: 'x.pdf', parents: ['FOLDER'], owners: [{ emailAddress: owner }], permissions },
  });

  it('passes an owned, link-readable, undiscoverable file', async () => {
    composio.executeTool.mockResolvedValueOnce(meta([{ type: 'anyone', role: 'reader', allowFileDiscovery: false }]));
    await expect(verifyShared('X', 'FOLDER')).resolves.toBeUndefined();
  });

  it('fails a restricted, editable or foreign-owned file', async () => {
    composio.executeTool.mockResolvedValueOnce(meta([{ type: 'user', role: 'owner' }]));
    await expect(verifyShared('X')).rejects.toThrow(/anyone with the link/);
    composio.executeTool.mockResolvedValueOnce(meta([{ type: 'anyone', role: 'writer' }]));
    await expect(verifyShared('X')).rejects.toThrow(/anyone with the link/);
    composio.executeTool.mockResolvedValueOnce(meta([{ type: 'anyone', role: 'reader' }], 'other@x.com'));
    await expect(verifyShared('X')).rejects.toThrow(/not owned/);
  });
});
