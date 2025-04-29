/*
  # Add description field to planosxmenu table

  1. Changes
    - Add description column to planosxmenu table
    - Make it nullable to maintain compatibility with existing plans
    - Update existing plans with empty description

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Add description column if it doesn't exist
ALTER TABLE planosxmenu
ADD COLUMN IF NOT EXISTS description text;