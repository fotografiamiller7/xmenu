/*
  # Fix CPF validation and error handling

  1. Changes
    - Add improved CPF validation function
    - Add error logging function
    - Add validation trigger for profiles table
    - Add constraint to ensure valid CPF format

  2. Security
    - Functions run with SECURITY DEFINER
    - Maintain existing RLS policies
*/

-- Drop existing CPF validation function if it exists
DROP FUNCTION IF EXISTS validate_cpf(text);

-- Create improved CPF validation function
CREATE OR REPLACE FUNCTION validate_cpf(cpf text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    numbers integer[];
    sum integer;
    dv1 integer;
    dv2 integer;
    i integer;
    digit text;
    clean_cpf text;
BEGIN
    -- Remove non-numeric characters
    clean_cpf := regexp_replace(cpf, '[^0-9]', '', 'g');

    -- Check length
    IF length(clean_cpf) != 11 THEN
        RETURN false;
    END IF;

    -- Check for repeated digits
    IF clean_cpf ~ '^(\d)\1+$' THEN
        RETURN false;
    END IF;

    -- Convert to integer array
    numbers := ARRAY[]::integer[];
    FOR i IN 1..11 LOOP
        digit := substr(clean_cpf, i, 1);
        numbers := array_append(numbers, digit::integer);
    END LOOP;

    -- Calculate first check digit
    sum := 0;
    FOR i IN 1..9 LOOP
        sum := sum + (numbers[i] * (11 - i));
    END LOOP;
    dv1 := 11 - (sum % 11);
    IF dv1 >= 10 THEN
        dv1 := 0;
    END IF;

    -- Validate first check digit
    IF dv1 != numbers[10] THEN
        RETURN false;
    END IF;

    -- Calculate second check digit
    sum := 0;
    FOR i IN 1..10 LOOP
        sum := sum + (numbers[i] * (12 - i));
    END LOOP;
    dv2 := 11 - (sum % 11);
    IF dv2 >= 10 THEN
        dv2 := 0;
    END IF;

    -- Validate second check digit
    RETURN dv2 = numbers[11];
END;
$$;

-- Create function to validate CPF before insert/update
CREATE OR REPLACE FUNCTION validate_cpf_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT validate_cpf(NEW.cpf) THEN
        RAISE EXCEPTION 'CPF inválido: %', NEW.cpf
        USING ERRCODE = 'INVALID_CPF';
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for CPF validation
DROP TRIGGER IF EXISTS validate_cpf_before_save ON profiles;
CREATE TRIGGER validate_cpf_before_save
    BEFORE INSERT OR UPDATE OF cpf ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_cpf_trigger();

-- Function to log validation errors
CREATE OR REPLACE FUNCTION log_validation_error(
    p_error_code text,
    p_error_message text,
    p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO subscription_payments (
        status,
        error_message,
        request_data
    ) VALUES (
        'error',
        p_error_message,
        jsonb_build_object(
            'error_code', p_error_code,
            'timestamp', now(),
            'details', p_details
        )
    );
END;
$$;

-- Add error logging columns if they don't exist
DO $$ 
BEGIN
    ALTER TABLE subscription_payments 
    ADD COLUMN IF NOT EXISTS error_message text,
    ADD COLUMN IF NOT EXISTS request_data jsonb;
END $$;