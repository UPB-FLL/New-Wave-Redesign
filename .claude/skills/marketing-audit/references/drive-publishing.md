# Publishing to Google Drive

Reports live in the Google Drive of **josh@newwaveitfl.com**, reached through the Composio
`googledrive` connection. Layout:

```
My Drive/
  Customers/                      (one folder, created once; reuse its id)
    <Business name>/              (one per business; reuse it when an audit runs again)
      <Business> - Marketing Audit Summary.pdf
      <Business> - Marketing Audit Slides.pdf
      <Business> - Full Marketing Audit.pdf
```

Every file **and** the business folder is shared **"Anyone with the link" → Viewer** (a permission of
type `anyone`, role `reader`, `allow_file_discovery: false`). Never "Restricted", never shared to
individual addresses, never an editor role.

## Steps

1. **Check the account.** `GOOGLEDRIVE_GET_ABOUT` must report `josh@newwaveitfl.com`. If the connection is
   missing or reports another address, stop and fail the audit with
   "Google Drive is not connected as josh@newwaveitfl.com" (never upload to another account).
2. **Find or create folders.** `GOOGLEDRIVE_FIND_FILE` with
   `q: "name = 'Customers' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false"`;
   create it with `GOOGLEDRIVE_CREATE_FOLDER` only when none exists. Then the same for the business folder
   inside `Customers` (`'<customers id>' in parents`). Use ids, never names, after this.
3. **Upload each PDF**, in the order in `report-specs.md` (audit, then deck, then summary). The PDFs are
   on this machine, not in Composio's sandbox, so use a Drive resumable upload:
   - In `COMPOSIO_REMOTE_WORKBENCH`, call
     `proxy_execute("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink", "googledrive", body={"name": "<file name>", "parents": ["<business folder id>"], "mimeType": "application/pdf"}, headers={"X-Upload-Content-Type": "application/pdf"})`
     and read the `Location` header: the upload session URL. It authorizes the upload by itself, so
     treat it as a secret: write it to a file in your scratchpad, never print it or put it in a report.
   - From this machine: `curl -sS -X PUT -H 'Content-Type: application/pdf' --data-binary @<file.pdf> "$(cat <session file>)"`
     returns the new file's `id`. Delete the session file afterwards.
   - Fallback (files under 5 MB): base64 the PDF into the workbench in chunks, write it under
     `/mnt/files/`, `upload_local_file()` it, and pass the returned `s3key` to `GOOGLEDRIVE_UPLOAD_FILE`
     with `folder_to_upload_to` set.
   Re-running an audit uploads new files; move the previous versions of the same names to the trash
   only after the new ones are shared and verified.
4. **Share.** `GOOGLEDRIVE_CREATE_PERMISSION` with `file_id`, `type: "anyone"`, `role: "reader"`,
   `allow_file_discovery: false`, for each file and for the business folder (not for `Customers`).
5. **Verify.** `GOOGLEDRIVE_GET_FILE_METADATA` (fields `id,name,webViewLink,permissions,owners,parents`)
   for each item: an `anyone`/`reader` permission, owner `josh@newwaveitfl.com`, the right parent. Links are
   `https://drive.google.com/file/d/<id>/view?usp=sharing` and
   `https://drive.google.com/drive/folders/<id>?usp=sharing`.
6. **Write back.** Only verified Drive links go into `marketing_audits` (the table's CHECK constraints
   refuse anything else).
