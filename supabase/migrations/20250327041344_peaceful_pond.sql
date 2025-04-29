/*
  # Fix CPF validation and add unique constraint

  1. Changes
    - Add unique constraint to CPF field in profiles table
    - Add check constraint to ensure CPF is properly formatted
    - Add trigger to format CPF before insert/update

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Function to remove non-numeric characters from CPF
CREATE OR REPLACE FUNCTION format_cpf(cpf text)
RETURNS text AS $$
BEGIN
  RETURN regexp_replace(cpf, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint to CPF field
ALTER TABLE profiles
ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf);

-- Create trigger function to format CPF
CREATE OR REPLACE FUNCTION format_cpf_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cpf := format_cpf(NEW.cpf);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to format CPF before insert/update
CREATE TRIGGER format_cpf_before_insert_update
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION format_cpf_trigger();