/*
  # Fix plan features and restrictions

  1. Changes
    - Update plan_features trigger to properly check user's active subscription
    - Fix theme customization check
    - Fix tag restrictions
    - Update enterprise plan limits
    - Add function to get user's active plan features

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Create function to get user's active plan features
CREATE OR REPLACE FUNCTION get_user_plan_features(user_id uuid)
RETURNS plan_features AS $$
DECLARE
  user_plan_features plan_features;
BEGIN
  -- Get user's active plan features
  SELECT pf.*
  INTO user_plan_features
  FROM subscriptions s
  JOIN plan_features pf ON pf.plan_id = s.plan_id
  WHERE s.user_id = $1
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- If no active plan found, use basic plan limits
  IF user_plan_features IS NULL THEN
    SELECT pf.*
    INTO user_plan_features
    FROM planosxmenu p
    JOIN plan_features pf ON pf.plan_id = p.id
    WHERE p.name = 'Básico'
    LIMIT 1;
  END IF;

  RETURN user_plan_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_product_limits function
CREATE OR REPLACE FUNCTION check_product_limits()
RETURNS trigger AS $$
DECLARE
  user_plan_features plan_features;
BEGIN
  -- Get user's plan features
  user_plan_features := get_user_plan_features(NEW.user_id);

  -- Check product count
  IF TG_OP = 'INSERT' THEN
    IF (
      SELECT COUNT(*) 
      FROM products 
      WHERE user_id = NEW.user_id
    ) >= user_plan_features.max_products THEN
      RAISE EXCEPTION 'Limite de produtos atingido. Seu plano permite até % produtos.', 
        user_plan_features.max_products;
    END IF;
  END IF;

  -- Enforce description length
  IF length(NEW.description) > user_plan_features.max_description_length THEN
    NEW.description := substring(NEW.description, 1, user_plan_features.max_description_length);
  END IF;

  -- Enforce tags restriction
  IF NOT user_plan_features.allow_tags AND NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0 THEN
    RAISE EXCEPTION 'Etiquetas não estão disponíveis no seu plano atual';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update enterprise plan features
UPDATE plan_features pf
SET
  max_products = 999999,
  max_description_length = 1000,
  allow_tags = true,
  allow_theme_customization = true,
  allow_cart = true,
  allow_purchases = true
FROM planosxmenu p
WHERE p.id = pf.plan_id
  AND p.name = 'Enterprise';

-- Add trigger to enforce theme customization
CREATE OR REPLACE FUNCTION check_theme_customization()
RETURNS trigger AS $$
DECLARE
  user_plan_features plan_features;
BEGIN
  -- Only check on theme updates
  IF OLD.theme = NEW.theme THEN
    RETURN NEW;
  END IF;

  -- Get user's plan features
  user_plan_features := get_user_plan_features(NEW.id);

  -- Check if theme customization is allowed
  IF NOT user_plan_features.allow_theme_customization THEN
    RAISE EXCEPTION 'Personalização de tema não está disponível no seu plano atual';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for theme customization
DROP TRIGGER IF EXISTS enforce_theme_customization ON profiles;
CREATE TRIGGER enforce_theme_customization
  BEFORE UPDATE OF theme ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_theme_customization();