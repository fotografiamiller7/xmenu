/*
  # Make order details public

  1. Changes
    - Add public access policy for pedidosxmenu table
    - Allow public to view order details without authentication
    - Maintain existing policies for store owners

  2. Security
    - Only allow reading specific order details
    - Maintain existing RLS policies for other operations
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view order details" ON pedidosxmenu;

-- Create policy for public access to order details
CREATE POLICY "Public can view order details"
  ON pedidosxmenu
  FOR SELECT
  TO public
  USING (true);