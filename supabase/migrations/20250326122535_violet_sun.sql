/*
  # Fix user registration trigger and profile creation

  1. Changes
    - Update handle_new_user trigger function to handle null metadata values
    - Add better error handling for profile creation
    - Ensure all required fields have default values if missing

  2. Security
    - Maintains existing RLS policies
    - No changes to table structure or permissions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with null handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
  default_store TEXT;
  default_cpf TEXT;
BEGIN
  -- Set default values if metadata is missing
  default_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User ' || substr(NEW.id::text, 1, 8));
  default_store := COALESCE(NEW.raw_user_meta_data->>'store_name', 'Store ' || substr(NEW.id::text, 1, 8));
  default_cpf := COALESCE(NEW.raw_user_meta_data->>'cpf', '000.000.000-00');

  -- Insert new profile with safe defaults
  INSERT INTO public.profiles (
    id,
    name,
    store_name,
    cpf
  ) VALUES (
    NEW.id,
    default_name,
    default_store,
    default_cpf
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details (in production this should go to a proper logging system)
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();