/*
  # Fix subscription handling and cleanup

  1. Changes
    - Drop existing constraints and indexes
    - Add proper status enum type
    - Add unique index for active subscriptions
    - Update subscription management function
    - Add cleanup trigger
    - Fix status transitions

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- First, ensure we have proper status types
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing constraints and indexes if they exist
DROP INDEX IF EXISTS idx_subscriptions_active_user;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add proper status constraint
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_status_check 
CHECK (status IN ('active', 'canceled', 'past_due', 'trialing'));

-- Create unique index for active subscriptions
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

-- Create function to clean up old subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete old canceled subscriptions, keeping only the most recent one per user
  WITH ranked_old_subscriptions AS (
    SELECT 
      id,
      user_id,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY user_id 
        ORDER BY created_at DESC
      ) as rn
    FROM subscriptions
    WHERE 
      status = 'canceled'
      AND created_at < now() - interval '30 days'
  )
  DELETE FROM subscriptions
  WHERE id IN (
    SELECT id 
    FROM ranked_old_subscriptions 
    WHERE rn > 1
  );
END;
$$;

-- Create trigger function for subscription cleanup
CREATE OR REPLACE FUNCTION trigger_subscription_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Run cleanup when a new subscription is created
  PERFORM cleanup_old_subscriptions();
  RETURN NEW;
END;
$$;

-- Create trigger to run cleanup on new subscriptions
DROP TRIGGER IF EXISTS subscription_cleanup_trigger ON subscriptions;
CREATE TRIGGER subscription_cleanup_trigger
  AFTER INSERT ON subscriptions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_subscription_cleanup();

-- Clean up any existing duplicate active subscriptions
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