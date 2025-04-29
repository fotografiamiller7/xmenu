/*
  # Fix subscription trigger to handle missing payment_id

  1. Changes
    - Update sync_subscription_with_profile function to handle missing payment_id
    - Make period_type optional
    - Default to monthly period if not specified
    - Maintain existing functionality for profile updates

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Update sync_subscription_with_profile function to handle missing payment_id
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

  -- Calculate subscription end date based on period type
  NEW.current_period_end := 
    CASE 
      WHEN NEW.period_type = 'annual' THEN
        COALESCE(NEW.current_period_start, now()) + interval '1 year'
      ELSE
        COALESCE(NEW.current_period_start, now()) + interval '30 days'
    END;

  -- Set current_period_start if not provided
  IF NEW.current_period_start IS NULL THEN
    NEW.current_period_start := now();
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