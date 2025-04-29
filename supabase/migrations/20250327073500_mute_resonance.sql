/*
  # Fix plan features RLS policies

  1. Changes
    - Enable RLS on plan_features table
    - Add policy for admin to manage plan features
    - Add policy for users to read plan features
    - Use is_admin() function for admin checks

  2. Security
    - Only admin can create/update plan features
    - All users can read plan features
*/

-- Enable RLS
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read plan features" ON plan_features;
DROP POLICY IF EXISTS "Admin can manage plan features" ON plan_features;

-- Create policy for admin to manage plan features
CREATE POLICY "Admin can manage plan features"
ON plan_features
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Create policy for users to read plan features
CREATE POLICY "Public can read plan features"
ON plan_features
FOR SELECT
TO public
USING (true);