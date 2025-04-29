/*
  # Fix subscriptions table RLS policies

  1. Changes
    - Drop existing RLS policies for subscriptions table
    - Add policy for public to view subscriptions
    - Add policy for authenticated users to insert subscriptions
    - Add policy for users to view their own subscriptions
    - Add policy for admin to manage all subscriptions

  2. Security
    - Allow public read access
    - Allow authenticated users to create subscriptions
    - Maintain admin access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Public can view subscriptions" ON subscriptions;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public can view subscriptions"
  ON subscriptions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add policy for subscription payments
DROP POLICY IF EXISTS "Users can view own payments" ON subscription_payments;
DROP POLICY IF EXISTS "Allow system to manage payments" ON subscription_payments;

CREATE POLICY "Users can view own payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow system to manage payments"
  ON subscription_payments
  FOR ALL
  TO authenticated
  WITH CHECK (true);