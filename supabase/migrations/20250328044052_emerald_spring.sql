/*
  # Add payment_id to subscriptions table

  1. Changes
    - Add payment_id column to subscriptions table
    - Add constraint to ensure payment_id is unique
    - Update sync_subscription_with_profile function to handle payment_id
    - Fix any existing subscriptions without payment_id

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add payment_id column if it doesn't exist
DO $$ BEGIN
  ALTER TABLE subscriptions 
  ADD COLUMN payment_id text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add unique constraint for payment_id
DO $$ BEGIN
  ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_payment_id_key UNIQUE (payment_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update sync_subscription_with_profile function to handle payment_id
CREATE OR REPLACE FUNCTION sync_subscription_with_profile()
RETURNS trigger AS $$
BEGIN
  -- Set default period type if not provided
  IF NEW.period_type IS NULL THEN
    -- Try to get from subscription_payments if payment_id exists
    IF NEW.payment_id IS NOT NULL THEN
      SELECT period_type INTO NEW.period_type
      FROM subscription_payments
      WHERE payment_id = NEW.payment_id
      LIMIT 1;
    END IF;
    
    -- Default to monthly if still null
    IF NEW.period_type IS NULL THEN
      NEW.period_type := 'monthly';
    END IF;
  END IF;

  -- Validate period type
  IF NEW.period_type NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid period type: %. Must be either monthly or annual', NEW.period_type;
  END IF;

  -- Set current_period_start if not provided
  IF NEW.current_period_start IS NULL THEN
    NEW.current_period_start := now();
  END IF;

  -- Calculate subscription end date based on period type
  NEW.current_period_end := 
    CASE NEW.period_type
      WHEN 'annual' THEN NEW.current_period_start + interval '1 year'
      ELSE NEW.current_period_start + interval '30 days'
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
  IF TG_OP = 'UPDATE' AND NEW.status = 'canceled' AND OLD.status = 'active' THEN
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

-- Drop existing trigger
DROP TRIGGER IF EXISTS sync_subscription_profile_trigger ON subscriptions;

-- Create trigger for subscription changes
CREATE TRIGGER sync_subscription_profile_trigger
  BEFORE INSERT OR UPDATE OF status, plan_id, period_type
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_with_profile();

-- Update existing subscriptions with payment_id from subscription_payments
UPDATE subscriptions s
SET payment_id = sp.payment_id
FROM subscription_payments sp
WHERE s.user_id = sp.user_id
  AND s.plan_id = sp.plan_id
  AND s.payment_id IS NULL;