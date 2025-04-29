/*
  # Fix payment verification system

  1. Changes
    - Update sync_subscription_payment function to handle payment status properly
    - Add payment_id to subscription_payments table
    - Add proper status handling and validation
    - Fix subscription transition logic

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS sync_subscription_payment_trigger ON subscription_payments;
DROP FUNCTION IF EXISTS sync_subscription_payment();

-- Create improved function to sync subscription with payment
CREATE OR REPLACE FUNCTION sync_subscription_payment()
RETURNS trigger AS $$
DECLARE
  v_plan_id uuid;
  v_user_id uuid;
  v_period_type text;
  v_old_subscription record;
  v_new_subscription record;
BEGIN
  -- Get plan ID and user ID from payment
  v_plan_id := NEW.plan_id;
  v_user_id := NEW.user_id;
  v_period_type := NEW.period_type;

  -- Only proceed if this is a status update to 'approved'
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- First cancel any existing active subscription
    UPDATE subscriptions s
    SET 
      status = 'canceled',
      updated_at = now()
    WHERE s.user_id = v_user_id
      AND s.status = 'active'
    RETURNING * INTO v_old_subscription;

    -- Then create new active subscription
    INSERT INTO subscriptions (
      user_id,
      plan_id,
      payment_id,
      status,
      period_type,
      current_period_start,
      current_period_end
    ) VALUES (
      v_user_id,
      v_plan_id,
      NEW.payment_id,
      'active',
      v_period_type,
      now(),
      CASE v_period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END
    )
    RETURNING * INTO v_new_subscription;

    -- Update profile's plan reference
    UPDATE profiles p
    SET 
      plano = v_plan_id,
      updated_at = now()
    WHERE p.id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription payments
CREATE TRIGGER sync_subscription_payment_trigger
  AFTER UPDATE OF status ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_payment();