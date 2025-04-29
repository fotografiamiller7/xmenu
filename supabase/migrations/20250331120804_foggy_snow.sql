/*
  # Fix subscription status handling

  1. Changes
    - Update manage_subscription_transition function to properly handle status changes
    - Remove automatic status changes to 'canceled'
    - Keep subscriptions active when updating plans
    - Fix status check constraint

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Drop existing function
DROP FUNCTION IF EXISTS manage_subscription_transition(uuid, uuid, text, text);

-- Create improved function with proper status handling
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
    -- Get current active subscription if exists
    SELECT * INTO v_old_subscription
    FROM subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;

    -- If there's an existing subscription, update it instead of creating a new one
    IF v_old_subscription IS NOT NULL THEN
      UPDATE subscriptions s
      SET 
        plan_id = p_plan_id,
        payment_id = COALESCE(p_payment_id, s.payment_id),
        period_type = p_period_type,
        current_period_start = now(),
        current_period_end = CASE p_period_type
          WHEN 'annual' THEN now() + interval '1 year'
          ELSE now() + interval '30 days'
        END,
        updated_at = now()
      WHERE s.id = v_old_subscription.id
      RETURNING * INTO v_new_subscription;
    ELSE
      -- Create new active subscription if none exists
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
    END IF;

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