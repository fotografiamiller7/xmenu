/*
  # Add INSERT policy for profiles table

  1. Changes
    - Add policy to allow authenticated users to insert their own profile
    - This fixes the RLS violation error when creating new profiles

  2. Security
    - Only allows users to create a profile with their own user ID
    - Maintains existing RLS policies for SELECT and UPDATE
*/

-- Create INSERT policy for profiles
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);