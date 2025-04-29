/*
  # Fix duplicate CPF fields in profiles table

  1. Changes
    - Check for duplicate CPF columns
    - Keep only one CPF column with proper constraints
    - Update data to ensure no information is lost
    - Add proper validation

  2. Security
    - Maintain existing RLS policies
    - Keep data integrity
*/

-- First, check if we have duplicate CPF columns and fix them
DO $$ 
DECLARE
    column_count integer;
    duplicate_cpf_column text;
BEGIN
    -- Count how many CPF columns we have
    SELECT COUNT(*)
    INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'cpf';

    -- If we have more than one CPF column
    IF column_count > 1 THEN
        -- Find the duplicate column name (it might have a different case)
        SELECT column_name
        INTO duplicate_cpf_column
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND lower(column_name) = 'cpf'
        AND column_name != 'cpf'
        LIMIT 1;

        -- If we found a duplicate column
        IF duplicate_cpf_column IS NOT NULL THEN
            -- Update the main CPF column with non-null values from the duplicate
            EXECUTE format('
                UPDATE profiles p1
                SET cpf = p2.%I
                FROM profiles p2
                WHERE p1.id = p2.id
                AND p1.cpf IS NULL
                AND p2.%I IS NOT NULL',
                duplicate_cpf_column,
                duplicate_cpf_column
            );

            -- Drop the duplicate column
            EXECUTE format('ALTER TABLE profiles DROP COLUMN IF EXISTS %I', duplicate_cpf_column);
        END IF;
    END IF;
END $$;

-- Ensure we have the proper constraints on the CPF column
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

-- Create or replace CPF validation trigger
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

-- Create or replace CPF formatting trigger
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

-- Drop existing triggers if they exist
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