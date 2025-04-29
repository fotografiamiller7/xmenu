/*
  # Fix subscription admin access policies

  1. Changes
    - Drop existing policies for subscriptions table
    - Create a new policy to allow public access to subscriptions
    - Maintain admin access for full CRUD operations

  2. Security
    - Allow public to view subscription data
    - Admin can still fully manage subscriptions
*/

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;

-- Create new policies for subscriptions table
-- This allows anyone to view subscription data (required for the admin panel)
CREATE POLICY "Public can view subscriptions"
  ON subscriptions
  FOR SELECT
  TO public
  USING (true);

-- Admin can still manage all subscriptions
CREATE POLICY "Admin can manage subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add policy for plans table as well
CREATE POLICY "Public can view plans"
  ON plans
  FOR SELECT
  TO public
  USING (true);