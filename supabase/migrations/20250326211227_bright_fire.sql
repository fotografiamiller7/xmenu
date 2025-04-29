/*
  # Configure storage policies for products bucket

  1. Changes
    - Create storage bucket for products if it doesn't exist
    - Add policies for authenticated users to:
      - Upload files to products bucket
      - Read their own files
      - Delete their own files

  2. Security
    - Files are stored in user-specific folders
    - Users can only access their own files
    - Public read access is disabled
*/

-- Create a function to safely create a bucket if it doesn't exist
CREATE OR REPLACE FUNCTION create_storage_bucket(bucket_id text, public boolean)
RETURNS void AS $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    bucket_id,
    bucket_id,
    public,
    2097152, -- 2MB in bytes
    ARRAY['image/png', 'image/jpeg', 'image/gif']
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create the products bucket
SELECT create_storage_bucket('products', false);

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the storage.objects table
DO $$
BEGIN
  -- Drop existing policies if they exist
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