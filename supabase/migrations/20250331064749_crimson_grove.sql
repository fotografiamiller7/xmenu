/*
  # Fix subscription payment handling

  1. Changes
    - Update sync_subscription_payment function to properly handle payment status changes
    - Add proper error handling and validation
    - Ensure atomic updates for subscription and profile data
    - Add logging for better debugging

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Drop existing trigger and function
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
  IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
     (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
    -- Start transaction
    BEGIN
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

      -- Log the successful update
      RAISE NOTICE 'Subscription updated successfully: user_id=%, plan_id=%, payment_id=%',
        v_user_id, v_plan_id, NEW.payment_id;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE NOTICE 'Error updating subscription: %', SQLERRM;
        RAISE;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription payments
CREATE TRIGGER sync_subscription_payment_trigger
  AFTER INSERT OR UPDATE OF status ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_payment();

-- Add index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status 
ON subscription_payments(status);

-- Add constraint to ensure valid status values
DO $$ BEGIN
  ALTER TABLE subscription_payments
  ADD CONSTRAINT subscription_payments_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'error'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;