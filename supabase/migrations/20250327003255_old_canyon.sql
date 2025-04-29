/*
  # Add theme field to profiles table

  1. Changes
    - Add `theme` column to store user's color theme preferences
    - Column type is JSONB to store multiple color values
    - Default value is a JSON object with default theme colors
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT json_build_object(
  'primary', '#0061FF',
  'secondary', '#2D3748',
  'accent', '#1E40AF'
);