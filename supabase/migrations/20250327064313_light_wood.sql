/*
  # Fix subscription plan reference

  1. Changes
    - Drop existing foreign key constraint
    - Add correct foreign key reference to planosxmenu table
    - Update existing subscriptions to use correct plan IDs

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Drop existing foreign key constraint if it exists
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;

-- Add new foreign key constraint referencing planosxmenu table
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES planosxmenu(id)
ON DELETE RESTRICT;