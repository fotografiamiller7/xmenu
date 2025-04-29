/*
  # Fix pedidosxmenu table case sensitivity

  1. Changes
    - Drop existing table
    - Recreate with lowercase name for consistency
    - Add proper indexes
    - Set up RLS policies
    - Add trigger for updated_at

  2. Security
    - Enable RLS
    - Add policy for store owners to view their orders
    - Add policy for system to insert orders
*/

-- Drop existing table
DROP TABLE IF EXISTS "pedidosXmenu";
DROP TABLE IF EXISTS pedidosxmenu;

-- Create table with consistent lowercase name
CREATE TABLE pedidosxmenu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL,
  store_id uuid NOT NULL REFERENCES profiles(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_cpf text NOT NULL,
  customer_address text NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  produtos jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_pedidosxmenu_payment_id ON pedidosxmenu(payment_id);
CREATE INDEX idx_pedidosxmenu_store_id ON pedidosxmenu(store_id);
CREATE INDEX idx_pedidosxmenu_status ON pedidosxmenu(status);

-- Enable RLS
ALTER TABLE pedidosxmenu ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Store owners can view their orders"
  ON pedidosxmenu
  FOR SELECT
  TO authenticated
  USING (auth.uid() = store_id);

CREATE POLICY "System can insert orders"
  ON pedidosxmenu
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger
CREATE TRIGGER set_pedidosxmenu_updated_at
  BEFORE UPDATE ON pedidosxmenu
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();