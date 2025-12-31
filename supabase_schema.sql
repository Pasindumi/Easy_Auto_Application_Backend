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


-- CarAd Table
create table if not exists public."CarAd" (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.users(id) on delete cascade,
  title text not null,
  price numeric not null,
  location text not null,
  description text,
  status text default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'SOLD', 'EXPIRED')),
  views_count integer default 0,
  expiry_date timestamp with time zone,
  contact_number text,
  contact_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CarDetails Table
create table if not exists public."CarDetails" (
  id uuid default uuid_generate_v4() primary key,
  ad_id uuid references public."CarAd"(id) on delete cascade,
  condition text,
  brand text,
  model text,
  year integer,
  mileage integer,
  engine_capacity integer,
  fuel_type text,
  transmission text,
  body_type text
);

-- AdImage Table
create table if not exists public."AdImage" (
  id uuid default uuid_generate_v4() primary key,
  ad_id uuid references public."CarAd"(id) on delete cascade,
  image_url text not null,
  is_primary boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public."CarAd" enable row level security;
alter table public."CarDetails" enable row level security;
alter table public."AdImage" enable row level security;

-- Policies for CarAd
create policy "Public ads are viewable by everyone" on public."CarAd"
  for select using (status = 'ACTIVE');

create policy "Users can see their own drafts" on public."CarAd"
  for select using (auth.uid() = seller_id);

create policy "Users can insert their own ads" on public."CarAd"
  for insert with check (auth.uid() = seller_id);

create policy "Users can update their own ads" on public."CarAd"
  for update using (auth.uid() = seller_id);

create policy "Users can delete their own ads" on public."CarAd"
  for delete using (auth.uid() = seller_id);

