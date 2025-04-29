/*
  # Fix plan restrictions and features

  1. Changes
    - Fix plan features lookup to properly handle active subscriptions
    - Add proper error messages for plan restrictions
    - Fix theme customization check
    - Update enterprise plan limits
    - Add function to sync plan features with profiles

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add plano column to profiles if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'plano'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plano uuid REFERENCES planosxmenu(id);
  END IF;
END $$;

-- Function to sync subscription plan with profile
CREATE OR REPLACE FUNCTION sync_subscription_plan()
RETURNS trigger AS $$
BEGIN
  -- Update profile's plan when subscription changes
  UPDATE profiles
  SET plano = NEW.plan_id
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription changes
DROP TRIGGER IF EXISTS sync_subscription_plan_trigger ON subscriptions;
CREATE TRIGGER sync_subscription_plan_trigger
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_plan();

-- Update get_user_plan_features function
CREATE OR REPLACE FUNCTION get_user_plan_features(user_id uuid)
RETURNS plan_features AS $$
DECLARE
  user_plan_features plan_features;
BEGIN
  -- Get user's active plan features through profiles.plano
  SELECT pf.*
  INTO user_plan_features
  FROM profiles p
  JOIN plan_features pf ON pf.plan_id = p.plano
  WHERE p.id = user_id;

  -- If no plan found, try getting from active subscription
  IF user_plan_features IS NULL THEN
    SELECT pf.*
    INTO user_plan_features
    FROM subscriptions s
    JOIN plan_features pf ON pf.plan_id = s.plan_id
    WHERE s.user_id = user_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  -- If still no plan found, use basic plan limits
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
      RAISE EXCEPTION 'Limite de produtos atingido. Seu plano permite até % produtos. Faça upgrade para adicionar mais produtos.', 
        user_plan_features.max_products;
    END IF;
  END IF;

  -- Enforce description length
  IF length(NEW.description) > user_plan_features.max_description_length THEN
    RAISE EXCEPTION 'Descrição muito longa. Seu plano permite até % caracteres. Faça upgrade para descrições maiores.',
      user_plan_features.max_description_length;
  END IF;

  -- Enforce tags restriction
  IF NOT user_plan_features.allow_tags AND NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0 THEN
    RAISE EXCEPTION 'Etiquetas não estão disponíveis no seu plano atual. Faça upgrade para usar etiquetas.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update check_theme_customization function
CREATE OR REPLACE FUNCTION check_theme_customization()
RETURNS trigger AS $$
DECLARE
  user_plan_features plan_features;
BEGIN
  -- Only check on theme updates
  IF OLD.theme = NEW.theme OR NEW.theme IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get user's plan features
  user_plan_features := get_user_plan_features(NEW.id);

  -- Check if theme customization is allowed
  IF NOT user_plan_features.allow_theme_customization THEN
    RAISE EXCEPTION 'Personalização de tema não está disponível no seu plano atual. Faça upgrade para personalizar as cores.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync existing subscriptions with profiles
UPDATE profiles p
SET plano = s.plan_id
FROM subscriptions s
WHERE s.user_id = p.id
  AND s.status = 'active'
  AND p.plano IS NULL;

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

-- Create trigger for theme customization if not exists
DROP TRIGGER IF EXISTS enforce_theme_customization ON profiles;
CREATE TRIGGER enforce_theme_customization
  BEFORE UPDATE OF theme ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_theme_customization();