/*
  # Add subscription cleanup on payment approval

  1. Changes
    - Add cleanup of canceled subscriptions when payment is approved
    - Keep only the most recent canceled subscription for history
    - Update manage_subscription_transition function to handle cleanup
    - Add proper error handling and logging

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Drop existing function
DROP FUNCTION IF EXISTS manage_subscription_transition(uuid, uuid, text, text);

-- Create improved function with subscription cleanup
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
  v_plan_price numeric;
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

  -- Get plan price
  SELECT price INTO v_plan_price
  FROM planosxmenu
  WHERE id = p_plan_id;

  -- For paid plans, payment_id is required and must be approved
  IF v_plan_price > 0 THEN
    IF p_payment_id IS NULL THEN
      RAISE EXCEPTION 'Payment ID is required for paid plans';
    END IF;

    -- Verify payment status
    IF NOT EXISTS (
      SELECT 1 
      FROM subscription_payments 
      WHERE payment_id = p_payment_id 
      AND status = 'approved'
    ) THEN
      RAISE EXCEPTION 'Cannot update subscription: payment % is not approved', p_payment_id;
    END IF;
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

    -- Delete all canceled subscriptions except the most recent one
    WITH ranked_subscriptions AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id 
          ORDER BY updated_at DESC
        ) as rn
      FROM subscriptions
      WHERE user_id = p_user_id
        AND status = 'canceled'
    )
    DELETE FROM subscriptions
    WHERE id IN (
      SELECT id 
      FROM ranked_subscriptions 
      WHERE rn > 1
    );

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
      p_payment_id, -- Will be NULL for free plans
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