/*
  # Update status notification to use first name

  1. Changes
    - Update status notification message to use first name
    - Add function to extract first name from full name
    - Maintain existing functionality
    - Keep proper error handling

  2. Security
    - Maintain SECURITY DEFINER
    - Keep existing RLS policies
*/

-- Function to get first name from full name
CREATE OR REPLACE FUNCTION get_first_name(full_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Split the name and return the first part
  RETURN split_part(full_name, ' ', 1);
END;
$$;

-- Update status notification function
CREATE OR REPLACE FUNCTION status_notification()
RETURNS trigger AS $$
DECLARE
  v_old_status text;
  v_new_status text;
  v_customer_name text;
  v_store_name text;
  v_order_date text;
  v_total_amount numeric;
  v_tracking_url text;
  v_customer_phone text;
  v_message text;
BEGIN
  -- Get order details
  SELECT 
    o.delivery_status,
    o.customer_name,
    p.store_name,
    o.created_at,
    o.total_amount,
    o.customer_phone,
    o.id
  INTO
    v_old_status,
    v_customer_name,
    v_store_name,
    v_order_date,
    v_total_amount,
    v_customer_phone,
    v_tracking_url
  FROM pedidosxmenu o
  JOIN profiles p ON p.id = o.store_id
  WHERE o.id = NEW.order_id;

  -- Get customer's first name
  v_customer_name := get_first_name(v_customer_name);

  -- Format order date
  v_order_date := to_char(v_order_date::timestamp, 'DD/MM/YYYY HH24:MI');

  -- Format tracking URL
  v_tracking_url := 'https://xmenu.pro/checkout/pedidos/' || NEW.order_id;

  -- Create personalized message for customer
  v_message := '🔔 Atualização do seu Pedido!

Olá ' || v_customer_name || ', seu pedido teve uma atualização!

📦 Pedido #' || NEW.order_id || '
🏪 Loja: ' || v_store_name || '
📅 Data do Pedido: ' || v_order_date || '

' || get_status_emoji(NEW.new_delivery_status) || ' Status Atualizado:
' || format_delivery_status(NEW.old_delivery_status) || ' ➡️ ' || format_delivery_status(NEW.new_delivery_status) || '

' || CASE WHEN NEW.reason IS NOT NULL THEN '
📝 Observação:
' || NEW.reason || '
' ELSE '' END || '

🔍 Acompanhe seu pedido:
' || v_tracking_url || '

Agradecemos a preferência! 😊';

  -- Send WhatsApp message
  PERFORM send_whatsapp_message(v_customer_phone, v_message);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;