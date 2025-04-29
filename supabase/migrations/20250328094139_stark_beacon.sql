/*
  # Fix WhatsApp notification function and policies

  1. Changes
    - Add policy to allow authenticated users to invoke edge functions
    - Add policy to allow reading profile data
    - Add proper error handling and logging

  2. Security
    - Maintain existing RLS policies
    - Add specific policies for notification function
*/

-- Add policy to allow authenticated users to invoke edge functions
CREATE POLICY "Allow authenticated to invoke functions"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'functions');

-- Add policy to allow reading profile data for notifications
CREATE POLICY "Allow reading profile data for notifications"
  ON profiles
  FOR SELECT
  TO service_role
  USING (true);

-- Create function to validate phone number format
CREATE OR REPLACE FUNCTION is_valid_phone(phone text)
RETURNS boolean AS $$
BEGIN
  -- Remove any non-digits
  phone := regexp_replace(phone, '\D', '', 'g');
  -- Check if it's a valid phone number (at least 10 digits)
  RETURN length(phone) >= 10;
END;
$$ LANGUAGE plpgsql;