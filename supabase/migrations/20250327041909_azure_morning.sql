/*
  # Add quantity field to products table

  1. Changes
    - Add quantity column to products table
    - Set default value to 0
    - Add NOT NULL constraint
    - Add CHECK constraint to ensure non-negative values

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Add quantity column with constraints
ALTER TABLE products
ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0);