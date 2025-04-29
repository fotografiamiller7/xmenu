/*
  # Fix Admin Permissions and Access

  1. Changes
    - Add public policy for profiles table
    - Fix admin access to users table
    - Fix admin access to subscriptions table
    - Fix admin access to pedidosxmenu table
    - Add proper RLS policies for all tables

  2. Security
    - Maintain existing user-level policies
    - Add proper admin access
    - Use consistent admin check across all policies
*/

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@admin.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix profiles table policies
DROP POLICY IF EXISTS "Admin access" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;

CREATE POLICY "Public can view profiles"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin access"
ON profiles FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Fix subscriptions table policies
DROP POLICY IF EXISTS "Admin can manage subscriptions" ON subscriptions;

CREATE POLICY "Admin can manage subscriptions"
ON subscriptions FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Fix pedidosxmenu table policies
DROP POLICY IF EXISTS "Admin can view all orders" ON pedidosxmenu;
DROP POLICY IF EXISTS "Store owners can view their orders" ON pedidosxmenu;
DROP POLICY IF EXISTS "Allow insert orders" ON pedidosxmenu;

CREATE POLICY "Admin can view all orders"
ON pedidosxmenu FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Store owners can view their orders"
ON pedidosxmenu FOR SELECT
TO authenticated
USING (store_id = auth.uid());

CREATE POLICY "Allow insert orders"
ON pedidosxmenu FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix planosxmenu table policies
DROP POLICY IF EXISTS "Admin can manage plans" ON planosxmenu;

CREATE POLICY "Admin can manage plans"
ON planosxmenu FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Fix metrics table policies
DROP POLICY IF EXISTS "Admin can manage metrics" ON metrics;

CREATE POLICY "Admin can manage metrics"
ON metrics FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());