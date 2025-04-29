/*
  # Fix users table policies and relationships

  1. Changes
    - Drop existing policies to avoid conflicts
    - Drop and recreate foreign key relationship
    - Update email sync between tables
    - Add proper RLS policies

  2. Security
    - Enable RLS
    - Add policies for:
      - Users to read/update their own data
      - Admin to view all users
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

-- Update users table to ensure proper relationship
UPDATE users u
SET email = au.email,
    status = 'active'
FROM auth.users au
WHERE u.id = au.id
AND u.email IS NULL;

-- Update profiles table to ensure proper relationship
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
AND p.email IS NULL;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Create new policies
CREATE POLICY "Users can view their own data"
ON users FOR SELECT
TO public
USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
TO public
USING (auth.uid() = id);

CREATE POLICY "Admin can view all users"
ON users FOR SELECT
TO authenticated
USING (
  (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
);