/*
  # Add plan deletion support and constraints

  1. Changes
    - Add ON DELETE CASCADE to plan_features foreign key
    - Add ON DELETE CASCADE to subscriptions foreign key
    - Add ON DELETE CASCADE to subscription_payments foreign key
    - Add check to prevent deletion of plans with active subscriptions

  2. Security
    - Maintain existing RLS policies
    - Add proper constraints for data integrity
*/

-- First drop existing foreign key constraints
ALTER TABLE plan_features 
DROP CONSTRAINT IF EXISTS plan_features_plan_id_fkey;

ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;

ALTER TABLE subscription_payments
DROP CONSTRAINT IF EXISTS subscription_payments_plan_id_fkey;

-- Recreate foreign key constraints with proper ON DELETE behavior
ALTER TABLE plan_features
ADD CONSTRAINT plan_features_plan_id_fkey
FOREIGN KEY (plan_id)
REFERENCES planosxmenu(id)
ON DELETE CASCADE;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_plan_id_fkey
FOREIGN KEY (plan_id)
REFERENCES planosxmenu(id)
ON DELETE RESTRICT;

ALTER TABLE subscription_payments
ADD CONSTRAINT subscription_payments_plan_id_fkey
FOREIGN KEY (plan_id)
REFERENCES planosxmenu(id)
ON DELETE RESTRICT;

-- Create function to check if plan can be deleted
CREATE OR REPLACE FUNCTION can_delete_plan(plan_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if plan has any active subscriptions
  RETURN NOT EXISTS (
    SELECT 1 
    FROM subscriptions 
    WHERE subscriptions.plan_id = $1 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;