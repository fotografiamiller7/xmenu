/*
  # Fix users and profiles relationship

  1. Changes
    - Drop existing foreign key constraint
    - Create proper foreign key relationship between profiles and auth.users
    - Create index for better performance
    - Update email fields to ensure data consistency
    - Fix RLS policies to prevent recursion

  2. Security
    - Update RLS policies for users table
    - Add proper admin access policy
*/

-- Drop existing foreign key if it exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Create proper foreign key relationship
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Update profiles table to ensure proper relationship
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
AND p.email IS NULL;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Admin access" ON users;

-- Create new policies without recursion
CREATE POLICY "Users can view own record"
ON users FOR SELECT
TO public
USING (id = auth.uid());

CREATE POLICY "Users can update own record"
ON users FOR UPDATE
TO public
USING (id = auth.uid());

CREATE POLICY "Admin access"
ON users FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid() AND auth.users.email = 'admin@admin.com'
));