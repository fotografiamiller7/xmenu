/*
  # Add order status enum and update status column

  1. Changes
    - Create order_status enum type
    - Add temporary column with new type
    - Convert existing status values
    - Replace old status column with new typed column

  2. Security
    - No changes to RLS policies
    - Maintains existing permissions
*/

-- Create order status enum type
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pendente',
    'aprovado',
    'rejeitado',
    'cancelado',
    'finalizado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add temporary column with new type
ALTER TABLE pedidosxmenu
ADD COLUMN status_new order_status;

-- Convert existing status values
UPDATE pedidosxmenu
SET status_new = CASE
  WHEN status = 'pending' OR status = 'pendente' THEN 'pendente'::order_status
  WHEN status = 'approved' OR status = 'aprovado' THEN 'aprovado'::order_status
  WHEN status = 'rejected' OR status = 'rejeitado' THEN 'rejeitado'::order_status
  WHEN status = 'canceled' OR status = 'cancelado' THEN 'cancelado'::order_status
  WHEN status = 'finished' OR status = 'finalizado' THEN 'finalizado'::order_status
  ELSE 'pendente'::order_status
END;

-- Drop old column and rename new one
ALTER TABLE pedidosxmenu DROP COLUMN status;
ALTER TABLE pedidosxmenu RENAME COLUMN status_new TO status;
ALTER TABLE pedidosxmenu ALTER COLUMN status SET NOT NULL;
ALTER TABLE pedidosxmenu ALTER COLUMN status SET DEFAULT 'pendente'::order_status;