/*
  # Add plan fields to profiles table

  1. Changes
    - Add `plano` column to store the selected plan name
    - Add `valor` column to store the plan price
    - Set appropriate data types and constraints
    - Add default values for existing rows

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Add plan fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS plano text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS valor numeric(10,2) DEFAULT 0.00;

-- Update existing profiles with plan data from subscriptions
UPDATE profiles p
SET 
  plano = pm.name,
  valor = pm.price
FROM subscriptions s
JOIN planosxmenu pm ON pm.id = s.plan_id
WHERE s.user_id = p.id
  AND s.status = 'active';

-- Add comment to explain the fields
COMMENT ON COLUMN profiles.plano IS 'Nome do plano selecionado pelo usuário';
COMMENT ON COLUMN profiles.valor IS 'Valor do plano em reais';