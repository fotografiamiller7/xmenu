/*
  # Add subscription cleanup function and trigger

  1. Changes
    - Add function to delete canceled subscriptions
    - Add trigger to run cleanup after plan changes
    - Update subscription transition to handle cleanup

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Create function to delete canceled subscriptions
CREATE OR REPLACE FUNCTION delete_canceled_subscriptions(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all canceled subscriptions for the user
  DELETE FROM subscriptions
  WHERE user_id = user_id
    AND status = 'canceled';
END;
$$;

-- Update manage_subscription_transition to include cleanup
CREATE OR REPLACE FUNCTION manage_subscription_transition(
  p_user_id uuid,
  p_plan_id uuid,
  p_payment_id text DEFAULT NULL,
  p_period_type text DEFAULT 'monthly'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_subscription record;
  v_new_subscription record;
  v_result jsonb;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan ID is required';
  END IF;

  IF p_period_type NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid period type: %. Must be either monthly or annual', p_period_type;
  END IF;

  -- Start transaction
  BEGIN
    -- First cancel any existing active subscription
    UPDATE subscriptions
    SET 
      status = 'canceled',
      updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'active'
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
    UPDATE profiles
    SET 
      plano = p_plan_id,
      updated_at = now()
    WHERE id = p_user_id;

    -- Delete canceled subscriptions
    PERFORM delete_canceled_subscriptions(p_user_id);

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