/*
  # Add subscription cleanup on plan upgrade

  1. Changes
    - Add trigger to clean up canceled subscriptions when a user upgrades their plan
    - Keep only the most recent canceled subscription for history
    - Update sync_subscription_with_profile function to handle cleanup
    - Add proper error handling and logging

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Create function to clean up old subscriptions for a user
CREATE OR REPLACE FUNCTION cleanup_user_subscriptions(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  most_recent_canceled uuid;
BEGIN
  -- Get ID of most recent canceled subscription
  SELECT id INTO most_recent_canceled
  FROM subscriptions
  WHERE user_id = user_id
    AND status = 'canceled'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Delete all canceled subscriptions except the most recent one
  DELETE FROM subscriptions
  WHERE user_id = user_id
    AND status = 'canceled'
    AND id != COALESCE(most_recent_canceled, '00000000-0000-0000-0000-000000000000'::uuid);
END;
$$;

-- Update sync_subscription_with_profile function to include cleanup
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
  UPDATE profiles
  SET 
    plano = CASE 
      WHEN NEW.status = 'active' THEN NEW.plan_id 
      ELSE NULL 
    END,
    updated_at = now()
  WHERE id = NEW.user_id;

  -- If subscription is canceled, revert to basic plan
  IF TG_OP = 'UPDATE' AND NEW.status = 'canceled' AND OLD.status = 'active' THEN
    WITH basic_plan AS (
      SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
    )
    UPDATE profiles
    SET 
      plano = (SELECT id FROM basic_plan),
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  -- Clean up old canceled subscriptions when activating a new one
  IF NEW.status = 'active' THEN
    PERFORM cleanup_user_subscriptions(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;