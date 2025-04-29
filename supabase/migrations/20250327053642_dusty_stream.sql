/*
  # Fix user registration trigger and profile creation

  1. Changes
    - Update handle_new_user trigger to better handle metadata
    - Add better error handling and default values
    - Ensure all required fields are properly set

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
  default_store TEXT;
  default_cpf TEXT;
BEGIN
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

  -- Insert new profile with safe defaults
  INSERT INTO public.profiles (
    id,
    name,
    store_name,
    cpf,
    email,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    default_name,
    default_store,
    default_cpf,
    NEW.email,
    now(),
    now()
  );

  -- Also create a user record
  INSERT INTO public.users (
    id,
    email,
    name,
    cpf,
    created_at,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    default_name,
    default_cpf,
    now(),
    'active'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details (in production this should go to a proper logging system)
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();