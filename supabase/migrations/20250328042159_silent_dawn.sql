/*
  # Fix annual subscription period calculation

  1. Changes
    - Update sync_subscription_with_profile function to handle annual subscriptions
    - Add period_type column to subscriptions table
    - Update subscription period calculation based on period type
    - Add check constraint for period_type

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add period_type column to subscriptions if it doesn't exist
DO $$ BEGIN
  ALTER TABLE subscriptions 
  ADD COLUMN period_type text CHECK (period_type IN ('monthly', 'annual'));
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Update sync_subscription_with_profile function to handle annual subscriptions
CREATE OR REPLACE FUNCTION sync_subscription_with_profile()
RETURNS trigger AS $$
BEGIN
  -- Get period type from subscription_payments
  SELECT period_type INTO NEW.period_type
  FROM subscription_payments
  WHERE payment_id = NEW.payment_id
  LIMIT 1;

  -- Calculate subscription end date based on period type
  NEW.current_period_end := 
    CASE 
      WHEN NEW.period_type = 'annual' THEN
        NEW.current_period_start + interval '1 year'
      ELSE
        NEW.current_period_start + interval '30 days'
    END;

  -- Update profile with subscription data
  UPDATE profiles
  SET 
    plano = CASE 
      WHEN NEW.status = 'active' THEN NEW.plan_id 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = NEW.user_id;

  -- If subscription is canceled, revert to basic plan
  IF NEW.status = 'canceled' AND OLD.status = 'active' THEN
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
  BEFORE INSERT OR UPDATE OF status, plan_id
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_with_profile();