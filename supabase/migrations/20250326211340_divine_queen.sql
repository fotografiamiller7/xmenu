/*
  # Configure storage bucket and policies for products

  1. Changes
    - Create products bucket with proper settings
    - Set up RLS policies for storage.buckets and storage.objects
    - Allow authenticated users to create and manage buckets
    - Organize files in user-specific folders

  2. Security
    - Enable RLS on both buckets and objects
    - Restrict access to authenticated users
    - Users can only access their own files
*/

-- Enable RLS on storage.buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to create buckets
CREATE POLICY "Allow authenticated users to create buckets"
ON storage.buckets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create the products bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  false,
  2097152, -- 2MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to upload" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to read own files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow users to delete own files" ON storage.objects;
END $$;

-- Policy for uploading files
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for reading files
CREATE POLICY "Allow users to read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for deleting files
CREATE POLICY "Allow users to delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = auth.uid()::text
);