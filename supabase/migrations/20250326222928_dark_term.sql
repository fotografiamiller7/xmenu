/*
  # Add logo and background image support to profiles

  1. New Columns
    - `logo_url` (text, nullable) - URL of the store's logo image
    - `background_url` (text, nullable) - URL of the store's background/cover image

  2. Changes
    - Add new columns with default NULL value
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS background_url text DEFAULT NULL;