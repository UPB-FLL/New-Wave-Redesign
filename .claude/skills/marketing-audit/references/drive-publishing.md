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
3. **Reserve the three file ids before building anything.** In `COMPOSIO_REMOTE_WORKBENCH`:
   `proxy_execute("GET", "https://www.googleapis.com/drive/v3/files/generateIds", "googledrive", query_params={"count": "3", "space": "drive", "type": "files"})`
   returns `ids`: one each for the audit, the deck and the summary. Their links are known now, so all
   three reports are built with their final Drive links (`report-specs.md`) and nothing is rebuilt after
   an upload. Save the ids in `$W/drive.json`.
4. **Print the PDFs in the workbench.** Files reach Composio's sandbox only as text inside a tool call
   (`proxy_execute` returns no headers, so a resumable upload session can't be handed to this machine).
   The built sources are far smaller than the PDFs, so send those:
   - Here: `python3 -I $A/scripts/pack_for_workbench.py $W/audit $W/deck $W/onepager.html $W/pack`
     writes `piece_NN` files (base64, ≤ 30,000 characters) and `manifest.json`.
   - In one workbench cell, paste the text of `scripts/workbench_render.py` and `exec` it. Then send each
     piece in its own cell, written to `/tmp/<slug>/piece_NN`, checking its sha256 prefix against the
     manifest in the same cell (resend on a mismatch). Paste the text exactly as `cat` printed it; long runs
     of one character (`AAAA…`) can come through altered, so if a piece keeps failing, send such a run
     as `"A" * n`.
   - `assemble("/tmp/<slug>", MANIFEST)` checks every piece and the whole archive, then
     `render_all(<bundle>, "/tmp/<slug>/out")` prints `audit.pdf`, `deck.pdf` and `summary.pdf`.
     Each result's page count and links must equal the local PDFs', with `broken_images` 0.
5. **Upload** each workbench PDF under its reserved id: `upload_local_file(<pdf>)` returns an `s3key`;
   then `run_composio_tool("GOOGLEDRIVE_RESUMABLE_UPLOAD", {"file_to_upload": {"name": <file name>, "mimetype": "application/pdf", "s3key": <s3key>}, "metadata": {"name": <file name>, "id": <reserved id>, "parents": [<business folder id>]}})`.
   The result's `file.id` must equal the reserved id. Re-running an audit reserves new ids and uploads
   new files; move the previous versions of the same names to the trash only after the new ones are
   shared and verified.
6. **Share.** `GOOGLEDRIVE_CREATE_PERMISSION` with `file_id`, `type: "anyone"`, `role: "reader"`,
   `allow_file_discovery: false`, for each file and for the business folder (not for `Customers`).
   (`proxy_execute("POST", ".../drive/v3/files/<id>/permissions", "googledrive", body={"type": "anyone", "role": "reader", "allowFileDiscovery": False})` does the same.)
7. **Verify.** `GOOGLEDRIVE_GET_FILE_METADATA` (fields `id,name,md5Checksum,permissions,owners,parents`)
   for each item: an `anyone`/`reader` permission, owner `josh@newwaveitfl.com`, the right parent, and an
   `md5Checksum` equal to the workbench PDF's md5. Fetch each link from the workbench without signing in
   (`requests.get`): it must open, not redirect to `accounts.google.com`. Links are
   `https://drive.google.com/file/d/<id>/view?usp=sharing` and
   `https://drive.google.com/drive/folders/<id>?usp=sharing`.
8. **Write back.** Only verified Drive links go into `marketing_audits` (the table's CHECK constraints
   refuse anything else).
