-- Run this in the Supabase SQL Editor to set up the todos table

-- Create todos table
create table public.todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  is_complete boolean default false not null,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security
alter table public.todos enable row level security;

-- Policy: users can view their own todos
create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

-- Policy: users can insert their own todos
create policy "Users can insert their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

-- Policy: users can update their own todos
create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id);

-- Policy: users can delete their own todos
create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);
