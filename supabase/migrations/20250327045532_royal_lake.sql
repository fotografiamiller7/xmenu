/*
  # Admin System Tables

  1. New Tables
    - `plans` - Store subscription plan details
      - `id` (uuid, primary key)
      - `name` (text) - Plan name
      - `description` (text) - Plan description
      - `price` (numeric) - Monthly price
      - `features` (jsonb) - Plan features
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `subscriptions` - Store user subscriptions
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Reference to profiles
      - `plan_id` (uuid) - Reference to plans
      - `status` (text) - Subscription status
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `metrics` - Store system metrics
      - `id` (uuid, primary key)
      - `name` (text) - Metric name
      - `value` (numeric) - Metric value
      - `date` (date) - Date of metric
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  value numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admin can manage plans"
  ON plans
  TO authenticated
  USING (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  )
  WITH CHECK (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  );

CREATE POLICY "Admin can manage subscriptions"
  ON subscriptions
  TO authenticated
  USING (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  )
  WITH CHECK (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  );

CREATE POLICY "Admin can manage metrics"
  ON metrics
  TO authenticated
  USING (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  )
  WITH CHECK (
    (SELECT email FROM users WHERE id = auth.uid()) = 'admin@admin.com'
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();