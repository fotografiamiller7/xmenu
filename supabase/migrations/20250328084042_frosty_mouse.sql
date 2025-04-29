/*
  # Add subscription management function

  1. New Function
    - `manage_subscription_status`: Handles plan transitions
      - Validates user and plan existence
      - Updates existing subscription status
      - Creates or updates new subscription
      - Ensures only one active subscription per user
      - Returns updated subscription info

  2. Security
    - Function runs with SECURITY DEFINER
    - Validates input parameters
    - Handles errors gracefully
*/

-- Create function to manage subscription status transitions
CREATE OR REPLACE FUNCTION manage_subscription_status(
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
  v_user_exists boolean;
  v_plan_exists boolean;
  v_current_subscription record;
  v_new_subscription record;
  v_result jsonb;
BEGIN
  -- Validate user exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Validate plan exists
  SELECT EXISTS (
    SELECT 1 FROM planosxmenu WHERE id = p_plan_id
  ) INTO v_plan_exists;

  IF NOT v_plan_exists THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  -- Validate period type
  IF p_period_type NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid period type: %. Must be either monthly or annual', p_period_type;
  END IF;

  -- Get current active subscription if exists
  SELECT * INTO v_current_subscription
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Begin transaction
  BEGIN
    -- If there's an active subscription, update its status
    IF v_current_subscription IS NOT NULL THEN
      UPDATE subscriptions
      SET 
        status = 'inactive',
        updated_at = now()
      WHERE id = v_current_subscription.id;
    END IF;

    -- Insert or update subscription for new plan
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
    ON CONFLICT (user_id, plan_id) WHERE status = 'active'
    DO UPDATE SET
      payment_id = EXCLUDED.payment_id,
      period_type = EXCLUDED.period_type,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = now()
    RETURNING * INTO v_new_subscription;

    -- Update profile's plan
    UPDATE profiles
    SET 
      plano = p_plan_id,
      updated_at = now()
    WHERE id = p_user_id;

    -- Prepare result
    v_result = jsonb_build_object(
      'subscription_id', v_new_subscription.id,
      'user_id', v_new_subscription.user_id,
      'plan_id', v_new_subscription.plan_id,
      'status', v_new_subscription.status,
      'period_type', v_new_subscription.period_type,
      'current_period_start', v_new_subscription.current_period_start,
      'current_period_end', v_new_subscription.current_period_end,
      'previous_subscription_id', v_current_subscription.id
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RAISE EXCEPTION 'Error managing subscription status: %', SQLERRM;
  END;
END;
$$;