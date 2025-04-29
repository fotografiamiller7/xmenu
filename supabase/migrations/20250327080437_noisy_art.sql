/*
  # Fix profiles and planosxmenu relationship

  1. Changes
    - Drop existing foreign key constraint if it exists
    - Add proper foreign key constraint between profiles.plano and planosxmenu.id
    - Create index for better join performance
    - Update existing profiles with plan data

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop existing foreign key constraint if it exists
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_plano_fkey;

-- Add proper foreign key constraint
ALTER TABLE profiles
ADD CONSTRAINT profiles_plano_fkey 
FOREIGN KEY (plano) 
REFERENCES planosxmenu(id)
ON DELETE SET NULL;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_profiles_plano ON profiles(plano);

-- Update existing profiles with plan data from subscriptions
UPDATE profiles p
SET plano = s.plan_id
FROM subscriptions s
WHERE s.user_id = p.id
  AND s.status = 'active'
  AND p.plano IS NULL;

-- Create basic plan if it doesn't exist
INSERT INTO planosxmenu (
  name,
  description,
  price,
  features
)
SELECT
  'Básico',
  'Plano básico para começar seu catálogo online',
  0.00,
  ARRAY[
    'Até 30 produtos',
    'Descrições com até 30 caracteres',
    'Catálogo online'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM planosxmenu WHERE name = 'Básico'
);

-- Insert basic plan features
WITH basic_plan AS (
  SELECT id FROM planosxmenu WHERE name = 'Básico'
)
INSERT INTO plan_features (
  plan_id,
  max_products,
  max_description_length,
  allow_tags,
  allow_theme_customization,
  allow_cart,
  allow_purchases
)
SELECT
  id,
  30, -- max_products
  30, -- max_description_length
  false, -- allow_tags
  false, -- allow_theme_customization
  false, -- allow_cart
  false -- allow_purchases
FROM basic_plan
ON CONFLICT (plan_id) 
DO UPDATE SET
  max_products = 30,
  max_description_length = 30,
  allow_tags = false,
  allow_theme_customization = false,
  allow_cart = false,
  allow_purchases = false;