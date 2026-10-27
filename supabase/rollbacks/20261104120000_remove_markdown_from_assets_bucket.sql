-- Undoes 20261104120000: removes text/markdown from the groundswell-assets
-- allow-list. Briefs already stored stay in the bucket; new ones fall back
-- to text/plain (geoDelivery.ts). Never applied on its own: this folder is
-- not a migrations folder.
UPDATE storage.buckets
   SET allowed_mime_types = array_remove(allowed_mime_types, 'text/markdown')
 WHERE id = 'groundswell-assets';
