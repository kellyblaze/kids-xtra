-- ─── Supabase Storage: chore-photos bucket ────────────────────────────────────
-- Files are stored at: {family_id}/{child_id}/{timestamp}-{uuid}.jpg
-- Bucket is private; access is controlled by RLS on storage.objects.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chore-photos',
  'chore-photos',
  false,
  5242880,   -- 5 MB per file
  ARRAY['image/jpeg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users (parents) to upload photos for their own family
CREATE POLICY "chore_photos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chore-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (
      SELECT family_id::text FROM public.parent_profiles WHERE id = auth.uid()
    )
  );

-- Allow family members to read photos in their family folder
CREATE POLICY "chore_photos_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chore-photos'
    AND (storage.foldername(name))[1] = (
      SELECT family_id::text FROM public.parent_profiles WHERE id = auth.uid()
    )
  );

-- Allow family members to delete their own photos
CREATE POLICY "chore_photos_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chore-photos'
    AND (storage.foldername(name))[1] = (
      SELECT family_id::text FROM public.parent_profiles WHERE id = auth.uid()
    )
  );
