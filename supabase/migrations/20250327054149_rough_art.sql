/*
  # Fix profile creation trigger to handle duplicates

  1. Changes
    - Drop existing trigger and function
    - Create new trigger function with better duplicate handling
    - Add explicit checks before inserting
    - Add proper error handling
    - Improve metadata extraction

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with better duplicate handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
  default_store TEXT;
  default_cpf TEXT;
  existing_profile RECORD;
BEGIN
  -- First check if profile already exists
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE id = NEW.id;

  -- If profile exists, just return
  IF existing_profile IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get metadata values with fallbacks
  default_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    'User ' || substr(NEW.id::text, 1, 8)
  );
  
  default_store := COALESCE(
    NEW.raw_user_meta_data->>'store_name',
    'Store ' || substr(NEW.id::text, 1, 8)
  );
  
  default_cpf := COALESCE(
    NEW.raw_user_meta_data->>'cpf',
    '00000000000'
  );

  -- Insert new profile only if it doesn't exist
  INSERT INTO public.profiles (
    id,
    name,
    store_name,
    cpf,
    email,
    created_at,
    updated_at
  )
  SELECT
    NEW.id,
    default_name,
    default_store,
    default_cpf,
    NEW.email,
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  );

  -- Create user record if it doesn't exist
  INSERT INTO public.users (
    id,
    email,
    name,
    cpf,
    created_at,
    status
  )
  SELECT
    NEW.id,
    NEW.email,
    default_name,
    default_cpf,
    now(),
    'active'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Log the error but don't fail the trigger
    RAISE WARNING 'Duplicate key violation in handle_new_user trigger for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log other errors
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();