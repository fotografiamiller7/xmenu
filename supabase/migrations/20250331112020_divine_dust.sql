/*
  # Fix duplicate CPF column issue

  1. Changes
    - Drop duplicate CPF column
    - Ensure single CPF column with proper constraints
    - Migrate any data from duplicate column
    - Add proper validation and formatting

  2. Security
    - Maintain existing RLS policies
    - Keep data integrity during migration
*/

-- First, identify and fix duplicate CPF columns
DO $$ 
DECLARE
    column_exists boolean;
    duplicate_column_name text;
BEGIN
    -- Check if we have a CPF column with different case
    SELECT column_name INTO duplicate_column_name
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND lower(column_name) = 'cpf'
    AND column_name != 'cpf'
    LIMIT 1;

    -- If we found a duplicate column
    IF duplicate_column_name IS NOT NULL THEN
        -- First, migrate any non-null values from the duplicate column
        EXECUTE format('
            UPDATE profiles p1
            SET cpf = COALESCE(p1.cpf, p2.%I)
            FROM profiles p2
            WHERE p1.id = p2.id
            AND p2.%I IS NOT NULL',
            duplicate_column_name,
            duplicate_column_name
        );

        -- Then drop the duplicate column
        EXECUTE format('ALTER TABLE profiles DROP COLUMN IF EXISTS %I', duplicate_column_name);
    END IF;
END $$;

-- Ensure we have proper constraints on the CPF column
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_unique;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_check;

    -- Add proper constraints
    ALTER TABLE profiles
        ALTER COLUMN cpf SET NOT NULL,
        ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf),
        ADD CONSTRAINT profiles_cpf_check CHECK (
            length(regexp_replace(cpf, '[^0-9]', '', 'g')) = 11
        );
END $$;

-- Create or replace CPF validation function
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

-- Create or replace CPF validation trigger function
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

-- Create or replace CPF formatting trigger function
CREATE OR REPLACE FUNCTION format_cpf_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Remove any non-numeric characters
    NEW.cpf := regexp_replace(NEW.cpf, '[^0-9]', '', 'g');
    RETURN NEW;
END;
$$;

-- Drop existing triggers
DROP TRIGGER IF EXISTS validate_cpf_before_save ON profiles;
DROP TRIGGER IF EXISTS format_cpf_before_insert_update ON profiles;

-- Create triggers
CREATE TRIGGER validate_cpf_before_save
    BEFORE INSERT OR UPDATE OF cpf ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION validate_cpf_trigger();

CREATE TRIGGER format_cpf_before_insert_update
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION format_cpf_trigger();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);

-- Validate existing CPF values
DO $$
DECLARE
    invalid_cpf RECORD;
BEGIN
    -- Find any invalid CPFs
    FOR invalid_cpf IN
        SELECT id, cpf
        FROM profiles
        WHERE NOT validate_cpf(cpf)
    LOOP
        RAISE WARNING 'Invalid CPF found for user %: %', 
            invalid_cpf.id, 
            invalid_cpf.cpf;
    END LOOP;
END $$;