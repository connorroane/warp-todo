-- Seed data for local development
-- This file runs after migrations on `supabase start` and `supabase db reset`.

-- Create a test user in auth.users for local development.
-- The password is "password123" (hashed with bcrypt).
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) values (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'testuser@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Test User"}',
  now(),
  now(),
  '',
  ''
);

-- Seed todos for the test user
insert into public.todos (user_id, title, description, time_commitment, finished)
values
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Buy groceries', 'Milk, eggs, bread, and vegetables', '30 minutes', false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Read a chapter of my book', 'Continue reading "Designing Data-Intensive Applications"', '1 hour', false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Schedule dentist appointment', 'Call Dr. Smith''s office for a cleaning', '10 minutes', false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Reply to Alice''s email', 'Respond about the project timeline', '15 minutes', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Fix the leaky kitchen faucet', 'Replace the washer and check the valve', '2 hours', false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Submit expense report', 'March expenses for client travel', '20 minutes', true);
