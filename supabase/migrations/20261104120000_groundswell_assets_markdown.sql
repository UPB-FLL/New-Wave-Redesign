-- The GEO developer brief (deliver_geo, a Markdown file) is stored in the
-- groundswell-assets bucket, whose allow-list (20261029120000) had no
-- text/markdown: the first run after the AI search PR failed its delivery
-- with "mime type text/markdown; charset=utf-8 is not supported". Add the
-- type. Idempotent: a bucket that already lists it is left alone. The code
-- also falls back to text/plain while a bucket is behind this migration.
UPDATE storage.buckets
   SET allowed_mime_types = array_append(allowed_mime_types, 'text/markdown')
 WHERE id = 'groundswell-assets'
   AND allowed_mime_types IS NOT NULL
   AND NOT ('text/markdown' = ANY (allowed_mime_types));
