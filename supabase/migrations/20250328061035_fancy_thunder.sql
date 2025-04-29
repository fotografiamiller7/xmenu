/*
  # Fix plan features type casting error

  1. Changes
    - Drop existing check_product_limits function
    - Create new version that properly handles plan features lookup
    - Fix type casting issue by using explicit type annotations
    - Maintain existing functionality with better error handling

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS enforce_plan_limits ON products;
DROP FUNCTION IF EXISTS check_product_limits();

-- Create improved function with proper type handling
CREATE OR REPLACE FUNCTION check_product_limits()
RETURNS trigger AS $$
DECLARE
  user_plan_id uuid;
  plan_limits record;
  product_count integer;
BEGIN
  -- Get user's active plan ID from profiles
  SELECT plano INTO user_plan_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get plan limits
  SELECT 
    max_products,
    max_description_length,
    allow_tags
  INTO STRICT plan_limits
  FROM plan_features
  WHERE plan_id = user_plan_id;

  -- If no plan found, use basic plan limits
  IF plan_limits IS NULL THEN
    SELECT 
      max_products,
      max_description_length,
      allow_tags
    INTO plan_limits
    FROM plan_features pf
    JOIN planosxmenu p ON p.id = pf.plan_id
    WHERE p.name = 'Básico'
    LIMIT 1;

    -- If still no limits found, use defaults
    IF plan_limits IS NULL THEN
      plan_limits := ROW(
        30, -- max_products
        30, -- max_description_length
        false -- allow_tags
      );
    END IF;
  END IF;

  -- Check product count
  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*) INTO product_count
    FROM products
    WHERE user_id = NEW.user_id;

    IF product_count >= plan_limits.max_products THEN
      RAISE EXCEPTION 'Limite de produtos atingido. Seu plano permite até % produtos.', 
        plan_limits.max_products;
    END IF;
  END IF;

  -- Enforce description length
  IF length(NEW.description) > plan_limits.max_description_length THEN
    NEW.description := substring(NEW.description, 1, plan_limits.max_description_length);
  END IF;

  -- Enforce tags restriction
  IF NOT plan_limits.allow_tags AND NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0 THEN
    RAISE EXCEPTION 'Etiquetas não estão disponíveis no seu plano atual';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_plan_limits
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_limits();