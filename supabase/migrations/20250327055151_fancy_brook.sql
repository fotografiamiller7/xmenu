/*
  # Fix users and profiles relationship

  1. Changes
    - Drop existing foreign key if it exists
    - Create proper foreign key relationship between users and profiles tables
    - Update existing data to maintain consistency

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
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
SET email = au.email
FROM auth.users au
WHERE u.id = au.id
AND u.email IS NULL;

-- Update profiles table to ensure proper relationship
UPDATE profiles p
SET email = u.email
FROM users u
WHERE p.id = u.id
AND p.email IS NULL;