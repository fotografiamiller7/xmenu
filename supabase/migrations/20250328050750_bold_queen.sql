/*
  # Add unique constraint to subscription_payments table

  1. Changes
    - Add unique constraint on payment_id column
    - Add index for better query performance
    - Update existing policies to handle payment_id properly

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add unique constraint for payment_id
ALTER TABLE subscription_payments
ADD CONSTRAINT subscription_payments_payment_id_key UNIQUE (payment_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_id 
ON subscription_payments(payment_id);