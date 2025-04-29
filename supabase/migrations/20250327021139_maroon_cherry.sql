/*
  # Create pedidosxmenu table

  1. New Tables
    - `pedidosxmenu`
      - `id` (uuid, primary key)
      - `payment_id` (text, not null) - ID do pagamento do Mercado Pago
      - `store_id` (uuid, not null) - ID da loja que recebeu o pedido
      - `customer_name` (text, not null) - Nome do cliente
      - `customer_email` (text, not null) - Email do cliente
      - `customer_phone` (text, not null) - Telefone do cliente
      - `customer_cpf` (text, not null) - CPF do cliente
      - `customer_address` (text, not null) - Endereço do cliente
      - `total_amount` (numeric, not null) - Valor total do pedido
      - `produtos` (jsonb, not null) - Array com os produtos do pedido
      - `status` (text, not null) - Status do pagamento
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização

  2. Security
    - Enable RLS on `pedidosxmenu` table
    - Add policy for store owners to view their orders
    - Add policy for system to insert orders

  3. Indexes
    - Index on payment_id for faster lookups
    - Index on store_id for faster filtering
    - Index on status for status filtering
*/

-- Create pedidosxmenu table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS pedidosxmenu (
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
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Create indexes if they don't exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_pedidosxmenu_payment_id ON pedidosxmenu(payment_id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_pedidosxmenu_store_id ON pedidosxmenu(store_id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_pedidosxmenu_status ON pedidosxmenu(status);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE pedidosxmenu ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and create new ones
DO $$ BEGIN
  DROP POLICY IF EXISTS "Store owners can view their orders" ON pedidosxmenu;
  DROP POLICY IF EXISTS "System can insert orders" ON pedidosxmenu;
  
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
END $$;

-- Create updated_at trigger if it doesn't exist
DO $$ BEGIN
  CREATE TRIGGER set_pedidosxmenu_updated_at
    BEFORE UPDATE ON pedidosxmenu
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;