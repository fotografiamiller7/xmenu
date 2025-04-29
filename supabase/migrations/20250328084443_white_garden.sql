/*
  # Add subscription transition function

  1. New Function
    - `transition_subscription_plan`: Handles plan transitions in a single transaction
      - Validates user and plan existence
      - Updates existing subscription status
      - Creates new subscription record
      - Updates profile's plan reference
      - Returns updated subscription details

  2. Security
    - Function runs with SECURITY DEFINER
    - Validates all inputs
    - Maintains data integrity through transactions
*/

CREATE OR REPLACE FUNCTION transition_subscription_plan(
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

  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Verify plan exists
  IF NOT EXISTS (SELECT 1 FROM planosxmenu WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  -- Start transaction
  BEGIN
    -- Get current active subscription
    SELECT * INTO v_old_subscription
    FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Deactivate current subscription if exists
    IF v_old_subscription IS NOT NULL THEN
      UPDATE subscriptions
      SET 
        status = 'inactive',
        updated_at = now()
      WHERE id = v_old_subscription.id;
    END IF;

    -- Create new subscription
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
      ),
      'previous_subscription', CASE 
        WHEN v_old_subscription IS NOT NULL THEN jsonb_build_object(
          'id', v_old_subscription.id,
          'plan_id', v_old_subscription.plan_id,
          'status', 'inactive'
        )
        ELSE NULL
      END
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Transaction will automatically rollback
      RAISE EXCEPTION 'Failed to transition subscription plan: %', SQLERRM;
  END;
END;
$$;