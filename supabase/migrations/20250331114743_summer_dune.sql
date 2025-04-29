/*
  # Fix ambiguous user_id references in functions

  1. Changes
    - Update cleanup_user_subscriptions function to properly qualify user_id
    - Fix ambiguous column references in queries
    - Maintain existing functionality

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Drop existing function
DROP FUNCTION IF EXISTS cleanup_user_subscriptions(uuid);

-- Create improved function with qualified column references
CREATE OR REPLACE FUNCTION cleanup_user_subscriptions(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  most_recent_canceled uuid;
BEGIN
  -- Get ID of most recent canceled subscription
  SELECT id INTO most_recent_canceled
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'canceled'
  ORDER BY s.updated_at DESC
  LIMIT 1;

  -- Delete all canceled subscriptions except the most recent one
  DELETE FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'canceled'
    AND s.id != COALESCE(most_recent_canceled, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$$;

-- Update sync_subscription_with_profile function to use qualified references
CREATE OR REPLACE FUNCTION sync_subscription_with_profile()
RETURNS trigger AS $$
BEGIN
  -- Set default period type if not provided
  IF NEW.period_type IS NULL THEN
    NEW.period_type := 'monthly';
  END IF;

  -- Validate period type
  IF NEW.period_type NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid period type: %. Must be either monthly or annual', NEW.period_type;
  END IF;

  -- Set current_period_start if not provided
  IF NEW.current_period_start IS NULL THEN
    NEW.current_period_start := now();
  END IF;

  -- Calculate subscription end date based on period type
  NEW.current_period_end := 
    CASE NEW.period_type
      WHEN 'annual' THEN NEW.current_period_start + interval '1 year'
      ELSE NEW.current_period_start + interval '30 days'
    END;

  -- Update profile with subscription data
  UPDATE profiles p
  SET 
    plano = CASE 
      WHEN NEW.status = 'active' THEN NEW.plan_id 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE p.id = NEW.user_id;

  -- If subscription is canceled, revert to basic plan
  IF TG_OP = 'UPDATE' AND NEW.status = 'canceled' AND OLD.status = 'active' THEN
    WITH basic_plan AS (
      SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
    )
    UPDATE profiles p
    SET 
      plano = (SELECT id FROM basic_plan),
      updated_at = now()
    WHERE p.id = NEW.user_id;
  END IF;

  -- Clean up old canceled subscriptions when activating a new one
  IF NEW.status = 'active' THEN
    PERFORM cleanup_user_subscriptions(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;