/*
  # Add professional plan features

  1. Changes
    - Insert professional plan into planosxmenu if it doesn't exist
    - Add unique constraint on plan_id in plan_features table
    - Set up plan features for professional plan:
      - 50 max products
      - 100 character description limit
      - Enable tags
      - Enable theme customization
      - Enable cart and purchases
    - Add plan description

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Insert professional plan if it doesn't exist
INSERT INTO planosxmenu (
  name,
  description,
  price,
  features
)
SELECT
  'Profissional',
  'Plano ideal para estabelecimentos que precisam de recursos avançados de personalização e vendas',
  99.90,
  ARRAY[
    'Até 50 produtos',
    'Descrições com até 100 caracteres',
    'Etiquetas personalizadas',
    'Personalização de cores',
    'Carrinho de compras',
    'Vendas online'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM planosxmenu WHERE name = 'Profissional'
);

-- Add unique constraint to plan_features table
ALTER TABLE plan_features DROP CONSTRAINT IF EXISTS plan_features_plan_id_key;
ALTER TABLE plan_features ADD CONSTRAINT plan_features_plan_id_key UNIQUE (plan_id);

-- Insert or update plan features using the unique constraint
WITH professional_plan AS (
  SELECT id FROM planosxmenu WHERE name = 'Profissional'
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
  50, -- max_products
  100, -- max_description_length
  true, -- allow_tags
  true, -- allow_theme_customization
  true, -- allow_cart
  true -- allow_purchases
FROM professional_plan
ON CONFLICT (plan_id) 
DO UPDATE SET
  max_products = 50,
  max_description_length = 100,
  allow_tags = true,
  allow_theme_customization = true,
  allow_cart = true,
  allow_purchases = true;