/*
  # Fix subscription status transitions and constraints

  1. Changes
    - Add function to manage subscription transitions
    - Handle status changes properly
    - Ensure status values match existing constraints
    - Clean up duplicate active subscriptions

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- First, deactivate duplicate active subscriptions keeping only the most recent
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY created_at DESC
    ) as rn
  FROM subscriptions
  WHERE status = 'active'
)
UPDATE subscriptions
SET 
  status = 'canceled',
  updated_at = now()
WHERE id IN (
  SELECT id 
  FROM ranked_subscriptions 
  WHERE rn > 1
);

-- Create unique index to ensure only one active subscription per user
CREATE UNIQUE INDEX idx_subscriptions_active_user 
ON subscriptions (user_id)
WHERE status = 'active';

-- Create function to manage subscription transitions
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
    -- Get and deactivate current active subscription if exists
    UPDATE subscriptions
    SET 
      status = 'canceled',
      updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'active'
    RETURNING * INTO v_old_subscription;

    -- Insert new active subscription
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
          'status', 'canceled'
        )
        ELSE NULL
      END
    );

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      -- Transaction will automatically rollback
      RAISE EXCEPTION 'Failed to transition subscription: %', SQLERRM;
  END;
END;
$$;