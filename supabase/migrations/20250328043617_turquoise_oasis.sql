/*
  # Fix subscription period type and expiration date

  1. Changes
    - Add period_type constraint to subscriptions table
    - Update sync_subscription_with_profile function to properly handle period types
    - Add trigger to sync period type between payments and subscriptions
    - Fix expiration date calculation based on period type

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add constraint for period_type if it doesn't exist
DO $$ BEGIN
  ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_period_type_check 
  CHECK (period_type IN ('monthly', 'annual'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update sync_subscription_with_profile function
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

-- Create function to sync subscription payments with subscriptions
CREATE OR REPLACE FUNCTION sync_subscription_payment()
RETURNS trigger AS $$
BEGIN
  -- Update subscription with payment info
  UPDATE subscriptions
  SET 
    period_type = NEW.period_type,
    current_period_start = now(),
    current_period_end = CASE NEW.period_type
      WHEN 'annual' THEN now() + interval '1 year'
      ELSE now() + interval '30 days'
    END
  WHERE user_id = NEW.user_id
    AND plan_id = NEW.plan_id
    AND status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription payments
DROP TRIGGER IF EXISTS sync_subscription_payment_trigger ON subscription_payments;
CREATE TRIGGER sync_subscription_payment_trigger
  AFTER INSERT ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_payment();

-- Fix any existing annual subscriptions with wrong expiration dates
UPDATE subscriptions
SET current_period_end = current_period_start + interval '1 year'
WHERE period_type = 'annual'
  AND current_period_end <= current_period_start + interval '30 days';