/*
  # Remove payment system tables and functions

  1. Changes
    - Drop payment_logs table
    - Drop payment-related functions
    - Remove payment_id from subscriptions
    - Clean up unused columns and constraints

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop payment logs table and related objects
DROP TABLE IF EXISTS payment_logs;
DROP FUNCTION IF EXISTS clean_old_payment_logs();

-- Remove payment_id from subscriptions
ALTER TABLE subscriptions
DROP COLUMN IF EXISTS payment_id;

-- Remove payment-related columns from subscription_payments
ALTER TABLE subscription_payments
DROP CONSTRAINT IF EXISTS subscription_payments_payment_id_key,
DROP COLUMN IF EXISTS payment_id;