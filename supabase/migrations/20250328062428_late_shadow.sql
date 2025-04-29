/*
  # Add customer notes field to pedidosxmenu table

  1. Changes
    - Add customer_notes column to store order notes/preferences
    - Make it nullable since notes are optional
    - Add column comment explaining its purpose

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Add customer_notes column if it doesn't exist
ALTER TABLE pedidosxmenu
ADD COLUMN IF NOT EXISTS customer_notes text;