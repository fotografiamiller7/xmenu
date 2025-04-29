/*
  # Add subscription sync trigger and functions

  1. Changes
    - Add function to sync subscription data with profiles
    - Add trigger to automatically update profiles when subscription changes
    - Add function to validate subscription status
    - Add proper error handling and validation

  2. Security
    - Maintain existing RLS policies
    - Add proper validation checks
*/

-- Function to validate subscription status
CREATE OR REPLACE FUNCTION validate_subscription_status(status text)
RETURNS boolean AS $$
BEGIN
  RETURN status IN ('active', 'canceled', 'past_due', 'trialing');
END;
$$ LANGUAGE plpgsql;

-- Function to sync subscription with profile
CREATE OR REPLACE FUNCTION sync_subscription_with_profile()
RETURNS trigger AS $$
BEGIN
  -- Validate subscription status
  IF NOT validate_subscription_status(NEW.status) THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;

  -- Update profile with subscription data
  UPDATE profiles
  SET 
    plano = CASE 
      WHEN NEW.status = 'active' THEN NEW.plan_id 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = NEW.user_id;

  -- If subscription is canceled, clear the plan from profile
  IF NEW.status = 'canceled' AND OLD.status = 'active' THEN
    -- Get basic plan ID
    WITH basic_plan AS (
      SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
    )
    UPDATE profiles
    SET 
      plano = (SELECT id FROM basic_plan),
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_subscription_profile_trigger ON subscriptions;

-- Create trigger for subscription changes
CREATE TRIGGER sync_subscription_profile_trigger
  AFTER INSERT OR UPDATE OF status, plan_id
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_with_profile();

-- Sync existing active subscriptions
DO $$ 
BEGIN
  -- Update profiles with their active subscription plans
  UPDATE profiles p
  SET plano = s.plan_id
  FROM subscriptions s
  WHERE s.user_id = p.id
    AND s.status = 'active'
    AND p.plano IS DISTINCT FROM s.plan_id;

  -- Set basic plan for profiles without active subscriptions
  WITH basic_plan AS (
    SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
  )
  UPDATE profiles p
  SET plano = (SELECT id FROM basic_plan)
  WHERE p.plano IS NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM subscriptions s 
      WHERE s.user_id = p.id 
        AND s.status = 'active'
    );
END $$;