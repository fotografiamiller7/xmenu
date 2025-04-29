/*
  # Fix email sync between users and profiles tables

  1. Changes
    - Add trigger to sync email between auth.users and profiles
    - Update existing profiles with emails from auth.users
    - Add NOT NULL constraint to profiles.email

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- First, update existing profiles with emails from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Make email NOT NULL and add default
ALTER TABLE profiles 
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN email SET DEFAULT '';

-- Create trigger function to sync email
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles.email when auth.users.email changes
  UPDATE profiles
  SET email = NEW.email,
      updated_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    store_name,
    cpf,
    email
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User ' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'store_name', 'Store ' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'cpf', '00000000000'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;