/*
  # Fix subscription payments table structure

  1. Changes
    - Add payment_id column if missing
    - Add unique constraint for payment_id
    - Add proper indexes for performance
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add proper constraints
*/

-- Add payment_id column if it doesn't exist
ALTER TABLE subscription_payments
ADD COLUMN IF NOT EXISTS payment_id text;

-- Add unique constraint for payment_id if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscription_payments_payment_id_key'
  ) THEN
    ALTER TABLE subscription_payments
    ADD CONSTRAINT subscription_payments_payment_id_key UNIQUE (payment_id);
  END IF;
END $$;

-- Create index for better performance if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_subscription_payments_payment_id'
  ) THEN
    CREATE INDEX idx_subscription_payments_payment_id 
    ON subscription_payments(payment_id);
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own payments" ON subscription_payments;
  DROP POLICY IF EXISTS "Users can view their own payments" ON subscription_payments;
  DROP POLICY IF EXISTS "Users can view their own records" ON subscription_payments;
  DROP POLICY IF EXISTS "Allow service role to access subscription_payments" ON subscription_payments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can view their own payments'
    AND tablename = 'subscription_payments'
  ) THEN
    CREATE POLICY "Users can view their own payments"
      ON subscription_payments
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Allow service role to access subscription_payments'
    AND tablename = 'subscription_payments'
  ) THEN
    CREATE POLICY "Allow service role to access subscription_payments"
      ON subscription_payments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;