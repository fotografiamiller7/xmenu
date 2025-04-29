/*
  # Fix users and profiles relationship

  1. Changes
    - Drop existing foreign key constraint
    - Create proper foreign key relationship between profiles and auth.users
    - Create index for better performance
    - Update email fields to ensure data consistency

  2. Security
    - Maintain existing RLS policies
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

-- Update profiles table to ensure proper relationship
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
AND p.email IS NULL;