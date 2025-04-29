/*
  # Fix users table policies recursion

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies without recursion
    - Use auth.email() instead of subquery for admin check
    - Maintain basic user access policies

  2. Security
    - Enable RLS
    - Add policies for:
      - Users to read/update their own data
      - Admin to view all users based on email
*/

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Permitir leitura de todos os usuários" ON users;
DROP POLICY IF EXISTS "Permitir atualização de usuários" ON users;

-- Create new policies without recursion
CREATE POLICY "Users can view own record"
ON users FOR SELECT
TO public
USING (auth.uid() = id);

CREATE POLICY "Users can update own record"
ON users FOR UPDATE
TO public
USING (auth.uid() = id);

CREATE POLICY "Admin access"
ON users FOR ALL 
TO authenticated
USING (auth.email() = 'admin@admin.com')
WITH CHECK (auth.email() = 'admin@admin.com');