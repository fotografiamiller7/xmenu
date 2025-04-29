/*
  # Add subscription payments table and related structures

  1. New Tables
    - `subscription_payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `plan_id` (uuid, references planosxmenu)
      - `payment_id` (text) - Mercado Pago payment ID
      - `amount` (numeric)
      - `status` (text)
      - `period_type` (text) - 'monthly' or 'annual'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users can read their own payments
      - System can insert/update payments
*/

-- Create subscription payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES planosxmenu(id) ON DELETE RESTRICT NOT NULL,
  payment_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending',
  period_type text NOT NULL CHECK (period_type IN ('monthly', 'annual')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_id ON subscription_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);

-- Enable RLS
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow system to manage payments"
  ON subscription_payments
  FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Create trigger for updating updated_at
CREATE TRIGGER set_subscription_payments_updated_at
  BEFORE UPDATE ON subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();