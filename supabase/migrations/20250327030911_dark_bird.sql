/*
  # Add order status audit trail and update status management

  1. New Tables
    - `order_status_history`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references pedidosxmenu)
      - `old_status` (order_status)
      - `new_status` (order_status)
      - `old_delivery_status` (delivery_status)
      - `new_delivery_status` (delivery_status)
      - `changed_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `reason` (text, optional)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create order status history table
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES pedidosxmenu(id) ON DELETE CASCADE NOT NULL,
  old_status order_status,
  new_status order_status,
  old_delivery_status delivery_status,
  new_delivery_status delivery_status,
  changed_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  reason text
);

-- Create indexes
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_changed_by ON order_status_history(changed_by);

-- Enable RLS
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view status history of their orders"
  ON order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pedidosxmenu
      WHERE pedidosxmenu.id = order_status_history.order_id
      AND pedidosxmenu.store_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert status history for their orders"
  ON order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidosxmenu
      WHERE pedidosxmenu.id = order_status_history.order_id
      AND pedidosxmenu.store_id = auth.uid()
    )
  );

-- Create function to update order status
CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id uuid,
  p_new_status order_status,
  p_new_delivery_status delivery_status,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_status order_status;
  v_old_delivery_status delivery_status;
BEGIN
  -- Get current status values
  SELECT status, delivery_status
  INTO v_old_status, v_old_delivery_status
  FROM pedidosxmenu
  WHERE id = p_order_id;

  -- Update order status
  UPDATE pedidosxmenu
  SET 
    status = p_new_status,
    delivery_status = p_new_delivery_status,
    updated_at = now()
  WHERE id = p_order_id;

  -- Insert status change history
  INSERT INTO order_status_history (
    order_id,
    old_status,
    new_status,
    old_delivery_status,
    new_delivery_status,
    changed_by,
    reason
  ) VALUES (
    p_order_id,
    v_old_status,
    p_new_status,
    v_old_delivery_status,
    p_new_delivery_status,
    auth.uid(),
    p_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;