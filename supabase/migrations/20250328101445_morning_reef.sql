/*
  # Fix storage and profile policies

  1. Changes
    - Drop existing policies if they exist
    - Create policies only if they don't exist
    - Add proper error handling
    - Add phone number validation function

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop storage policies
  DROP POLICY IF EXISTS "Allow authenticated to invoke functions" ON storage.objects;
  
  -- Drop profile policies
  DROP POLICY IF EXISTS "Allow reading profile data for notifications" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create storage policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated to invoke functions'
  ) THEN
    CREATE POLICY "Allow authenticated to invoke functions"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'functions');
  END IF;
END $$;

-- Create profile policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow reading profile data for notifications'
  ) THEN
    CREATE POLICY "Allow reading profile data for notifications"
      ON profiles
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

-- Create or replace phone validation function
CREATE OR REPLACE FUNCTION is_valid_phone(phone text)
RETURNS boolean AS $$
BEGIN
  -- Remove any non-digits
  phone := regexp_replace(phone, '\D', '', 'g');
  -- Check if it's a valid phone number (at least 10 digits)
  RETURN length(phone) >= 10;
END;
$$ LANGUAGE plpgsql;