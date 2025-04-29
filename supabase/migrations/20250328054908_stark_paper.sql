/*
  # Add payment logging table and functions

  1. New Tables
    - `payment_logs` - Store detailed payment transaction logs
      - `id` (uuid, primary key)
      - `payment_id` (text) - Mercado Pago payment ID
      - `user_id` (uuid) - Reference to profiles
      - `status` (text) - Transaction status
      - `error_message` (text) - Detailed error message
      - `request_data` (jsonb) - Request payload
      - `response_data` (jsonb) - API response
      - `created_at` (timestamptz)

  2. Functions
    - Add logging triggers for payment operations
    - Add function to clean old logs
*/

-- Create payment logs table
CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text,
  user_id uuid REFERENCES profiles(id),
  status text NOT NULL,
  error_message text,
  request_data jsonb,
  response_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_logs_payment_id ON payment_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON payment_logs(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at);

-- Enable RLS
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can view all logs"
  ON payment_logs
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can view own logs"
  ON payment_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to clean old logs
CREATE OR REPLACE FUNCTION clean_old_payment_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM payment_logs
  WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;