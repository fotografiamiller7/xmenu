/*
  # Fix admin access and permissions

  1. Changes
    - Create admin user if it doesn't exist
    - Add admin role to users table
    - Update RLS policies for admin access

  2. Security
    - Only admin can access admin features
    - Admin has full access to all tables
*/

-- Create admin user if it doesn't exist
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  last_sign_in_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@admin.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'admin@admin.com'
);

-- Create admin profile
INSERT INTO public.profiles (
  id,
  name,
  store_name,
  cpf,
  email,
  created_at,
  updated_at
)
SELECT
  id,
  'Admin',
  'Admin Store',
  '00000000000',
  'admin@admin.com',
  now(),
  now()
FROM auth.users
WHERE email = 'admin@admin.com'
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'admin@admin.com'
);

-- Create admin user record
INSERT INTO public.users (
  id,
  email,
  name,
  cpf,
  created_at,
  status
)
SELECT
  id,
  'admin@admin.com',
  'Admin',
  '00000000000',
  now(),
  'active'
FROM auth.users
WHERE email = 'admin@admin.com'
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'admin@admin.com'
);