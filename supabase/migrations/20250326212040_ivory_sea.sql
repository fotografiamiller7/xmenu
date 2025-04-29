/*
  # Fix storage bucket and policies for product images

  1. Changes
    - Make products bucket public
    - Update storage policies to allow public read access
    - Maintain secure upload/delete policies

  2. Security
    - Public can read all product images
    - Only authenticated users can upload/delete their own images
    - Images are stored in user-specific folders
*/

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to create buckets" ON storage.buckets;
  DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to read own files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public to read files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
END $$;

-- Enable RLS on storage.buckets if not already enabled
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to create buckets
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create or update the products bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true, -- Make bucket public
  2097152, -- 2MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for uploading files
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for public read access
CREATE POLICY "Allow public to read files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');

-- Policy for deleting files
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);