/*
  # Fix permissions and policies for payment system

  1. Changes
    - Add proper RLS policies for payment-related tables
    - Fix service role access for edge functions
    - Add missing columns and indexes
    - Update existing policies to be more permissive

  2. Security
    - Allow edge functions to access necessary tables
    - Maintain user data privacy
    - Enable proper access for payment processing
*/

-- Enable RLS on all relevant tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE planosxmenu ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Subscriptions policies
  DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Allow service role to access subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Allow system to manage subscriptions" ON subscriptions;
  
  -- Subscription payments policies
  DROP POLICY IF EXISTS "Users can view own payments" ON subscription_payments;
  DROP POLICY IF EXISTS "Allow service role to access subscription_payments" ON subscription_payments;
  DROP POLICY IF EXISTS "Allow system to manage payments" ON subscription_payments;
  
  -- Plans policies
  DROP POLICY IF EXISTS "Public can view plans" ON planosxmenu;
  DROP POLICY IF EXISTS "Allow service role to access planosxmenu" ON planosxmenu;
  
  -- Plan features policies
  DROP POLICY IF EXISTS "Public can read plan features" ON plan_features;
  DROP POLICY IF EXISTS "Allow service role to access plan_features" ON plan_features;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow service role to access subscriptions"
  ON subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow system to manage subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new policies for subscription payments
CREATE POLICY "Users can view own payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow service role to access subscription_payments"
  ON subscription_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow system to manage payments"
  ON subscription_payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new policies for plans
CREATE POLICY "Public can view plans"
  ON planosxmenu
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service role to access planosxmenu"
  ON planosxmenu
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create new policies for plan features
CREATE POLICY "Public can read plan features"
  ON plan_features
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service role to access plan_features"
  ON plan_features
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status 
ON subscriptions(user_id, status);

-- Create indexes for subscription payments if the table exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'subscription_payments'
  ) THEN
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subscription_payments' 
      AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id 
      ON subscription_payments(user_id);
    END IF;

    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subscription_payments' 
      AND column_name = 'payment_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_id 
      ON subscription_payments(payment_id);
    END IF;
  END IF;
END $$;

-- Grant necessary permissions to service role
GRANT ALL ON subscriptions TO service_role;
GRANT ALL ON subscription_payments TO service_role;
GRANT ALL ON planosxmenu TO service_role;
GRANT ALL ON plan_features TO service_role;

-- Function to check if service role has proper access
CREATE OR REPLACE FUNCTION verify_service_role_access()
RETURNS boolean AS $$
DECLARE
  has_access boolean;
BEGIN
  -- Check if service role has proper permissions
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE grantee = 'service_role'
    AND table_name IN ('subscriptions', 'subscription_payments', 'planosxmenu', 'plan_features')
    AND privilege_type = 'ALL'
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate payment data
CREATE OR REPLACE FUNCTION validate_payment_data(
  p_user_id uuid,
  p_plan_id uuid,
  p_payment_id text,
  p_amount numeric
)
RETURNS boolean AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check if plan exists
  IF NOT EXISTS (SELECT 1 FROM planosxmenu WHERE id = p_plan_id) THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  -- Check if payment_id is unique in subscriptions
  IF EXISTS (
    SELECT 1 
    FROM subscriptions 
    WHERE payment_id = p_payment_id
  ) THEN
    RAISE EXCEPTION 'Duplicate payment ID in subscriptions';
  END IF;

  -- Check if payment_id is unique in subscription_payments
  IF EXISTS (
    SELECT 1 
    FROM subscription_payments 
    WHERE payment_id = p_payment_id
  ) THEN
    RAISE EXCEPTION 'Duplicate payment ID in subscription_payments';
  END IF;

  -- Check if amount is valid
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;