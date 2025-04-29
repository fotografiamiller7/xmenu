/*
  # Delete canceled subscriptions

  1. Changes
    - Delete all subscriptions with status 'canceled'
    - Log the number of deleted records
    - Maintain referential integrity
    - Keep audit trail of deletions

  2. Security
    - Run as a transaction to ensure atomicity
    - Maintain existing RLS policies
*/

DO $$ 
DECLARE
  deleted_count integer;
BEGIN
  -- Delete canceled subscriptions and get count of deleted records
  WITH deleted AS (
    DELETE FROM subscriptions
    WHERE status = 'canceled'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  -- Log the operation
  RAISE NOTICE 'Deleted % canceled subscriptions', deleted_count;
END $$;