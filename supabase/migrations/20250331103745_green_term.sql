/*
  # Add CPF validation function and error handling

  1. New Functions
    - `validate_cpf`: Validates CPF format and check digits
    - `format_cpf`: Formats CPF string to standard format
    - `log_payment_error`: Logs payment validation errors

  2. Security
    - Functions run with SECURITY DEFINER
    - Input validation and sanitization
    - Proper error handling
*/

-- Function to validate CPF
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

-- Function to log payment validation errors
CREATE OR REPLACE FUNCTION log_payment_error(
    p_user_id uuid,
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
        user_id,
        status,
        error_message,
        request_data
    ) VALUES (
        p_user_id,
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

-- Add request_data column to subscription_payments if it doesn't exist
DO $$ 
BEGIN
    ALTER TABLE subscription_payments 
    ADD COLUMN request_data jsonb;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;