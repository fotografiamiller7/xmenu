/*
  # Fix service role policies and permissions

  1. Changes
    - Add policies for service role access
    - Fix syntax errors in policy creation
    - Enable RLS for necessary tables
    - Add proper DROP policy statements

  2. Security
    - Allow service role to access required data
    - Maintain existing security policies
*/

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow function invocation" ON storage.objects;
  DROP POLICY IF EXISTS "Allow service role to read logs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow service role to access profiles" ON profiles;
  DROP POLICY IF EXISTS "Allow service role to access subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Allow service role to access subscription_payments" ON subscription_payments;
  DROP POLICY IF EXISTS "Allow service role to access pedidosxmenu" ON pedidosxmenu;
  DROP POLICY IF EXISTS "Allow service role to access planosxmenu" ON planosxmenu;
  DROP POLICY IF EXISTS "Allow service role to access plan_features" ON plan_features;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS on storage tables
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies
CREATE POLICY "Allow function invocation"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'functions');

CREATE POLICY "Allow service role to read logs"
  ON storage.objects
  FOR SELECT
  TO service_role
  USING (bucket_id = 'functions');

-- Create service role policies for each table
CREATE POLICY "Allow service role to access profiles"
  ON profiles
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to access subscriptions"
  ON subscriptions
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to access subscription_payments"
  ON subscription_payments
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to access pedidosxmenu"
  ON pedidosxmenu
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to access planosxmenu"
  ON planosxmenu
  TO service_role
  USING (true);

CREATE POLICY "Allow service role to access plan_features"
  ON plan_features
  TO service_role
  USING (true);

-- Create function to check service role permissions
CREATE OR REPLACE FUNCTION check_service_role_permissions()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT rolsuper FROM pg_roles WHERE rolname = 'service_role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;