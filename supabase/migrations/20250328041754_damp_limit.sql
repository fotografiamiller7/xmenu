/*
  # Fix plans visibility and access policies

  1. Changes
    - Add public access policy for plans
    - Drop existing admin-only policy
    - Add new admin policy for modifications
    - Update existing policies to be more permissive

  2. Security
    - Allow public to view all plans
    - Maintain admin-only access for modifications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage plans" ON planosxmenu;

-- Create policy for public access to view plans
CREATE POLICY "Public can view plans"
  ON planosxmenu
  FOR SELECT
  TO public
  USING (true);

-- Create policy for admin to manage plans
CREATE POLICY "Admin can manage plans"
  ON planosxmenu
  FOR ALL 
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Add public access policy for plan features
DROP POLICY IF EXISTS "Public can read plan features" ON plan_features;

CREATE POLICY "Public can read plan features"
  ON plan_features
  FOR SELECT
  TO public
  USING (true);

-- Ensure basic plan exists
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

-- Insert basic plan features if they don't exist
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
WHERE NOT EXISTS (
  SELECT 1 FROM plan_features pf
  JOIN planosxmenu p ON p.id = pf.plan_id
  WHERE p.name = 'Básico'
);