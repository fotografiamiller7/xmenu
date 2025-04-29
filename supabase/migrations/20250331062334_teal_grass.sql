/*
  # Fix subscription payment approval handling

  1. Changes
    - Drop existing functions before recreating
    - Add status check before updating subscription
    - Add function to handle subscription payment approval
    - Add trigger to sync subscription only on payment approval

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS sync_subscription_payment_trigger ON subscription_payments;
DROP FUNCTION IF EXISTS sync_subscription_payment();
DROP FUNCTION IF EXISTS manage_subscription_transition(uuid,uuid,text,text);

-- Create function to sync subscription with payment
CREATE OR REPLACE FUNCTION sync_subscription_payment()
RETURNS trigger AS $$
DECLARE
  v_plan_id uuid;
  v_user_id uuid;
  v_period_type text;
BEGIN
  -- Only proceed if payment is approved
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get plan ID and user ID from payment
  v_plan_id := NEW.plan_id;
  v_user_id := NEW.user_id;
  v_period_type := NEW.period_type;

  -- Call manage_subscription_transition to handle the subscription update
  PERFORM manage_subscription_transition(
    v_user_id,
    v_plan_id,
    NEW.payment_id,
    v_period_type
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription payments
CREATE TRIGGER sync_subscription_payment_trigger
  AFTER INSERT OR UPDATE OF status ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_payment();

-- Create function to manage subscription transitions
CREATE OR REPLACE FUNCTION manage_subscription_transition(
  p_user_id uuid,
  p_plan_id uuid,
  p_payment_id text,
  p_period_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_subscription record;
  v_new_subscription record;
  v_payment_status text;
  v_result jsonb;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan ID is required';
  END IF;

  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'Payment ID is required';
  END IF;

  IF p_period_type NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid period type: %. Must be either monthly or annual', p_period_type;
  END IF;

  -- Check payment status
  SELECT status INTO v_payment_status
  FROM subscription_payments
  WHERE payment_id = p_payment_id;

  IF v_payment_status != 'approved' THEN
    RAISE EXCEPTION 'Cannot update subscription: payment % is not approved', p_payment_id;
  END IF;

  -- Start transaction
  BEGIN
    -- First cancel any existing active subscription
    UPDATE subscriptions s
    SET 
      status = 'canceled',
      updated_at = now()
    WHERE s.user_id = p_user_id
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
      p_user_id,
      p_plan_id,
      p_payment_id,
      'active',
      p_period_type,
      now(),
      CASE p_period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END
    )
    RETURNING * INTO v_new_subscription;

    -- Update profile's plan reference
    UPDATE profiles p
    SET 
      plano = p_plan_id,
      updated_at = now()
    WHERE p.id = p_user_id;

    -- Build result object
    v_result = jsonb_build_object(
      'success', true,
      'subscription', jsonb_build_object(
        'id', v_new_subscription.id,
        'user_id', v_new_subscription.user_id,
        'plan_id', v_new_subscription.plan_id,
        'status', v_new_subscription.status,
        'period_type', v_new_subscription.period_type,
        'current_period_start', v_new_subscription.current_period_start,
        'current_period_end', v_new_subscription.current_period_end,
        'payment_id', v_new_subscription.payment_id
      )
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Transaction will automatically rollback
      RAISE EXCEPTION 'Failed to transition subscription: %', SQLERRM;
  END;
END;
$$;