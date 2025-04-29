/*
  # Fix user registration trigger to handle existing profiles

  1. Changes
    - Add check for existing profile before insert
    - Add check for existing user record before insert
    - Better error handling and logging
    - Safer transaction handling

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with duplicate handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
  default_store TEXT;
  default_cpf TEXT;
  profile_exists BOOLEAN;
  user_exists BOOLEAN;
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

  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.id
  ) INTO profile_exists;

  -- Check if user record already exists
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = NEW.id
  ) INTO user_exists;

  -- Create profile if it doesn't exist
  IF NOT profile_exists THEN
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
  END IF;

  -- Create user record if it doesn't exist
  IF NOT user_exists THEN
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
  END IF;

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