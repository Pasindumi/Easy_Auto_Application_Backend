-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  email text not null unique,
  phone text,
  password text not null, -- Hashed password
  role text default 'user' check (role in ('user', 'admin')),
  avatar text default 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format',
  is_premium boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;

-- Policies
create policy "Allow public insert (Signup)" on public.users
  for insert with check (true);

create policy "Users can read their own data" on public.users
  for select using (auth.uid() = id);

create policy "Public profiles are viewable by everyone" on public.users
  for select using (true);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);
