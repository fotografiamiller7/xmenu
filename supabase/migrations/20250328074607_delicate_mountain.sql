/*
  # Fix profiles table RLS policies

  1. Changes
    - Drop existing restrictive policies
    - Add policy for public to view profiles
    - Add policy for users to update their own profiles
    - Add policy for admin access
    - Add policy for authenticated users to insert profiles

  2. Security
    - Allow public read access to profiles
    - Allow users to manage their own profiles
    - Allow admin full access
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin access" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;

-- Create new policies

-- Allow public to view all profiles
CREATE POLICY "Public can view profiles"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow admin full access
CREATE POLICY "Admin access"
  ON profiles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix any existing profiles without plans
WITH basic_plan AS (
  SELECT id FROM planosxmenu WHERE name = 'Básico' LIMIT 1
)
UPDATE profiles p
SET plano = (SELECT id FROM basic_plan)
WHERE p.plano IS NULL;