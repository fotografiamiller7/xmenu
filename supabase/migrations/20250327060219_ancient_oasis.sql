/*
  # Fix profiles table permissions and policies

  1. Changes
    - Drop and recreate RLS policies for profiles table
    - Add public access policy for profiles
    - Ensure proper foreign key relationship with auth.users
    - Add index for better performance

  2. Security
    - Enable RLS
    - Allow public read access to profiles
    - Allow authenticated users to manage their own profiles
    - Allow admin full access
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admin access" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;

-- Create new policies
CREATE POLICY "Public can view profiles"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Admin access"
ON profiles FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = auth.uid() 
  AND auth.users.email = 'admin@admin.com'
));