/*
  # Add email field to profiles table

  1. Changes
    - Add `email` column for storing user's email
    - Set default value to empty string to avoid null values
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text DEFAULT '';