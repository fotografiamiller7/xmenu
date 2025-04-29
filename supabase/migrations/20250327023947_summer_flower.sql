/*
  # Add establishment_id column to pedidosxmenu table

  1. Changes
    - Add establishment_id column to pedidosxmenu table
    - Add foreign key constraint referencing profiles table
    - Create index for better query performance
    - Update existing rows to use store_id as establishment_id

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Add establishment_id column if it doesn't exist
ALTER TABLE pedidosxmenu
ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES profiles(id);

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_pedidosxmenu_establishment_id 
ON pedidosxmenu(establishment_id);

-- Update existing rows to set establishment_id equal to store_id
UPDATE pedidosxmenu
SET establishment_id = store_id
WHERE establishment_id IS NULL;

-- Add NOT NULL constraint after updating existing rows
ALTER TABLE pedidosxmenu
ALTER COLUMN establishment_id SET NOT NULL;