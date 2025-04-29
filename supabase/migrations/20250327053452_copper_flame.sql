/*
  # Create plans table for XMenu

  1. New Tables
    - `planosxmenu`
      - `id` (uuid, primary key)
      - `name` (text) - Nome do plano
      - `price` (numeric) - Valor do plano
      - `features` (text[]) - Array de funcionalidades
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS planosxmenu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  features text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE planosxmenu ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admin can manage plans"
  ON planosxmenu
  TO authenticated
  USING (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  )
  WITH CHECK (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  );

-- Create trigger for updating updated_at
CREATE TRIGGER set_planosxmenu_updated_at
  BEFORE UPDATE ON planosxmenu
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();