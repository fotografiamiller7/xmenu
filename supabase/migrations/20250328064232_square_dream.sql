/*
  # Add period type handling for plans

  1. Changes
    - Add period_type column to subscription_payments
    - Add period_type column to subscriptions
    - Add check constraints for valid period types
    - Update sync functions to handle period types

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add period_type column to subscription_payments if it doesn't exist
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS period_type text CHECK (period_type IN ('monthly', 'annual'));

-- Add period_type column to subscriptions if it doesn't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS period_type text CHECK (period_type IN ('monthly', 'annual'));

-- Update sync_subscription_payment function to handle period types
CREATE OR REPLACE FUNCTION sync_subscription_payment()
RETURNS trigger AS $$
DECLARE
  existing_subscription_id uuid;
  annual_discount numeric := 0.2; -- 20% discount for annual plans
  annual_price numeric;
BEGIN
  -- Calculate annual price with discount if period is annual
  IF NEW.period_type = 'annual' THEN
    -- Get monthly price from plan
    SELECT price INTO annual_price
    FROM planosxmenu
    WHERE id = NEW.plan_id;
    
    -- Calculate annual price with discount
    annual_price := (annual_price * 12) * (1 - annual_discount);
    
    -- Update payment amount
    NEW.amount := annual_price;
  END IF;

  -- First check if user has an active subscription
  SELECT id INTO existing_subscription_id
  FROM subscriptions
  WHERE user_id = NEW.user_id
    AND status = 'active';

  IF existing_subscription_id IS NOT NULL THEN
    -- Update existing subscription
    UPDATE subscriptions
    SET 
      plan_id = NEW.plan_id,
      payment_id = NEW.payment_id,
      period_type = NEW.period_type,
      current_period_start = now(),
      current_period_end = CASE NEW.period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END,
      updated_at = now()
    WHERE id = existing_subscription_id;
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
      NEW.user_id,
      NEW.plan_id,
      NEW.payment_id,
      'active',
      NEW.period_type,
      now(),
      CASE NEW.period_type
        WHEN 'annual' THEN now() + interval '1 year'
        ELSE now() + interval '30 days'
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;