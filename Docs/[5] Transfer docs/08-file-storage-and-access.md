# 08 — File Storage & Access Control Spec

## Storage backend

- Old app: Cloudflare R2 via S3 API.
- **Rebuild (applied):** Supabase Storage, one private bucket `main_bucket` (`SUPABASE_STORAGE_BUCKET`), accessed only by the backend with the service-role key. Prefixes below are folders in that bucket.
- DB stores the **object key** in `files.file_location` / `solutions.file_location` / `invoices.pdf_path`; signed URLs are generated at access time.

### Upload flow (rebuild)

1. Browser calls `POST /api/v1/tasks/:id/files/upload-url` (or `/solutions/upload-url`); backend authorizes, validates type/size, returns a signed upload URL + key.
2. Browser `PUT`s the file directly to the signed URL (no API body-size limits).
3. Browser registers it with `POST /api/v1/tasks/:id/files` (or `/solutions`) `{ key, filename }`; backend checks the key belongs to the task, re-validates the stored object's real size/type (deleting it if invalid), then inserts the row.
4. Downloads: `GET .../:fileId/download` returns a short-lived signed URL after authorization.

## Object categories & path conventions

| Category                | Suggested prefix                            | DB table                                   |
| ----------------------- | ------------------------------------------- | ------------------------------------------ |
| Client / task documents | `student_files/`                            | `files`                                    |
| Tutor solutions         | `solutions/` (or shared prefix — normalize) | `solutions`                                |
| Revision solutions      | same as solutions + link table              | `solutions` + `revision_session_solutions` |
| Invoice PDFs            | `invoices/`                                 | `invoices.pdf_path`                        |
| Temp zip builds         | local temp only                             | —                                          |

## Allowed file types

Extensions (current):  
`pdf, doc, docx, txt, zip, jpg, jpeg, png, gif, bmp, tiff, ico, webp, excel, csv, ppt, pptx`

Rebuild: map to MIME allowlist server-side, not extension-only.

## Size limits

| Context                              | Limit                                                                 |
| ------------------------------------ | --------------------------------------------------------------------- |
| Upload batch (docs + solutions path) | **500 MB** total per request (current StorageController)              |
| Client create-task docs              | Also referenced **10 MB** check in places — **normalize to one rule** |

**Decision for rebuild (applied):** **25 MiB/file**, **100 MiB/task** via `STORAGE_MAX_FILE_BYTES` / `STORAGE_MAX_TASK_BYTES` (defaults in config). MIME allowlist enforced server-side in `backend/src/storage/`.

## Operations

### Upload documents

- Client on create/edit (own unpaid/allowed tasks).
- Coordinator/Admin on managed tasks.
- Creates `File` row with storage location.

### Upload solutions

- Tutor on assigned tasks.
- Coordinator/Admin as override.
- Creates `Solution` row.
- If inside revision: also create `RevisionSessionSolution` linking session ↔ solution.

### Download

- Stream via authenticated endpoint (no permanent public bucket ACL).
- Bulk download: zip selected/all files for a task into temp, stream, delete temp.

### Delete

- Role-gated; also delete object from storage.
- Task delete cascades DB and should purge storage objects.

## Access matrix (solutions)

| Actor       | Can download solutions when                                                          |
| ----------- | ------------------------------------------------------------------------------------ |
| Admin       | Always (authorized task)                                                             |
| Coordinator | Always (authorized task)                                                             |
| Tutor       | Assigned to task                                                                     |
| Client      | Task is theirs **and** `allow_view = true` (and/or after payment — product decision) |

Documents (client uploads) are available to client + assigned tutor + coordinator + admin.

## `allow_view`

- Boolean on Task, default `false`.
- Admin toggles client visibility of solutions.
- Rebuild: clarify whether payment completion should auto-enable view.

## Security rules

1. Never trust client-supplied paths; resolve via DB id → stored key.
2. Authorize task membership/role before any get/put/delete.
3. Use short-lived signed URLs whenever the browser reads or writes storage directly.
4. Virus scanning optional but valuable for student uploads.
5. Cap concurrent large uploads (timeouts in old app were extremely high — don’t blindly copy 3+ hour PHP limits; use direct-to-storage uploads).

## Cleanup rules

| Event                 | Cleanup                    |
| --------------------- | -------------------------- |
| File/solution deleted | Remove DB row + object     |
| Task deleted          | Remove all related objects |
| Invoice regenerated   | Replace or version PDF     |

## Known bug — do not copy

One revision upload path linked a **File** id into `revision_session_solutions.solution_id`. Only **Solution** ids are valid.
