/*
  # Fix subscription update logic

  1. Changes
    - Update sync_subscription_payment function to update existing subscriptions
    - Add upsert handling for subscription records
    - Maintain payment history in subscription_payments
    - Fix period type and expiration date calculation

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Update sync_subscription_payment function to handle updates
CREATE OR REPLACE FUNCTION sync_subscription_payment()
RETURNS trigger AS $$
DECLARE
  existing_subscription_id uuid;
BEGIN
  -- First check if user has an active subscription
  SELECT id INTO existing_subscription_id
  FROM subscriptions
  WHERE user_id = NEW.user_id
    AND status = 'active';

  IF existing_subscription_id IS NOT NULL THEN
    -- Update existing subscription
    UPDATE subscriptions
    SET 
      plan_id = NEW.plan_id,
      payment_id = NEW.payment_id,
      period_type = NEW.period_type,
      current_period_start = now(),
      current_period_end = CASE NEW.period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END,
      updated_at = now()
    WHERE id = existing_subscription_id;
  ELSE
    -- Create new subscription if none exists
    INSERT INTO subscriptions (
      user_id,
      plan_id,
      payment_id,
      status,
      period_type,
      current_period_start,
      current_period_end
    ) VALUES (
      NEW.user_id,
      NEW.plan_id,
      NEW.payment_id,
      'active',
      NEW.period_type,
      now(),
      CASE NEW.period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger
DROP TRIGGER IF EXISTS sync_subscription_payment_trigger ON subscription_payments;

-- Create trigger for subscription payments
CREATE TRIGGER sync_subscription_payment_trigger
  AFTER INSERT ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_payment();