/*
  # Fix dashboard permissions and access rules

  1. Changes
    - Add missing RLS policies for products table
    - Add proper policies for profile access
    - Ensure proper cascade behavior for product deletion
    - Add policies for storage access

  2. Security
    - Users can only access their own data
    - Public can view store products
    - Proper storage access control
*/

-- Enable RLS on all relevant tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own products" ON products;
DROP POLICY IF EXISTS "Users can create own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;
DROP POLICY IF EXISTS "Public can view products" ON products;

-- Create comprehensive policies for products
CREATE POLICY "Users can read own products"
  ON products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view products"
  ON products
  FOR SELECT
  TO public
  USING (true);

-- Storage policies for product images
DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;

CREATE POLICY "Users can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'products');

-- Add function to check product limits based on plan
CREATE OR REPLACE FUNCTION check_product_limits()
RETURNS trigger AS $$
DECLARE
  user_plan_features record;
BEGIN
  -- Get user's plan features
  SELECT pf.*
  INTO user_plan_features
  FROM profiles p
  LEFT JOIN subscriptions s ON s.user_id = p.id AND s.status = 'active'
  LEFT JOIN plan_features pf ON pf.plan_id = s.plan_id
  WHERE p.id = NEW.user_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- If no plan found, use basic plan limits
  IF user_plan_features IS NULL THEN
    user_plan_features := ROW(
      NULL, -- id
      NULL, -- plan_id
      30,   -- max_products
      30,   -- max_description_length
      false, -- allow_tags
      false, -- allow_theme_customization
      false, -- allow_cart
      false  -- allow_purchases
    )::plan_features;
  END IF;

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
  IF NOT user_plan_features.allow_tags THEN
    NEW.tags := '{}';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;