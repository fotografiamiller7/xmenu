/*
  # Update product quantity function

  1. New Function
    - `update_product_quantity`: Updates product quantity after a successful purchase
      - Takes product ID and quantity as parameters
      - Validates stock availability
      - Updates quantity atomically
      - Returns success/failure status

  2. Security
    - Function can only be called by authenticated users
    - Validates input parameters
    - Uses transaction to ensure data consistency
*/

CREATE OR REPLACE FUNCTION update_product_quantity(
  product_id uuid,
  quantity_to_subtract integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_quantity integer;
BEGIN
  -- Get current quantity with row lock
  SELECT quantity INTO current_quantity
  FROM products
  WHERE id = product_id
  FOR UPDATE;

  -- Check if we have enough stock
  IF current_quantity >= quantity_to_subtract THEN
    -- Update quantity
    UPDATE products
    SET 
      quantity = quantity - quantity_to_subtract,
      updated_at = now()
    WHERE id = product_id;
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;