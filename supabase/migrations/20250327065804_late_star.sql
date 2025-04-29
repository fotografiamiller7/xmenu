/*
  # Add basic plan restrictions

  1. Changes
    - Create basic plan with restrictions
    - Add plan_features table to store plan-specific restrictions
    - Add function to check plan limits
    - Add trigger to enforce plan restrictions

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create plan_features table to store plan-specific restrictions
CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES planosxmenu(id) ON DELETE CASCADE,
  max_products integer NOT NULL DEFAULT 30,
  max_description_length integer NOT NULL DEFAULT 30,
  allow_tags boolean NOT NULL DEFAULT false,
  allow_theme_customization boolean NOT NULL DEFAULT false,
  allow_cart boolean NOT NULL DEFAULT false,
  allow_purchases boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read plan features
CREATE POLICY "Users can read plan features"
  ON plan_features
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to check plan limits
CREATE OR REPLACE FUNCTION check_plan_limits()
RETURNS trigger AS $$
DECLARE
  user_plan_id uuid;
  plan_limits record;
  product_count integer;
BEGIN
  -- Get user's active plan
  SELECT plan_id INTO user_plan_id
  FROM subscriptions
  WHERE user_id = NEW.user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get plan limits
  SELECT * INTO plan_limits
  FROM plan_features
  WHERE plan_id = user_plan_id;

  -- If no plan found or no limits set, use basic plan restrictions
  IF plan_limits IS NULL THEN
    plan_limits := ROW(
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

  -- Check product count
  SELECT COUNT(*) INTO product_count
  FROM products
  WHERE user_id = NEW.user_id;

  -- Enforce limits
  IF TG_OP = 'INSERT' AND product_count >= plan_limits.max_products THEN
    RAISE EXCEPTION 'Limite de produtos atingido. Seu plano permite até % produtos.', plan_limits.max_products;
  END IF;

  -- Enforce description length
  IF length(NEW.description) > plan_limits.max_description_length THEN
    NEW.description := substring(NEW.description, 1, plan_limits.max_description_length);
  END IF;

  -- Enforce tags restriction
  IF NOT plan_limits.allow_tags THEN
    NEW.tags := '{}';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce plan limits
DROP TRIGGER IF EXISTS enforce_plan_limits ON products;
CREATE TRIGGER enforce_plan_limits
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_plan_limits();

-- Insert basic plan features
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
FROM planosxmenu
WHERE name ILIKE '%básico%'
ON CONFLICT DO NOTHING;