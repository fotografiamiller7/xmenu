/*
  # Fix plan payment function and error handling

  1. Changes
    - Add proper error handling for plan payment
    - Add validation for plan existence
    - Fix payment amount calculation for annual plans
    - Add proper response formatting

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow service role to access subscription_payments" ON subscription_payments;
DROP POLICY IF EXISTS "Allow system to manage payments" ON subscription_payments;

-- Create new policies
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

-- Function to validate plan exists and get price
CREATE OR REPLACE FUNCTION get_plan_price(p_plan_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price numeric;
BEGIN
  SELECT price INTO v_price
  FROM planosxmenu
  WHERE id = p_plan_id;

  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  RETURN v_price;
END;
$$;

-- Function to calculate annual price with discount
CREATE OR REPLACE FUNCTION calculate_annual_price(monthly_price numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  annual_price numeric;
  discount_percentage numeric := 0.2; -- 20% discount
BEGIN
  -- Calculate annual price (12 months with 20% discount)
  annual_price := monthly_price * 12 * (1 - discount_percentage);
  
  -- Round to 2 decimal places
  RETURN round(annual_price::numeric, 2);
END;
$$;

-- Function to validate payment data
CREATE OR REPLACE FUNCTION validate_payment_data(
  p_amount numeric,
  p_customer_data jsonb,
  p_store_api_key text,
  p_period_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate amount
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: %', p_amount;
  END IF;

  -- Validate customer data
  IF p_customer_data IS NULL OR 
     p_customer_data->>'name' IS NULL OR 
     p_customer_data->>'email' IS NULL OR 
     p_customer_data->>'cpf' IS NULL THEN
    RAISE EXCEPTION 'Invalid customer data';
  END IF;

  -- Validate API key
  IF p_store_api_key IS NULL OR p_store_api_key = '' THEN
    RAISE EXCEPTION 'Invalid API key';
  END IF;

  -- Validate period type
  IF p_period_type NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid period type: %. Must be either monthly or annual', p_period_type;
  END IF;

  RETURN true;
END;
$$;

-- Create function to handle payment errors
CREATE OR REPLACE FUNCTION handle_payment_error(
  p_error text,
  p_user_id uuid,
  p_plan_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log error
  INSERT INTO subscription_payments (
    user_id,
    plan_id,
    amount,
    status,
    error_message
  ) VALUES (
    p_user_id,
    p_plan_id,
    p_amount,
    'error',
    p_error
  );

  -- Return error response
  RETURN jsonb_build_object(
    'success', false,
    'error', p_error
  );
END;
$$;

-- Add error_message column to subscription_payments if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE subscription_payments 
  ADD COLUMN error_message text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;