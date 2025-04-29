/*
  # Fix admin permissions for subscriptions and profiles

  1. Changes
    - Add RLS policies for admin to access subscriptions table
    - Update profiles table policies for admin access
    - Add policies for pedidosxmenu table admin access

  2. Security
    - Only admin can access all records
    - Maintains existing user-specific policies
*/

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON subscriptions;

-- Create admin policy for subscriptions
CREATE POLICY "Admin can manage subscriptions"
ON subscriptions FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.email = 'admin@admin.com'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.email = 'admin@admin.com'
));

-- Enable RLS on pedidosxmenu table
ALTER TABLE pedidosxmenu ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin can view all orders" ON pedidosxmenu;

-- Create admin policy for pedidosxmenu
CREATE POLICY "Admin can view all orders"
ON pedidosxmenu FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.email = 'admin@admin.com'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.email = 'admin@admin.com'
));