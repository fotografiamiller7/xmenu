/*
  # Fix duplicate CPF column issue

  1. Changes
    - Find and fix any duplicate CPF columns
    - Ensure proper constraints and validation
    - Maintain data integrity during migration

  2. Security
    - Avoid system trigger manipulation
    - Keep existing RLS policies
*/

-- First, identify and handle duplicate CPF columns
DO $$ 
DECLARE
    duplicate_column_name text;
BEGIN
    -- Find duplicate CPF column (case-insensitive search)
    SELECT column_name INTO duplicate_column_name
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND lower(column_name) = 'cpf'
    AND column_name != 'cpf'
    LIMIT 1;

    -- If duplicate column exists, migrate data and drop it
    IF duplicate_column_name IS NOT NULL THEN
        -- Migrate any non-null values
        EXECUTE format('
            UPDATE profiles p1
            SET cpf = COALESCE(NULLIF(p1.cpf, ''''), p2.%I)
            FROM profiles p2
            WHERE p1.id = p2.id
            AND p2.%I IS NOT NULL',
            duplicate_column_name,
            duplicate_column_name
        );

        -- Drop the duplicate column
        EXECUTE format('ALTER TABLE profiles DROP COLUMN IF EXISTS %I', duplicate_column_name);
    END IF;
END $$;

-- Ensure CPF column exists and has proper type
DO $$ 
BEGIN
    -- Ensure CPF column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'cpf'
    ) THEN
        ALTER TABLE profiles ADD COLUMN cpf text;
    END IF;

    -- Set NOT NULL constraint
    ALTER TABLE profiles ALTER COLUMN cpf SET NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Add proper constraints
DO $$ 
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_key;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_unique;
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_cpf_check;

    -- Add constraints
    ALTER TABLE profiles
        ADD CONSTRAINT profiles_cpf_unique UNIQUE (cpf),
        ADD CONSTRAINT profiles_cpf_check CHECK (
            length(regexp_replace(cpf, '[^0-9]', '', 'g')) = 11
        );
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);