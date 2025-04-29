/*
  # Create products table and related structures

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `price` (numeric)
      - `description` (text)
      - `category` (text)
      - `tags` (text[])
      - `image_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on products table
    - Add policies for:
      - Users can read their own products
      - Users can create their own products
      - Users can update their own products
      - Users can delete their own products
      - Public can read all products (for the store front)

  3. Triggers
    - Add trigger to update the updated_at timestamp
*/

-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the product_tag type if it doesn't exist
CREATE TYPE product_tag AS ENUM (
  'novidade',
  'em-falta',
  'premium',
  'exclusivo',
  'mais-pedido'
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  description text,
  category text,
  tags text[] DEFAULT '{}',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can create their own products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own products"
  ON products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for public access (store front)
CREATE POLICY "Public can view all products"
  ON products
  FOR SELECT
  TO public
  USING (true);

-- Create trigger for updating the updated_at timestamp
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();