/*
  # Add delivery status to pedidosxmenu table

  1. Changes
    - Create delivery_status enum type
    - Add delivery_status column with default value
    - Set NOT NULL constraint

  2. Security
    - No changes to RLS policies
    - Maintains existing permissions
*/

-- Create delivery status enum type
DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM (
    'entrega_pendente',
    'em_preparacao',
    'em_transito',
    'entregue',
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add delivery_status column
ALTER TABLE pedidosxmenu
ADD COLUMN delivery_status delivery_status NOT NULL DEFAULT 'entrega_pendente'::delivery_status;