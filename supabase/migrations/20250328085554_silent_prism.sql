/*
  # Add subscription cleanup function and trigger

  1. Changes
    - Add function to automatically delete old inactive/canceled subscriptions
    - Add trigger to clean up old subscriptions periodically
    - Keep only the most recent inactive subscription for history
    - Delete subscriptions older than 30 days

  2. Security
    - Function runs with SECURITY DEFINER to ensure proper permissions
    - Only deletes inactive/canceled subscriptions
*/

-- Create function to clean up old subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Keep only the most recent inactive subscription per user
  WITH ranked_old_subscriptions AS (
    SELECT 
      id,
      user_id,
      created_at,
      ROW_NUMBER() OVER (
        PARTITION BY user_id 
        ORDER BY created_at DESC
      ) as rn
    FROM subscriptions
    WHERE 
      status IN ('inactive', 'canceled')
      AND created_at < now() - interval '30 days'
  )
  DELETE FROM subscriptions
  WHERE id IN (
    SELECT id 
    FROM ranked_old_subscriptions 
    WHERE rn > 1
  );
END;
$$;

-- Create function to periodically clean up subscriptions
CREATE OR REPLACE FUNCTION trigger_subscription_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Run cleanup when a new subscription is created
  PERFORM cleanup_old_subscriptions();
  RETURN NEW;
END;
$$;

-- Create trigger to run cleanup on new subscriptions
DROP TRIGGER IF EXISTS subscription_cleanup_trigger ON subscriptions;
CREATE TRIGGER subscription_cleanup_trigger
  AFTER INSERT ON subscriptions
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_subscription_cleanup();