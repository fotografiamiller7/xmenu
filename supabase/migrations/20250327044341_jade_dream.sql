/*
  # Fix out of stock tag trigger

  1. Updated Function
    - `manage_out_of_stock_tag`: Fixed array manipulation logic
      - Uses array_remove instead of unnest subquery
      - More reliable array handling
      - Same functionality, better implementation

  2. Trigger remains unchanged
    - Still executes on product quantity updates
    - Automatically manages the out of stock tag
*/

CREATE OR REPLACE FUNCTION manage_out_of_stock_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quantity = 0 AND (NEW.tags IS NULL OR NOT NEW.tags @> ARRAY['em-falta']::text[]) THEN
    -- Add 'em-falta' tag if quantity is 0 and tag doesn't exist
    NEW.tags = COALESCE(NEW.tags, ARRAY[]::text[]) || ARRAY['em-falta']::text[];
  ELSIF NEW.quantity > 0 AND NEW.tags @> ARRAY['em-falta']::text[] THEN
    -- Remove 'em-falta' tag if quantity is > 0 and tag exists
    NEW.tags = array_remove(COALESCE(NEW.tags, ARRAY[]::text[]), 'em-falta');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger for products table
DROP TRIGGER IF EXISTS manage_out_of_stock_tag_trigger ON products;
CREATE TRIGGER manage_out_of_stock_tag_trigger
  BEFORE INSERT OR UPDATE OF quantity
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION manage_out_of_stock_tag();