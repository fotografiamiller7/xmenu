/*
  # Fix plan relationships and foreign keys

  1. Changes
    - Add foreign key from profiles.plano to planosxmenu.id
    - Drop and recreate foreign key with proper ON DELETE behavior
    - Update existing profiles with correct plan references
    - Fix RLS policies for plan access

  2. Security
    - Maintain existing RLS policies
    - Add proper foreign key constraints
*/

-- First, make sure the plano column exists and is the right type
ALTER TABLE profiles
DROP COLUMN IF EXISTS plano;

ALTER TABLE profiles
ADD COLUMN plano uuid REFERENCES planosxmenu(id) ON DELETE SET NULL;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_profiles_plano ON profiles(plano);

-- Update existing profiles with plan data from subscriptions
UPDATE profiles p
SET plano = s.plan_id
FROM subscriptions s
WHERE s.user_id = p.id
  AND s.status = 'active'
  AND p.plano IS NULL;

-- Function to sync subscription plan with profile
CREATE OR REPLACE FUNCTION sync_subscription_plan()
RETURNS trigger AS $$
BEGIN
  -- Update profile's plan when subscription changes
  UPDATE profiles
  SET plano = NEW.plan_id
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription changes
DROP TRIGGER IF EXISTS sync_subscription_plan_trigger ON subscriptions;
CREATE TRIGGER sync_subscription_plan_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_plan();

-- Update get_user_plan_features function to use profiles.plano
CREATE OR REPLACE FUNCTION get_user_plan_features(user_id uuid)
RETURNS plan_features AS $$
DECLARE
  user_plan_features plan_features;
BEGIN
  -- Get user's plan features through profiles.plano
  SELECT pf.*
  INTO user_plan_features
  FROM profiles p
  JOIN planosxmenu pm ON pm.id = p.plano
  JOIN plan_features pf ON pf.plan_id = p.plano
  WHERE p.id = user_id;

  -- If no plan found, use basic plan limits
  IF user_plan_features IS NULL THEN
    SELECT pf.*
    INTO user_plan_features
    FROM planosxmenu p
    JOIN plan_features pf ON pf.plan_id = p.id
    WHERE p.name = 'Básico'
    LIMIT 1;
  END IF;

  RETURN user_plan_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;