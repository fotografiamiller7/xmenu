/*
  # Fix profile creation and duplicate key issues

  1. Changes
    - Drop and recreate handle_new_user trigger with better duplicate handling
    - Add proper error handling for profile creation
    - Fix race conditions in profile creation
    - Add proper checks before inserting

  2. Security
    - Maintain existing RLS policies
    - Keep security definer on functions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with proper duplicate handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_name TEXT;
  default_store TEXT;
  default_cpf TEXT;
  basic_plan_id uuid;
BEGIN
  -- Only proceed if profile doesn't exist
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) THEN
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

  -- Insert new profile with explicit ON CONFLICT DO NOTHING
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
  ) ON CONFLICT (id) DO NOTHING;

  -- Create initial subscription with basic plan
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
  ) ON CONFLICT DO NOTHING;

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
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Fix any existing profiles without plans
WITH basic_plan AS (
  SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
)
UPDATE profiles p
SET plano = (SELECT id FROM basic_plan)
WHERE p.plano IS NULL;

-- Fix any existing profiles without subscriptions
WITH basic_plan AS (
  SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
)
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
  (SELECT id FROM basic_plan),
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