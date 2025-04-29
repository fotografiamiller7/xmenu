/*
  # Add new fields to profiles table

  1. Changes
    - Add `apikey` column for API key storage
    - Add `instagram` column for Instagram handle
    - Add `endereco` column for address
    - Add `telefone` column for phone number
    - All new fields default to empty string to avoid null values
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS apikey text DEFAULT '',
ADD COLUMN IF NOT EXISTS instagram text DEFAULT '',
ADD COLUMN IF NOT EXISTS endereco text DEFAULT '',
ADD COLUMN IF NOT EXISTS telefone text DEFAULT '';