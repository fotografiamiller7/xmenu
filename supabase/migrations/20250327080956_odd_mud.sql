/*
  # Fix plan features relationship and queries

  1. Changes
    - Add proper foreign key relationship between profiles and plan_features
    - Update get_user_plan_features function to use correct joins
    - Add basic plan features for new users

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Update get_user_plan_features function to use correct joins
CREATE OR REPLACE FUNCTION get_user_plan_features(user_id uuid)
RETURNS plan_features AS $$
DECLARE
  user_plan_features plan_features;
BEGIN
  -- Get user's plan features through profiles.plano
  SELECT pf.*
  INTO user_plan_features
  FROM profiles p
  LEFT JOIN plan_features pf ON pf.plan_id = p.plano
  WHERE p.id = user_id;

  -- If no plan found, use basic plan limits
  IF user_plan_features IS NULL THEN
    SELECT pf.*
    INTO user_plan_features
    FROM planosxmenu p
    JOIN plan_features pf ON pf.plan_id = p.id
    WHERE p.name = 'Básico'
    LIMIT 1;

    -- If still no plan found, use default values
    IF user_plan_features IS NULL THEN
      RETURN ROW(
        gen_random_uuid(), -- id
        NULL, -- plan_id
        30, -- max_products
        30, -- max_description_length
        false, -- allow_tags
        false, -- allow_theme_customization
        false, -- allow_cart
        false -- allow_purchases
      )::plan_features;
    END IF;
  END IF;

  RETURN user_plan_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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