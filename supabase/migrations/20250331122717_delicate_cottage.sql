/*
  # Fix subscription status update logic

  1. Changes
    - Update manage_subscription_transition function to handle status changes properly
    - Only require payment ID for new paid plans or reactivations
    - Fix plan reference updates in profiles table
    - Add proper validation for status changes

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Drop existing function
DROP FUNCTION IF EXISTS manage_subscription_transition(uuid, uuid, text, text, text);

-- Create improved function with proper status handling
CREATE OR REPLACE FUNCTION manage_subscription_transition(
  p_user_id uuid,
  p_plan_id uuid,
  p_payment_id text DEFAULT NULL,
  p_status text DEFAULT 'active',
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
  v_is_plan_change boolean;
  v_is_reactivation boolean;
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

  IF p_status NOT IN ('active', 'canceled') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be either active or canceled', p_status;
  END IF;

  -- Get current subscription if exists
  SELECT * INTO v_old_subscription
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Check if this is a plan change or reactivation
  v_is_plan_change := v_old_subscription IS NULL OR v_old_subscription.plan_id != p_plan_id;
  v_is_reactivation := v_old_subscription IS NOT NULL 
    AND v_old_subscription.status = 'canceled' 
    AND p_status = 'active';

  -- Get plan price
  SELECT price INTO v_plan_price
  FROM planosxmenu
  WHERE id = p_plan_id;

  -- Only require payment ID for new paid plans or reactivations
  IF v_plan_price > 0 AND p_status = 'active' AND (v_is_plan_change OR v_is_reactivation) THEN
    IF p_payment_id IS NULL THEN
      RAISE EXCEPTION 'Payment ID is required for new paid active plans';
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
    -- If there's an existing subscription, update it
    IF v_old_subscription IS NOT NULL THEN
      UPDATE subscriptions s
      SET 
        plan_id = p_plan_id,
        payment_id = CASE 
          WHEN v_is_plan_change OR v_is_reactivation THEN p_payment_id 
          ELSE s.payment_id 
        END,
        status = p_status,
        period_type = p_period_type,
        current_period_start = CASE 
          WHEN v_is_plan_change OR v_is_reactivation THEN now() 
          ELSE s.current_period_start 
        END,
        current_period_end = CASE 
          WHEN v_is_plan_change OR v_is_reactivation THEN
            CASE p_period_type
              WHEN 'annual' THEN now() + interval '1 year'
              ELSE now() + interval '30 days'
            END
          ELSE s.current_period_end
        END,
        updated_at = now()
      WHERE s.id = v_old_subscription.id
      RETURNING * INTO v_new_subscription;
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
        p_user_id,
        p_plan_id,
        p_payment_id,
        p_status,
        p_period_type,
        now(),
        CASE p_period_type
          WHEN 'annual' THEN now() + interval '1 year'
          ELSE now() + interval '30 days'
        END
      )
      RETURNING * INTO v_new_subscription;
    END IF;

    -- Update profile's plan reference based on status
    IF p_status = 'active' THEN
      UPDATE profiles p
      SET 
        plano = p_plan_id,
        updated_at = now()
      WHERE p.id = p_user_id;
    ELSE
      -- If status is not active, set plan to basic
      WITH basic_plan AS (
        SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
      )
      UPDATE profiles p
      SET 
        plano = (SELECT id FROM basic_plan),
        updated_at = now()
      WHERE p.id = p_user_id;
    END IF;

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