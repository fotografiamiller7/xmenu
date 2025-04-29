/*
  # Fix RLS policies for pedidosxmenu table

  1. Changes
    - Drop existing RLS policies
    - Create new policies that allow:
      - Store owners to view their orders
      - Anyone to insert orders (needed for edge function)
      - System role to bypass RLS
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Store owners can view their orders" ON pedidosxmenu;
DROP POLICY IF EXISTS "System can insert orders" ON pedidosxmenu;

-- Enable RLS
ALTER TABLE pedidosxmenu ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Store owners can view their orders"
  ON pedidosxmenu
  FOR SELECT
  TO authenticated
  USING (auth.uid() = store_id);

CREATE POLICY "Allow insert orders"
  ON pedidosxmenu
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Grant access to service_role (bypasses RLS)
GRANT ALL ON pedidosxmenu TO service_role;