/*
  # Create orders table for XMenu

  1. New Tables
    - `pedidosXmenu`
      - `id` (uuid, primary key)
      - `payment_id` (text) - Mercado Pago payment ID
      - `store_id` (uuid) - References profiles.id
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `customer_cpf` (text)
      - `customer_address` (text)
      - `total_amount` (numeric)
      - `produtos` (jsonb) - Array of products with details
      - `status` (text) - Payment status
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for:
      - Store owners can read their own orders
      - System can insert new orders
      - No update/delete allowed
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS pedidosXmenu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL,
  store_id uuid REFERENCES profiles(id) NOT NULL,
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pedidosXmenu_store_id ON pedidosXmenu(store_id);
CREATE INDEX IF NOT EXISTS idx_pedidosXmenu_payment_id ON pedidosXmenu(payment_id);
CREATE INDEX IF NOT EXISTS idx_pedidosXmenu_status ON pedidosXmenu(status);

-- Enable RLS
ALTER TABLE pedidosXmenu ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Store owners can view their orders"
  ON pedidosXmenu
  FOR SELECT
  TO authenticated
  USING (auth.uid() = store_id);

CREATE POLICY "System can insert orders"
  ON pedidosXmenu
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create trigger for updating updated_at
CREATE TRIGGER set_pedidosXmenu_updated_at
  BEFORE UPDATE ON pedidosXmenu
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();