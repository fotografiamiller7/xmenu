/*
  # Add Storage Policies for Profiles Bucket

  1. Security
    - Enable RLS for profiles bucket
    - Add policies for authenticated users to:
      - Read their own profile images
      - Upload images to their own folder
      - Delete their own images
    - Add policy for public to read all profile images
*/

-- Create storage policies for the profiles bucket
BEGIN;

-- Policy to allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload files to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow authenticated users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profiles' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow public access to read all files
CREATE POLICY "Public can read all files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profiles');

COMMIT;