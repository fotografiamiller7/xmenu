/*
  # Fix profile creation and email handling

  1. Changes
    - Drop and recreate handle_new_user trigger with proper error handling
    - Add explicit transaction handling
    - Add proper checks before profile creation
    - Fix email synchronization between auth.users and profiles

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
  default_store TEXT;
  default_cpf TEXT;
  basic_plan_id uuid;
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) INTO profile_exists;

  -- If profile exists, just return
  IF profile_exists THEN
    RETURN NEW;
  END IF;

  -- Get basic plan ID
  SELECT id INTO basic_plan_id
  FROM planosxmenu
  WHERE name = 'Básico'
  LIMIT 1;

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

  -- Start transaction
  BEGIN
    -- Insert new profile
    INSERT INTO profiles (
      id,
      name,
      store_name,
      cpf,
      email,
      plano,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      default_name,
      default_store,
      default_cpf,
      NEW.email,
      basic_plan_id,
      now(),
      now()
    );

    -- Create initial subscription
    INSERT INTO subscriptions (
      user_id,
      plan_id,
      status,
      period_type,
      current_period_start,
      current_period_end
    ) VALUES (
      NEW.id,
      basic_plan_id,
      'active',
      'monthly',
      now(),
      now() + interval '30 days'
    );

    -- If we get here, both inserts succeeded
    RETURN NEW;
  EXCEPTION
    WHEN unique_violation THEN
      -- Check which constraint was violated
      IF SQLERRM LIKE '%profiles_pkey%' THEN
        RAISE WARNING 'Profile already exists for user %', NEW.id;
      ELSIF SQLERRM LIKE '%profiles_cpf_key%' THEN
        RAISE WARNING 'CPF already exists: %', default_cpf;
      ELSE
        RAISE WARNING 'Unique constraint violation: %', SQLERRM;
      END IF;
      RETURN NEW;
    WHEN OTHERS THEN
      RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Fix any existing profiles with missing emails
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND (p.email IS NULL OR p.email = '');

-- Fix any profiles without subscriptions
INSERT INTO subscriptions (
  user_id,
  plan_id,
  status,
  period_type,
  current_period_start,
  current_period_end
)
SELECT 
  p.id,
  p.plano,
  'active',
  'monthly',
  now(),
  now() + interval '30 days'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 
  FROM subscriptions s 
  WHERE s.user_id = p.id 
  AND s.status = 'active'
);