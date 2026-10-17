-- Original IQ — 013: file/solution upload metadata (store object key + meta)
-- file_location / solutions.file_location remain the private object key (not a public URL).

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS original_name varchar(255),
  ADD COLUMN IF NOT EXISTS content_type varchar(120),
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

ALTER TABLE solutions
  ADD COLUMN IF NOT EXISTS original_name varchar(255),
  ADD COLUMN IF NOT EXISTS content_type varchar(120),
  ADD COLUMN IF NOT EXISTS size_bytes bigint;

COMMENT ON COLUMN files.file_location IS 'R2 object key (e.g. student_files/{taskId}/{uuid}_name.pdf)';
COMMENT ON COLUMN solutions.file_location IS 'R2 object key (e.g. solutions/{taskId}/{uuid}_name.pdf)';
