/*
  # Add enterprise plan and features

  1. Changes
    - Insert enterprise plan into planosxmenu table
    - Set up enterprise plan features:
      - Very high product limit (999999) to represent unlimited
      - 1000 character description limit
      - Enable tags
      - Enable theme customization
      - Enable cart and purchases
    - Add plan description

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Insert enterprise plan if it doesn't exist
INSERT INTO planosxmenu (
  name,
  description,
  price,
  features
)
SELECT
  'Enterprise',
  'Plano completo com recursos ilimitados para grandes estabelecimentos',
  299.90,
  ARRAY[
    'Produtos ilimitados',
    'Descrições com até 1000 caracteres',
    'Etiquetas personalizadas',
    'Personalização completa de cores',
    'Carrinho de compras',
    'Vendas online',
    'Suporte prioritário'
  ]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM planosxmenu WHERE name = 'Enterprise'
);

-- Insert or update plan features using the unique constraint
WITH enterprise_plan AS (
  SELECT id FROM planosxmenu WHERE name = 'Enterprise'
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
  999999, -- max_products set to a very high number to represent unlimited
  1000, -- max_description_length
  true, -- allow_tags
  true, -- allow_theme_customization
  true, -- allow_cart
  true  -- allow_purchases
FROM enterprise_plan
ON CONFLICT (plan_id) 
DO UPDATE SET
  max_products = 999999,
  max_description_length = 1000,
  allow_tags = true,
  allow_theme_customization = true,
  allow_cart = true,
  allow_purchases = true;