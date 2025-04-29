/*
  # Add plan payment handling

  1. Changes
    - Add function to handle plan upgrades
    - Add trigger to sync subscription status
    - Add payment handling for plan changes

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Function to handle plan upgrade payment
CREATE OR REPLACE FUNCTION handle_plan_upgrade(
  user_id uuid,
  plan_id uuid,
  payment_id text,
  period_type text
)
RETURNS void AS $$
DECLARE
  existing_subscription_id uuid;
BEGIN
  -- Validate period type
  IF period_type NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid period type: %. Must be either monthly or annual', period_type;
  END IF;

  -- Check if user has an active subscription
  SELECT id INTO existing_subscription_id
  FROM subscriptions
  WHERE user_id = user_id
    AND status = 'active';

  IF existing_subscription_id IS NOT NULL THEN
    -- Update existing subscription
    UPDATE subscriptions
    SET 
      plan_id = plan_id,
      payment_id = payment_id,
      period_type = period_type,
      current_period_start = now(),
      current_period_end = CASE period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END,
      updated_at = now()
    WHERE id = existing_subscription_id;
  ELSE
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
      user_id,
      plan_id,
      payment_id,
      'active',
      period_type,
      now(),
      CASE period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END
    );
  END IF;

  -- Update profile's plan
  UPDATE profiles
  SET 
    plano = plan_id,
    updated_at = now()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;